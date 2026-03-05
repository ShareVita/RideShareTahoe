'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';
import dynamic from 'next/dynamic';
import Badge from '@/components/ui/Badge';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUserProfile } from '@/hooks/useProfile';

const ThemeToggle = dynamic(
  () => import('@/components/ThemeToggle').then((mod) => mod.ThemeToggle),
  {
    ssr: false,
  }
);

const STATIC_ITEMS = [
  {
    href: '/community',
    label: 'Community',
  },
  {
    href: '/rides/post',
    label: 'Post a Ride',
  },
  {
    href: '/messages',
    label: 'Messages',
  },
  {
    href: '/vehicles',
    label: 'My Cars',
  },
  {
    href: '/profile',
    label: 'Profile',
  },
  {
    href: '/tahoe-transportation',
    label: 'Transit Guide',
  },
];

/**
 * Navigation bar for authenticated users.
 * Includes links to primary app sections, message notifications, and user menu.
 */
const LoggedInNav = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useUser();
  const { unreadCount, hasUnreadMessages } = useUnreadMessages();
  const { data: profile } = useUserProfile();

  const navigationItems = useMemo(() => {
    const items = [...STATIC_ITEMS];
    if (profile?.is_admin) {
      items.push({
        href: '/admin',
        label: 'Admin',
      });
    }
    return items;
  }, [profile?.is_admin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [searchParams]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      globalThis.location.href = '/';
    }
  };

  const isActive = (href: string) => {
    if (href === '/community') {
      return pathname === '/community' && !searchParams.get('view');
    }
    if (href === '/community?view=my-rides') {
      return pathname === '/community' && searchParams.get('view') === 'my-rides';
    }
    return pathname === href;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-slate-950 text-white border-b border-white/10">
      <nav
        className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 mx-auto"
        aria-label="Global"
      >
        {/* Logo - responsive sizing */}
        <div className="flex xl:flex-1">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title={`${config.appName} home`}
          >
            <Image
              src="/icon.png"
              alt={`${config.appName} logo`}
              className="w-6 sm:w-8"
              priority={true}
              width={32}
              height={32}
              unoptimized
            />
            <span className="font-extrabold text-base sm:text-lg text-white">{config.appName}</span>
          </Link>
        </div>

        {/* Burger button to open menu on small and medium screens */}
        <div className="flex xl:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-300 hover:text-white"
            onClick={() => setIsOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>

        {/* Navigation items on extra large screens */}
        <div className="hidden xl:flex xl:justify-center xl:gap-6 xl:items-center flex-1">
          {navigationItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={`px-2 py-2 rounded-lg transition-colors text-slate-300 hover:text-white text-sm whitespace-nowrap ${
                isActive(item.href) ? 'bg-white/10 text-white' : ''
              }`}
              title={item.label}
            >
              <span className="flex items-center gap-2">
                {item.label}
                {item.label === 'Messages' && hasUnreadMessages && (
                  <Badge
                    variant="red"
                    data-testid="messages-unread-badge"
                    className="px-1.5 py-0.5 text-[10px] leading-none min-w-5 justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </span>
            </Link>
          ))}
        </div>

        {/* Sign out button on extra large screens */}
        <div className="hidden xl:flex xl:justify-end xl:flex-1 xl:items-center xl:gap-4">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="btn btn-outline btn-sm text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white hover:border-slate-500"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? '' : 'hidden'}`}>
        <div
          className={`fixed inset-y-0 right-0 z-10 w-full px-4 sm:px-6 lg:px-8 py-4 overflow-y-auto bg-slate-950 sm:max-w-sm sm:ring-1 sm:ring-white/10 transform origin-right transition ease-in-out duration-300`}
        >
          {/* Logo on small screens */}
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-2 shrink-0"
              title={`${config.appName} home`}
              href="/"
            >
              <Image
                src="/icon.png"
                alt={`${config.appName} logo`}
                className="w-6 sm:w-8"
                priority={true}
                width={32}
                height={32}
                unoptimized
              />
              <span className="font-extrabold text-base sm:text-lg text-white">
                {config.appName}
              </span>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-slate-300 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation items on small screens */}
          <div className="flow-root mt-6">
            <div className="py-4">
              <div className="flex flex-col gap-y-4 items-start">
                {navigationItems.map((item) => (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={`w-full px-3 py-2 rounded-lg transition-colors text-slate-300 hover:text-white flex items-center justify-between ${
                      isActive(item.href) ? 'bg-white/10 text-white' : ''
                    }`}
                    title={item.label}
                  >
                    <span>{item.label}</span>
                    {item.label === 'Messages' && hasUnreadMessages && (
                      <Badge variant="red" className="ml-2" data-testid="messages-unread-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
            <div className="divider border-white/10"></div>
            {/* Sign out button on small screens */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
              <button
                onClick={handleSignOut}
                className="btn btn-outline btn-sm w-full text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white hover:border-slate-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LoggedInNav;
