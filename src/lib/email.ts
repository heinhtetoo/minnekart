import { env, Env } from '@/lib/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SmtpTransport {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
}

type CreateTransport = (config: SmtpConfig) => Promise<SmtpTransport>;

const memoryInbox: EmailMessage[] = [];

export async function sendEmail(message: EmailMessage): Promise<void> {
  const transport = env().EMAIL_TRANSPORT;
  if (transport === 'memory') {
    memoryInbox.push(message);
    return;
  }
  if (transport === 'smtp') {
    await sendViaSmtp(message, resolveSmtpConfig(env()));
    return;
  }
  console.log(
    `[email] to=${message.to} subject=${message.subject}\n${message.text}`,
  );
}

export function resolveSmtpConfig(source: Env): SmtpConfig {
  return {
    host: required(source.SMTP_HOST, 'SMTP_HOST'),
    port: requiredPort(source.SMTP_PORT),
    user: required(source.SMTP_USER, 'SMTP_USER'),
    pass: required(source.SMTP_PASS, 'SMTP_PASS'),
    from: required(source.EMAIL_FROM, 'EMAIL_FROM'),
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name} (required when EMAIL_TRANSPORT=smtp)`);
  }
  return value;
}

function requiredPort(value: number | undefined): number {
  if (!value) {
    throw new Error('Missing SMTP_PORT (required when EMAIL_TRANSPORT=smtp)');
  }
  return value;
}

export async function sendViaSmtp(
  message: EmailMessage,
  config: SmtpConfig,
  createTransport: CreateTransport = defaultCreateTransport,
): Promise<void> {
  const transport = await createTransport(config);
  await transport.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}

const defaultCreateTransport: CreateTransport = async (config) => {
  const nodemailer = await import('nodemailer');
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
};

export function readMemoryInbox(): readonly EmailMessage[] {
  return memoryInbox;
}

export function clearMemoryInbox(): void {
  memoryInbox.length = 0;
}
