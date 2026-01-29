import React from 'react';
import { render, screen } from '@testing-library/react';
import { OwnerInfo } from './OwnerInfo';
import type { ProfileType } from '@/app/community/types';

// Mock Next.js components
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('OwnerInfo', () => {
  const mockOwnerWithPhoto: ProfileType = {
    id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    profile_photo_url: 'https://example.com/photo.jpg',
  } as ProfileType;

  const mockOwnerWithoutPhoto: ProfileType = {
    id: 'user-2',
    first_name: 'Jane',
    last_name: 'Smith',
    profile_photo_url: null,
  } as ProfileType;

  it('should display owner full name', () => {
    render(<OwnerInfo owner={mockOwnerWithPhoto} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should display profile photo when available', () => {
    render(<OwnerInfo owner={mockOwnerWithPhoto} />);
    const image = screen.getByAltText('John Doe');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('should display fallback avatar when photo is missing', () => {
    render(<OwnerInfo owner={mockOwnerWithoutPhoto} />);
    expect(screen.getByText('👤')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should link to owner profile page', () => {
    render(<OwnerInfo owner={mockOwnerWithPhoto} />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/profile/user-1');
    });
  });

  it('should handle owner with only first name', () => {
    const ownerWithOnlyFirstName = {
      ...mockOwnerWithPhoto,
      last_name: '',
    };
    render(<OwnerInfo owner={ownerWithOnlyFirstName as ProfileType} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should handle special characters in names', () => {
    const ownerWithSpecialChars = {
      ...mockOwnerWithPhoto,
      first_name: 'Jean-François',
      last_name: "O'Brien",
    };
    render(<OwnerInfo owner={ownerWithSpecialChars as ProfileType} />);
    expect(screen.getByText("Jean-François O'Brien")).toBeInTheDocument();
  });
});
