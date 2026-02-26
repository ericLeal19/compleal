export default async function handler(req, res) {
  // Você precisaria de uma API de terceiros ou scraping
  // Exemplo com a API da Amazon (via RapidAPI)
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'amazon-price1.p.rapidapi.com'
    }
  };

  try {
    // Busca produtos de informática na Amazon
    const resposta = await fetch('https://amazon-price1.p.rapidapi.com/search?keywords=notebook&marketplace=BR', options);
    const dados = await resposta.json();
    
    // Converte para o formato que seu frontend espera
    const produtos = dados.result.map(item => ({
      id: item.asin,
      title: item.title,
      price: item.price.current_price,
      thumbnail: item.thumbnail,
      permalink: `https://www.amazon.com.br/dp/${item.asin}?tag=SEUCODIGO-20`,
      rating: item.reviews.rating,
      sold_quantity: item.reviews.total_reviews
    }));
    
    res.status(200).json(produtos);
    
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Falha na busca' });
  }
}