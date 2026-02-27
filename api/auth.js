// ============================================================
//  /api/auth.js — Inicia o fluxo OAuth com PKCE
//  Acesse: https://compleal.com.br/api/auth para gerar tokens
// ============================================================
import crypto from 'crypto';

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export default function handler(req, res) {
  // Gera code_verifier (string aleatória de 64 bytes)
  const codeVerifier = base64URLEncode(crypto.randomBytes(64));

  // Gera code_challenge = BASE64URL(SHA256(code_verifier))
  const codeChallenge = base64URLEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );

  // Salva o code_verifier num cookie seguro para usar no callback
  res.setHeader('Set-Cookie', `cv=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);

  // Redireciona para o ML com PKCE
  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', process.env.ML_APP_ID);
  authUrl.searchParams.set('redirect_uri', process.env.ML_REDIRECT_URI);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return res.redirect(authUrl.toString());
}