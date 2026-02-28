// ============================================================
//  js/busca.js — Script FRONTEND
//  Exibe produtos cadastrados pelo admin com botão de favorito.
// ============================================================

const BUSCA_PADRAO = 'notebook';

function formatarPreco(preco) {
  return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarCondicao(condition) {
  if (condition === 'new')  return 'Novo';
  if (condition === 'used') return 'Usado';
  return '';
}

function renderizarEstrelas(rating) {
  if (!rating) return '';
  if (rating >= 4.8) rating = 5; // Regra adicionada para arredondar avaliações muito próximas de 5
  const cheias = Math.floor(rating);
  const meia   = rating - cheias >= 0.5 ? 1 : 0;
  const vazias = 5 - cheias - meia;
  return '★'.repeat(cheias) + (meia ? '⯪' : '') + '☆'.repeat(vazias);
}

function formatarVendidos(sold) {
  if (!sold) return null;
  if (sold >= 1000) return `+${(sold / 1000).toFixed(1).replace('.', ',')}mil vendidos`;
  return `+${sold} vendidos`;
}

function renderizarProdutos(produtos, termo = '') {
  const container = document.getElementById('produtos-ml');
  if (!container) return;

  const filtrados = termo
    ? produtos.filter(p => p.title.toLowerCase().includes(termo.toLowerCase()))
    : produtos;

  if (!filtrados || filtrados.length === 0) {
    container.innerHTML = '<p class="sem-produtos">Nenhum produto encontrado.</p>';
    return;
  }

  container.innerHTML = filtrados.map(produto => {
    const imgSrc     = produto.thumbnail || '';
    const link       = produto.affiliate_link || '#';
    const preco      = produto.price ? formatarPreco(produto.price) : 'Ver preço';
    const condicao   = formatarCondicao(produto.condition);
    const favoritado = window.Auth?.ehFavorito(produto.id) ? 'favoritado' : '';

    const avaliacaoHtml = produto.reviews?.rating ? `
      <div class="product-reviews">
        <span class="stars">${renderizarEstrelas(produto.reviews.rating)}</span>
        <span class="rating-value">${produto.reviews.rating.toFixed(1)}</span>
        ${produto.reviews.count ? `<span class="review-count">(${produto.reviews.count})</span>` : ''}
      </div>` : '';

    const vendidosHtml = produto.sold
      ? `<span class="product-sold">${formatarVendidos(produto.sold)}</span>` : '';

    return `
      <div class="card">
        <button
          class="btn-favorito ${favoritado}"
          data-fav-id="${produto.id}"
          title="${favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
          onclick="window.Auth?.toggleFavorito('${produto.id}', this)"
        >♡</button>
        <a href="${link}" target="_blank" rel="noopener noreferrer">
          <img class="product-img" src="${imgSrc}" alt="${produto.title}"
               loading="lazy" onerror="this.style.display='none'" />
        </a>
        <div class="card-body">
          ${condicao ? `<span class="product-condition">${condicao}</span>` : ''}
          <p class="product-title">${produto.title}</p>
          ${avaliacaoHtml}
          ${vendidosHtml}
          <p class="product-price">${preco}</p>
          <div class="button-group">
            <a class="btn-ver-ml" href="${link}" target="_blank" rel="noopener noreferrer">
              Comprar no Site
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

let todosOsProdutos = [];

async function carregarProdutos() {
  const container = document.getElementById('produtos-ml');
  if (!container) return;
  container.innerHTML = '<div class="loading">Carregando produtos…</div>';

  try {
    const resposta = await fetch('/api/produtos');
    if (!resposta.ok) throw new Error(`Erro ${resposta.status}`);
    todosOsProdutos = await resposta.json();
    renderizarProdutos(todosOsProdutos);
  } catch (erro) {
    container.innerHTML = `
      <div class="erro">Não foi possível carregar os produtos.<br><small>${erro.message}</small></div>`;
  }
}

function configurarBusca() {
  const intervalo = setInterval(() => {
    const form = document.querySelector('.nav-search');
    if (!form) return;
    clearInterval(intervalo);
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const termo = form.querySelector('input[type="text"]')?.value?.trim() || '';
      renderizarProdutos(todosOsProdutos, termo);
      document.getElementById('container-produtos')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  configurarBusca();
});