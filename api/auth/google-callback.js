// ============================================================
//  GET /api/auth/google-callback
//  Recebe o code do Google, troca por token e loga/cadastra
// ============================================================
import { redis }        from './_redis.js';
import { assinarToken } from './_jwt.js';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/?erro=google_cancelado');
  }

  try {
    // 1. Troca o code pelo access_token do Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Erro ao obter token do Google');

    // 2. Busca dados do usuário no Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    const { id: google_id, email, given_name: nome, family_name: sobrenome } = googleUser;

    // 3. Verifica se já existe conta com esse Google ID ou e-mail
    let id = await redis.get(`google:${google_id}`);

    if (!id) {
      // Tenta encontrar pelo e-mail (conta criada antes com senha)
      id = await redis.get(`email:${email.toLowerCase()}`);
    }

    if (!id) {
      // Novo usuário — cria conta
      id = crypto.randomUUID();

      const usuario = {
        id,
        nome:      nome      || '',
        sobrenome: sobrenome || '',
        email:     email.toLowerCase(),
        senha_hash: null,
        google_id,
        idade:     null,
        profissao: null,
        provider:  'google',
        criado_em: new Date().toISOString(),
      };

      await redis.set(`usuario:${id}`,               JSON.stringify(usuario));
      await redis.set(`email:${email.toLowerCase()}`, id);
      await redis.set(`google:${google_id}`,          id);

    } else {
      // Usuário existente — garante que o índice google: existe
      await redis.set(`google:${google_id}`, id);
    }

    // 4. Busca dados atualizados e gera JWT
    const raw     = await redis.get(`usuario:${id}`);
    const usuario = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const token = assinarToken({
      id:        usuario.id,
      email:     usuario.email,
      nome:      usuario.nome,
      sobrenome: usuario.sobrenome,
    });

    // 5. Redireciona para o site com o token na URL (capturado pelo auth.js)
    return res.redirect(`/?token=${encodeURIComponent(token)}`);

  } catch (e) {
    console.error('[Google Callback]', e.message);
    return res.redirect('/?erro=google_falhou');
  }
}
