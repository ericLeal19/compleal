function carregarComponentes() {
    const isSubFolder = window.location.pathname.includes('/reviews/') || 
                        window.location.pathname.includes('/sobre/') ||
                        window.location.pathname.includes('/login/') ||
                        window.location.pathname.includes('/ofertas/') ||
                        window.location.pathname.includes('/mais_vendidos/') ||
                        window.location.pathname.includes('/favorito/') ||
                        window.location.pathname.includes('/carrinho/') ||
                        window.location.pathname.includes('/ajuda/');

    const prefix = isSubFolder ? '../' : './';

    // Carrega Header
    fetch(prefix + 'components/header.html')
        .then(response => response.text())
        .then(data => {
            // Corrige os caminhos automaticamente dependendo da página
            let htmlCorrigido = data
                .replace(/src="logo\//g, `src="${prefix}logo/`)
                .replace(/href="login\//g, `href="${prefix}login/`)
                .replace(/href="favorito\//g, `href="${prefix}favorito/`)
                .replace(/href="carrinho\//g, `href="${prefix}carrinho/`)
                .replace(/href="ajuda\//g, `href="${prefix}ajuda/`)
                .replace(/href="reviews\//g, `href="${prefix}reviews/`)
                .replace(/href="ofertas\//g, `href="${prefix}ofertas/`)
                .replace(/href="mais_vendidos\//g, `href="${prefix}mais_vendidos/`)
                .replace(/href="sobre\//g, `href="${prefix}sobre/`)
                .replace(/href="index\.html"/g, `href="${prefix}index.html"`);

            document.getElementById('header-placeholder').innerHTML = htmlCorrigido;
        })
        .catch(erro => console.error("Erro ao carregar o cabeçalho:", erro));

    // Carrega o Footer
    fetch(prefix + 'components/footer.html')
    .then(response => response.text())
    .then(data => {
        // Se precisar corrigir caminhos no footer também:
        let htmlCorrigido = data.replace(/href="index\.html"/g, `href="${prefix}index.html"`);
        document.getElementById('footer-placeholder').innerHTML = htmlCorrigido;
    })
    .catch(erro => console.error("Erro ao carregar o rodapé:", erro));
}

// Deixe apenas esta linha, apague o carregarComponentes() solto que tinha no fim
document.addEventListener("DOMContentLoaded", carregarComponentes);