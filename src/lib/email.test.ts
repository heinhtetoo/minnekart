import { describe, expect, it, vi } from 'vitest';

import {
  EmailMessage,
  ResendConfig,
  resolveResendConfig,
  resolveSmtpConfig,
  SmtpConfig,
  sendViaResend,
  sendViaSmtp,
} from '@/lib/email';
import { Env } from '@/lib/env';

const config: SmtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  user: 'relay-user',
  pass: 'relay-pass',
  from: 'Minnekart <hello@minnekart.app>',
};

const resendConfig: ResendConfig = {
  apiKey: 're_test_key',
  from: 'Minnekart <hello@minnekart.com>',
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

describe('sendViaResend', () => {
  it('posts the message to the Resend API with a bearer token', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'msg_1' }),
    })) as unknown as typeof fetch;

    await sendViaResend(message, resendConfig, fetchImpl);

    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    expect(JSON.parse(init.body)).toEqual({
      from: resendConfig.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    });
  });

  it('throws when Resend rejects the message, rather than losing it', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'domain is not verified' }),
    })) as unknown as typeof fetch;

    await expect(
      sendViaResend(message, resendConfig, fetchImpl),
    ).rejects.toThrow(/422/);
  });
});

describe('resolveResendConfig', () => {
  it('returns the key and from address when both are set', () => {
    const resolved = resolveResendConfig(
      envWith({
        EMAIL_TRANSPORT: 'resend',
        RESEND_API_KEY: resendConfig.apiKey,
        EMAIL_FROM: resendConfig.from,
      }),
    );

    expect(resolved).toEqual(resendConfig);
  });

  it('throws naming the missing var when RESEND_API_KEY is absent', () => {
    expect(() =>
      resolveResendConfig(
        envWith({ EMAIL_TRANSPORT: 'resend', EMAIL_FROM: resendConfig.from }),
      ),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('throws naming the missing var when EMAIL_FROM is absent', () => {
    expect(() =>
      resolveResendConfig(
        envWith({
          EMAIL_TRANSPORT: 'resend',
          RESEND_API_KEY: resendConfig.apiKey,
        }),
      ),
    ).toThrow(/EMAIL_FROM/);
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
