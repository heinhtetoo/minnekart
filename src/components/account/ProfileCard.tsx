'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import form from '@/components/ui/Form.module.css';

import { accountApi } from './api';
import styles from './ProfileCard.module.css';
import ProfilePhotoPicker from './ProfilePhotoPicker';

interface ProfileCardProps {
  initialName: string;
  initialTagline: string;
  initialHeadline: string;
  initialBio: string;
  initialProfilePhotoId: string | null;
  profilePhotoThumbUrl: string | null;
}

export default function ProfileCard({
  initialName,
  initialTagline,
  initialHeadline,
  initialBio,
  initialProfilePhotoId,
  profilePhotoThumbUrl,
}: ProfileCardProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(initialTagline);
  const [headline, setHeadline] = useState(initialHeadline);
  const [bio, setBio] = useState(initialBio);
  const [profilePhotoId, setProfilePhotoId] = useState(initialProfilePhotoId);
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
      profilePhotoId,
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
        <h2 className={`serif ${styles.title}`}>Your profile</h2>
        <p className={styles.line}>Shown on your Profile page.</p>
      </div>

      <Field label="Name" hint={`${name.length}/80`}>
        <input
          className={`${form.field} ${styles.name}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
        />
      </Field>

      <Field label="Tagline" hint={`${tagline.length}/80`}>
        <input
          className={`${form.field} ${styles.tagline}`}
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          placeholder="Cartographer of small moments"
          maxLength={80}
        />
      </Field>

      <Field label="Headline" hint={`${headline.length}/120`}>
        <input
          className={`${form.field} ${styles.headline}`}
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          placeholder="I collect places the way others collect stamps."
          maxLength={120}
        />
      </Field>

      <Field label="Bio" hint={`${bio.length}/2000`}>
        <textarea
          className={`${form.field} ${styles.bio}`}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Tell the story behind your globe. Leave a blank line between paragraphs."
          maxLength={2000}
          rows={6}
        />
      </Field>

      <div className={styles.fieldWrap}>
        <span className={styles.fieldHead}>
          <span className={form.label} style={{ margin: 0 }}>
            Profile photo
          </span>
        </span>
        <ProfilePhotoPicker
          selectedId={profilePhotoId}
          fallbackThumbUrl={profilePhotoThumbUrl}
          onSelect={setProfilePhotoId}
        />
      </div>

      <div className={styles.actions}>
        <button
          className={`${form.button} ${styles.save}`}
          type="submit"
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        <Link href="/profile" className={styles.view}>
          View your profile →
        </Link>
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
        <span className={form.label} style={{ margin: 0 }}>
          {label}
        </span>
        <span className={styles.hint}>{hint}</span>
      </span>
      {children}
    </label>
  );
}
