// src/lib/externalNotifications.js

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * Send an SMS notification via Supabase Edge Function (server-side proxy to IprogSMS).
 * This avoids browser CORS restrictions on direct API calls.
 * @param {string} phoneNumber - The recipient's phone number.
 * @param {string} message - The message to send.
 */
export const sendSmsNotification = async (phoneNumber, message) => {
  if (!phoneNumber) {
    console.warn('[SMS] No phone number provided — skipping SMS');
    return { success: false, error: 'No phone number provided' };
  }

  // Normalize: strip spaces/dashes
  const cleanNumber = String(phoneNumber).replace(/[\s\-]/g, '');
  console.log(`[SMS] Sending to: ${cleanNumber}`);
  console.log(`[SMS] Message: ${message}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        phone_number: cleanNumber,
        message: message,
      }),
    });

    const result = await response.json();
    console.log('[SMS] API response:', result);
    return { success: response.ok && result.status === 200, result };
  } catch (error) {
    console.warn('[SMS] Notification failed:', error);
    return { success: false, error };
  }
};

/**
 * Send an Email notification via Supabase Edge Function (server-side).
 * This uses the SMTP settings configured in Supabase (Gmail).
 * @param {string} emailAddress - The recipient's email address.
 * @param {string} subject - The subject line.
 * @param {string} message - The email body.
 */
export const sendEmailNotification = async (emailAddress, subject, message) => {
  if (!emailAddress) return { success: false, error: 'No email address provided' };

  console.log(`[Email] Sending to: ${emailAddress}`);
  console.log(`[Email] Subject: ${subject}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email_address: emailAddress,
        subject: subject,
        message: message,
      }),
    });

    const result = await response.json();
    console.log('[Email] API response:', result);
    return { success: response.ok, result };
  } catch (error) {
    console.warn('[Email] Notification failed:', error);
    return { success: false, error };
  }
};
