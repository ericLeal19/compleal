// ============================================================
//  /api/produtos.js — Vercel Serverless Function
//  Retorna os produtos salvos manualmente no Redis pelo admin.
//  Futuramente: integrar com Amazon Product Advertising API.
// ============================================================
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://compleal.com.br');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    // Produtos salvos como lista no Redis (chave: "produtos")
    const produtos = await redis.lrange('produtos', 0, -1);

    if (!produtos || produtos.length === 0) {
      return res.status(200).json([]);
    }

    // Cada item é um JSON serializado; faz o parse de cada um
    const lista = produtos.map(p => (typeof p === 'string' ? JSON.parse(p) : p));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(lista);

  } catch (erro) {
    console.error('[Produtos] Erro:', erro.message);
    return res.status(500).json({ erro: 'Falha interna', detalhe: erro.message });
  }
}