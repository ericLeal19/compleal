// ============================================================
//  /api/renovar-tokens.js — Vercel Serverless Function
//  Chamado automaticamente pelo Cron Job todo dia às 6h.
//  Renova o Access Token E o Refresh Token no Redis.
// ============================================================
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // ✅ Proteção por chave secreta — deve ficar DENTRO do handler
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  const refreshToken = await redis.get('ml_refresh_token');

  if (!refreshToken) {
    return res.status(500).json({
      erro: 'Refresh Token não encontrado no Redis.',
      dica: 'Refaça o fluxo OAuth em /api/auth'
    });
  }

  try {
    const resposta = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     process.env.ML_APP_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token: refreshToken,
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json({
        erro:    'Falha ao renovar token no Mercado Livre',
        detalhe: dados
      });
    }

    // Salva os DOIS tokens novos (ambos mudam a cada renovação)
    await redis.set('ml_access_token',  dados.access_token);
    await redis.set('ml_refresh_token', dados.refresh_token);

    console.log(`Tokens renovados com sucesso. Expira em: ${dados.expires_in / 3600}h`);

    return res.status(200).json({
      ok:        true,
      expira_em: `${dados.expires_in / 3600}h`,
      user_id:   dados.user_id
    });

  } catch (erro) {
    return res.status(500).json({ erro: 'Erro interno', detalhe: erro.message });
  }
}