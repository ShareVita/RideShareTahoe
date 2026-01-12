import { getSEOTags } from '@/libs/seo';
import LandingPage from '@/components/landing/LandingPage';
import { createClient } from '@/libs/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = getSEOTags({
  title: 'RideShareTahoe - Community Rides to the Mountains',
  description:
    'Connect with drivers and passengers for trips between the Bay Area and Lake Tahoe. Share costs, reduce emissions, and build community.',
  canonicalUrlRelative: '/',
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
