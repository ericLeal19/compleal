// ============================================================
//  /api/admin.js — Vercel Serverless Function
//  Gerenciamento manual de produtos.
//  Scraping extrai título e imagem; demais dados são manuais.
//
//  GET    /api/admin          → lista produtos salvos
//  POST   /api/admin          → adiciona produto
//  PUT    /api/admin?id=...   → edita produto existente
//  DELETE /api/admin?id=...   → remove produto
// ============================================================
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function autenticado(req) {
  return req.headers['x-admin-password'] === process.env.ADMIN_PASSWORD;
}

function gerarId(url) {
  const match = url.match(/MLB-?(\d+)/i);
  if (match) return `MLB${match[1]}`;
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.charCodeAt(i);
    hash |= 0;
  }
  return `PROD${Math.abs(hash)}`;
}

function extrairMeta(html, propriedade) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propriedade}["'][^>]+content=["']([^"']+)["']`, 'i'
  );
  const match = html.match(regex) ||
    html.match(new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propriedade}["']`, 'i'
    ));
  return match ? match[1].trim() : null;
}

// Tenta extrair apenas título e thumbnail da página
async function scrapeBasico(link) {
  try {
    const resposta = await fetch(link, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!resposta.ok) return { title: null, thumbnail: null, urlFinal: link };

    const urlFinal = resposta.url;
    const html     = await resposta.text();

    // JSON-LD
    const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    let title, thumbnail;
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        title     = ld.name || null;
        thumbnail = ld.image?.[0] || ld.image || null;
      } catch {}
    }

    // Fallback Open Graph
    if (!title)     title     = extrairMeta(html, 'og:title');
    if (!thumbnail) thumbnail = extrairMeta(html, 'og:image');

    // Fallback <title>
    if (!title) {
      const t = html.match(/<title>([^<]+)<\/title>/i);
      if (t) title = t[1].split('|')[0].trim();
    }

    return {
      title:     title     || null,
      thumbnail: thumbnail ? thumbnail.replace('http://', 'https://') : null,
      urlFinal,
    };
  } catch {
    return { title: null, thumbnail: null, urlFinal: link };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://compleal.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!autenticado(req)) return res.status(401).json({ erro: 'Não autorizado' });

  // ---- GET ----
  if (req.method === 'GET') {
    try {
      const raw   = await redis.lrange('produtos', 0, -1);
      const lista = raw.map(p => (typeof p === 'string' ? JSON.parse(p) : p));
      return res.status(200).json(lista);
    } catch (e) {
      return res.status(500).json({ erro: 'Falha ao listar', detalhe: e.message });
    }
  }

  // ---- POST — adiciona produto ----
  if (req.method === 'POST') {
    const { page_url, affiliate_link, price, reviews_rating, reviews_count, sold, condition } = req.body || {};

    if (!page_url)      return res.status(400).json({ erro: 'Campo "page_url" é obrigatório.' });
    if (!affiliate_link) return res.status(400).json({ erro: 'Campo "affiliate_link" é obrigatório.' });

    // Scraping usa a URL real da página do produto
    const scraped = await scrapeBasico(page_url);
    const id      = gerarId(scraped.urlFinal || page_url);

    // Verifica duplicata pelo ID ou pela URL da página real
    const existentes = await redis.lrange('produtos', 0, -1);
    const jaExiste   = existentes.some(p => {
      const item = typeof p === 'string' ? JSON.parse(p) : p;
      return item.id === id || item.page_url === page_url;
    });
    if (jaExiste) return res.status(409).json({ erro: 'Produto já cadastrado.' });

    const produto = {
      id,
      title:          scraped.title     || 'Produto sem título',
      thumbnail:      scraped.thumbnail || null,
      condition:      condition         || null,
      price:          price          ? parseFloat(price)                                                             : null,
      reviews:        reviews_rating ? { rating: parseFloat(reviews_rating), count: reviews_count ? parseInt(reviews_count) : null } : null,
      sold:           sold           ? parseInt(sold)                                                                : null,
      affiliate_link,           // link de afiliado — destino do clique
      page_url,                 // URL real da página — usada no scraping
      scraped_at: new Date().toISOString(),
    };

    try {
      await redis.rpush('produtos', JSON.stringify(produto));
      return res.status(201).json({ mensagem: 'Produto adicionado!', produto });
    } catch (e) {
      return res.status(500).json({ erro: 'Falha ao salvar', detalhe: e.message });
    }
  }

  // ---- PUT — edita produto existente ----
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ erro: 'Parâmetro "id" é obrigatório.' });

    const { title, thumbnail, price, reviews_rating, reviews_count, sold, condition } = req.body || {};

    try {
      const raw  = await redis.lrange('produtos', 0, -1);
      const idx  = raw.findIndex(p => {
        const item = typeof p === 'string' ? JSON.parse(p) : p;
        return item.id === id;
      });

      if (idx === -1) return res.status(404).json({ erro: 'Produto não encontrado.' });

      const atual     = typeof raw[idx] === 'string' ? JSON.parse(raw[idx]) : raw[idx];
      const atualizado = {
        ...atual,
        title:     title     || atual.title,
        thumbnail: thumbnail || atual.thumbnail,
        condition: condition !== undefined ? condition : atual.condition,
        price:     price        !== undefined ? parseFloat(price)     : atual.price,
        reviews:   reviews_rating !== undefined
          ? { rating: parseFloat(reviews_rating), count: reviews_count ? parseInt(reviews_count) : null }
          : atual.reviews,
        sold:      sold !== undefined ? parseInt(sold) : atual.sold,
        updated_at: new Date().toISOString(),
      };

      // Substitui o item no Redis via LSET
      await redis.lset('produtos', idx, JSON.stringify(atualizado));
      return res.status(200).json({ mensagem: 'Produto atualizado!', produto: atualizado });
    } catch (e) {
      return res.status(500).json({ erro: 'Falha ao editar', detalhe: e.message });
    }
  }

  // ---- DELETE ----
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ erro: 'Parâmetro "id" é obrigatório.' });

    try {
      const raw      = await redis.lrange('produtos', 0, -1);
      const filtrados = raw.filter(p => {
        const item = typeof p === 'string' ? JSON.parse(p) : p;
        return item.id !== id;
      });

      await redis.del('produtos');
      if (filtrados.length > 0) await redis.rpush('produtos', ...filtrados);

      return res.status(200).json({ mensagem: `Produto ${id} removido.` });
    } catch (e) {
      return res.status(500).json({ erro: 'Falha ao remover', detalhe: e.message });
    }
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}