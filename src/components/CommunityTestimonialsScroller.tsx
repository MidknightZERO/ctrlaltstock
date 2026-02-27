import React from 'react';
import { communityTestimonials } from '../data/communityTestimonials';

const DUPLICATED = [...communityTestimonials, ...communityTestimonials];

const TestimonialCard: React.FC<{
  quote: string;
  username: string;
  sourceUrl: string;
  platform?: string;
}> = ({ quote, username, sourceUrl, platform }) => (
  <div className="flex-shrink-0 w-[300px] max-w-[320px] bg-gray-800 rounded-lg p-5 border border-gray-700/60">
    <p className="text-gray-300 text-sm mb-4 line-clamp-4">&ldquo;{quote}&rdquo;</p>
    <div className="flex items-center justify-between">
      <span className="font-semibold text-white text-sm">{username}</span>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#9ed04b] hover:text-[#9ed04b]/90 text-xs font-medium"
      >
        Source
      </a>
    </div>
    {platform && (
      <p className="text-gray-500 text-xs mt-1">{platform}</p>
    )}
  </div>
);

export const CommunityTestimonialsScroller: React.FC = () => {
  return (
    <div className="space-y-6 overflow-hidden">
      {/* Row 1: scroll left */}
      <div className="overflow-hidden">
        <div
          className="flex gap-6 animate-scroll-left"
          style={{ width: 'max-content' }}
        >
          {DUPLICATED.map((t, i) => (
            <TestimonialCard
              key={`left-${i}`}
              quote={t.quote}
              username={t.username}
              sourceUrl={t.sourceUrl}
              platform={t.platform}
            />
          ))}
        </div>
      </div>
      {/* Row 2: scroll right */}
      <div className="overflow-hidden">
        <div
          className="flex gap-6 animate-scroll-right"
          style={{ width: 'max-content' }}
        >
          {DUPLICATED.map((t, i) => (
            <TestimonialCard
              key={`right-${i}`}
              quote={t.quote}
              username={t.username}
              sourceUrl={t.sourceUrl}
              platform={t.platform}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-scroll-left {
          animation: scrollLeft 45s linear infinite;
        }
        .animate-scroll-right {
          animation: scrollRight 45s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CommunityTestimonialsScroller;
