import { env } from '@/lib/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

const memoryInbox: EmailMessage[] = [];

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (env().EMAIL_TRANSPORT === 'memory') {
    memoryInbox.push(message);
    return;
  }
  console.log(
    `[email] to=${message.to} subject=${message.subject}\n${message.text}`,
  );
}

export function readMemoryInbox(): readonly EmailMessage[] {
  return memoryInbox;
}

export function clearMemoryInbox(): void {
  memoryInbox.length = 0;
}
