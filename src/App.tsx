import React, { useState, useEffect } from 'react';
import { Bell, Zap, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfiniteScroll } from './components/InfiniteScroll';
import BlogFeaturedSlideshow from './components/BlogFeaturedSlideshow';
import DiscordLogo from './components/DiscordLogo';
import TunnelAnimation from './components/TunnelAnimation';
import logoImage from './images/Logo.png';
import { getAllPosts } from './blog/utils/blogUtils';
import type { BlogPost } from './types';

// Placeholder data - to be replaced with real data
const DISCORD_INVITE = "https://discord.gg/MqqbyJJbvC";
const TWITTER_LINK = "https://x.com/ctrlaltstock";
const DISCORD_MEMBERS = "10,000+";

const TESTIMONIALS = [
  {
    username: "TechHunter",
    message: "Finally got my hands on a 4090 thanks to these alerts! You guys are lifesavers!",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=1"
  },
  {
    username: "GPUMaster",
    message: "Been trying for months to get a card. Got one within a week of joining!",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=2"
  },
  {
    username: "GamersUnite",
    message: "The alerts are lightning fast. Managed to grab both a PS5 and GPU!",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=3"
  }
];

const App: React.FC = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    getAllPosts().then((posts) => {
      const sorted = [...posts].sort(
        (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      );
      setBlogPosts(sorted);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative h-screen overflow-hidden">
        <div className="absolute inset-0">
          <TunnelAnimation />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-15% via-gray-900/50 via-65% to-gray-900 z-10"></div>
        </div>
        
        <div className="relative container mx-auto px-4 h-full flex items-center z-20">
          <div className="max-w-3xl">
            <img
              src={logoImage}
              alt="Ctrl, Alt, Stock"
              className="w-64 mb-8"
            />
            <h1 
              className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#9ed04b] to-[#9ed04b]/70"
              style={{ 
                animation: 'glow 3s ease-in-out infinite alternate',
              }}
            >
              Don't Pay Scalper Prices: 
              <br></br>Get Stock Alerts Now
            </h1>    
            <p 
              className="text-xl md:text-2xl text-gray-300 mb-8"
              style={{
                animation: 'subtleGlow 4s ease-in-out infinite alternate',
              }}
            >
              Outsmart the Bots. Get Real-Time Discord Alerts
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={DISCORD_INVITE}
                className="inline-flex items-center px-8 py-4 bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 rounded-lg text-lg font-semibold transition-all duration-300 hover:shadow-glow"
              >
                <DiscordLogo color="black" size={24} className="mr-2" />
                Join {DISCORD_MEMBERS} members
              </a>
              <a
                href={TWITTER_LINK}
                className="inline-flex items-center px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg font-semibold transition-colors"
              >
                <Twitter className="mr-2" />
                Follow us
              </a>
            </div>
          </div>
        </div>
      </div>

     {/* How It Works Section - Now with gray-900 background (was gray-800) */}
<section className="py-20 bg-gray-900">
  <div className="container mx-auto px-4">
    <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
    <div className="grid md:grid-cols-3 gap-12">
      <a href={DISCORD_INVITE} className="text-center group pointer-events-none">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#9ed04b] rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-circle pointer-events-auto">
          <DiscordLogo color="black" size={32} className="text-gray-900" />
        </div>
        <h3 className="text-2xl font-semibold mb-4">Join Discord</h3>
        <p className="text-gray-400">Join our active community of tech wizards and deal hunters</p>
      </a>
      <a href={DISCORD_INVITE} className="text-center group pointer-events-none">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#9ed04b] rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-circle pointer-events-auto">
          <Bell size={32} className="text-gray-900" />
        </div>
        <h3 className="text-2xl font-semibold mb-4">Configure Alerts</h3>
        <p className="text-gray-400">Set up your preferences for specific products and countries</p>
      </a>
      <a href={DISCORD_INVITE} className="text-center group pointer-events-none">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#9ed04b] rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-circle pointer-events-auto">
          <Zap size={32} className="text-gray-900" />
        </div>
        <h3 className="text-2xl font-semibold mb-4">Get Notified</h3>
        <p className="text-gray-400">Receive INSTANT alerts when your desired items are in stock</p>
      </a>
    </div>
  </div>
</section>


      {/* Now Tracking Section - Now with gray-800 background (was gray-900) */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Now Tracking</h2>
          <InfiniteScroll />
        </div>
      </section>

      {/* Success Stories Section - Now with gray-900 background (was gray-800) */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Community Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.username}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.username}</h4>
                    <div className="text-[#9ed04b] text-sm">Discord Member</div>
                  </div>
                </div>
                <p className="text-gray-400">{testimonial.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Preview Section - Slideshow matching blog homepage */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          {blogPosts.length > 0 ? (
            <BlogFeaturedSlideshow
              posts={blogPosts.slice(0, 8)}
              title="Latest from the Blog"
              showViewAll
            />
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>No blog posts yet. Check back soon!</p>
              <Link to="/blog" className="inline-block mt-4 text-[#9ed04b] hover:underline">Visit the blog</Link>
            </div>
          )}
        </div>
      </section>

      {/* Twitter Feed Section - Now with gray-900 background */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Latest Updates</h2>
          <div className="max-w-2xl mx-auto">
            <a 
              className="twitter-timeline" 
              data-theme="dark" 
              data-height="600" 
              href={TWITTER_LINK}
            >
              Tweets by CtrlAltStock
            </a>
          </div>
        </div>
      </section>

      {/* Footer - Now with gray-900 background (was gray-800) */}
      <footer className="bg-gray-900 pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img
                src={logoImage}
                alt="Ctrl, Alt, Stock"
                className="w-32 mb-4"
              />
              <p className="text-gray-400">Your trusted source for tech stock alerts and community support.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
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
                  <DiscordLogo color="white" size={20} className="group-hover:text-gray-900" />
                </a>
                <a
                  href={TWITTER_LINK}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#9ed04b] hover:text-gray-900 transition-colors"
                >
                  <Twitter size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400">
              © {new Date().getFullYear()} Ctrl, Alt, Stock. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Animation keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes glow {
            0% {
              text-shadow: 0 0 5px rgba(158, 208, 75, 0.3), 0 0 15px rgba(158, 208, 75, 0.2);
            }
            100% {
              text-shadow: 0 0 10px rgba(158, 208, 75, 0.5), 0 0 20px rgba(158, 208, 75, 0.4), 0 0 30px rgba(158, 208, 75, 0.3), 0 0 40px rgba(158, 208, 75, 0.2);
            }
          }
          
          @keyframes subtleGlow {
            0% {
              text-shadow: 0 0 2px rgba(255, 255, 255, 0.1);
            }
            100% {
              text-shadow: 0 0 8px rgba(255, 255, 255, 0.3), 0 0 12px rgba(158, 208, 75, 0.1);
            }
          }

          /* Custom shadow classes for glowing effects */
          .hover\\:shadow-glow:hover {
            box-shadow: 0 0 10px 3px rgba(158, 208, 75, 0.5), 0 0 20px 6px rgba(158, 208, 75, 0.3);
          }
          
          .group-hover\\:shadow-glow-circle {
            transition: box-shadow 0.3s ease;
          }
          
          .group:hover .group-hover\\:shadow-glow-circle {
            box-shadow: 0 0 15px 5px rgba(158, 208, 75, 0.6), 0 0 30px 10px rgba(158, 208, 75, 0.3);
          }
        `
      }} />
    </div>
  );
};

export default App;
