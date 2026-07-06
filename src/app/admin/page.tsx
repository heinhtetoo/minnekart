import { db } from '@/db';
import InviteList, { InviteDTO } from '@/components/admin/InviteList';
import InviteManager from '@/components/admin/InviteManager';
import AppPage from '@/components/layout/AppPage';
import { inviteStatus, listInvites } from '@/lib/auth/invites';
import { requireOwnerPageUser } from '@/lib/auth/session-server';

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
      width="narrow"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 3,
          color: 'var(--accent)',
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}
      >
        Owner
      </p>
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(28px,5vw,40px)',
          fontWeight: 700,
          color: 'var(--foreground)',
          letterSpacing: '-1px',
          margin: '0 0 24px',
        }}
      >
        Invites
      </h1>
      <InviteManager />
      <InviteList invites={invites} />
    </AppPage>
  );
}
