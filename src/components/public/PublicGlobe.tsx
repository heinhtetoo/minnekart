'use client';

import { useState } from 'react';

import Globe, { GlobePin } from '@/components/globe/Globe';
import homeStyles from '@/components/home/Home.module.css';
import PeekPanel from '@/components/home/PeekPanel';
import { formatTripDates } from '@/components/home/format';
import { TripDTO } from '@/lib/trips/dto';

interface PublicGlobeProps {
  ownerName: string;
  username: string;
  trips: TripDTO[];
}

export default function PublicGlobe({
  ownerName,
  username,
  trips,
}: PublicGlobeProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const trip = selected === null ? null : trips[selected];

  const pins: GlobePin[] = trips.map((item, index) => ({
    id: String(index),
    lng: item.lng,
    lat: item.lat,
    placeName: item.placeName,
  }));

  return (
    <main className="fade" style={{ isolation: 'isolate', paddingBottom: 24 }}>
      <section className={homeStyles.intro}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 4,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            margin: '0 0 14px',
          }}
        >
          A public globe
        </p>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(34px,6vw,60px)',
            fontWeight: 700,
            color: 'var(--foreground)',
            margin: 0,
            lineHeight: 1.04,
            letterSpacing: '-1.5px',
          }}
        >
          {ownerName}&apos;s{' '}
          <em style={{ color: 'var(--accent)', fontWeight: 400 }}>world.</em>
        </h1>
      </section>

      <section className={homeStyles.hero}>
        <div className={homeStyles.globeLayer}>
          <Globe
            pins={pins}
            width={960}
            height={960}
            onSelect={(id) => setSelected(Number(id))}
          />
          {trip && (
            <PeekPanel
              title={trip.placeName}
              subtitle={`${trip.country} · ${formatTripDates(
                trip.dateStart,
                trip.dateEnd,
              )}`}
              highlight={trip.highlight}
              story={trip.story}
              href={`/u/${username}/${trip.id}`}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
        <div className={homeStyles.formWrap}>
          <div className={homeStyles.placesPanel}>
            <p className={homeStyles.panelTitle}>Public places</p>
            <ul className={homeStyles.placesList}>
              {trips.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(index)}
                    className={homeStyles.placeRow}
                    aria-current={selected === index}
                    data-active={selected === index}
                  >
                    <span>
                      <span className={homeStyles.placeName}>
                        {item.placeName}
                      </span>
                      <span className={homeStyles.placeMeta}>
                        {item.country}
                      </span>
                    </span>
                    <span className={homeStyles.placeDates}>
                      {formatTripDates(item.dateStart, item.dateEnd)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
