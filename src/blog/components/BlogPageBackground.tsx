import React from 'react';

/**
 * Subtle animated SVG background for blog pages.
 * Uses brand color #9ed04b at very low opacity.
 */
const BlogPageBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="blog-grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#9ed04b"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="blog-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ed04b" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#9ed04b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#blog-grid)" />
        <rect width="100%" height="100%" fill="url(#blog-glow)" />
      </svg>
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#9ed04b] opacity-[0.02] blur-3xl animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-[#9ed04b] opacity-[0.015] blur-3xl animate-pulse"
        style={{ animationDuration: '10s', animationDelay: '2s' }}
      />
    </div>
  );
};

export default BlogPageBackground;
