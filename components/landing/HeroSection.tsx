import Image from 'next/image';
import Link from 'next/link';

/**
 * Landing hero section for the homepage.
 */
export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt="Winter view over Lake Tahoe mountains"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-slate-900/75" />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-brand-secondary/20 rounded-full blur-3xl animate-float [animation-delay:2s]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-surface-glass border border-border-glass backdrop-blur-md animate-appear-from-right shadow-lg">
            <p className="text-sm font-medium tracking-widest text-white uppercase font-display drop-shadow-sm">
              RideShareTahoe
            </p>
          </div>

          {/* SEO anchor headline (single H1 on homepage) */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight tracking-tight font-display text-white/95 drop-shadow-lg">
            Carpool to Lake Tahoe — Free to use, Community-Run
          </h1>

          {/* Brand vibe headline */}
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight font-display drop-shadow-xl">
            <span className="block text-white drop-shadow-lg pb-2">Share a Ride.</span>
            <span className="block text-sky-300 drop-shadow-lg pb-2">Start a Crew.</span>
            <span className="block text-emerald-300 drop-shadow-lg pb-2">Save the Mountains.</span>
          </h2>

          <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-md">
            Find or post rides between the Bay Area, Reno, and Tahoe. Split gas, cut traffic, and
            meet mountain friends — with carpools heading to Palisades, Northstar, Heavenly,
            Kirkwood, and more.
          </p>

          {/* CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/community"
              className="bg-white text-slate-950 rounded-2xl px-10 py-3 font-semibold shadow-2xl transition hover:scale-[1.02] inline-flex items-center justify-center"
            >
              Find a Ride
            </Link>

            <Link
              href="/rides/post"
              className="rounded-2xl px-10 py-3 font-semibold shadow-xl transition hover:scale-[1.02] inline-flex items-center justify-center border border-white/30 text-white bg-white/10 hover:bg-white/15 backdrop-blur-md"
            >
              Post a Ride
            </Link>
          </div>

          <p className="text-sm text-slate-300/90 max-w-3xl mx-auto">
            No ads. No algorithms. Just neighbors helping neighbors get to the mountains.
          </p>
        </div>
      </div>
    </section>
  );
}
