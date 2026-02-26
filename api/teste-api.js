// teste-api.js
async function testarAPI() {
  try {
    const resposta = await fetch('/api/produtos');
    const dados = await resposta.json();
    console.log('Resposta da API:', dados);
  } catch (erro) {
    console.error('Erro:', erro);
  }
}

testarAPI();