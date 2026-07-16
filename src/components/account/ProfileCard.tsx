'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { accountApi } from './api';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  initialName: string;
  initialTagline: string;
  initialHeadline: string;
  initialBio: string;
}

export default function ProfileCard({
  initialName,
  initialTagline,
  initialHeadline,
  initialBio,
}: ProfileCardProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(initialTagline);
  const [headline, setHeadline] = useState(initialHeadline);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Your name cannot be empty.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await accountApi.updateProfile({
      name: name.trim(),
      tagline,
      headline,
      bio,
    });
    setBusy(false);
    if (!result.ok) {
      setError('Could not save your profile.');
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className={styles.card} onSubmit={save}>
      <div className={styles.head}>
        <h2 className={styles.title}>Your About page</h2>
        <p className={styles.hint}>
          This is what visitors see on your public About page.
        </p>
      </div>

      <Field label="Name" hint={`${name.length}/80`}>
        <input
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
        />
      </Field>

      <Field label="Tagline" hint={`${tagline.length}/80`}>
        <input
          className="field"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          placeholder="Cartographer of small moments"
          maxLength={80}
        />
      </Field>

      <Field label="Headline" hint={`${headline.length}/120`}>
        <input
          className="field"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          placeholder="I collect places the way others collect stamps."
          maxLength={120}
        />
      </Field>

      <Field label="Bio" hint={`${bio.length}/2000`}>
        <textarea
          className="field"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Tell visitors the story behind your globe. Leave a blank line between paragraphs."
          maxLength={2000}
          rows={6}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </Field>

      <div className={styles.actions}>
        <button className="button" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        {saved && !error && <span className={styles.saved}>Saved</span>}
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldHead}>
        <span className="label" style={{ margin: 0 }}>
          {label}
        </span>
        <span className={styles.hint}>{hint}</span>
      </span>
      {children}
    </label>
  );
}
