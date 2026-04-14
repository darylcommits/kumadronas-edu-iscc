import nodemailer from 'npm:nodemailer';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { email_address, subject, message } = await req.json();

    if (!email_address || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'email_address, subject, and message are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
    const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME');
    const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD');

    if (!SMTP_USERNAME || !SMTP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'SMTP credentials not configured in environment variables' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Kumadronas System" <${SMTP_USERNAME}>`,
      to: email_address,
      subject: subject,
      text: message,
    });

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully', infoId: info.messageId }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Email function error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
