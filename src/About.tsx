import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DiscordLogo from './components/DiscordLogo';
import logoImage from './images/Logo.png';

function About() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Home
        </Link>

        <div className="max-w-3xl mx-auto">
          <img
            src={logoImage}
            alt="Ctrl, Alt, Stock"
            className="w-48 mb-8"
          />
          
          <div className="prose prose-invert">
            <p className="text-xl text-gray-300 mb-8">
              Ctrl, Alt, Stock was born from a simple idea: make it easier for tech enthusiasts
              to find and purchase the hardware they need, without falling prey to scalpers or
              missing restocks.
            </p>

            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-300 mb-8">
              We're committed to leveling the playing field in the tech market. By providing
              real-time stock alerts and building a community of enthusiasts, we help ensure
              that everyone has a fair chance at getting the latest technology at retail prices.
            </p>

            <h2 className="text-2xl font-semibold mb-4">How We Started</h2>
            <p className="text-gray-300 mb-8">
              During the height of the GPU shortage, our founders experienced firsthand the
              frustration of trying to purchase graphics cards at reasonable prices. What
              started as a small Discord channel for sharing restock information has grown
              into a thriving community of tech enthusiasts helping each other succeed.
            </p>

            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <ul className="list-disc list-inside text-gray-300 mb-8 space-y-2">
              <li>Monitor multiple retailers for stock updates</li>
              <li>Send real-time notifications when products become available</li>
              <li>Share insights about market trends and pricing</li>
              <li>Build a supportive community of tech enthusiasts</li>
              <li>Provide resources and guides for smart tech shopping</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">Community Values</h2>
            <p className="text-gray-300 mb-8">
              We believe in:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-8 space-y-2">
              <li>Fair access to technology</li>
              <li>Community support and knowledge sharing</li>
              <li>Transparent and honest communication</li>
              <li>Fighting against scalping and price gouging</li>
            </ul>

            <div className="bg-gray-800 p-8 rounded-lg mt-12">
              <h2 className="text-2xl font-semibold mb-4">Join Our Community</h2>
              <p className="text-gray-300 mb-6">
                Whether you're looking for a new GPU, gaming console, or other tech products,
                our community is here to help. Join thousands of others who have already found
                success through our alerts and community support.
              </p>
              <Link
                to="/"
                className="inline-flex items-center bg-[#9ed04b] hover:bg-[#9ed04b]/90 text-gray-900 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <span className="mr-2">Get Started</span>
                <DiscordLogo color="black" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;