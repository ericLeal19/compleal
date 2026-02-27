// ============================================================
//  /api/produtos.js — Vercel Serverless Function
//  Lê o Access Token do Redis (renovado automaticamente
//  pelo cron job /api/renovar-tokens todo dia às 6h)
// ============================================================
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function buscarNoML(url, token) {
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

async function renovarToken() {
  const refreshToken = await redis.get('ml_refresh_token');

  if (!refreshToken) {
    throw new Error('Refresh Token ausente no Redis.');
  }

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

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Falha ao renovar token: ${erro}`);
  }

  const dados = await resposta.json();

  await redis.set('ml_access_token',  dados.access_token);
  await redis.set('ml_refresh_token', dados.refresh_token);

  return dados.access_token;
}

export default async function handler(req, res) {
  // ✅ CORS dentro do handler (único lugar onde res existe)
  res.setHeader('Access-Control-Allow-Origin', 'https://compleal.com.br');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  let token = await redis.get('ml_access_token');

  if (!token) {
    try {
      token = await renovarToken();
    } catch (e) {
      return res.status(500).json({
        erro: 'Token ausente e renovação falhou',
        detalhe: e.message
      });
    }
  }

  const termo  = req.query.q     || 'notebook gamer';
  const limite = parseInt(req.query.limit) || 9;
  const url    = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=${limite}`;

  try {
    let resposta = await buscarNoML(url, token);

    if (resposta.status === 401) {
      console.log('Token expirado, renovando automaticamente...');
      try {
        token    = await renovarToken();
        resposta = await buscarNoML(url, token);
      } catch (e) {
        return res.status(401).json({
          erro:    'Token expirado e não foi possível renovar',
          detalhe: e.message
        });
      }
    }

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      return res.status(resposta.status).json({
        erro:    'Erro da API do Mercado Livre',
        detalhe: erroTexto
      });
    }

    const dados    = await resposta.json();
    const produtos = dados.results.map(p => ({
      id:                 p.id,
      title:              p.title,
      price:              p.price,
      thumbnail:          p.thumbnail,
      permalink:          p.permalink,
      condition:          p.condition,
      available_quantity: p.available_quantity,
      sold_quantity:      p.sold_quantity,
      reviews:            p.reviews || null,
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(produtos);

  } catch (erro) {
    console.error('Erro interno:', erro.message);
    return res.status(500).json({ erro: 'Falha interna', detalhe: erro.message });
  }
}