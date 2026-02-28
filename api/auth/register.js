// ============================================================
//  POST /api/auth/register
//  Body: { nome, sobrenome, email, senha, idade?, profissao? }
// ============================================================
import bcrypt    from 'bcryptjs';
import { redis }      from './_redis.js';
import { assinarToken } from './_jwt.js';

function gerarId() {
  // crypto.randomUUID disponível no Node 14.17+
  return crypto.randomUUID();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const { nome, sobrenome, email, senha, idade, profissao } = req.body || {};

  if (!nome || !sobrenome || !email || !senha) {
    return res.status(400).json({ erro: 'nome, sobrenome, email e senha são obrigatórios.' });
  }

  // Verifica se e-mail já existe
  const idExistente = await redis.get(`email:${email.toLowerCase()}`);
  if (idExistente) {
    return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
  }

  const id          = gerarId();
  const senha_hash  = await bcrypt.hash(senha, 10);

  const usuario = {
    id,
    nome,
    sobrenome,
    email:     email.toLowerCase(),
    senha_hash,
    idade:     idade     ? parseInt(idade)  : null,
    profissao: profissao || null,
    provider:  'email',
    criado_em: new Date().toISOString(),
  };

  // Salva usuário e índice de e-mail
  await redis.set(`usuario:${id}`,              JSON.stringify(usuario));
  await redis.set(`email:${email.toLowerCase()}`, id);

  const token = assinarToken({ id, email: usuario.email, nome, sobrenome });

  return res.status(201).json({
    token,
    usuario: { id, nome, sobrenome, email: usuario.email, idade: usuario.idade, profissao: usuario.profissao },
  });
}
