'use client';

import Field from './Field';
import PlaceSearch from './PlaceSearch';
import styles from './TripForm.module.css';
import { SeedAction, SeedState } from './seed-fields';

// Everywhere the memory's location is set: searched for, typed by hand, or
// read out of the seed photo. (The pin itself is drawn by TripForm, beside
// the form.) All three write through the same reducer, which
// is what keeps the name, country and pin describing one place.
export default function PlaceFields({
  seed,
  dispatch,
  onPlacePicked,
}: {
  seed: SeedState;
  dispatch: (action: SeedAction) => void;
  onPlacePicked: () => void;
}) {
  function typedInto(field: 'placeName' | 'country') {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: 'userTyped', field, value: event.target.value });
  }

  return (
    <>
      {/* Remounting on a new key is how the search box gets reset. */}
      <PlaceSearch
        key={seed.searchReset}
        onPick={(place) => {
          dispatch({ type: 'placePicked', place });
          onPlacePicked();
        }}
      />

      <div className={styles.row}>
        <Field label="Place name">
          <input
            className={`field ${styles.big}`}
            value={seed.placeName}
            onChange={typedInto('placeName')}
            placeholder="Kyoto"
            maxLength={120}
          />
        </Field>
        <Field label="Country">
          <input
            className={`field ${styles.big}`}
            value={seed.country}
            onChange={typedInto('country')}
            placeholder="Japan"
            maxLength={80}
          />
        </Field>
      </div>
    </>
  );
}
