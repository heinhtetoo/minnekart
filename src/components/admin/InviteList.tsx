'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { InviteStatus } from '@/lib/auth/invites';

import styles from './Admin.module.css';
import { invitesApi } from './api';

export interface InviteDTO {
  id: string;
  note: string | null;
  status: InviteStatus;
  createdLabel: string;
  expiresLabel: string;
  usedByUsername: string | null;
}

const statusLabels: Record<InviteStatus, string> = {
  unused: 'Unused',
  used: 'Used',
  revoked: 'Revoked',
  expired: 'Expired',
};

export default function InviteList({ invites }: { invites: InviteDTO[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!window.confirm('Revoke this invite? The link will stop working.')) {
      return;
    }
    setBusyId(id);
    const result = await invitesApi.revoke(id);
    setBusyId(null);
    if (result.ok) {
      router.refresh();
    }
  }

  if (invites.length === 0) {
    return <p className={styles.empty}>No invites yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {invites.map((invite) => (
        <li key={invite.id} className={styles.item}>
          <div>
            <p className={styles.itemNote}>{invite.note || 'Untitled invite'}</p>
            <p className={styles.itemMeta}>
              Created {invite.createdLabel} · expires {invite.expiresLabel}
              {invite.usedByUsername && ` · used by @${invite.usedByUsername}`}
            </p>
          </div>
          <div className={styles.itemRight}>
            <span className={`${styles.badge} ${styles[invite.status]}`}>
              {statusLabels[invite.status]}
            </span>
            {invite.status === 'unused' && (
              <button
                type="button"
                className={styles.revokeButton}
                onClick={() => revoke(invite.id)}
                disabled={busyId === invite.id}
              >
                Revoke
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
