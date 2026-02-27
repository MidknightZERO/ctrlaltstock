import React from 'react';

/**
 * Subtle animated SVG background (abstract geometry - slow-moving grid).
 * CSS/SVG only, no heavy JS. Opacity ~0.04 so it does not distract.
 */
const HomepageBackground: React.FC = () => {
  const size = 60;
  const dots = [];
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 12; y++) {
      dots.push({ x: x * size + 10, y: y * size + 10, d: (x + y) % 5 });
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(158,208,75,0.08)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.9)_0,_#020617_65%)]" />
      {/* Slow-moving geometric grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.045]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ed04b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r="1.5"
            fill="url(#bgGrad)"
            style={{
              animation: `pulseDot 20s ease-in-out infinite`,
              animationDelay: `${dot.d * 4}s`,
            }}
          />
        ))}
      </svg>
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default HomepageBackground;
