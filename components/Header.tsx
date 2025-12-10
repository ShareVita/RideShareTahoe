'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from './ui/OptimizedImage';
import ButtonSignin from './ButtonSignin';
const logo = '/icon.png';
import config from '@/config';

const cta = <ButtonSignin extraStyle="btn-primary" />;

interface HeaderProps {
  transparent?: boolean;
}

/**
 * Public header component.
 * Displays the logo and a sign-in button.
 * Can be rendered with a transparent background for overlay effects.
 */
const Header = ({ transparent = false }: HeaderProps) => {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [searchParams]);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-colors duration-300 ${
        transparent
          ? 'bg-slate-900/10 backdrop-blur-[2px] border-b border-white/10'
          : 'bg-slate-950 text-white border-b border-white/10'
      }`}
    >
      <nav
        className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 mx-auto"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title={`${config.appName} homepage`}
          >
            <OptimizedImage
              src={logo}
              alt={`${config.appName} logo`}
              className="w-6 sm:w-8"
              priority={true}
              width={32}
              height={32}
            />
            <span className="font-extrabold text-base sm:text-lg text-white">{config.appName}</span>
          </Link>
        </div>

        {/* Burger button */}
        <div className="hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
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

        {/* CTA (desktop) */}
        <div className="flex justify-end flex-1">{cta}</div>
      </nav>

      {/* Mobile menu */}
      <div className={`relative z-50 ${isOpen ? '' : 'hidden'}`}>
        <div
          className={`fixed inset-y-0 right-0 z-10 w-full px-4 sm:px-6 lg:px-8 py-4 overflow-y-auto 
          bg-slate-950 sm:max-w-sm sm:ring-1 sm:ring-white/10 
          transform origin-right transition ease-in-out duration-300`}
        >
          {/* Logo (mobile) */}
          <div className="flex items-center justify-between">
            <Link
              className="flex items-center gap-2 shrink-0"
              title={`${config.appName} homepage`}
              href="/"
            >
              <OptimizedImage
                src={logo}
                alt={`${config.appName} logo`}
                className="w-6 sm:w-8"
                priority={true}
                width={32}
                height={32}
              />
              <span className="font-extrabold text-base sm:text-lg text-white">
                {config.appName}
              </span>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-white"
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

          {/* Links (mobile) */}
          <div className="flow-root mt-6">
            <div className="py-4">
              <div className="flex flex-col gap-y-2 items-start">
                {/* Mobile links would go here if we had any public ones */}
              </div>
            </div>
            <div className="divider"></div>
            <div className="flex flex-col">{cta}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
