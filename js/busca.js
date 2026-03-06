// ============================================================
//  js/busca.js — Script FRONTEND
//  Exibe produtos cadastrados pelo admin
// ============================================================

let todosOsProdutos = [];

// ---- Formatadores ----

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
  if (rating >= 4.8) rating = 5;
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

// ---- Carrega a imagem com IntersectionObserver (performance)----

const observadorImagens = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }
    obs.unobserve(img);
  });
}, { rootMargin: '200px' });

// ---- Renderizacao dos produtos totais e filtrados ----

function renderizarProdutos(produtos, termo) {
  termo = termo || '';
  const container  = document.getElementById('info-produtos');
  const btnVerMais = document.getElementById('btn-ver-mais');
  if (!container) return;

  // Normaliza o termo de busca apenas UMA vez (aceita busca de títulos com acentos)
const buscaLimpa = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const filtrados = termo
  ? produtos.filter(p => 
      p.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(buscaLimpa)
    )
  : produtos;

  // Se não encontrar nenhum produto, mostra mensagem e esconde botão "ver mais"
  if (!filtrados || filtrados.length === 0) {
    container.innerHTML = '<p class="sem-produtos">Nenhum produto encontrado.</p>';
    if (btnVerMais) btnVerMais.classList.remove('visivel');
    return;
  }


  container.innerHTML = filtrados.map(function(produto) {
    // Transforma os dados do produto em HTML
    const imgSrc   = produto.thumbnail || 'Sem Imagem';
    const link     = produto.affiliate_link || '#';
    const preco    = produto.price ? formatarPreco(produto.price) : 'Ver preco';
    const condicao = formatarCondicao(produto.condition);
    const favoritado = window.Auth && window.Auth.ehFavorito(produto.id) ? 'favoritado' : '';

    const avaliacaoHtml = produto.reviews && produto.reviews.rating ? (
      '<div class="product-reviews">' +
        '<span class="stars">' + renderizarEstrelas(produto.reviews.rating) + '</span>' +
        '<span class="rating-value">' + produto.reviews.rating.toFixed(1) + '</span>' +
        (produto.reviews.count ? '<span class="review-count">(' + produto.reviews.count + ')</span>' : '') +
      '</div>'
    ) : '';

    const vendidosHtml = produto.sold
      ? '<span class="product-sold">' + formatarVendidos(produto.sold) + '</span>'
      : '';

    return (
      '<div class="card">' +
        '<button class="btn-favorito ' + favoritado + '" data-fav-id="' + produto.id + '"' +
          ' title="' + (favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '"' +
          ' onclick="window.Auth && window.Auth.toggleFavorito(\'' + produto.id + '\', this)">&#9825;</button>' +
        '<a href="' + link + '" target="_blank" rel="noopener noreferrer">' +
          '<img class="produto-img"' +
            ' src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"' +
            ' data-src="' + imgSrc + '"' +
            ' alt="' + produto.title + '"' +
            ' onerror="this.style.display=\'none\'" />' +
        '</a>' +
        '<div class="card-body">' +
          (condicao ? '<span class="product-condition">' + condicao + '</span>' : '') +
          '<p class="product-title">' + produto.title + '</p>' +
          avaliacaoHtml +
          vendidosHtml +
          '<p class="product-price">' + preco + '</p>' +
          '<div class="button-group">' +
            '<a class="btn-ver-ml" href="' + link + '" target="_blank" rel="noopener noreferrer">Comprar no Site</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  // Ativa lazy loading em todas as imagens renderizadas
  container.querySelectorAll('img[data-src]').forEach(function(img) {
    observadorImagens.observe(img);
  });

  // Mostra ou esconde o botao "ver mais"
  if (btnVerMais) {
    if (filtrados.length > 9) {
      btnVerMais.classList.add('visivel');
    } else {
      btnVerMais.classList.remove('visivel');
    }
  }
}

// ---- Carregamento dos produtos ----

async function carregarProdutos() {
  const container = document.getElementById('info-produtos');
  if (!container) return;
  container.innerHTML = '<div class="loading">Carregando produtos</div>';

  // Processa os produtos do backend (/api/produtos) e renderiza
  try {
    const resposta = await fetch('/api/produtos');
    if (!resposta.ok) throw new Error('Erro ' + resposta.status);
    todosOsProdutos = await resposta.json();
    renderizarProdutos(todosOsProdutos);
  } catch (erro) {
    container.innerHTML =
      '<div class="erro">Não foi possivel carregar os produtos.<br><small>' + erro.message + '</small></div>';
  }
}


// ---- Busca na caixa de pesquisa----

function configurarBusca() {
  const intervalo = setInterval(function() {
    const form = document.querySelector('.entrada-busca');
    if (!form) return;
    clearInterval(intervalo);
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const input = form.querySelector('input[type="text"]');
      const termo = input ? input.value.trim() : '';
      renderizarProdutos(todosOsProdutos, termo);
    });
  }, 200);
}

// ---- Botao "Ver mais" ----

function configurarBtnVerMais() {
  const btn  = document.getElementById('btn-ver-mais');
  const grid = document.getElementById('info-produtos');
  if (!btn || !grid) return;

  btn.addEventListener('click', function() {
    grid.classList.add('mostrar-todos');
    btn.classList.remove('visivel');

    // Ativa lazy loading nos cards que acabaram de aparecer
    grid.querySelectorAll('img[data-src]').forEach(function(img) {
      observadorImagens.observe(img);
    });
  });
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', function() {
  carregarProdutos();
  configurarBusca();
  configurarBtnVerMais();
});