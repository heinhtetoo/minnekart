import { CSSProperties } from 'react';

import styles from './PageSkeleton.module.css';

export type SkeletonVariant =
  'home' | 'gallery' | 'timeline' | 'trip' | 'profile' | 'form' | 'default';

interface PageSkeletonProps {
  variant?: SkeletonVariant;
}

export default function PageSkeleton({
  variant = 'default',
}: PageSkeletonProps) {
  return (
    <>
      <div className={styles.navStrip}>
        <Bar w={120} h={22} />
        <Bar w={180} h={22} />
        <Bar w={120} h={22} />
      </div>
      {renderVariant(variant)}
    </>
  );
}

function renderVariant(variant: SkeletonVariant) {
  if (variant === 'home') return <HomeSkeleton />;
  if (variant === 'gallery') return <GallerySkeleton />;
  if (variant === 'timeline') return <TimelineSkeleton />;
  if (variant === 'trip') return <TripSkeleton />;
  if (variant === 'profile') return <ProfileSkeleton />;
  if (variant === 'form') return <FormSkeleton />;
  return <DefaultSkeleton />;
}

function HomeSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.wide}>
        <Bar w={160} h={12} />
        <div className={styles.gap12} />
        <Bar w="55%" h={48} />
        <div className={styles.heroRow}>
          <Bar className={styles.globe} round />
          <div className={styles.pinsCol}>
            <Bar w={110} h={12} />
            <div className={styles.gap12} />
            {times(4, (i) => (
              <div key={i} className={styles.pinRow}>
                <Bar w={38} h={38} />
                <div className={styles.pinBody}>
                  <Bar w="55%" h={13} />
                  <div style={{ height: 6 }} />
                  <Bar w="80%" h={11} />
                </div>
                <Bar w={20} h={13} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.statsBand}>
        <div className={styles.statsInner}>
          {times(4, (i) => (
            <div key={i} className={styles.statCol}>
              <Bar w={64} h={34} />
              <Bar w={72} h={12} />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.wide}>
        <Bar w={260} h={30} />
        <div className={styles.cardGrid3}>
          {times(3, (i) => (
            <Card key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

function GallerySkeleton() {
  const heights = [220, 300, 180, 260, 200, 320, 240, 190, 280];
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.wide}>
        <Header />
        <div className={styles.chips}>
          {times(5, (i) => (
            <Bar key={i} w={72} h={30} />
          ))}
        </div>
        <div className={styles.masonry}>
          {heights.map((h, i) => (
            <div key={i} className={styles.masonryItem}>
              <Bar w="100%" h={h} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function TimelineSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.narrow}>
        <Header />
        <div className={styles.thread}>
          <div className={styles.line} />
          {times(5, (i) => (
            <div key={i} className={styles.entry}>
              <Bar w={14} h={14} round />
              <Bar w={130} h={104} />
              <div className={styles.entryBody}>
                <Bar w="35%" h={12} />
                <div style={{ height: 8 }} />
                <Bar w="60%" h={20} />
                <div style={{ height: 8 }} />
                <Bar w="45%" h={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function TripSkeleton() {
  return (
    <main className={styles.mainBleed} aria-busy="true" aria-label="Loading">
      <Bar className={styles.tripHero} w="100%" />
      <div className={styles.tripBody}>
        <div className={styles.bodyGrid}>
          <div>
            <Bar w="70%" h={24} />
            <div style={{ height: 20 }} />
            {times(5, (i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Bar w={i === 4 ? '60%' : '100%'} h={14} />
              </div>
            ))}
          </div>
          <Bar w="100%" h={280} />
        </div>
        <Bar w={180} h={22} />
        <div className={styles.cardGrid3}>
          {times(6, (i) => (
            <Bar key={i} w="100%" h={180} />
          ))}
        </div>
      </div>
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.profileGrid}>
        <div className={styles.portrait}>
          <Bar w={56} h={56} round />
          <Bar w={140} h={22} />
          <Bar w={180} h={13} />
        </div>
        <div>
          <Bar w={120} h={12} />
          <div className={styles.gap12} />
          <Bar w="80%" h={36} />
          <div style={{ height: 20 }} />
          {times(4, (i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <Bar w={i === 3 ? '55%' : '100%'} h={14} />
            </div>
          ))}
          <div className={styles.statsRow}>
            {times(3, (i) => (
              <div key={i}>
                <Bar w={54} h={30} />
                <div style={{ height: 8 }} />
                <Bar w={70} h={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function FormSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.form}>
        <Header />
        {times(5, (i) => (
          <div key={i} className={styles.fieldRow}>
            <Bar w={90} h={12} />
            <div style={{ height: 8 }} />
            <Bar w="100%" h={44} />
          </div>
        ))}
        <Bar w={140} h={44} />
      </div>
    </main>
  );
}

function DefaultSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.wide}>
        <Header />
        {times(4, (i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <Bar w={i === 3 ? '60%' : '100%'} h={16} />
          </div>
        ))}
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className={styles.header}>
      <Bar w={140} h={13} />
      <div className={styles.gap12} />
      <Bar w={280} h={38} />
    </div>
  );
}

function Card() {
  return (
    <div>
      <Bar w="100%" h={180} />
      <div className={styles.cardBody}>
        <Bar w="70%" h={20} />
        <div style={{ height: 10 }} />
        <Bar w="90%" h={13} />
      </div>
    </div>
  );
}

function Bar({
  w,
  h,
  round,
  className,
}: {
  w?: number | string;
  h?: number | string;
  round?: boolean;
  className?: string;
}) {
  const style: CSSProperties = { width: w, height: h };
  if (round) style.borderRadius = '50%';
  const classes = className ? `${styles.block} ${className}` : styles.block;
  return <div className={classes} style={style} />;
}

function times<T>(count: number, render: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => render(index));
}
