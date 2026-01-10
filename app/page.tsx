import { getSEOTags } from '@/libs/seo';
import LandingPage from '@/components/landing/LandingPage';
import { createClient } from '@/libs/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = getSEOTags({
  title: 'Carpool to Tahoe | RideShareTahoe',
  description:
    'Find or post a carpool to, from, or around Lake Tahoe. RideShareTahoe connects Bay Area riders headed to Palisades, Northstar, Heavenly, Kirkwood & more—share gas, cut traffic, and meet mountain friends.',
  canonicalUrlRelative: '/',
  openGraph: {
    title: 'Carpool to Tahoe | RideShareTahoe',
    description:
      'Community-run carpools to and from Tahoe—save money, reduce traffic, and meet mountain friends.',
    image: '/og/home.jpg',
  },
});

/**
 * The landing page of the application.
 * Checks for an authenticated user session.
 * - If authenticated, redirects to /community.
 * - If not, renders the LandingPage component.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/community');
  }

  return <LandingPage />;
}
