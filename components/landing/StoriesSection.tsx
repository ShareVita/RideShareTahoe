import Link from 'next/link';

interface StoryCard {
  /** Story quote text. */
  readonly quote: string;
  /** Story author name and role. */
  readonly author: string;
}

interface StoriesSectionProps {
  /** Heading for the stories block. */
  readonly heading: string;
  /** Stories to render. */
  readonly stories: readonly StoryCard[];
  /** CTA displayed below the grid. */
  readonly cta?: {
    readonly label: string;
    readonly href: string;
  };
}

/**
 * Renders a set of customer/community stories with a gradient background.
 * SEO/UX: CTA is a real link (crawlable, accessible) styled as a button.
 */
export default function StoriesSection({ heading, stories, cta }: StoriesSectionProps) {
  return (
    <section className="relative bg-slate-900 text-slate-50 py-24 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-brand-primary to-brand-secondary opacity-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4">
          <p className="text-sm uppercase tracking-[0.5em] text-brand-secondary font-bold">
            Community
          </p>
          <h2 className="text-4xl md:text-5xl font-bold font-display text-white">{heading}</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <article
              key={`${story.author}-${story.quote.substring(0, 10)}`}
              className="bg-slate-800/40 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md hover:-translate-y-2 transition-transform duration-300"
            >
              <p className="text-lg leading-relaxed text-slate-100 font-light italic relative z-10">
                &ldquo;{story.quote}&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold text-sm">
                  {story.author.charAt(0)}
                </div>
                <p className="text-sm uppercase tracking-widest text-slate-300 font-medium">
                  {story.author}
                </p>
              </div>
            </article>
          ))}
        </div>

        {cta ? (
          <div className="text-center">
            <Link
              href={cta.href}
              className="mt-8 bg-amber-400 text-slate-900 rounded-2xl px-10 py-4 font-bold shadow-2xl transition hover:scale-[1.02] hover:bg-amber-300 hover:shadow-amber-400/20 inline-flex items-center justify-center"
            >
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
