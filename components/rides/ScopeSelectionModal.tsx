'use client';

import { Fragment, useState, ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { formatDateMedium } from '@/libs/dateTimeFormatters';
import type { RidePostType } from '@/app/community/types';

export type ScopeType = 'single' | 'future' | 'all';

export interface ScopeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ride: RidePostType;
  seriesRides: RidePostType[];
  // eslint-disable-next-line no-unused-vars
  onConfirm: (scope: ScopeType) => void;
  isLoading?: boolean;
  /** Modal variant - affects colors and text */
  variant: 'delete' | 'edit';
}

interface VariantConfig {
  icon: ReactNode;
  title: string;
  subtitle: string;
  selectedBorderColor: string;
  selectedBgColor: string;
  radioColor: string;
  infoBoxBg: string;
  infoBoxBorder: string;
  infoBoxText: string;
  confirmButtonBg: string;
  confirmButtonHover: string;
  confirmButtonRing: string;
  confirmText: string;
  loadingText: string;
  /* eslint-disable no-unused-vars */
  getInfoText: (
    scope: ScopeType,
    futureCount: number,
    totalCount: number,
    rideDate: string
  ) => ReactNode;
}

const variantConfigs: Record<'delete' | 'edit', VariantConfig> = {
  delete: {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6 text-red-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
    title: 'Delete recurring ride',
    subtitle: 'What would you like to delete?',
    selectedBorderColor: 'border-red-500',
    selectedBgColor: 'bg-red-50 dark:bg-red-900/20',
    radioColor: 'text-red-600 focus:ring-red-500',
    infoBoxBg: 'bg-amber-50 dark:bg-amber-900/20',
    infoBoxBorder: 'border-amber-200 dark:border-amber-800',
    infoBoxText: 'text-amber-800 dark:text-amber-200',
    confirmButtonBg: 'bg-red-600',
    confirmButtonHover: 'hover:bg-red-700',
    confirmButtonRing: 'focus:ring-red-500',
    confirmText: 'Delete',
    loadingText: 'Deleting...',
    getInfoText: (scope, futureCount, totalCount) => {
      if (scope === 'single') {
        return <>This will delete 1 ride. Any bookings for this date will be cancelled.</>;
      }
      if (scope === 'future') {
        return (
          <>
            This will delete {futureCount} ride{futureCount !== 1 ? 's' : ''}. Any bookings for
            these dates will be cancelled.
          </>
        );
      }
      return (
        <>This will delete all {totalCount} rides in this series. All bookings will be cancelled.</>
      );
    },
  },
  edit: {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6 text-blue-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    ),
    title: 'Edit recurring ride',
    subtitle: 'What would you like to change?',
    selectedBorderColor: 'border-blue-500',
    selectedBgColor: 'bg-blue-50 dark:bg-blue-900/20',
    radioColor: 'text-blue-600 focus:ring-blue-500',
    infoBoxBg: 'bg-blue-50 dark:bg-blue-900/20',
    infoBoxBorder: 'border-blue-200 dark:border-blue-800',
    infoBoxText: 'text-blue-800 dark:text-blue-200',
    confirmButtonBg: 'bg-blue-600',
    confirmButtonHover: 'hover:bg-blue-700',
    confirmButtonRing: 'focus:ring-blue-500',
    confirmText: 'Continue',
    loadingText: 'Loading...',
    getInfoText: (scope, futureCount, totalCount, rideDate) => {
      if (scope === 'single') {
        return <>You&apos;ll be able to change the time, date, and details for this ride only.</>;
      }
      if (scope === 'future') {
        return (
          <>
            Changes will apply to {futureCount} ride{futureCount !== 1 ? 's' : ''} from {rideDate}{' '}
            onwards.
          </>
        );
      }
      return (
        <>
          Changes will apply to all {totalCount} rides in this series. You can add or remove dates.
        </>
      );
    },
  },
};

/**
 * Unified modal for selecting scope when editing or deleting a ride that's part of a series.
 * Offers three options: this date only, this and all future dates, or entire series.
 */
export default function ScopeSelectionModal({
  isOpen,
  onClose,
  ride,
  seriesRides,
  onConfirm,
  isLoading = false,
  variant,
}: Readonly<ScopeSelectionModalProps>) {
  const [selectedScope, setSelectedScope] = useState<ScopeType>('single');
  const config = variantConfigs[variant];

  const rideDate = formatDateMedium(ride.departure_date);
  const totalCount = seriesRides.length;

  // Calculate future rides (including this one)
  const rideDateTime = new Date(ride.departure_date + 'T00:00:00');
  const futureRides = seriesRides.filter((r) => {
    const d = new Date(r.departure_date + 'T00:00:00');
    return d >= rideDateTime;
  });
  const futureCount = futureRides.length;

  const handleConfirm = () => {
    onConfirm(selectedScope);
  };

  const scopeOptions = [
    {
      value: 'single' as const,
      label: 'This date only',
      description: rideDate,
      count: 1,
    },
    {
      value: 'future' as const,
      label: 'This and all future dates',
      description: `Starting from ${rideDate}`,
      count: futureCount,
      disabled: futureCount <= 1,
    },
    {
      value: 'all' as const,
      label: 'Entire series',
      description: 'All scheduled rides',
      count: totalCount,
    },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">{config.icon}</div>
                  <div>
                    <DialogTitle
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      {config.title}
                    </DialogTitle>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {config.subtitle}
                    </p>
                  </div>
                </div>

                {/* Scope Options */}
                <div className="space-y-2 mb-6">
                  {scopeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        option.disabled
                          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-700'
                          : selectedScope === option.value
                            ? `${config.selectedBorderColor} ${config.selectedBgColor}`
                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        value={option.value}
                        checked={selectedScope === option.value}
                        onChange={() => setSelectedScope(option.value)}
                        disabled={option.disabled}
                        className={`mt-1 h-4 w-4 border-gray-300 ${config.radioColor}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {option.label}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {option.count} ride{option.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Info Box */}
                <div
                  className={`mb-6 p-3 ${config.infoBoxBg} border ${config.infoBoxBorder} rounded-lg`}
                >
                  <p className={`text-sm ${config.infoBoxText}`}>
                    {config.getInfoText(selectedScope, futureCount, totalCount, rideDate)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={`rounded-lg ${config.confirmButtonBg} px-4 py-2 text-sm font-medium text-white ${config.confirmButtonHover} focus:outline-none focus:ring-2 ${config.confirmButtonRing} focus:ring-offset-2 transition-colors disabled:opacity-50`}
                  >
                    {isLoading ? config.loadingText : config.confirmText}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
