// Helpers JWT compartilhados
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export function assinarToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verificarToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function extrairToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}
