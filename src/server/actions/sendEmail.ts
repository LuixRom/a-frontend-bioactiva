'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      from: `"Bioactiva CRM" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    });
    return { ok: true };
  } catch (err) {
    console.error('[sendEmail] Error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
  }
}
