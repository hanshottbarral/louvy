import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { to, subject, html } = (await request.json()) as {
    to?: string;
    subject?: string;
    html?: string;
  };

  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Payload incompleto.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return NextResponse.json({
      sent: false,
      reason: 'email-provider-not-configured',
    });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text || 'Falha ao enviar email.' }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
