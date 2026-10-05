'use client';

import { useState } from 'react';
import Link from 'next/link';
import LEGAL from '@/lib/legal';

const faqData = [
  // General Questions
  {
    id: 'what-is',
    question: 'What is RideShareTahoe?',
    answer:
      'RideShareTahoe is a community platform connecting drivers and passengers for trips between the Bay Area and Lake Tahoe. We help you save money on gas, reduce traffic, and meet new people.',
    category: 'general',
  },
  {
    id: 'who-runs',
    question: 'Who runs RideShareTahoe?',
    answer: LEGAL.faqDisclosure,
    category: 'general',
  },
  {
    id: 'how-works',
    question: 'How does RideShareTahoe work?',
    answer:
      'Drivers post their planned trips with available seats, and passengers request rides. You can also post a ride request if you are a passenger looking for a driver. Once connected, you can message each other to coordinate details.',
    category: 'general',
  },
  {
    id: 'is-free',
    question: 'Is RideShareTahoe free to use?',
    answer:
      'Yes, the platform is free to use. Drivers and passengers arrange cost-sharing (e.g., for gas) directly between themselves.',
    category: 'general',
  },
  {
    id: 'areas',
    question: 'What areas does RideShareTahoe serve?',
    answer:
      'Trips between Lake Tahoe and the San Francisco Bay Area, Sacramento and Reno. On the Tahoe side that means Truckee, North and South Lake Tahoe and every ski resort around the lake, including Palisades, Northstar, Heavenly, Kirkwood, Sugar Bowl and Mt. Rose.',
    category: 'general',
  },

  {
    id: 'browse-without-account',
    question: 'Can I browse rides without an account?',
    answer:
      'Yes. The Find a Ride page lists every upcoming ride post with the route, date, seats and cost share. You only need a free account to see full profiles and send a message, which keeps members from being contacted by anonymous visitors.',
    category: 'general',
  },
  {
    id: 'how-funded',
    question: 'How is RideShareTahoe funded? Is there a catch?',
    answer:
      'No catch. RideShareTahoe is 100% free and has no ads. It is funded by ShareVita, the 501(c)(3) nonprofit that runs it, and by donations. Drivers can only ask passengers to split real trip costs like gas, tolls and parking, never make a profit.',
    category: 'general',
  },

  // Safety & Privacy
  {
    id: 'safety',
    question: 'How do you ensure safety on the platform?',
    answer:
      'We prioritize safety through community verification (email/phone), secure messaging, and profile reviews. We encourage all users to verify their accounts and check reviews before traveling.',
    category: 'safety',
  },
  {
    id: 'privacy',
    question: 'How is my privacy protected?',
    answer:
      'We protect your privacy by only showing approximate locations (with a random offset) on the map. Your exact address is never shared publicly. Phone numbers and emails are kept private until you choose to share them.',
    category: 'safety',
  },
  {
    id: 'first-meeting',
    question: 'What should I do for my first ride?',
    answer:
      "Verify the driver's car and license plate before getting in. Share your trip details with a friend or family member. Trust your instincts and don't hesitate to cancel if you feel uncomfortable.",
    category: 'safety',
  },
  {
    id: 'wrong',
    question: 'What if something goes wrong?',
    answer:
      'If you encounter any issues, please contact us immediately. We have community guidelines and can help mediate disputes. For emergencies, always contact local authorities first.',
    category: 'safety',
  },

  // Technical & Account
  {
    id: 'create-account',
    question: 'How do I create an account?',
    answer:
      "Click 'Sign in' and use our magic link authentication. Simply enter your email address and we'll send you a secure login link. No password required!",
    category: 'technical',
  },
  {
    id: 'update-profile',
    question: 'How do I update my profile?',
    answer:
      "Go to your Profile section and click 'Edit Profile'. You can update your information, add photos, modify your location, and change your preferences at any time.",
    category: 'technical',
  },
  {
    id: 'messaging',
    question: 'How does the messaging system work?',
    answer:
      'Our built-in messaging system allows secure communication between users. You can send messages to coordinate pick-up times and locations. Messages are private and secure.',
    category: 'technical',
  },
  {
    id: 'delete-account',
    question: 'Can I delete my account?',
    answer:
      'Yes, you can delete your account at any time through your profile settings. This will remove all your data from our platform. Please note that this action cannot be undone.',
    category: 'technical',
  },

  // Community & Guidelines
  {
    id: 'guidelines',
    question: 'What are the community guidelines?',
    answer:
      'We promote kindness, respect, and safety. Be punctual, communicate clearly, and respect your fellow travelers. We have zero tolerance for harassment or unsafe behavior.',
    category: 'community',
  },
  {
    id: 'report',
    question: 'Can I report inappropriate behavior?',
    answer:
      'Yes, please report any concerning behavior immediately. We take all reports seriously and will investigate. You can report through our contact form or messaging system.',
    category: 'community',
  },
  {
    id: 'trust',
    question: 'How do I build trust in the community?',
    answer:
      'Be reliable, communicate clearly, and follow through on commitments. Good reviews and consistent behavior help build trust.',
    category: 'community',
  },
  {
    id: 'cancel',
    question: 'What if I need to cancel a trip?',
    answer:
      "Communicate as early as possible if you need to cancel. Be respectful of others' time and plans. Frequent cancellations may affect your community reputation.",
    category: 'community',
  },
];

const categories = [
  { id: 'all', name: 'All Questions', icon: '❓' },
  { id: 'general', name: 'General', icon: '🏠' },
  { id: 'safety', name: 'Safety & Privacy', icon: '🔒' },
  { id: 'drivers', name: 'For Drivers', icon: '🚗' },
  { id: 'passengers', name: 'For Passengers', icon: '👋' },
  { id: 'technical', name: 'Technical', icon: '⚙️' },
  { id: 'community', name: 'Community', icon: '🤝' },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const filteredFAQ =
    selectedCategory === 'all'
      ? faqData
      : faqData.filter((item) => {
          if (item.category === selectedCategory) return true;
          // Map drivers/passengers categories to general or community if specific ones don't exist in data yet
          // For now, we'll just show all relevant ones.
          return false;
        });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about RideShareTahoe and how to get the most out of our
              community
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4">
          {filteredFAQ.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">{item.question}</h3>
                <span className="text-blue-600 text-xl">
                  {openItems.includes(item.id) ? '−' : '+'}
                </span>
              </button>
              {openItems.includes(item.id) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 bg-white rounded-lg shadow-xs border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
          <p className="text-gray-600 mb-6">
            Can&apos;t find what you&apos;re looking for? Our community team is here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/community"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Join Community
            </Link>
            <Link
              href="/safety"
              className="border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Safety Guidelines
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Link
            href="/community"
            className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-semibold text-gray-900 mb-2">Browse Rides</h3>
            <p className="text-gray-600 text-sm">See upcoming trips in your area</p>
          </Link>
          <Link
            href="/rides/post"
            className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-semibold text-gray-900 mb-2">Post a Ride</h3>
            <p className="text-gray-600 text-sm">Offer a ride or request one</p>
          </Link>
          <Link
            href="/profile/edit"
            className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-900 mb-2">Update Profile</h3>
            <p className="text-gray-600 text-sm">
              Keep your profile current to find better matches
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
