import Link from 'next/link';

type ClosingCtaProps = {
  title: string;
  subtitle?: string;
  primary: {
    label: string;
    href: string;
  };
  secondary?: {
    label: string;
    href: string;
  };
};

export default function ClosingCta({ title, subtitle, primary, secondary }: ClosingCtaProps) {
  return (
    <section className="bg-white dark:bg-slate-950 py-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            {subtitle}
          </p>
        ) : null}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={primary.href}
            className="bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-2xl px-10 py-3 font-semibold shadow-2xl transition hover:scale-[1.02] inline-flex items-center justify-center"
          >
            {primary.label}
          </Link>

          {secondary ? (
            <Link
              href={secondary.href}
              className="rounded-2xl px-10 py-3 font-semibold shadow-xl transition hover:scale-[1.02] inline-flex items-center justify-center border border-slate-200 text-slate-900 bg-white hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

