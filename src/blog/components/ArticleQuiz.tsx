import React, { useEffect, useState, useCallback } from 'react';
import { getQuizCategoryId, getQuizDifficulty } from '../utils/quizCategoryMap';

const OPENTDB_BASE = 'https://opentdb.com';
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:3001/api';

export interface ArticleQuizProps {
  tags: string[];
}

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
}

interface TriviaResponse {
  response_code: number;
  results?: TriviaQuestion[];
}

/** Decode HTML entities (e.g. &#039; → ', &amp; → &) */
function decodeHtmlEntities(text: string): string {
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || text;
}

/** Shuffle array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ArticleQuiz: React.FC<ArticleQuizProps> = ({ tags }) => {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const categoryId = getQuizCategoryId(tags);
  const difficulty = getQuizDifficulty(categoryId);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const url = API_BASE ? `${API_BASE}/trivia-token` : `${OPENTDB_BASE}/api_token.php?command=request`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.token) {
        return data.token;
      }
    } catch {
      // No token is fine; we just might see repeat questions
    }
    return null;
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionToken || (await fetchToken());
      if (token) setSessionToken(token);

      const params: Record<string, string> = {
        amount: '10',
        category: String(categoryId),
        type: 'multiple',
        difficulty,
      };
      if (token) params.token = token;

      const query = new URLSearchParams(params).toString();
      const url = API_BASE ? `${API_BASE}/trivia?${query}` : `${OPENTDB_BASE}/api.php?${query}`;
      const res = await fetch(url);
      const data: TriviaResponse = await res.json();

      if (data.response_code === 1) {
        setError('No questions available for this category.');
        setQuestions([]);
        return;
      }
      if (data.response_code === 4 && token) {
        // Token exhausted; reset and retry without token this time
        const resetUrl = API_BASE
          ? `${API_BASE}/trivia-token?command=reset&token=${token}`
          : `${OPENTDB_BASE}/api_token.php?command=reset&token=${token}`;
        await fetch(resetUrl);
        setSessionToken(null);
        return fetchQuestions();
      }
      if (data.response_code !== 0 || !data.results?.length) {
        setError('Could not load quiz questions.');
        setQuestions([]);
        return;
      }

      setQuestions(data.results);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setScore(0);
      setAnswered(false);
      setFinished(false);
    } catch (err) {
      setError('Failed to load quiz. Please try again later.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty, sessionToken, fetchToken]);

  useEffect(() => {
    fetchQuestions();
  }, [categoryId]); // Re-fetch when category changes (e.g. different article)

  const currentQuestion = questions[currentIndex];
  const answers = currentQuestion
    ? shuffle([
        currentQuestion.correct_answer,
        ...currentQuestion.incorrect_answers,
      ])
    : [];

  const handleAnswer = (answer: string) => {
    if (answered) return;
    setSelectedAnswer(answer);
    setAnswered(true);
    if (answer === currentQuestion.correct_answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  };

  const handlePlayAgain = () => {
    fetchQuestions();
  };

  if (loading) {
    return (
      <section className="mt-12 rounded-xl border border-gray-700/50 bg-gray-800/50 p-8" aria-label="Article quiz">
        <h2 className="text-xl font-bold mb-4 text-[#9ed04b]">Quiz</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-[#9ed04b] rounded-full" />
        </div>
      </section>
    );
  }

  if (error || questions.length === 0) {
    return (
      <section className="mt-12 rounded-xl border border-gray-700/50 bg-gray-800/50 p-8" aria-label="Article quiz">
        <h2 className="text-xl font-bold mb-4 text-[#9ed04b]">Quiz</h2>
        <p className="text-gray-400">{error || 'No questions available.'}</p>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="mt-12 rounded-xl border border-gray-700/50 bg-gray-800/50 p-8" aria-label="Article quiz">
        <h2 className="text-xl font-bold mb-4 text-[#9ed04b]">Quiz Complete</h2>
        <p className="text-white text-lg mb-4">
          You scored {score} out of {questions.length}
        </p>
        <button
          onClick={handlePlayAgain}
          className="bg-[#9ed04b] text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-[#9ed04b]/90 transition-colors"
        >
          Play again
        </button>
      </section>
    );
  }

  return (
    <section className="mt-12 rounded-xl border border-gray-700/50 bg-gray-800/50 p-8" aria-label="Article quiz">
      <h2 className="text-xl font-bold mb-2 text-[#9ed04b]">Quiz</h2>
      <p className="text-gray-400 text-sm mb-6">
        Question {currentIndex + 1} of {questions.length}
      </p>

      <p className="text-white text-lg mb-6">{decodeHtmlEntities(currentQuestion.question)}</p>

      <fieldset className="space-y-3" aria-label="Answer options">
        {answers.map((answer) => {
          const decoded = decodeHtmlEntities(answer);
          const isCorrect = answer === currentQuestion.correct_answer;
          const isSelected = selectedAnswer === answer;
          const showResult = answered && (isCorrect || isSelected);

          return (
            <button
              key={answer}
              type="button"
              onClick={() => handleAnswer(answer)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-500/20 text-green-200'
                    : isSelected
                      ? 'border-red-500 bg-red-500/20 text-red-200'
                      : 'border-gray-600 bg-gray-800/50 text-gray-400'
                  : isSelected
                    ? 'border-[#9ed04b] bg-[#9ed04b]/10 text-white'
                    : 'border-gray-600 bg-gray-800/50 text-white hover:border-gray-500'
              }`}
            >
              {decoded}
            </button>
          );
        })}
      </fieldset>

      {answered && (
        <button
          onClick={handleNext}
          className="mt-6 bg-[#9ed04b] text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-[#9ed04b]/90 transition-colors"
        >
          {currentIndex + 1 >= questions.length - 1 ? 'See results' : 'Next'}
        </button>
      )}
    </section>
  );
};

export default ArticleQuiz;
