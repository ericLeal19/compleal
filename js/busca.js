// ============================================================
//  js/busca.js — Script FRONTEND
//  Exibe os produtos cadastrados manualmente pelo admin.
//  ⚠️ Este arquivo roda no NAVEGADOR — não use import/require.
// ============================================================

const BUSCA_PADRAO = 'notebook';

// ----- Helpers -------------------------------------------------------

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
  const cheias  = Math.floor(rating);
  const meia    = rating - cheias >= 0.5 ? 1 : 0;
  const vazias  = 5 - cheias - meia;
  return '★'.repeat(cheias) + (meia ? '½' : '') + '☆'.repeat(vazias);
}

function formatarVendidos(sold) {
  if (!sold) return null;
  if (sold >= 1000) return `+${(sold / 1000).toFixed(1).replace('.', ',')}mil vendidos`;
  return `+${sold} vendidos`;
}

// ----- Renderização --------------------------------------------------

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
    const imgSrc   = produto.thumbnail || '';
    const link     = produto.affiliate_link || '#';
    const preco    = produto.price ? formatarPreco(produto.price) : 'Ver preço';
    const condicao = formatarCondicao(produto.condition);

    const avaliacaoHtml = produto.reviews?.rating ? `
      <div class="product-reviews">
        <span class="stars">${renderizarEstrelas(produto.reviews.rating)}</span>
        <span class="rating-value">${produto.reviews.rating.toFixed(1)}</span>
        ${produto.reviews.count ? `<span class="review-count">(${produto.reviews.count})</span>` : ''}
      </div>` : '';

    const vendidosHtml = produto.sold ? `
      <span class="product-sold">${formatarVendidos(produto.sold)}</span>` : '';

    return `
      <div class="card">
        <a href="${link}" target="_blank" rel="noopener noreferrer">
          <img
            class="product-img"
            src="${imgSrc}"
            alt="${produto.title}"
            loading="lazy"
            onerror="this.style.display='none'"
          />
        </a>
        <div class="card-body">
          ${condicao ? `<span class="product-condition">${condicao}</span>` : ''}
          <p class="product-title">${produto.title}</p>
          ${avaliacaoHtml}
          ${vendidosHtml}
          <p class="product-price">${preco}</p>
          <div class="button-group">
            <a class="btn-ver-ml" href="${link}" target="_blank" rel="noopener noreferrer">
              Ver no Mercado Livre
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ----- Busca ---------------------------------------------------------

let todosOsProdutos = []; // cache local para filtro sem nova requisição

async function carregarProdutos() {
  const container = document.getElementById('produtos-ml');
  if (!container) return;

  container.innerHTML = '<div class="loading">Carregando produtos…</div>';

  try {
    const resposta = await fetch('/api/produtos');

    if (!resposta.ok) {
      const erroJson = await resposta.json().catch(() => ({}));
      throw new Error(`Erro ${resposta.status}${erroJson.detalhe ? ': ' + erroJson.detalhe : ''}`);
    }

    todosOsProdutos = await resposta.json();
    renderizarProdutos(todosOsProdutos);

  } catch (erro) {
    console.error('[Busca] Erro ao carregar produtos:', erro);
    container.innerHTML = `
      <div class="erro">
        Não foi possível carregar os produtos. Tente novamente mais tarde.<br>
        <small>${erro.message}</small>
      </div>
    `;
  }
}

// ----- Formulário de busca (filtra localmente) ----------------------

function configurarBusca() {
  const intervalo = setInterval(() => {
    const form = document.querySelector('.nav-search');
    if (!form) return;
    clearInterval(intervalo);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = form.querySelector('input[type="text"]');
      const termo = input?.value?.trim() || '';
      renderizarProdutos(todosOsProdutos, termo);
      document.getElementById('container-produtos')
        ?.scrollIntoView({ behavior: 'smooth' });
    });
  }, 200);
}

// ----- Init ----------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  configurarBusca();
});