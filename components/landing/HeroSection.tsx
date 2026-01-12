'use client';

import Image from 'next/image';

/**
 * Renders the landing hero with carousel and CTA controls for RideShareTahoe.
 */
export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt="Lake Tahoe Landscape"
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

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight font-display drop-shadow-xl">
            <span className="block text-white drop-shadow-lg pb-2">Share a Ride.</span>
            <span className="block text-sky-300 drop-shadow-lg pb-2">Start a Crew.</span>
            <span className="block text-emerald-300 drop-shadow-lg pb-2">Save the Mountains.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-md">
            Your community-driven carpool hub for cheaper trips, new friends, and fewer cars
            clogging the mountain.
          </p>
        </div>
      </div>
    </section>
  );
}
