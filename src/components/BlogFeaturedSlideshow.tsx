import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { BlogPost } from '../types';
import MarkdownRenderer from '../blog/components/MarkdownRenderer';
import { stripExcerptArtifacts } from '../blog/utils/blogUtils';

const SLIDESHOW_INTERVAL_MS = 9000;

/** First 5 lines of content for preview, stripped of headers and prompt artifacts. */
function getFirstFiveLines(content: string, maxChars: number = 320): string {
  if (!content) return '';
  const cleaned = stripExcerptArtifacts(content);
  const lines = cleaned
    .split(/\n/)
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .filter((l) => l.length > 0);
  const five = lines.slice(0, 5).join(' ');
  return five.length > maxChars ? five.slice(0, maxChars) + '…' : five;
}

export interface BlogFeaturedSlideshowProps {
  posts: BlogPost[];
  title: string;
  showViewAll?: boolean;
}

const BlogFeaturedSlideshow: React.FC<BlogFeaturedSlideshowProps> = ({
  posts,
  title,
  showViewAll = false,
}) => {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [timerProgress, setTimerProgress] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const featuredTrackRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  // For infinite loop: append clone of first slide at end
  const trackPosts = posts.length > 0 ? [...posts, posts[0]] : [];
  const realCount = posts.length;

  // Auto-advance: go to next, or to clone when at last real slide
  useEffect(() => {
    if (realCount <= 1) return;
    const t = setInterval(() => {
      setFeaturedIndex((i) => (i < realCount - 1 ? i + 1 : realCount)); // realCount = clone index
    }, SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(t);
  }, [realCount]);

  // Timer bar countdown
  useEffect(() => {
    setTimerProgress(1);
    startTimeRef.current = Date.now();
    if (realCount <= 1) return;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.max(0, 1 - elapsed / SLIDESHOW_INTERVAL_MS);
      setTimerProgress(progress);
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [featuredIndex, realCount]);

  // Sync scroll when featuredIndex changes
  useEffect(() => {
    const el = featuredTrackRef.current;
    if (!el || trackPosts.length <= 1) return;
    const slideWidth = el.offsetWidth;
    isProgrammaticScrollRef.current = true;
    el.scrollTo({ left: featuredIndex * slideWidth, behavior: 'smooth' });
    const t = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 800);
    return () => clearTimeout(t);
  }, [featuredIndex, trackPosts.length]);

  // Infinite loop: when we land on clone, instantly jump back to real first
  useEffect(() => {
    if (featuredIndex !== realCount) return;
    const t = setTimeout(() => {
      const el = featuredTrackRef.current;
      if (!el) return;
      isProgrammaticScrollRef.current = true;
      const prevBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = 0;
      setFeaturedIndex(0);
      requestAnimationFrame(() => {
        el.style.scrollBehavior = prevBehavior || 'smooth';
        isProgrammaticScrollRef.current = false;
      });
    }, 900);
    return () => clearTimeout(t);
  }, [featuredIndex, realCount]);

  const handlePrev = () => {
    setFeaturedIndex((i) => (i > 0 ? i - 1 : realCount - 1));
  };

  const handleNext = () => {
    setFeaturedIndex((i) => (i < realCount - 1 ? i + 1 : realCount));
  };

  const handleDotClick = (index: number) => {
    setFeaturedIndex(index);
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticScrollRef.current) return;
    const el = e.currentTarget;
    const slideWidth = el.offsetWidth;
    const rawIndex = Math.round(el.scrollLeft / slideWidth);
    const newIndex = rawIndex >= realCount ? realCount - 1 : Math.min(rawIndex, realCount - 1);
    if (newIndex >= 0 && newIndex !== featuredIndex && newIndex < realCount) {
      setFeaturedIndex(newIndex);
    }
  };

  if (posts.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold">{title}</h2>
        {showViewAll && (
          <Link
            to="/blog"
            className="text-[#9ed04b] hover:text-[#9ed04b]/80 font-semibold flex items-center gap-2 transition-colors"
          >
            View all posts
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800/50">
        <div
          ref={featuredTrackRef}
          className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
          onScroll={onScroll}
        >
          {trackPosts.map((post, i) => (
            <div
              key={i === realCount ? `${post.slug}-clone` : post.slug}
              className="flex-shrink-0 w-full min-w-full snap-start snap-always"
            >
              <Link
                to={`/blog/${post.slug}`}
                className="block p-6 md:p-8 md:flex md:gap-8 md:items-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(158,208,75,0.06) 0%, rgba(30,41,59,0.95) 100%)',
                }}
              >
                {post.coverImage && (
                  <div className="md:w-1/2 h-48 md:h-64 -mx-6 -mt-6 md:mx-0 md:mt-0 mb-4 md:mb-0 overflow-hidden rounded-t-2xl md:rounded-2xl">
                    <img
                      src={post.coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el && el.src !== '/Logo.png') el.src = '/Logo.png';
                      }}
                    />
                  </div>
                )}
                <div className="md:flex-1 md:py-6">
                  <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 line-clamp-2 hover:text-[#9ed04b] transition-colors">
                    {post.title}
                  </h3>
                  <div className="text-gray-400 text-sm md:text-base line-clamp-4 mb-4 prose prose-invert prose-sm max-w-none prose-p:my-0 prose-a:text-[#9ed04b]">
                    <MarkdownRenderer content={getFirstFiveLines(post.content || post.excerpt)} />
                  </div>
                  <span className="text-[#9ed04b] text-sm font-medium">Read more →</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
        {realCount > 1 && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80 z-10 overflow-hidden rounded-b-2xl">
              <div
                className="h-full bg-[#9ed04b] transition-all duration-75 ease-linear"
                style={{ width: `${timerProgress * 100}%` }}
              />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {posts.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDotClick(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    (featuredIndex === i || (featuredIndex === realCount && i === 0))
                      ? 'bg-[#9ed04b] scale-125'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white flex items-center justify-center transition-colors z-10"
              aria-label="Previous slide"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white flex items-center justify-center transition-colors z-10"
              aria-label="Next slide"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BlogFeaturedSlideshow;
