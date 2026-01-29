import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PassengerActions } from './PassengerActions';
import type { RidePostType, ProfileType } from '@/app/community/types';

jest.mock('next/link', () => {
  const Link = ({
    children,
    href,
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );

  Link.displayName = 'NextLinkMock';
  return Link;
});

describe('PassengerActions', () => {
  const mockPost = {
    id: 'post-1',
    title: 'Need Ride',
    posting_type: 'passenger',
    poster_id: 'user-1',
    owner: { id: 'user-1', first_name: 'Jane', last_name: 'Smith' } as ProfileType,
    status: 'active',
  } as unknown as RidePostType;

  const mockOnMessage = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnInvite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Non-Owner Actions', () => {
    it('should show View Profile, Message, and Invite buttons', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      expect(screen.getByText('View Profile')).toBeInTheDocument();
      expect(screen.getByText('Message')).toBeInTheDocument();
      expect(screen.getByText('Invite')).toBeInTheDocument();
    });

    it('should link to correct profile page', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const profileLink = screen.getByText('View Profile').closest('a');
      expect(profileLink).toHaveAttribute('href', '/profile/user-1');
    });

    it('should call onMessage with owner and post', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      fireEvent.click(screen.getByText('Message'));
      expect(mockOnMessage).toHaveBeenCalledWith(mockPost.owner, mockPost);
    });

    it('should call onInvite when Invite clicked', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      fireEvent.click(screen.getByText('Invite'));
      expect(mockOnInvite).toHaveBeenCalledTimes(1);
    });
  });

  describe('Owner Actions', () => {
    it('should show Edit and Delete buttons for owners', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should link to edit page with correct post id', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const editLink = screen.getByText('Edit').closest('a');
      expect(editLink).toHaveAttribute('href', '/rides/edit/post-1');
    });

    it('should call onDelete with post id', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      fireEvent.click(screen.getByText('Delete'));
      expect(mockOnDelete).toHaveBeenCalledWith('post-1');
    });

    it('should not show Message and Invite for owners', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      expect(screen.queryByText('Message')).not.toBeInTheDocument();
      expect(screen.queryByText('Invite')).not.toBeInTheDocument();
    });
  });

  describe('Deleting State', () => {
    it('should show ... text when deleting', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          deleting={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('should disable Delete button when deleting', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          deleting={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      const deleteButton = screen.getByText('...').closest('button');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Missing Owner', () => {
    it('should not show non-owner actions when owner is null', () => {
      const postWithoutOwner = { ...mockPost, owner: null };
      render(
        <PassengerActions
          post={postWithoutOwner as unknown as RidePostType}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      expect(screen.queryByText('Message')).not.toBeInTheDocument();
      expect(screen.queryByText('Invite')).not.toBeInTheDocument();
    });

    it('should still show owner actions even if owner field is missing', () => {
      const postWithoutOwner = { ...mockPost, owner: null };
      render(
        <PassengerActions
          post={postWithoutOwner as unknown as RidePostType}
          isOwner={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA label for View Profile link', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const profileLink = screen.getByRole('link', { name: 'View profile of Jane Smith' });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('aria-label', 'View profile of Jane Smith');
    });

    it('should have ARIA label for Message button', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const messageButton = screen.getByText('Message');
      expect(messageButton).toHaveAttribute('aria-label', 'Send message to Jane');
      expect(messageButton).toHaveAttribute('type', 'button');
    });

    it('should have ARIA label for Invite button', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const inviteButton = screen.getByText('Invite');
      expect(inviteButton).toHaveAttribute('aria-label', 'Invite Jane to your ride');
      expect(inviteButton).toHaveAttribute('type', 'button');
    });

    it('should have ARIA label for Edit link', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const editLink = screen.getByRole('link', { name: 'Edit ride request: Need Ride' });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute('aria-label', 'Edit ride request: Need Ride');
    });

    it('should have ARIA label and aria-busy for Delete button', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          deleting={false}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete ride request: Need Ride');
      expect(deleteButton).toHaveAttribute('type', 'button');
      expect(deleteButton).toHaveAttribute('aria-busy', 'false');
    });

    it('should have aria-busy=true when deleting', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={true}
          deleting={true}
          onMessage={mockOnMessage}
          onDelete={mockOnDelete}
          onInvite={mockOnInvite}
        />
      );
      const deleteButton = screen.getByText('...');
      expect(deleteButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should have proper button types for all interactive elements', () => {
      render(
        <PassengerActions
          post={mockPost}
          isOwner={false}
          onMessage={mockOnMessage}
          onInvite={mockOnInvite}
        />
      );
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
