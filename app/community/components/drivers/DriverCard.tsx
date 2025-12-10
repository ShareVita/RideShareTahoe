import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProfileType } from '../../types';

interface DriverCardProps {
  driver: ProfileType;
}

/**
 * DriverCard component displays a single driver's profile information.
 * Abstracted from DriversTab.tsx.
 */
export const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Driver Header */}
      <div className="flex items-center space-x-4 mb-4">
        <Link href={`/profile/${driver.id}`} className="shrink-0">
          {driver.profile_photo_url ? (
            <Image
              src={driver.profile_photo_url}
              alt={driver.first_name || 'Driver'}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover hover:opacity-90 transition-opacity"
              unoptimized
            />
          ) : (
            <div className="w-16 h-16 bg-linear-to-br from-sky-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl font-bold hover:opacity-90 transition-opacity">
              {driver.first_name?.[0] || driver.last_name?.[0] || '?'}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${driver.id}`} className="hover:underline">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-50 truncate">
              {driver.first_name} {driver.last_name}
            </h3>
          </Link>
          <div className="h-5">
            {driver.city ? (
              <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                📍 {driver.city}
                {driver.state ? `, ${driver.state}` : ''}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">Location not specified</p>
            )}
          </div>
        </div>
      </div>

      {/* Car Details - Fixed Height Container */}
      <div className="h-[72px] mb-4">
        {driver.car_details && typeof driver.car_details === 'object' ? (
          <div className="h-full p-3 bg-blue-50 dark:bg-slate-800 rounded-lg flex flex-col justify-center">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300 truncate">
              🚗{' '}
              {(driver.car_details as { type?: string; color?: string; year?: number }).type ||
                'Vehicle'}
            </p>
            {(driver.car_details as { color?: string }).color && (
              <p className="text-xs text-blue-700 dark:text-blue-400 truncate">
                {(driver.car_details as { color?: string }).color}
                {(driver.car_details as { year?: number }).year &&
                  ` • ${(driver.car_details as { year?: number }).year}`}
              </p>
            )}
          </div>
        ) : (
          <div className="h-full p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center border border-dashed border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-400 dark:text-slate-500 italic">No vehicle details</p>
          </div>
        )}
      </div>

      {/* Bio - Fixed Height & Scrollable */}
      <div className="h-24 mb-4">
        <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
          {driver.bio ? (
            <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">
              {driver.bio}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-slate-500 italic">No bio provided.</p>
          )}
        </div>
      </div>

      {/* Social Links - Fixed Height Container */}
      <div className="h-10 mb-4 border-t border-gray-200 dark:border-slate-700 pt-4">
        <div className="flex space-x-2">
          {driver.facebook_url ||
          driver.instagram_url ||
          driver.linkedin_url ||
          driver.airbnb_url ? (
            <>
              {driver.facebook_url && (
                <a
                  href={driver.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label="Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {driver.instagram_url && (
                <a
                  href={driver.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {driver.linkedin_url && (
                <a
                  href={driver.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-500"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400 dark:text-slate-500 italic self-center">
              No social links
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex flex-col sm:flex-row gap-2">
        <Link
          href={`/profile/${driver.id}`}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
};
