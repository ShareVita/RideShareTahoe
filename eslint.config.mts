import js from '@eslint/js';
import globals from 'globals';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jestPlugin from 'eslint-plugin-jest';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Next 16.4 added `react-hooks/set-state-in-effect`. These files predate it
    // and load data with fetch-in-effect; they stay visible as warnings until
    // they move to React Query. Every other file keeps the rule as an error, so
    // new code cannot add the pattern.
    files: [
      'app/community/components/FindRidesTab.tsx',
      'app/community/components/drivers/DriversSection.tsx',
      'app/community/components/members/CommunityMembersList.tsx',
      'app/community/components/passengers/PassengersList.tsx',
      'app/community/components/passengers/PassengersSection.tsx',
      'app/community/hooks/useCommunityRides.ts',
      'app/messages/page.tsx',
      'app/onboarding/welcome/page.tsx',
      'app/profile/[[]id]/page.tsx',
      'app/profile/page.tsx',
      'components/AppLayout.tsx',
      'components/DeletionRequestStatus.tsx',
      'components/ProfilesList.tsx',
      'components/trips/MyTripsView.tsx',
      'components/vehicles/VehicleList.tsx',
      'contexts/BlockedUsersContext.tsx',
      'hooks/useHasActiveBooking.ts',
      'hooks/useIsBlocked.ts',
      'hooks/useRideDetail.ts',
      'hooks/useUnreadMessages.ts',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
  {
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.local'],
        projectService: {
          allowDefaultProject: [
            'eslint.config.mts',
            'next-sitemap.config.js',
            '.env.test.local',
            'jest.config.js',
          ],
        },
      },
    },
  },
  globalIgnores([
    '**/package-lock.json',
    '**/node_modules/**',
    '**/coverage/**',
    '**/.vercel/**',
    '**/.next/**',
    '**/*.d.ts',
    '**/.env.*',
    '**/.open-next/**',
    'supabase/functions/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['types/database.types.ts'],
    // Supabase generates mapped type placeholders named `_`.
    rules: { 'no-unused-vars': 'off' },
  },
  {
    files: ['**/*.json'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: { json: json as any },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    extends: ['markdown/recommended'],
  },
  {
    files: ['tests/**/*', '**/*.test.*'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]);
