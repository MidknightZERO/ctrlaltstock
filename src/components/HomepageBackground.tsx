import React from 'react';

import matrixBackground from '../images/Logo.png';

const HomepageBackground: React.FC = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.12]"
      aria-hidden="true"
    >
      <div className="w-full h-full bg-[radial-gradient(circle_at_top,_rgba(158,208,75,0.12)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.9)_0,_#020617_65%)]" />
    </div>
  );
};

export default HomepageBackground;

