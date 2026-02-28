// ============================================================
//  /api/favoritos — Lista de favoritos do usuário logado
//
//  GET    → retorna IDs + dados dos produtos favoritos
//  POST   → { produto_id } adiciona favorito
//  DELETE → ?id={produto_id} remove favorito
// ============================================================
import { Redis }        from '@upstash/redis';
import { verificarToken, extrairToken } from './auth/_jwt.js';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token   = extrairToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) return res.status(401).json({ erro: 'Não autenticado.' });

  const chave = `favoritos:${payload.id}`;

  // GET — lista favoritos com dados completos dos produtos
  if (req.method === 'GET') {
    const ids = await redis.smembers(chave);

    if (!ids || ids.length === 0) return res.status(200).json([]);

    // Busca dados dos produtos no Redis
    const todosProdutos = await redis.lrange('produtos', 0, -1);
    const mapa = {};
    todosProdutos.forEach(p => {
      const item = typeof p === 'string' ? JSON.parse(p) : p;
      mapa[item.id] = item;
    });

    const favoritos = ids
      .map(id => mapa[id])
      .filter(Boolean);

    return res.status(200).json(favoritos);
  }

  // POST — adiciona favorito
  if (req.method === 'POST') {
    const { produto_id } = req.body || {};
    if (!produto_id) return res.status(400).json({ erro: 'produto_id é obrigatório.' });

    await redis.sadd(chave, produto_id);
    return res.status(200).json({ mensagem: 'Adicionado aos favoritos.' });
  }

  // DELETE — remove favorito
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ erro: 'Parâmetro "id" é obrigatório.' });

    await redis.srem(chave, id);
    return res.status(200).json({ mensagem: 'Removido dos favoritos.' });
  }

  return res.status(405).end();
}
