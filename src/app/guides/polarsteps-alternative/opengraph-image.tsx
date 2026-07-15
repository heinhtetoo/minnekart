import { brandCard, OG_SIZE, renderOgCard } from '@/lib/og/card';

export const alt =
  'A Polarsteps alternative that does not track your live location';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOgCard(
    brandCard({
      eyebrow: 'Guide',
      title: 'A Polarsteps alternative that does not track your live location',
      subtitle: 'A private memory globe, not a live-location feed.',
    }),
  );
}
