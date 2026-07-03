import { EmailMessage, sendEmail } from '@/lib/email';
import { env } from '@/lib/env';

export function sendOtpEmail(to: string, code: string): Promise<void> {
  const message: EmailMessage = {
    to,
    subject: 'Your Minnekart verification code',
    text: `Your Minnekart verification code is ${code}. It expires in 10 minutes.`,
  };
  return sendEmail(message);
}

export function sendResetEmail(to: string, token: string): Promise<void> {
  const url = `${env().APP_URL}/reset?token=${token}`;
  const message: EmailMessage = {
    to,
    subject: 'Reset your Minnekart password',
    text: `Reset your Minnekart password with this link (valid 30 minutes): ${url}`,
  };
  return sendEmail(message);
}
