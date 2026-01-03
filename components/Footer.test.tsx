import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock LEGAL
jest.mock('@/lib/legal', () => ({
  __esModule: true,
  default: {
    getCurrentDisclosure: jest.fn().mockReturnValue('Mock Legal Disclosure'),
  },
}));

describe('Footer', () => {
  it('renders brand information', () => {
    render(<Footer />);
    expect(screen.getByText('RideShareTahoe')).toBeInTheDocument();
    expect(
      screen.getByText(/Connecting Bay Area drivers with Tahoe-bound riders/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/© 2025 RideShareTahoe. All rights reserved./i)).toBeInTheDocument();
  });

  it('renders quick links', () => {
    render(<Footer />);
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Community').closest('a')).toHaveAttribute('href', '/community');
    expect(screen.getByText('Find a Ride').closest('a')).toHaveAttribute('href', '/rides/find');
    expect(screen.getByText('Post a Ride').closest('a')).toHaveAttribute('href', '/rides/post');
    expect(screen.getByText('Messages').closest('a')).toHaveAttribute('href', '/messages');
  });

  it('renders legal links', () => {
    render(<Footer />);
    expect(screen.getByText('Terms of Service').closest('a')).toHaveAttribute('href', '/tos');
    expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute(
      'href',
      '/privacy-policy'
    );
    expect(screen.getByText('Community Guidelines').closest('a')).toHaveAttribute(
      'href',
      '/community-guidelines'
    );
    expect(screen.getByText('Safety Guidelines').closest('a')).toHaveAttribute('href', '/safety');
    expect(screen.getByText('Help & FAQ').closest('a')).toHaveAttribute('href', '/faq');
  });

  it('renders legal disclosure', () => {
    render(<Footer />);
    expect(screen.getByText('Mock Legal Disclosure')).toBeInTheDocument();
    expect(screen.getByText('Made with ❤️ for snow lovers')).toBeInTheDocument();
  });
});
