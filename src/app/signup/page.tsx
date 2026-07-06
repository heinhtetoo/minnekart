import { redirect } from 'next/navigation';

interface SignupPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { invite } = await searchParams;
  redirect(invite ? `/?invite=${encodeURIComponent(invite)}` : '/');
}
