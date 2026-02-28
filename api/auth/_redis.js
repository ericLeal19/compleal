// Instância compartilhada do Redis para todos os módulos de auth
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
