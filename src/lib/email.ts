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

export interface ResendConfig {
  apiKey: string;
  from: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

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
  if (transport === 'resend') {
    await sendViaResend(message, resolveResendConfig(env()));
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

export function resolveResendConfig(source: Env): ResendConfig {
  return {
    apiKey: required(source.RESEND_API_KEY, 'RESEND_API_KEY', 'resend'),
    from: required(source.EMAIL_FROM, 'EMAIL_FROM', 'resend'),
  };
}

export async function sendViaResend(
  message: EmailMessage,
  config: ResendConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });

  // A dropped OTP is invisible to the user and fatal to the signup, so a
  // rejection has to surface rather than resolve quietly.
  if (!response.ok) {
    throw new Error(`Resend rejected the message (${response.status})`);
  }
}

export function resolveSmtpConfig(source: Env): SmtpConfig {
  return {
    host: required(source.SMTP_HOST, 'SMTP_HOST', 'smtp'),
    port: requiredPort(source.SMTP_PORT),
    user: required(source.SMTP_USER, 'SMTP_USER', 'smtp'),
    pass: required(source.SMTP_PASS, 'SMTP_PASS', 'smtp'),
    from: required(source.EMAIL_FROM, 'EMAIL_FROM', 'smtp'),
  };
}

function required(
  value: string | undefined,
  name: string,
  transport: string,
): string {
  if (!value) {
    throw new Error(
      `Missing ${name} (required when EMAIL_TRANSPORT=${transport})`,
    );
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
