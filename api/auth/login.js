// ============================================================
//  POST /api/auth/login
//  Body: { email, senha }
// ============================================================
import bcrypt          from 'bcryptjs';
import { redis }       from './_redis.js';
import { assinarToken } from './_jwt.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ erro: 'email e senha são obrigatórios.' });

  const id = await redis.get(`email:${email.toLowerCase()}`);
  if (!id)  return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

  const raw     = await redis.get(`usuario:${id}`);
  const usuario = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (!usuario?.senha_hash) {
    return res.status(401).json({ erro: 'Esta conta foi criada com o Google. Use "Entrar com Google".' });
  }

  const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaOk) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

  const token = assinarToken({ id: usuario.id, email: usuario.email, nome: usuario.nome, sobrenome: usuario.sobrenome });

  return res.status(200).json({
    token,
    usuario: {
      id:        usuario.id,
      nome:      usuario.nome,
      sobrenome: usuario.sobrenome,
      email:     usuario.email,
      idade:     usuario.idade,
      profissao: usuario.profissao,
    },
  });
}
