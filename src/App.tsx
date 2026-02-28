import React, { useEffect, useState } from 'react';
import { Bell, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { InfiniteScroll } from './components/InfiniteScroll';
import BlogFeaturedSlideshow from './components/BlogFeaturedSlideshow';
import CommunityTestimonialsScroller from './components/CommunityTestimonialsScroller';
import DiscordLogo from './components/DiscordLogo';
import TunnelAnimation from './components/TunnelAnimation';
import HomepageBackground from './components/HomepageBackground';
import logoImage from './images/Logo.png';
import { getAllPosts } from './blog/utils/blogUtils';
import type { BlogPost } from './types';

const DISCORD_INVITE = 'https://discord.gg/MqqbyJJbvC';
const DISCORD_MEMBERS = '10,000+';

const App: React.FC = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    getAllPosts().then((posts) => {
      const sorted = [...posts].sort(
        (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
      );
      setBlogPosts(sorted);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      <HomepageBackground />

      {/* Hero Section */}
      <div className="relative h-screen overflow-hidden">
        <div className="absolute inset-0">
          <TunnelAnimation />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-15% via-gray-900/50 via-65% to-gray-900 z-10" />
        </div>

        <div className="relative container mx-auto px-4 h-full flex items-center z-20">
          <div className="max-w-3xl">
            <img src={logoImage} alt="Ctrl, Alt, Stock" className="w-64 mb-8" />
            <h1
              className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#9ed04b] to-[#9ed04b]/70"
              style={{
                animation: 'glow 3s ease-in-out infinite alternate',
              }}
            >
              Don&apos;t Pay Scalper Prices:
              <br />
              Get Stock Alerts Now
            </h1>
            <p
              className="text-xl md:text-2xl text-gray-300 mb-8"
              style={{
                animation: 'subtleGlow 4s ease-in-out infinite alternate',
              }}
            >
              Outsmart the bots. Get real-time Discord alerts for the hardware you actually want.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={DISCORD_INVITE}
                className="inline-flex items-center px-8 py-4 bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 rounded-lg text-lg font-semibold transition-all duration-300 hover:shadow-glow"
              >
                <DiscordLogo color="black" size={24} className="mr-2" />
                Join {DISCORD_MEMBERS} members
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <a href={DISCORD_INVITE} className="text-center group pointer-events-none">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#9ed04b] rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-circle pointer-events-auto">
                <DiscordLogo color="black" size={32} className="text-gray-900" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Join Discord</h3>
              <p className="text-gray-400">
                Join our active community of tech wizards and deal hunters.
              </p>
            </a>
            <a href={DISCORD_INVITE} className="text-center group pointer-events-none">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#9ed04b] rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-circle pointer-events-auto">
                <Bell size={32} className="text-gray-900" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Configure Alerts</h3>
              <p className="text-gray-400">
                Set up your preferences for specific products, price ranges, and regions.
              </p>
            </a>
            <a href={DISCORD_INVITE} className="text-center group pointer-events-none">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#9ed04b] rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-circle pointer-events-auto">
                <Zap size={32} className="text-gray-900" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Get Notified</h3>
              <p className="text-gray-400">
                Receive instant alerts the moment your tracked hardware comes back in stock.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Latest hardware news - most recent blog post */}
      <section className="py-16 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Latest hardware news
          </h2>
          <p className="text-center text-gray-400 mb-10">
            The freshest story from the CtrlAltStock blog, covering what matters right now in PC
            hardware.
          </p>
          {blogPosts.length > 0 ? (
            <div className="max-w-4xl mx-auto bg-gray-800/80 border border-gray-700/60 rounded-2xl overflow-hidden shadow-xl flex flex-col md:flex-row">
              {blogPosts[0].coverImage && (
                <div className="md:w-1/3">
                  <img
                    src={blogPosts[0].coverImage}
                    alt={blogPosts[0].title}
                    className="w-full h-56 md:h-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el && el.src !== '/Logo.png') el.src = '/Logo.png';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.2em] text-[#9ed04b]/80 mb-2">
                  Most recent post
                </p>
                <h3 className="text-2xl md:text-3xl font-semibold mb-4">{blogPosts[0].title}</h3>
                <p className="text-gray-300 mb-6">
                  {blogPosts[0].excerpt ||
                    `${blogPosts[0].content.slice(0, 150)}${
                      blogPosts[0].content.length > 150 ? '…' : ''
                    }`}
                </p>
                <Link
                  to={`/blog/${blogPosts[0].slug}`}
                  className="inline-flex items-center px-5 py-3 bg-[#9ed04b] text-gray-900 rounded-lg font-semibold hover:bg-[#9ed04b]/90 transition-colors"
                >
                  Read more
                  <span className="ml-2">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              No posts yet.{' '}
              <Link to="/blog" className="text-[#9ed04b] hover:underline">
                Visit the blog
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Now Tracking Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Now Tracking</h2>
          <InfiniteScroll />
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Community Success Stories</h2>
          <CommunityTestimonialsScroller />
        </div>
      </section>

      {/* Blog Preview Section */}
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
              <Link
                to="/blog"
                className="inline-block mt-4 text-[#9ed04b] hover:underline"
              >
                Visit the blog
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={logoImage} alt="Ctrl, Alt, Stock" className="w-32 mb-4" />
              <p className="text-gray-400">
                Your trusted source for tech stock alerts and community support.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="text-gray-400 hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <a href={DISCORD_INVITE} className="text-gray-400 hover:text-white">
                    Join Discord
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/terms-of-service" className="text-gray-400 hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="text-gray-400 hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
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
      <style
        // We only use keyframes; no Web Share or other browser APIs are auto-invoked.
        dangerouslySetInnerHTML={{
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

          .hover\\:shadow-glow:hover {
            box-shadow: 0 0 10px 3px rgba(158, 208, 75, 0.5), 0 0 20px 6px rgba(158, 208, 75, 0.3);
          }

          .group-hover\\:shadow-glow-circle {
            transition: box-shadow 0.3s ease;
          }

          .group:hover .group-hover\\:shadow-glow-circle {
            box-shadow: 0 0 15px 5px rgba(158, 208, 75, 0.6), 0 0 30px 10px rgba(158, 208, 75, 0.3);
          }
        `,
        }}
      />
    </div>
  );
};

export default App;

