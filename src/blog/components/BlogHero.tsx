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

const BRAND_GREEN = '#9ed04b';

/**
 * Hero section with background image and SVG title overlay.
 * Title wraps to container via foreignObject; subtle glow and fade-in animation.
 * CAS logo in bottom-right with glow and animation.
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
      {/* Title overlay: SVG with foreignObject so text wraps to container; glow + fade-in */}
      <div
        className={`absolute inset-0 flex p-6 md:p-8 lg:p-10 ${positionClass}`}
      >
        <svg
          className="h-full w-full max-w-4xl animate-hero-title-fade"
          viewBox="0 0 800 200"
          preserveAspectRatio="xMidYMid meet"
        >
          <foreignObject
            x={0}
            y={0}
            width="100%"
            height="100%"
            className="overflow-visible"
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="h-full w-full flex flex-col justify-center"
              style={{
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                maxHeight: '100%',
              }}
            >
              <div
                className="text-white font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  filter: `drop-shadow(0 0 10px ${BRAND_GREEN}40) drop-shadow(0 2px 8px rgba(0,0,0,0.5))`,
                }}
              >
                {title}
              </div>
            </div>
          </foreignObject>
        </svg>
      </div>
      {/* CAS logo bottom-right with subtle glow and animation */}
      <div
        className="absolute bottom-4 right-4 flex items-center justify-center animate-hero-logo-fade"
        aria-hidden
      >
        <img
          src="/Logo.png"
          alt=""
          className="h-12 w-auto md:h-14 object-contain"
          style={{
            filter: 'drop-shadow(0 0 12px rgba(158, 208, 75, 0.4)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
          }}
        />
      </div>
      <style>{`
        @keyframes hero-title-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes hero-logo-fade {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-hero-title-fade {
          animation: hero-title-fade 0.4s ease-out forwards;
        }
        .animate-hero-logo-fade {
          animation: hero-logo-fade 0.5s ease-out 0.2s forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default BlogHero;
