import type { Metadata } from 'next';

import ResetForm from '@/components/auth/ResetForm';
import Wordmark from '@/components/brand/Wordmark';

import styles from '../status.module.css';

export const metadata: Metadata = {
  title: 'Reset password · Minnekart',
};

interface ResetPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPage({ searchParams }: ResetPageProps) {
  const { token } = await searchParams;
  return (
    <main className={`fade ${styles.wrap}`}>
      <Wordmark />
      <ResetForm token={token ?? null} />
    </main>
  );
}
