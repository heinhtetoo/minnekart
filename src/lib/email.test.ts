import { describe, expect, it, vi } from 'vitest';

import {
  EmailMessage,
  resolveSmtpConfig,
  SmtpConfig,
  sendViaSmtp,
} from '@/lib/email';
import { Env } from '@/lib/env';

const config: SmtpConfig = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  user: 'relay-user',
  pass: 'relay-pass',
  from: 'Minnekart <hello@minnekart.app>',
};

const message: EmailMessage = {
  to: 'traveller@example.com',
  subject: 'Your Minnekart verification code',
  text: 'Your code is 123456.',
};

function envWith(overrides: Partial<Env>): Env {
  return {
    DATABASE_URL: 'postgres://localhost/test',
    APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
    EMAIL_TRANSPORT: 'smtp',
    STORAGE_DRIVER: 'memory',
    ...overrides,
  } as Env;
}

describe('sendViaSmtp', () => {
  it('passes the from address and message fields to the transport', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const createTransport = vi.fn().mockResolvedValue({ sendMail });

    await sendViaSmtp(message, config, createTransport);

    expect(createTransport).toHaveBeenCalledWith(config);
    expect(sendMail).toHaveBeenCalledWith({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  });
});

describe('resolveSmtpConfig', () => {
  it('returns a complete config when every SMTP var is set', () => {
    const resolved = resolveSmtpConfig(
      envWith({
        SMTP_HOST: config.host,
        SMTP_PORT: config.port,
        SMTP_USER: config.user,
        SMTP_PASS: config.pass,
        EMAIL_FROM: config.from,
      }),
    );

    expect(resolved).toEqual(config);
  });

  it('throws naming the missing var when SMTP_HOST is absent', () => {
    expect(() =>
      resolveSmtpConfig(
        envWith({
          SMTP_PORT: config.port,
          SMTP_USER: config.user,
          SMTP_PASS: config.pass,
          EMAIL_FROM: config.from,
        }),
      ),
    ).toThrow(/SMTP_HOST/);
  });

  it('throws naming the missing var when EMAIL_FROM is absent', () => {
    expect(() =>
      resolveSmtpConfig(
        envWith({
          SMTP_HOST: config.host,
          SMTP_PORT: config.port,
          SMTP_USER: config.user,
          SMTP_PASS: config.pass,
        }),
      ),
    ).toThrow(/EMAIL_FROM/);
  });
});
