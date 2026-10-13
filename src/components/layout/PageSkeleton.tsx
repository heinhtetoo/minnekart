import { CSSProperties } from 'react';

import styles from './PageSkeleton.module.css';

export type SkeletonVariant =
  | 'home'
  | 'publicGlobe'
  | 'gallery'
  | 'timeline'
  | 'trip'
  | 'tripForm'
  | 'profile'
  | 'admin'
  | 'settings'
  | 'pricing'
  | 'default';

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
  if (variant === 'publicGlobe') return <PublicGlobeSkeleton />;
  if (variant === 'gallery') return <GallerySkeleton />;
  if (variant === 'timeline') return <TimelineSkeleton />;
  if (variant === 'trip') return <TripSkeleton />;
  if (variant === 'profile') return <ProfileSkeleton />;
  if (variant === 'admin') return <AdminSkeleton />;
  if (variant === 'settings') return <SettingsSkeleton />;
  if (variant === 'tripForm') return <TripFormSkeleton />;
  if (variant === 'pricing') return <PricingSkeleton />;
  return <DefaultSkeleton />;
}

function HomeSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.homeHero}>
        <Bar w={190} h={12} />
        <div className={styles.gap12} />
        <Bar w="58%" h={72} />
        <div className={styles.homeRow}>
          <Bar className={styles.homeGlobe} round />
          <div className={styles.homeSheet}>
            <Bar w={110} h={12} />
            <div className={styles.gap12} />
            <Bar w="85%" h={22} />
            <div className={styles.homeSheetRule} />
            {times(5, (i) => (
              <div key={i} className={styles.pinRow}>
                <Bar w={22} h={14} />
                <Bar w={44} h={44} />
                <div className={styles.pinBody}>
                  <Bar w="55%" h={16} />
                  <div style={{ height: 6 }} />
                  <Bar w="75%" h={11} />
                </div>
                <Bar w={24} h={13} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.homeLedger}>
        {times(4, (i) => (
          <div key={i} className={styles.statCol}>
            <Bar w={64} h={58} />
            <Bar w={84} h={12} />
          </div>
        ))}
      </div>
      <div className={styles.homeCards}>
        {times(3, (i) => (
          <div key={i}>
            <Bar className={styles.homeCardPhoto} />
            <div style={{ height: 18 }} />
            <Bar w="40%" h={11} />
            <div style={{ height: 10 }} />
            <Bar w="65%" h={28} />
          </div>
        ))}
      </div>
    </main>
  );
}

// Someone's public globe (screen 10): the heading, the globe and the places
// sheet, laid out like the home's, without the stats and featured sections.
function PublicGlobeSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.homeHero}>
        <Bar w={170} h={12} />
        <div className={styles.gap12} />
        <Bar w="52%" h={72} />
        <div className={styles.homeRow}>
          <Bar className={styles.homeGlobe} round />
          <div className={styles.homeSheet}>
            <Bar w={110} h={12} />
            <div className={styles.homeSheetRule} />
            {times(3, (i) => (
              <div key={i} className={styles.pinRow}>
                <Bar w={44} h={44} />
                <div className={styles.pinBody}>
                  <Bar w="60%" h={18} />
                  <div style={{ height: 6 }} />
                  <Bar w="40%" h={11} />
                </div>
                <Bar w={60} h={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function GallerySkeleton() {
  // Photo shapes in the gallery's rows (landscape and portrait).
  const ratios = [
    1.5, 1.5, 0.71, 1.5, 1.5, 0.71, 1.5, 1.5, 0.71, 1.5, 1.5, 1.5,
  ];
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.wide}>
        <div className={styles.galleryHead}>
          <Bar w={150} h={12} />
          <div className={styles.gap12} />
          <Bar w={240} h={60} />
        </div>
        <div className={styles.chips}>
          {times(6, (i) => (
            <Bar key={i} w={i === 0 ? 50 : 96} h={38} className={styles.pill} />
          ))}
        </div>
        <div className={styles.photoRows}>
          {ratios.map((r, i) => (
            <div
              key={i}
              className={`${styles.block} ${styles.rowPhoto}`}
              style={{ '--r': r } as CSSProperties}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function TimelineSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.almanac}>
        <div className={styles.almanacHead}>
          <Bar w={150} h={12} />
          <div className={styles.gap12} />
          <Bar w="60%" h={60} />
        </div>
        {times(5, (i) => (
          <div key={i} className={styles.almanacRow}>
            {i % 2 === 0 ? <Bar w={90} h={44} /> : <span />}
            <div className={styles.entry}>
              <Bar w={150} h={112} />
              <div className={styles.entryBody}>
                <Bar w="35%" h={12} />
                <div style={{ height: 10 }} />
                <Bar w="55%" h={30} />
                <div style={{ height: 10 }} />
                <Bar w="70%" h={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function TripSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.tripHead}>
        <div>
          <Bar w={150} h={12} />
          <div style={{ height: 44 }} />
          <Bar w={190} h={12} />
          <div className={styles.gap12} />
          <Bar w="80%" h={72} />
          <div style={{ height: 22 }} />
          <Bar w="70%" h={20} />
        </div>
        <Bar className={styles.tripPlate} />
      </div>
      <div className={styles.tripLedger}>
        {times(3, (i) => (
          <div key={i} className={styles.tripLedgerCell}>
            <Bar w={i === 0 ? 90 : 140} h={i === 0 ? 40 : 14} />
          </div>
        ))}
      </div>
      <div className={styles.tripStory}>
        {times(5, (i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <Bar w={i === 4 ? '60%' : '100%'} h={16} />
          </div>
        ))}
      </div>
      <div className={styles.tripSheet}>
        {times(4, (i) => (
          <Bar key={i} className={styles.tripFrame} />
        ))}
      </div>
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.titlePage}>
        <Bar w={120} h={12} />
        <div className={styles.titlePrint}>
          <Bar w="100%" className={styles.titlePhoto} />
        </div>
        <Bar w={260} h={44} />
        <div className={styles.gap12} />
        <Bar w={200} h={16} />
        <div style={{ height: 44 }} />
        <Bar w="60%" h={36} />
        <div style={{ height: 20 }} />
        {times(3, (i) => (
          <div key={i} className={styles.titleLine}>
            <Bar w={i === 2 ? '55%' : '100%'} h={16} />
          </div>
        ))}
        <div className={styles.titleStats}>
          {times(4, (i) => (
            <div key={i} className={styles.titleStat}>
              <Bar w={48} h={44} />
              <Bar w={70} h={11} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function TripFormSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.journal}>
        <div>
          <Bar w={150} h={12} />
          <div style={{ height: 26 }} />
          <Bar w="80%" h={52} />
          <div style={{ height: 28 }} />
          <Bar className={styles.journalGlobe} round />
        </div>
        <div>
          {times(4, (i) => (
            <div key={i} className={styles.journalRow}>
              <Bar w={110} h={12} />
              <div style={{ height: 12 }} />
              <Bar w="100%" h={i === 3 ? 160 : 34} />
            </div>
          ))}
          <Bar w="100%" h={48} />
        </div>
      </div>
    </main>
  );
}

// Admin (Register): the heading, the note field and its button, then three
// ruled invite rows with their status column.
function AdminSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.admin}>
        <Bar w={150} h={12} />
        <div className={styles.gap12} />
        <Bar w={220} h={56} />
        <div className={styles.adminCreate}>
          <div className={styles.adminField}>
            <div>
              <Bar w={120} h={11} />
              <div style={{ height: 14 }} />
              <Bar w="100%" h={36} />
            </div>
            <Bar className={styles.adminButton} w={170} h={46} />
          </div>
          <div style={{ height: 16 }} />
          <Bar w="62%" h={13} />
        </div>
        <div className={styles.adminList}>
          {times(3, (i) => (
            <div key={i} className={styles.adminRow}>
              <div>
                <Bar w="55%" h={20} />
                <div style={{ height: 10 }} />
                <Bar w="75%" h={12} />
              </div>
              <Bar w={90} h={14} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// Pricing (Sheets): the heading block, then one paper sheet per plan with
// the middle one raised, as on the page.
function PricingSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.pricing}>
        <Bar w={120} h={12} />
        <div className={styles.pricingTitle}>
          <Bar w="min(560px, 100%)" h="clamp(92px, 12vw, 152px)" />
        </div>
        <div className={styles.pricingLead}>
          <Bar w="min(560px, 90%)" h={16} />
          <Bar w="min(430px, 70%)" h={16} />
        </div>
        <div className={styles.pricingPlans}>
          {times(3, (i) => (
            <div key={i} className={styles.pricingSheet}>
              <Bar w={80} h={11} />
              <div style={{ height: 20 }} />
              <Bar w={120} h={52} />
              <div style={{ height: 22 }} />
              <Bar w="90%" h={13} />
              <div className={styles.pricingRule} />
              <Bar w="85%" h={13} />
              <div className={styles.gap12} />
              <Bar w="70%" h={13} />
              <div className={styles.gap12} />
              <Bar w="78%" h={13} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// The content pages (screen 12: About, Guides, Terms, Privacy, Refunds):
// the heading block, the opening lines in the text column, then sections with
// their heading in the margin, as ContentPage lays them out.
function DefaultSkeleton() {
  const lines = (count: number) =>
    times(count, (i) => (
      <div key={i} className={styles.contentLine}>
        <Bar w={i === count - 1 ? '62%' : '100%'} h={15} />
      </div>
    ));
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.content}>
        <Bar w={110} h={12} />
        <Bar className={styles.contentTitle} />
        <div className={styles.contentIntro}>{lines(3)}</div>
        {times(2, (section) => (
          <div key={section} className={styles.contentSection}>
            <Bar w={170} h={24} />
            <div>{lines(5)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

// Settings (Journal): the header, then sections opened by a hairline and a
// heading, with underlined fields.
function SettingsSkeleton() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Loading">
      <div className={styles.settings}>
        <Bar w={150} h={12} />
        <div className={styles.gap12} />
        <Bar w={240} h={56} />
        {times(2, (section) => (
          <div key={section} className={styles.settingsSection}>
            <Bar w={section === 0 ? 200 : 300} h={32} />
            <div style={{ height: 10 }} />
            <Bar w="55%" h={14} />
            {section === 0 &&
              times(3, (i) => (
                <div key={i} className={styles.settingsField}>
                  <Bar w={90} h={11} />
                  <div style={{ height: 12 }} />
                  <Bar w={i === 0 ? '45%' : '70%'} h={i === 0 ? 30 : 22} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </main>
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
