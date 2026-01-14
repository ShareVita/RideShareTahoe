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
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
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
