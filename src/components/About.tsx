import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CheckCircle } from 'lucide-react';
import DiscordLogo from './DiscordLogo';

// Placeholder data
const DISCORD_INVITE = "https://discord.gg/MqqbyJJbvC";
const MEMBER_COUNT = "10,000+";
const FOUNDING_YEAR = 2021;

const About: React.FC = () => {
  return (
    <div className="bg-gray-900 text-white">
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About Ctrl Alt Stock</h1>
            <p className="text-xl text-gray-300 mb-8">
              A community-driven platform helping tech enthusiasts make smarter investment decisions.
            </p>
          </div>
        </div>
      </section>
      
      {/* Our Story Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-gray-300 mb-4">
                Founded in {FOUNDING_YEAR}, Ctrl Alt Stock began as a small Discord group of tech industry professionals who wanted to share insights about technology investments and market trends.
              </p>
              <p className="text-gray-300 mb-4">
                What started as casual conversations about promising tech stocks quickly evolved into a structured community with stock alerts, research discussions, and educational resources for both new and experienced investors.
              </p>
              <p className="text-gray-300">
                Today, we've grown to over {MEMBER_COUNT} members globally, united by a passion for technology and smart investing. Our community includes software engineers, financial analysts, industry experts, and tech enthusiasts from all walks of life.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-lime-400/20 rounded-lg blur-xl"></div>
              <div className="relative bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center mb-6">
                  <div className="text-4xl font-bold text-lime-400 mr-4">{MEMBER_COUNT}</div>
                  <div className="text-lg text-gray-300">Community members and growing daily</div>
                </div>
                <div className="h-px bg-gray-700 mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">24/7</div>
                    <div className="text-sm text-gray-400">Stock alerts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">500+</div>
                    <div className="text-sm text-gray-400">Tech companies tracked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">100+</div>
                    <div className="text-sm text-gray-400">Research reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">50+</div>
                    <div className="text-sm text-gray-400">Expert contributors</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Our Mission Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl text-gray-300 mb-8">
              To democratize access to high-quality tech investment insights and build a supportive community where both new and experienced investors can thrive.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-left mt-12">
              <div className="bg-gray-900 p-6 rounded-lg">
                <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Reliable Information</h3>
                <p className="text-gray-400">Provide timely, accurate, and well-researched information about tech stocks and market trends.</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg">
                <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Community Support</h3>
                <p className="text-gray-400">Foster an inclusive environment where investors can learn from each other and grow together.</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg">
                <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Education First</h3>
                <p className="text-gray-400">Empower members with the knowledge and tools to make informed investment decisions independently.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* What We Offer Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">What We Offer</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-lime-400 mr-2">
                  <CheckCircle size={20} />
                </span>
                Real-time Stock Alerts
              </h3>
              <p className="text-gray-300 mb-4">
                Get notified about significant movements in tech stocks, including price targets, breakouts, and earnings reports.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Pre-market and after-hours updates
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Technical analysis breakdowns
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Customizable notification preferences
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-lime-400 mr-2">
                  <CheckCircle size={20} />
                </span>
                Research & Analysis
              </h3>
              <p className="text-gray-300 mb-4">
                Access in-depth research on tech companies, industry trends, and market analysis from our team and community experts.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Quarterly earnings analysis
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Sector rotation strategies
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Long-term investment opportunities
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-lime-400 mr-2">
                  <CheckCircle size={20} />
                </span>
                Educational Resources
              </h3>
              <p className="text-gray-300 mb-4">
                Learn investing fundamentals and advanced techniques through our guides, webinars, and interactive discussions.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Beginner-friendly investing guides
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Weekly educational webinars
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Investment strategy frameworks
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-lime-400 mr-2">
                  <CheckCircle size={20} />
                </span>
                Community Engagement
              </h3>
              <p className="text-gray-300 mb-4">
                Connect with like-minded investors in our active Discord community for discussions, Q&A sessions, and collaborative learning.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Topic-specific discussion channels
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Live Q&A sessions with industry experts
                </div>
                <div className="flex items-center text-gray-400">
                  <ChevronRight size={16} className="text-lime-400 mr-2" />
                  Community challenges and events
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Team Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Team Member 1 */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 bg-gray-700">
                <img 
                  src="https://i.imgur.com/7PtWsNM.jpg" 
                  alt="Michael Chen"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1">Michael Chen</h3>
              <p className="text-lime-400 mb-3">Founder & Lead Analyst</p>
              <p className="text-gray-400 text-sm">
                Former tech industry analyst with 10+ years of experience in equity research and portfolio management.
              </p>
            </div>
            
            {/* Team Member 2 */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 bg-gray-700">
                <img 
                  src="https://i.imgur.com/FHgaHLO.jpg" 
                  alt="Sarah Johnson"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1">Sarah Johnson</h3>
              <p className="text-lime-400 mb-3">Community Director</p>
              <p className="text-gray-400 text-sm">
                Community building expert with a background in technology startups and online education platforms.
              </p>
            </div>
            
            {/* Team Member 3 */}
            <div className="text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 bg-gray-700">
                <img 
                  src="https://i.imgur.com/B8bFkYZ.jpg" 
                  alt="Alex Rivera"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1">Alex Rivera</h3>
              <p className="text-lime-400 mb-3">Technical Analyst</p>
              <p className="text-gray-400 text-sm">
                Software engineer and technical analyst specializing in AI and semiconductor companies.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Join Our Community Today</h2>
            <p className="text-xl text-gray-300 mb-8">
              Connect with {MEMBER_COUNT} tech investors and gain access to exclusive insights, alerts, and educational resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-lime-400 hover:bg-lime-500 text-gray-900 rounded-lg font-medium transition-colors"
              >
                <span className="mr-2">Join Our Discord</span>
                <DiscordLogo color="black" size={20} className="inline" />
              </a>
              <Link
                to="/blog"
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
              >
                Read Our Blog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About; 