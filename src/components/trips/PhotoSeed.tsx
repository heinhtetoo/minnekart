'use client';

import styles from './TripForm.module.css';

export default function PhotoSeed({
  fileName,
  preview,
  showNoPreview,
  note,
  busy,
  canUseLocation,
  onPick,
  onClear,
  onUseLocation,
}: {
  fileName: string;
  preview: string | null;
  showNoPreview: boolean;
  note: string;
  busy: boolean;
  canUseLocation: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onUseLocation: () => void;
}) {
  return (
    <div className={styles.seed}>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.seedPreview} src={preview} alt="" />
      )}

      <div className={styles.seedBody}>
        <label className={styles.seedPick}>
          {/*
            No accept filter on purpose. An image-only accept steers Chrome on
            Android to the gallery picker, whose media provider blanks EXIF
            location; the file browser hands over the original bytes. The file
            is vetted by its magic bytes instead, which accept never did.
          */}
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onPick(file);
            }}
            hidden
          />
          {fileName ? `Photo: ${fileName}` : 'Start from a photo'}
        </label>

        {!fileName && (
          <p className={styles.seedHint}>
            Pick one photo and we&apos;ll read its location and date to fill
            this in. It gets added to the memory when you save. On a phone, a
            photo you take now keeps its location; saved ones usually only give
            us the date.
          </p>
        )}

        {busy && <p className={styles.seedHint}>Reading the photo…</p>}

        {showNoPreview && (
          <p className={styles.seedHint}>
            No preview for this format, but the photo still uploads.
          </p>
        )}

        {!busy && fileName && (
          <p className={styles.seedNote}>
            <span>
              {note}
              {canUseLocation && (
                <button
                  type="button"
                  className={styles.seedSwap}
                  onClick={onUseLocation}
                >
                  Use the photo&apos;s place
                </button>
              )}
            </span>
            <button
              type="button"
              className={styles.seedClear}
              onClick={onClear}
            >
              Remove
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
