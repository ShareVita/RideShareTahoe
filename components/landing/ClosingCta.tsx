'use client';

import type { MouseEventHandler } from 'react';

interface ClosingCtaProps {
  /** Title used for the final CTA block. */
  readonly title: string;
  /** Supporting copy shown below the title. */
  readonly subtitle: string;
  /** Primary action data. */
  readonly primary: {
    readonly label: string;
    readonly onClick: MouseEventHandler<HTMLButtonElement>;
  };
}

/**
 * Renders the closing CTA that encourages visitors to act.
 */
export default function ClosingCta({ title, subtitle, primary }: ClosingCtaProps) {
  return (
    <section className="bg-linear-to-br from-slate-50 via-sky-100 to-cyan-200 text-slate-950 py-20">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-4xl md:text-5xl font-bold">{title}</h2>
        <p className="text-lg text-slate-900/80">{subtitle}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="bg-slate-950 text-white rounded-2xl px-10 py-3 font-semibold shadow-2xl transition hover:scale-[1.02]"
            onClick={primary.onClick}
          >
            {primary.label}
          </button>
        </div>
      </div>
    </section>
  );
}
