import Link from 'next/link';
import LEGAL from '@/lib/legal';

/**
 * Footer component matching the RideShareTahoe design.
 * Contains links to legal pages, social links, and quick navigation.
 */
const Footer = () => {
  return (
    <footer className="bg-slate-950 text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Top section with three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Brand Information */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-4 text-white">RideShareTahoe</h3>
            <p className="text-sm mb-4 text-slate-400">
              Connecting Bay Area drivers with Tahoe-bound riders. Split costs, make friends, and
              reduce traffic.
            </p>
            <p className="text-sm text-slate-500">© 2025 RideShareTahoe. All rights reserved.</p>
          </div>

          {/* Middle Column - Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-4 text-white">Quick Links</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/community" className="text-slate-400 hover:text-white transition-colors">
                Community
              </Link>
              <Link
                href="/rides/find"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Find a Ride
              </Link>
              <Link
                href="/rides/post"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Post a Ride
              </Link>
              <Link href="/messages" className="text-slate-400 hover:text-white transition-colors">
                Messages
              </Link>
            </div>
          </div>

          {/* Right Column - Legal */}
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-4 text-white">Legal</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/tos" className="text-slate-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link
                href="/privacy-policy"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/community-guidelines"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Community Guidelines
              </Link>
              <Link href="/safety" className="text-slate-400 hover:text-white transition-colors">
                Safety Guidelines
              </Link>
              <Link href="/faq" className="text-slate-400 hover:text-white transition-colors">
                Help & FAQ
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom section with divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="text-center md:text-left">
              <p className="text-slate-400 mb-2">
                ridesharetahoe is a community platform. Users are responsible for their own safety and
                interactions.
              </p>
              <p className="text-xs text-slate-500">{LEGAL.getCurrentDisclosure()}</p>
            </div>
            <p className="text-slate-400">Made with ❤️ for snow lovers</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
