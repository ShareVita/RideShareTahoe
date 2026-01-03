import Link from 'next/link';
import type { ReactNode } from 'react';

interface InfoGridItem {
  /** Icon or emoji that visually represents the card. */
  readonly icon: ReactNode;
  /** Title of the card. */
  readonly title: string;
  /** Supporting description copy. */
  readonly description: string;
}

interface InfoGridSectionProps {
  /** Section title. */
  readonly title: string;
  /** Optional summary copy shown above the cards. */
  readonly description?: string;
  /** The cards rendered inside the grid. */
  readonly items: readonly InfoGridItem[];
  /** Optional CTA that lives below the grid. */
  readonly cta?: {
    readonly label: string;
    readonly href: string;
  };
  /** Tailwind background classes for the section wrapper. */
  readonly backgroundClass?: string;
  /** Optional text color helpers for the section wrapper. */
  readonly sectionTextClass?: string;
  /** Custom class applied to each card wrapper. */
  readonly cardClassName?: string;
  /** Optional class name for each item description. */
  readonly descriptionClassName?: string;
  /** Optional class name for the summary description. */
  readonly summaryClassName?: string;
  /** Optional class name for the CTA button/link. */
  readonly ctaClassName?: string;
}

/**
 * Renders a responsive grid of info cards with an optional CTA.
 * SEO/UX: CTA is a real link (crawlable, accessible) styled like your button.
 */
export default function InfoGridSection({
  title,
  description,
  items,
  cta,
  backgroundClass = 'transparent',
  sectionTextClass,
  cardClassName,
  descriptionClassName,
  summaryClassName,
  ctaClassName,
}: InfoGridSectionProps) {
  const sectionClass = `${backgroundClass} py-20 ${sectionTextClass ?? 'text-white'}`;
  const cardClass =
    cardClassName ??
    'bg-white/10 backdrop-blur-sm rounded-4xl shadow-xl border border-white/20 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-white';
  const descriptionClass = descriptionClassName ?? 'text-base text-slate-200 leading-relaxed';
  const summaryClass = summaryClassName ?? 'text-lg text-slate-200 max-w-3xl mx-auto';

  return (
    <section className={sectionClass}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold font-display tracking-tight">{title}</h2>
          {description ? <p className={summaryClass}>{description}</p> : null}
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <article key={`${item.title}-${item.description}`} className={cardClass}>
              <div className="mb-6 text-5xl filter drop-shadow-md text-center" aria-hidden>
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 font-display text-black dark:text-white text-center">
                {item.title}
              </h3>
              <p className={descriptionClass}>{item.description}</p>
            </article>
          ))}
        </div>

        {cta ? (
          <div className="text-center pt-4">
            <Link
              href={cta.href}
              className={
                ctaClassName ??
                'bg-slate-900 text-white rounded-2xl px-10 py-4 font-bold shadow-2xl transition hover:scale-[1.02] hover:shadow-slate-900/20 inline-flex items-center justify-center'
              }
            >
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
