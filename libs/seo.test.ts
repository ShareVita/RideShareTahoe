import { getSEOTags } from './seo';

describe('social metadata', () => {
  it('uses an existing local image for default cards', () => {
    const metadata = getSEOTags();
    expect(metadata.openGraph).toMatchObject({ images: [{ url: '/hero-bg.png' }] });
    expect(metadata.twitter).toMatchObject({ images: ['/hero-bg.png'] });
  });

  it('honors an explicitly supplied card image on both platforms', () => {
    const metadata = getSEOTags({ openGraph: { image: '/custom-card.png' } });
    expect(metadata.openGraph).toMatchObject({ images: [{ url: '/custom-card.png' }] });
    expect(metadata.twitter).toMatchObject({ images: ['/custom-card.png'] });
  });
});
