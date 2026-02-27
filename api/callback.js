// ============================================================
//  /api/callback.js — Recebe o code do ML e troca pelos tokens
//  Após receber os tokens, acesse /api/setup-tokens para salvá-los no Redis
// ============================================================

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Código de autorização ausente.');
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || '').split('; ').map(c => c.split('='))
  );
  const codeVerifier = cookies['cv'];

  if (!codeVerifier) {
    return res.status(400).send(`
      <h2>Cookie expirado ou ausente.</h2>
      <p>Inicie o fluxo novamente: <a href="/api/auth">/api/auth</a></p>
    `);
  }

  try {
    const resposta = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     process.env.ML_APP_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        code:          code,
        redirect_uri:  process.env.ML_REDIRECT_URI,
        code_verifier: codeVerifier,
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(400).send(`
        <h2>Erro ao trocar o token</h2>
        <pre>${JSON.stringify(dados, null, 2)}</pre>
      `);
    }

    // Limpa o cookie
    res.setHeader('Set-Cookie', 'cv=; HttpOnly; Secure; Path=/; Max-Age=0');

    return res.status(200).send(`
      <html>
      <body style="font-family:monospace;padding:40px;background:#0d0b26;color:white">
        <h2 style="color:#FF9900">✅ Tokens gerados com sucesso!</h2>
        <p>Cole esses valores nas variáveis de ambiente da Vercel e depois acesse <a href="/api/setup-tokens" style="color:#FF9900">/api/setup-tokens</a>.</p>
        <hr style="border-color:#4e6c76">

        <p><strong style="color:#FF9900">ML_ACCESS_TOKEN</strong></p>
        <input style="width:100%;padding:8px;background:#1a1840;color:white;border:1px solid #4e6c76;border-radius:4px"
               value="${dados.access_token}" readonly onclick="this.select()">

        <p style="margin-top:20px"><strong style="color:#FF9900">ML_TG (Refresh Token)</strong></p>
        <input style="width:100%;padding:8px;background:#1a1840;color:white;border:1px solid #4e6c76;border-radius:4px"
               value="${dados.refresh_token}" readonly onclick="this.select()">

        <p style="margin-top:30px;color:#4e6c76">
          Expira em: ${dados.expires_in / 3600}h | User ID: ${dados.user_id}
        </p>

        <p style="margin-top:20px">
          Próximo passo:<br>
          <code style="color:#FF9900">
            1. Salve ML_ACCESS_TOKEN e ML_TG nas variáveis de ambiente da Vercel<br>
            2. Acesse https://compleal.com.br/api/setup-tokens
          </code>
        </p>
      </body>
      </html>
    `);

  } catch (erro) {
    return res.status(500).send(`Erro interno: ${erro.message}`);
  }
}