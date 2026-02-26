async function buscarProdutosMercadoLivre() {
  try {
    const resposta = await fetch('/api/produtos');
    const dados = await resposta.json();
    
    // Trava: Se não for um array (ex: for um erro 500), mostra o erro e para a função
    if (!Array.isArray(dados)) {
      console.error("A API retornou um erro:", dados);
      return; 
    }

    renderizarProdutosML(dados); 
  } catch (erro) {
    console.error('Erro de conexão com a API interna:', erro);
  }
}

function renderizarProdutosML(produtos) {
  const container = document.getElementById('produtos-ml');
  if (!container) return;

  let html = '';

  produtos.forEach(produto => {
    const linkAfiliado = `${produto.permalink}&campanha=SEU_CODIGO_DE_AFILIADO`;

    html += `
      <div class="produto-card">
        <img src="${produto.thumbnail}" alt="${produto.title}" width="150">
        <h3>${produto.title}</h3>
        <p class="preco">R$ ${produto.price.toFixed(2)}</p>
        <a href="${linkAfiliado}" target="_blank" class="btn-comprar">
          Ver Oferta no Mercado Livre
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', buscarProdutosMercadoLivre);