import React from 'react';
import DiscordLogo from '../../components/DiscordLogo';

const DISCORD_INVITE = 'https://discord.gg/MqqbyJJbvC';

const ArticleDiscordCTA: React.FC = () => {
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-12 flex items-center justify-center gap-4 p-6 rounded-xl border border-[#9ed04b]/30 bg-gradient-to-r from-[#9ed04b]/10 to-[#9ed04b]/5 hover:border-[#9ed04b]/50 hover:shadow-[0_0_24px_rgba(158,208,75,0.15)] transition-all duration-300 group"
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#9ed04b]/20 flex items-center justify-center animate-discord-pulse">
        <DiscordLogo color="white" size={28} className="group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="text-left">
        <p className="text-lg font-semibold text-white group-hover:text-[#9ed04b] transition-colors">
          Join the CAS Discord
        </p>
        <p className="text-sm text-gray-400">
          Live stock alerts, community chat, and exclusive deals
        </p>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-[#9ed04b] group-hover:translate-x-1 transition-transform"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
      <style>{`
        @keyframes discord-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(158, 208, 75, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(158, 208, 75, 0); }
        }
        .animate-discord-pulse {
          animation: discord-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </a>
  );
};

export default ArticleDiscordCTA;
