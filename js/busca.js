// ============================================================
//  js/busca.js — Script FRONTEND
//  Chama /api/produtos (Vercel Function) como proxy para o ML
//  O servidor faz a chamada ao ML, evitando o erro 403
// ============================================================

// ⚠️ Substitua pelo seu ID real do Programa de Afiliados do ML
// Cadastre-se em: https://www.mercadolibre.com.br/afiliados
const ML_AFFILIATE_ID = 'compleal';

const BUSCA_PADRAO    = 'notebook gamer';
const LIMITE_PRODUTOS = 3;

function gerarLinkAfiliado(permalink) {
  return `${permalink}?utm_source=${ML_AFFILIATE_ID}&utm_medium=referral&utm_campaign=compleal`;
}

function renderizarEstrelas(nota) {
  if (!nota) return '';
  const cheias = Math.round(nota);
  return '★'.repeat(cheias) + '☆'.repeat(5 - cheias);
}

function formatarPreco(preco) {
  return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarProdutos(produtos) {
  const container = document.getElementById('produtos-ml');
  if (!container) return;

  if (!produtos || produtos.length === 0) {
    container.innerHTML = '<p class="sem-produtos">Nenhum produto encontrado.</p>';
    return;
  }

  container.innerHTML = produtos.map(produto => {
    const preco    = produto.price ? formatarPreco(produto.price) : 'Ver preço';
    const estrelas = produto.reviews?.rating_average
      ? renderizarEstrelas(produto.reviews.rating_average)
      : '';
    const link   = gerarLinkAfiliado(produto.permalink);
    const imgSrc = produto.thumbnail.replace('http://', 'https://');

    return `
      <div class="card">
        <img class="product-img" src="${imgSrc}" alt="${produto.title}" loading="lazy">
        <p class="product-title">${produto.title}</p>
        ${estrelas ? `<div class="product-rating"><span class="estrelas">${estrelas}</span></div>` : ''}
        <p class="product-price">${preco}</p>
        <div class="button-group">
          <a href="${link}" target="_blank" rel="noopener noreferrer sponsored" class="btn-buy">
            Ver no ML
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// ✅ Chama /api/produtos (Vercel Function como proxy) — resolve o erro 403
async function buscarProdutos(termo = BUSCA_PADRAO) {
  const container = document.getElementById('produtos-ml');
  if (!container) return;

  container.innerHTML = '<div class="loading">Buscando produtos</div>';

  const url = `/api/produtos?q=${encodeURIComponent(termo)}&limit=${LIMITE_PRODUTOS}`;

  try {
    const resposta = await fetch(url);

    if (!resposta.ok) {
      const erroJson = await resposta.json().catch(() => ({}));
      throw new Error(`Erro ${resposta.status}${erroJson.detalhe ? ': ' + erroJson.detalhe : ''}`);
    }

    const produtos = await resposta.json();
    renderizarProdutos(produtos);

  } catch (erro) {
    console.error('Erro ao buscar produtos:', erro);
    container.innerHTML = `
      <div class="erro">
        Não foi possível carregar os produtos. Tente novamente mais tarde.<br>
        <small>${erro.message}</small>
      </div>
    `;
  }
}

function configurarBusca() {
  const intervalo = setInterval(() => {
    const form = document.querySelector('.nav-search');
    if (!form) return;
    clearInterval(intervalo);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = form.querySelector('input[type="text"]');
      const termo = input?.value?.trim();
      if (termo) {
        buscarProdutos(termo);
        document.getElementById('container-produtos')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
  buscarProdutos(BUSCA_PADRAO);
  configurarBusca();
});