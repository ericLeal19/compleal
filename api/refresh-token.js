// ============================================================
//  /api/refresh-token.js — Vercel Serverless Function
//  Renova o Access Token do ML usando o Refresh Token (ML_TG)
//  Chamado automaticamente quando a API retorna 401
// ============================================================

export default async function handler(req, res) {
  const clientId     = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const refreshToken = process.env.ML_TG; // TG- é o Refresh Token

  if (!clientId || !clientSecret || !refreshToken) {
    return res.status(500).json({
      erro: 'Credenciais ausentes',
      detalhe: 'Verifique ML_CLIENT_ID, ML_CLIENT_SECRET e ML_TG no .env.local e na Vercel'
    });
  }

  try {
    const resposta = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json({
        erro: 'Falha ao renovar token',
        detalhe: dados
      });
    }

    // Retorna os novos tokens para uso imediato
    return res.status(200).json({
      access_token:  dados.access_token,
      refresh_token: dados.refresh_token,
      expires_in:    dados.expires_in // segundos (normalmente 21600 = 6h)
    });

  } catch (erro) {
    return res.status(500).json({ erro: 'Erro interno', detalhe: erro.message });
  }
}