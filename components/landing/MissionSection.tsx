import Link from 'next/link';
import LEGAL from '@/lib/legal';

/**
 * States plainly what RideShareTahoe is and who runs it, directly under the hero.
 * Visitors (and grant reviewers) should not have to scroll to the footer to learn
 * this is a free nonprofit program.
 */
export default function MissionSection() {
  return (
    <section
      className="bg-slate-950 text-white px-6 py-16 border-t border-white/10"
      aria-labelledby="mission-heading"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10 items-start">
        <div className="md:col-span-2">
          <p className="text-sm font-medium tracking-widest uppercase text-sky-300">Our mission</p>
          <h2 id="mission-heading" className="mt-3 text-3xl font-black leading-tight">
            A free carpool board, run by a nonprofit, built by someone who needed a ride.
          </h2>
        </div>
        <div className="md:col-span-3 space-y-4 text-lg text-slate-200 leading-relaxed">
          <p>{LEGAL.programMission}</p>
          <p>
            It is a program of{' '}
            <a
              href={LEGAL.umbrellaWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-sky-300"
            >
              ShareVita
            </a>
            , a California 501(c)(3) nonprofit. {LEGAL.umbrellaMission} There is no fee, no ads and
            nothing for sale. Drivers and passengers split real trip costs between themselves, and
            the site is funded by ShareVita and donations.
          </p>
          <p>
            <Link href="/our-story" className="font-semibold underline underline-offset-4">
              Read who we are and how it started
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
