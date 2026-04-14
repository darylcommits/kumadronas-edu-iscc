const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { phone_number, message } = await req.json();

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'phone_number and message are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Call IprogSMS server-side — no CORS restrictions here
    const smsResponse = await fetch('https://www.iprogsms.com/api/v1/sms_messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        api_token: '0db2cea0502385f3547f648b779acbe51b7fe4d1',
        phone_number,
        message,
      }),
    });

    const result = await smsResponse.json();

    return new Response(JSON.stringify(result), {
      status: smsResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
