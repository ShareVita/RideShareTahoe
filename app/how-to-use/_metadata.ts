import { Metadata } from 'next';

/**
 * Page metadata for the How-To Use guide.
 */
export const metadata: Metadata = {
  title: 'How to Use RideShareTahoe - Complete User Guide',
  description:
    'Learn how to use RideShareTahoe to connect with drivers and passengers for trips to Lake Tahoe. Complete guide covering profiles, ride posts, messaging, booking, and reviews.',
  keywords: [
    'RideShareTahoe',
    'rideshare',
    'carpool',
    'Lake Tahoe',
    'Bay Area',
    'ski trips',
    'travel',
    'community',
    'how to use',
    'user guide',
  ],
  authors: [{ name: 'RideShareTahoe Team' }],
  creator: 'RideShareTahoe',
  publisher: 'RideShareTahoe',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ridesharetahoe.com'),
  alternates: {
    canonical: '/how-to-use',
  },
  openGraph: {
    title: 'How to Use RideShareTahoe - Complete User Guide',
    description:
      'Learn how to use RideShareTahoe to connect with drivers and passengers for trips to Lake Tahoe. Complete guide covering profiles, ride posts, messaging, booking, and reviews.',
    url: '/how-to-use',
    siteName: 'RideShareTahoe',
    images: [
      {
        url: '/hero-bg.png',
        alt: 'How to Use RideShareTahoe - Complete User Guide',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Use RideShareTahoe - Complete User Guide',
    description:
      'Learn how to use RideShareTahoe to connect with drivers and passengers for trips to Lake Tahoe.',
    images: ['/hero-bg.png'],
    creator: '@ridesharetahoe',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};
