'use client';

import React, { FormEvent, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUpdateProfile, useUserConsents, type UpdatableProfileData } from '@/hooks/useProfile';
import { geocodeZipCode } from '@/libs/geocoding';
import { trackSignupConversion } from '@/libs/googleAds';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { safeNextPath, withNextPath } from '@/lib/authRedirect';

const PRONOUN_OPTIONS = [
  { value: 'he/him', label: 'He/Him' },
  { value: 'she/her', label: 'She/Her' },
  { value: 'they/them', label: 'They/Them' },
  { value: 'prefer not to answer', label: 'Prefer not to answer' },
];

const SOCIAL_FIELDS = [
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'instagram_url', label: 'Instagram' },
  { key: 'linkedin_url', label: 'LinkedIn' },
  { key: 'airbnb_url', label: 'Airbnb' },
];

interface ProfileFormState {
  first_name: string;
  last_name: string;
  profile_photo_url: string;

  pronouns: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  display_lat: number | null;
  display_lng: number | null;
  bio: string;

  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  airbnb_url: string;
}

interface ProfileFormProps {
  readonly initialData: Record<string, unknown>;
}

/**
 * Form component for editing user profile information.
 * Handles validation, geocoding, and submission to the API.
 */
export default function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const { data: consents } = useUserConsents();

  // Check if user has already agreed to all legal documents
  const hasExistingConsent = useMemo(() => {
    if (!consents) return false;
    const documentTypes = ['tos', 'privacy_policy', 'community_guidelines'];
    return documentTypes.every((type) => consents.some((c) => c.document_type === type));
  }, [consents]);

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Detect if this is a first-time profile creation
  const isFirstTimeUser = useMemo(
    () => !initialData.first_name || initialData.first_name === '',
    [initialData.first_name]
  );

  // Safely coerce incoming profile values to expected types
  const safeString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback;

  const [formState, setFormState] = useState<ProfileFormState>({
    first_name: safeString(initialData.first_name),
    last_name: safeString(initialData.last_name),
    profile_photo_url: safeString(initialData.profile_photo_url),

    pronouns: safeString(initialData.pronouns),
    street_address: safeString(initialData.street_address),
    city: safeString(initialData.city),
    state: safeString(initialData.state),
    zip_code: safeString(initialData.zip_code),

    display_lat: typeof initialData.display_lat === 'number' ? initialData.display_lat : null,
    display_lng: typeof initialData.display_lng === 'number' ? initialData.display_lng : null,
    bio: safeString(initialData.bio),

    facebook_url: safeString(initialData.facebook_url),
    instagram_url: safeString(initialData.instagram_url),
    linkedin_url: safeString(initialData.linkedin_url),
    airbnb_url: safeString(initialData.airbnb_url),
  });
  const currentZip = useRef(formState.zip_code);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    if (name === 'zip_code') {
      currentZip.current = value;
      setValidationStatus('idle');
      setValidationMessage('');
    }
    setFormState((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'zip_code' ? { city: '', state: '', display_lat: null, display_lng: null } : {}),
    }));
  };

  const handlePhotoUpload = (url: string) => {
    setFormState((prev) => ({
      ...prev,
      profile_photo_url: url,
    }));
  };

  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'validating' | 'success' | 'error'
  >('idle');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleValidateLocation = async () => {
    const zip = formState.zip_code.trim();
    if (!/^\d{5}$/.test(zip)) {
      setValidationStatus('error');
      setValidationMessage('Enter a 5-digit US ZIP code.');
      return null;
    }

    setValidationStatus('validating');
    setValidationMessage('Checking location...');

    const coords = await geocodeZipCode(zip);
    if (currentZip.current.trim() !== zip) return null;

    if (coords) {
      setFormState((prev) => ({
        ...prev,
        city: coords.city,
        state: coords.state,
        display_lat: coords.lat,
        display_lng: coords.lng,
      }));
      setValidationStatus('success');
      setValidationMessage(`Location found: ${coords.city}, ${coords.state}.`);
    } else {
      setFormState((prev) => ({
        ...prev,
        display_lat: null,
        display_lng: null,
      }));
      setValidationStatus('error');
      setValidationMessage('Could not find that ZIP code. Check it and try again.');
    }
    return coords;
  };

  const buildPayload = (): UpdatableProfileData => {
    const sanitized: UpdatableProfileData = {
      first_name: formState.first_name.trim() || null,
      last_name: formState.last_name.trim() || null,
      profile_photo_url: formState.profile_photo_url || null,

      pronouns: formState.pronouns || null,
      street_address: formState.street_address.trim() || null,
      city: formState.city.trim() || null,
      state: formState.state.trim() || null,
      zip_code: formState.zip_code.trim() || null,

      display_lat: formState.display_lat,
      display_lng: formState.display_lng,
      bio: formState.bio.trim() || null,

      facebook_url: formState.facebook_url.trim() || null,
      instagram_url: formState.instagram_url.trim() || null,
      linkedin_url: formState.linkedin_url.trim() || null,
      airbnb_url: formState.airbnb_url.trim() || null,
    };

    return sanitized;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setHasSubmitted(true);

    // Validation Rules
    if (!formState.first_name.trim() || !formState.last_name.trim()) {
      setSubmitError('First and Last Name are required.');
      return;
    }

    // Consent validation: required if user hasn't already agreed
    if (!hasExistingConsent && !agreedToTerms) {
      setSubmitError(
        'You must agree to the Terms of Service, Privacy Policy, and Community Guidelines.'
      );
      return;
    }

    if (!/^\d{5}$/.test(formState.zip_code.trim())) {
      setValidationStatus('error');
      setValidationMessage('Enter a 5-digit US ZIP code.');
      return;
    }
    let location = {
      lat: formState.display_lat,
      lng: formState.display_lng,
      city: formState.city,
      state: formState.state,
    };
    if (location.lat === null || location.lng === null || !location.city || !location.state) {
      const resolved = await handleValidateLocation();
      if (!resolved) return;
      location = resolved;
    }

    updateProfile.mutate(
      {
        profileData: {
          ...buildPayload(),
          city: location.city,
          state: location.state,
          display_lat: location.lat,
          display_lng: location.lng,
        },
        recordConsent: !hasExistingConsent && agreedToTerms,
      },
      {
        onSuccess: () => {
          const next = safeNextPath(new URLSearchParams(window.location.search).get('next'));
          if (isFirstTimeUser) {
            // A completed first profile is the sign-up conversion for Google Ads
            trackSignupConversion();
            // Redirect first-time users to onboarding welcome page
            router.push(withNextPath('/onboarding/welcome', next));
          } else {
            // Redirect existing users to community page
            router.push(next || '/community');
          }
        },
      }
    );
  };

  const getValidationMessageClass = () => {
    if (validationStatus === 'success') return 'text-green-600 dark:text-green-400';
    if (validationStatus === 'error') return 'text-red-600 dark:text-red-400';
    return 'text-gray-500';
  };

  const getInputClass = (value: string) => {
    const baseClass =
      'w-full rounded-xl border px-4 py-2 focus:outline-none dark:bg-slate-800 dark:text-white';
    if (hasSubmitted && !value.trim()) {
      return `${baseClass} border-red-500 focus:border-red-500 dark:border-red-500`;
    }
    return `${baseClass} border-gray-200 focus:border-blue-500 dark:border-slate-600 dark:focus:border-blue-400`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 p-6 shadow-xl shadow-blue-100/70 dark:shadow-slate-950/50"
    >
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50 mb-4">
          Profile Photo
        </h2>
        <PhotoUpload
          id="profile-photo-upload"
          initialPhotoUrl={formState.profile_photo_url}
          onPhotoUploaded={handlePhotoUpload}
          bucketName="profile-photos"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">
            First name
          </span>
          <input
            name="first_name"
            value={formState.first_name}
            onChange={handleInputChange}
            className={getInputClass(formState.first_name)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Last name</span>
          <input
            name="last_name"
            value={formState.last_name}
            onChange={handleInputChange}
            className={getInputClass(formState.last_name)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">
            Pronouns <span className="text-xs font-normal text-gray-500"> (optional)</span>
          </span>
          <select
            name="pronouns"
            value={formState.pronouns}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
          >
            <option value="" disabled>
              Select pronouns (optional)
            </option>
            {PRONOUN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">
            ZIP code (required)
          </span>
          <input
            name="zip_code"
            inputMode="numeric"
            autoComplete="postal-code"
            aria-describedby="zip-help zip-status"
            value={formState.zip_code}
            onChange={handleInputChange}
            className={getInputClass(formState.zip_code)}
          />
        </label>
        <div className="sm:col-span-2 text-sm text-gray-600 dark:text-gray-300">
          <p id="zip-help">
            We use your ZIP code to find nearby rides. Only your city and approximate location are
            shared — no street address needed.
          </p>
          {formState.city && formState.state && (
            <p className="mt-2">
              Location: {formState.city}, {formState.state}
            </p>
          )}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleValidateLocation}
          disabled={validationStatus === 'validating' || updateProfile.isPending}
          className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {validationStatus === 'validating' ? 'Checking...' : 'Check ZIP code'}
        </button>
        <div className="flex flex-col">
          {validationMessage && (
            <span
              id="zip-status"
              role="status"
              className={`text-sm ${getValidationMessageClass()}`}
            >
              {validationMessage}
            </span>
          )}
          {validationStatus === 'error' && (
            <a
              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
                formState.zip_code
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              Search on OpenStreetMap
            </a>
          )}
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">Bio</span>
        <textarea
          name="bio"
          value={formState.bio}
          onChange={handleInputChange}
          rows={4}
          className="w-full rounded-2xl border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white p-4 text-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
        />
      </label>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Social links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <label key={field.key} className="space-y-1">
              <span className="text-sm font-semibold text-gray-600 dark:text-slate-400">
                {field.label}
              </span>
              <input
                name={field.key}
                value={(formState[field.key as keyof ProfileFormState] as string) || ''}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white px-4 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Terms Agreement Checkbox */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <input
          type="checkbox"
          id="terms-agreement"
          checked={hasExistingConsent || agreedToTerms}
          disabled={hasExistingConsent}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
        />
        <label
          htmlFor="terms-agreement"
          className={`text-sm ${hasExistingConsent ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
        >
          I agree to the{' '}
          <a
            href="/tos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Terms of Service
          </a>
          ,{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Privacy Policy
          </a>
          , and{' '}
          <a
            href="/community-guidelines"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Community Guidelines
          </a>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {submitError && (
          <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={updateProfile.isPending || validationStatus === 'validating'}
          className="rounded-2xl bg-blue-600 dark:bg-blue-500 px-6 py-3 text-white transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-400 dark:disabled:bg-blue-800"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save profile'}
        </button>
        {updateProfile.error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {updateProfile.error.message}
          </p>
        )}
        {updateProfile.isSuccess && (
          <output className="text-sm text-green-700 dark:text-green-400">
            Profile saved successfully.
          </output>
        )}
      </div>
    </form>
  );
}
