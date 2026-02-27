import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import DiscordLogo from './DiscordLogo';

const DISCORD_INVITE = 'https://discord.gg/MqqbyJJbvC';
const MEMBER_COUNT = '10,000+';

const About: React.FC = () => {
  return (
    <div className="bg-gray-900 text-white">
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About CtrlAltStock</h1>
            <p className="text-xl text-gray-300 mb-8">
              A grassroots Discord community that helped people beat GPU scalpers and still tracks
              the best hardware deals today.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our story</h2>
              <p className="text-gray-300 mb-4">
                CtrlAltStock started as a small Discord server during the 2020–2022 GPU shortage,
                when finding a reasonably priced graphics card felt impossible. A handful of
                hardware nerds began sharing live stock links, retailer quirks, and ways to beat
                the bots.
              </p>
              <p className="text-gray-300 mb-4">
                Very quickly, the server turned into a 24/7 watchtower for GPUs, consoles, CPUs and
                other hard‑to‑find tech. Members pooled their knowledge, built bots and celebrated
                every time someone finally grabbed the card or console they&apos;d been chasing for
                months.
              </p>
              <p className="text-gray-300">
                Today the community has grown to over {MEMBER_COUNT} members. The GPU crisis has
                eased, but the DNA of the server hasn&apos;t changed: real people helping each
                other dodge scalper prices, spot genuine deals and make smarter hardware purchases.
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 relative overflow-hidden">
              <div className="absolute -inset-16 bg-lime-400/10 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm uppercase tracking-[0.2em] text-gray-400">
                      Community stats
                    </div>
                    <div className="text-3xl font-bold text-white mt-1">{MEMBER_COUNT}</div>
                  </div>
                  <DiscordLogo color="white" size={40} />
                </div>
                <div className="h-px bg-gray-700 my-4" />
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center">
                    <CheckCircle className="text-[#9ed04b] mr-2" size={18} />
                    Real‑time alerts for GPUs, consoles, CPUs, RAM, SSDs and more.
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="text-[#9ed04b] mr-2" size={18} />
                    Channels dedicated to stock alerts, builds, troubleshooting and deals.
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="text-[#9ed04b] mr-2" size={18} />
                    Members sharing screenshots the moment they secure cards and consoles.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we do now */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">What we do today</h2>
            <p className="text-xl text-gray-300 mb-8">
              CtrlAltStock still helps people get hardware at fair prices — now with a dedicated
              blog, improved bots and a cleaner way to surface the best deals.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-3">Stock &amp; deal alerts</h3>
              <p className="text-gray-400">
                Discord channels tuned for GPUs, consoles, CPUs, RAM, SSDs and more — updated as
                soon as stock or discounts appear.
              </p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-3">Hardware‑first blog</h3>
              <p className="text-gray-400">
                Deep‑dive posts on builds, buyer guides and real‑world experiences with the latest
                parts, all written for everyday PC builders.
              </p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-3">No‑scalper ethos</h3>
              <p className="text-gray-400">
                The community exists to help people avoid scalper prices — not to flip hardware.
                That principle still guides how we run the server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Join the CtrlAltStock Discord</h2>
            <p className="text-xl text-gray-300 mb-8">
              If you care about GPUs, consoles and PC hardware — and you don&apos;t want to pay
              scalper prices — this is your home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-lime-400 hover:bg-lime-500 text-gray-900 rounded-lg font-medium transition-colors"
              >
                <span className="mr-2">Join our Discord</span>
                <DiscordLogo color="black" size={20} className="inline" />
              </a>
              <Link
                to="/blog"
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
              >
                Read the blog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

