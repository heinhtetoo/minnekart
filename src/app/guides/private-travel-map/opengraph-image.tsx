import { brandCard, OG_SIZE, renderOgCard } from '@/lib/og/card';

export const alt =
  'How to keep a private record of everywhere you have travelled';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOgCard(
    brandCard({
      eyebrow: 'Guide',
      title: 'Keep a private record of everywhere you have travelled',
      subtitle: 'A quiet, personal map of your places — no live tracking.',
    }),
  );
}
