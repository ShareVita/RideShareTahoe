import { Resend } from 'npm:resend@4';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const APP_NAME = 'RideShareTahoe';
const FROM_EMAIL = 'noreply@ridesharetahoe.com';

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: Record<string, string>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

Deno.serve(async (req: Request) => {
  const payload: AuthEmailPayload = await req.json();
  const { user, email_data } = payload;

  // Use Supabase's own verify endpoint (same as default templates).
  // This handles PKCE correctly and redirects to our callback with ?code=
  // which the existing OAuth handler in /api/auth/callback already processes.
  const magicLink = `${SUPABASE_URL}/auth/v1/verify?token=${email_data.token}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

  const { error } = await resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: [user.email],
    subject: `Sign in to ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0f172a;">Sign in to ${APP_NAME}</h2>
        <p style="color: #475569;">Click the button below to securely sign in. This link expires in 1 hour.</p>
        <a href="${magicLink}"
           style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Sign in to ${APP_NAME}
        </a>
        <p style="color: #94a3b8; font-size: 13px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Email sent' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
