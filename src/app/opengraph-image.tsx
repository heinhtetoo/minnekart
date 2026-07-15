import { brandCard, OG_SIZE, renderOgCard } from '@/lib/og/card';

export const alt = 'Minnekart — a private globe of your travel memories';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOgCard(
    brandCard({
      title: 'Your journeys, mapped.',
      subtitle:
        'A private globe of everywhere you have been — no trackers, no live ' +
        'location, just your places kept close.',
    }),
  );
}
