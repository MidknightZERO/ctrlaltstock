import React, { useState } from 'react';

export interface BlogHeroProps {
  /** Hero/cover image URL */
  coverImage: string;
  /** Post title rendered as SVG overlay */
  title: string;
  /** Optional position hint for the title overlay (e.g. "top-left", "center") */
  titlePosition?: 'top-left' | 'center' | 'bottom-left';
  /** Optional CSS class for the wrapper */
  className?: string;
}

/**
 * Hero section with background image and SVG title overlay.
 * The title is rendered as vector text so it can be animated, recolored,
 * and scaled per viewport without baking into the image.
 */
const BlogHero: React.FC<BlogHeroProps> = ({
  coverImage,
  title,
  titlePosition = 'top-left',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const imgSrc = imgError ? '/Logo.png' : coverImage;

  const positionClasses: Record<string, string> = {
    'top-left': 'items-start justify-start text-left',
    center: 'items-center justify-center text-center',
    'bottom-left': 'items-end justify-start text-left',
  };
  const positionClass = positionClasses[titlePosition] || positionClasses['top-left'];

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg min-h-[200px] ${className}`}
      role="img"
      aria-label={title}
    >
      {/* Background image - use img for onError fallback */}
      <img
        src={imgSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setImgError(true)}
        aria-hidden
      />
      {/* Subtle gradient overlay for text legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70"
        aria-hidden
      />
      {/* SVG title overlay - scales with viewport, animatable, recolorable */}
      <div
        className={`absolute inset-0 flex p-6 md:p-8 lg:p-10 ${positionClass}`}
      >
        <svg
          className="h-auto w-full max-w-4xl"
          viewBox="0 0 800 120"
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
        >
          <text
            x={titlePosition === 'center' ? '400' : '0'}
            y="70"
            textAnchor={titlePosition === 'center' ? 'middle' : 'start'}
            className="fill-white font-bold"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '48px',
            }}
          >
            {title}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default BlogHero;
