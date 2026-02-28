// ============================================================
//  GET  /api/auth/me        → retorna dados do usuário logado
//  PUT  /api/auth/me        → atualiza perfil
//  Body PUT: { nome?, sobrenome?, idade?, profissao? }
// ============================================================
import { redis }        from './_redis.js';
import { verificarToken, extrairToken } from './_jwt.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token   = extrairToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) return res.status(401).json({ erro: 'Não autenticado.' });

  const raw     = await redis.get(`usuario:${payload.id}`);
  if (!raw)     return res.status(404).json({ erro: 'Usuário não encontrado.' });
  const usuario = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // GET — retorna perfil (sem senha_hash)
  if (req.method === 'GET') {
    const { senha_hash, ...perfil } = usuario;
    return res.status(200).json(perfil);
  }

  // PUT — atualiza campos permitidos
  if (req.method === 'PUT') {
    const { nome, sobrenome, idade, profissao } = req.body || {};

    const atualizado = {
      ...usuario,
      nome:      nome      ?? usuario.nome,
      sobrenome: sobrenome ?? usuario.sobrenome,
      idade:     idade     !== undefined ? (idade ? parseInt(idade) : null) : usuario.idade,
      profissao: profissao !== undefined ? (profissao || null) : usuario.profissao,
      updated_at: new Date().toISOString(),
    };

    await redis.set(`usuario:${usuario.id}`, JSON.stringify(atualizado));

    const { senha_hash, ...perfil } = atualizado;
    return res.status(200).json(perfil);
  }

  return res.status(405).end();
}
