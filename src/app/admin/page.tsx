import { db } from '@/db';
import InviteList, { InviteDTO } from '@/components/admin/InviteList';
import InviteManager from '@/components/admin/InviteManager';
import AppPage from '@/components/layout/AppPage';
import { inviteStatus, listInvites } from '@/lib/auth/invites';
import { requireOwnerPageUser } from '@/lib/auth/session-server';

import styles from './admin.module.css';

const dateFormat = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminPage() {
  const user = await requireOwnerPageUser();
  const rows = await listInvites(db());

  const invites: InviteDTO[] = rows.map(({ invite, usedByUsername }) => ({
    id: invite.id,
    note: invite.note,
    status: inviteStatus(invite),
    createdLabel: dateFormat.format(invite.createdAt),
    expiresLabel: dateFormat.format(invite.expiresAt),
    usedByUsername,
  }));

  return (
    <AppPage
      user={{ name: user.name, email: user.email, isOwner: true }}
      width="wide"
    >
      {/* Register: Settings' column and heading, then the create part and a
          ruled ledger of invites. */}
      <div className={styles.page}>
        <p className={styles.eyebrow}>Owner</p>
        <h1 className={`serif ${styles.title}`}>Invites</h1>
        <InviteManager />
        <InviteList invites={invites} />
      </div>
    </AppPage>
  );
}
