import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import DiscordLogo from './DiscordLogo';
import logoImage from '../images/Logo.png';

// Constants
const DISCORD_INVITE = "https://discord.gg/MqqbyJJbvC";

interface LayoutProps {
  children: ReactNode;
  showHero?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showHero = false }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Glassmorphic Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/70 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src={logoImage}
              alt="Logo"
              className="h-8 mr-3"
            />
          </Link>
          
          <nav>
            <ul className="flex items-center space-x-6">
              <li>
                <Link to="/" className="hover:text-[#9ed04b] transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-[#9ed04b] transition-colors">Blog</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#9ed04b] transition-colors">About</Link>
              </li>
              <li>
                <a
                  href={DISCORD_INVITE}
                  className="p-2 bg-[#9ed04b] text-gray-900 rounded hover:bg-[#9ed04b]/90 transition-colors flex items-center"
                >
                  <DiscordLogo color="black" size={20} className="mr-2" />
                  <span className="hidden md:inline">Join Discord</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Header spacing to prevent content from going under the fixed header */}
      <div className="h-14"></div>

      {/* Main content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img
                src={logoImage}
                alt="Logo"
                className="w-32 mb-4"
              />
              <p className="text-gray-400">Your trusted source for tech stock alerts and community support.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
                <li><Link to="/blog" className="text-gray-400 hover:text-white">Blog</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
                <li><a href={DISCORD_INVITE} className="text-gray-400 hover:text-white">Join Discord</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/terms-of-service" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a
                  href={DISCORD_INVITE}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#9ed04b] hover:text-gray-900 transition-colors"
                >
                  <DiscordLogo color="white" size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 