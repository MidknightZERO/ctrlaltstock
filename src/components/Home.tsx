import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Zap, Twitter } from 'lucide-react';
import { InfiniteScroll } from './InfiniteScroll';
import { getAllPosts } from '../blog/utils/blogUtils';
import { BlogPost } from '../types';
import DiscordLogo from './DiscordLogo';

// Placeholder data
const DISCORD_INVITE = "https://discord.gg/MqqbyJJbvC";
const TWITTER_LINK = "https://x.com/ctrlaltstock";
const MEMBER_COUNT = 10000;

const Home: React.FC = () => {
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  
  // Initialize Twitter widgets if available
  useEffect(() => {
    // Load Twitter widgets if the script exists
    if (window.twttr?.widgets) {
      window.twttr.widgets.load();
    }
    
    // Fetch recent blog posts
    getAllPosts().then(posts => {
      const sorted = [...posts].sort(
        (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      );
      setRecentPosts(sorted.slice(0, 3));
    });
  }, []);
  
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section bg-gray-900 py-20 px-4 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Welcome to <span className="text-lime-400">Ctrl Alt Stock</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Your trusted community for tech stock alerts, market news, and investing strategies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-lime-400 hover:bg-lime-500 text-gray-900 rounded-lg font-medium transition-colors flex items-center justify-center hover:shadow-glow"
              >
                <span className="mr-2">Join our Discord</span>
                <DiscordLogo color="black" size={20} />
              </a>
              <Link
                to="/blog"
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center border border-gray-700"
              >
                Read our Blog
              </Link>
            </div>
          </div>
        </div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lime-400 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        </div>
      </section>
      
      {/* How it Works Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center group">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center group-hover:shadow-glow-circle">
                  <Bell size={32} className="text-lime-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Get Alerts</h3>
              <p className="text-gray-400">
                Receive real-time notifications when promising tech stocks show buying signals.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center group">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center group-hover:shadow-glow-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime-400">
                    <path d="M12 4V20"></path>
                    <path d="M5 12H19"></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Join Community</h3>
              <p className="text-gray-400">
                Connect with 10,000+ like-minded tech investors in our active Discord server.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center group">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center group-hover:shadow-glow-circle">
                  <Zap size={32} className="text-lime-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Grow Portfolio</h3>
              <p className="text-gray-400">
                Learn strategies and make informed decisions to build your tech investment portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Product Tracking Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-8">We Track the Latest Tech</h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
            Our community focuses on the most promising technology companies with strong growth potential.
          </p>
          
          <div className="mx-auto max-w-6xl overflow-hidden">
            <InfiniteScroll />
          </div>
        </div>
      </section>
      
      {/* Twitter Feed Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold text-white mb-6">Follow Us on X (Twitter)</h2>
              <p className="text-gray-400 mb-8">
                Get real-time market insights, tech stock alerts, and community highlights directly from our Twitter feed.
              </p>
              <a
                href={TWITTER_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a93df] text-white rounded-lg font-medium transition-colors w-fit"
              >
                <Twitter size={20} className="mr-2" />
                Follow @ctrlaltstock
              </a>
            </div>
            <div className="md:w-1/2 bg-gray-700 p-4 rounded-lg h-[500px] w-full max-w-md overflow-hidden">
              <a
                className="twitter-timeline"
                data-height="480"
                href="https://twitter.com/ctrlaltstock?ref_src=twsrc%5Etfw"
              >
                Tweets by @ctrlaltstock
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-16">What Our Community Says</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden mr-4">
                  <div className="w-full h-full bg-gradient-to-br from-lime-300 to-lime-500"></div>
                </div>
                <div>
                  <h4 className="font-medium text-white">Sarah K.</h4>
                  <p className="text-gray-400 text-sm">Tech Investor</p>
                </div>
              </div>
              <p className="text-gray-300">
                "The stock alerts have helped me make several profitable trades. The community is super supportive and knowledgeable."
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden mr-4">
                  <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-500"></div>
                </div>
                <div>
                  <h4 className="font-medium text-white">Michael T.</h4>
                  <p className="text-gray-400 text-sm">Software Developer</p>
                </div>
              </div>
              <p className="text-gray-300">
                "As someone in tech, I appreciate the industry insights. The Discord discussions have improved my investment strategy significantly."
              </p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden mr-4">
                  <div className="w-full h-full bg-gradient-to-br from-purple-300 to-purple-500"></div>
                </div>
                <div>
                  <h4 className="font-medium text-white">Alex R.</h4>
                  <p className="text-gray-400 text-sm">New Investor</p>
                </div>
              </div>
              <p className="text-gray-300">
                "I was intimidated by tech stocks before joining. Now I feel confident making investment decisions with the community's support."
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Recent Blog Posts Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-16">Recent Blog Posts</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {recentPosts.length > 0 ? (
              recentPosts.map(post => (
                <div key={post.id} className="bg-gray-900 rounded-lg overflow-hidden transition-transform hover:scale-105">
                  <img
                    src={post.coverImage || 'https://via.placeholder.com/400x200?text=Ctrl+Alt+Stock'}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el && el.src !== '/Logo.png') el.src = '/Logo.png';
                    }}
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      <Link to={`/blog/${post.slug}`} className="hover:text-lime-400 transition-colors">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-gray-400 mb-4">{post.excerpt}</p>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-lime-400 hover:text-lime-300 transition-colors inline-flex items-center"
                    >
                      Read More
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-400">Loading recent blog posts...</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-12">
            <Link
              to="/blog"
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors inline-block"
            >
              View All Posts
            </Link>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-lime-400 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Join Our Community?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Get access to tech stock alerts, expert insights, and connect with thousands of like-minded investors.
            </p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 bg-lime-400 hover:bg-lime-500 text-gray-900 rounded-lg font-medium transition-colors inline-block text-lg hover:shadow-glow"
            >
              Join Discord Community
              <DiscordLogo color="black" size={20} className="inline ml-2" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 