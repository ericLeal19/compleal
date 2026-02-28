// ============================================================
//  GET /api/auth/google
//  Inicia o fluxo OAuth 2.0 com o Google
// ============================================================
export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
