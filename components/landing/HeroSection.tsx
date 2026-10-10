import Image from 'next/image';
import Link from 'next/link';

/**
 * Landing hero section for the homepage.
 */
export default function HeroSection() {
  return (
    <section className="relative flex items-center justify-center overflow-hidden pt-24 pb-16 sm:py-24">
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
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-surface-glass border border-border-glass backdrop-blur-md animate-appear-from-right shadow-lg">
            <p className="text-sm font-medium tracking-widest text-white uppercase font-display drop-shadow-sm">
              RideShareTahoe
            </p>
          </div>

          {/* SEO anchor headline (single H1 on homepage) */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight font-display text-white drop-shadow-lg">
            Carpool to <span className="text-sky-300">Lake Tahoe.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Share rides between the Bay Area, Sacramento, Reno and Tahoe. Split gas, skip the solo
            drive, and find your mountain crew.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/rides/find"
              className="w-full sm:w-auto bg-sky-300 text-slate-950 rounded-2xl px-10 py-3 font-semibold shadow-xl transition hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white inline-flex items-center justify-center"
            >
              Find a Ride
            </Link>

            <Link
              href="/rides/post"
              className="w-full sm:w-auto rounded-2xl px-10 py-3 font-semibold shadow-xl transition inline-flex items-center justify-center border border-white/40 text-white bg-white/10 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white backdrop-blur-md"
            >
              Post a Ride
            </Link>
          </div>

          <p className="text-sm text-slate-300/90 max-w-3xl mx-auto">
            Free to join and use. Community-run. A program of ShareVita, a California 501(c)(3)
            nonprofit.
          </p>
        </div>
      </div>
    </section>
  );
}
