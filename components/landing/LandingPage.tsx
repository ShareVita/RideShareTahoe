import HeroSection from '@/components/landing/HeroSection';
import InfoGridSection from '@/components/landing/InfoGridSection';
import StoriesSection from '@/components/landing/StoriesSection';
import ClosingCta from '@/components/landing/ClosingCta';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <HeroSection />

      <InfoGridSection
        title="Why RideShareTahoe?"
        description="We are more than just a carpool app. We are a community dedicated to making Tahoe accessible and sustainable."
        backgroundClass="bg-white"
        sectionTextClass="text-slate-900"
        cardClassName="bg-slate-50 border border-slate-200 rounded-4xl shadow-xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-slate-900"
        descriptionClassName="text-base text-slate-700 leading-relaxed"
        summaryClassName="text-lg text-slate-600 max-w-3xl mx-auto"
        items={[
          {
            icon: '🤝',
            title: 'Friendly Community',
            description: 'Join carpools, make friends, and build your Tahoe crew.',
          },
          {
            icon: '💰',
            title: 'Shared Costs',
            description: 'Gas isn’t cheap — but splitting it is.',
          },
          {
            icon: '🌱',
            title: 'Lighter Footprint',
            description:
              'Every shared ride means fewer cars, less traffic, and cleaner air for Tahoe.',
          },
        ]}
        cta={{
          label: 'Learn More',
          href: '/how-to-use',
        }}
      />

      <StoriesSection
        heading="Community Stories"
        stories={[
          {
            quote:
              'I moved to the Bay last year and didn’t know anyone who skied. My first RideShareTahoe trip turned into a crew.',
            author: 'Maya (Berkeley → Palisades)',
          },
          {
            quote:
              'I was tired of solo driving and paying to park. Sharing rides saved me money and I met two friends I now hike with in the summer.',
            author: 'Chris (Oakland → Northstar)',
          },
          {
            quote:
              "We wanted to ski more but don't have a car and the Sports Basement ski bus was pricey. This worked perfectly for us.",
            author: 'Jen & Leo (SF → Heavenly)',
          },
        ]}
        cta={{
          label: 'Our Story',
          href: '/our-story',
        }}
      />

      <ClosingCta
        title="Ready to hit the slopes?"
        subtitle="Find a ride, post a ride, and make Tahoe trips easier all season."
        primary={{
          label: 'Find a Ride',
          href: '/community',
        }}
        secondary={{
          label: 'Post a Ride',
          href: '/rides/post',
        }}
      />
    </main>
  );
}
