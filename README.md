# compleal.com.br

## Cores
| Nome              | Hex     |
|-------------------|---------|
| AzulEscuro_Logo   | #1c1a41 |
| Laranja_Logo      | #ff9113 |
| F_AzulCinza_Claro | #f4f2ff |
| F_Azul_Claro      | #4e6c76 |
| F_Azul_Escuro     | #0d0b26 |

**Fonte do Logo:** League Spartan

---

## Configuração dos Tokens do Mercado Livre (Renovação Automática)

### Pré-requisitos
- Projeto na Vercel com as variáveis: `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `ML_REDIRECT_URI`
- Banco **Upstash Redis** criado em **Vercel → Storage → Upstash → Create → Redis**
  - Após criar, clique em **Connect to Project** (as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` são adicionadas automaticamente)

### Instalação
```bash
npm install @upstash/redis
```

### Fluxo de configuração (feito apenas uma vez)

1. **Gerar os tokens iniciais:**
   Acesse `https://compleal.com.br/api/auth` e siga o fluxo OAuth.
   O `/api/callback` exibirá o `ML_ACCESS_TOKEN` e o `ML_TG`.

2. **Salvar nas variáveis de ambiente da Vercel:**
   Adicione `ML_ACCESS_TOKEN` e `ML_TG` no painel da Vercel.

3. **Carregar os tokens no Redis:**
   Acesse `https://compleal.com.br/api/setup-tokens` uma única vez.
   ⚠️ Após executar, apague ou proteja esse arquivo.

### Renovação automática

O arquivo `vercel.json` configura um **Cron Job** que chama `/api/renovar-tokens`
a cada 5 horas, renovando o Access Token e o Refresh Token automaticamente.

```
A cada 5 horas
     │
     ▼
Cron Job → /api/renovar-tokens
     │
     ▼
Busca Refresh Token no Redis
     │
     ▼
Chama API do ML → recebe novos tokens
     │
     ▼
Salva Access Token + Refresh Token atualizados no Redis
```

### Arquivos da API
| Arquivo                    | Função                                              |
|----------------------------|-----------------------------------------------------|
| `/api/auth.js`             | Inicia o fluxo OAuth com PKCE                       |
| `/api/callback.js`         | Recebe o code e troca pelos tokens                  |
| `/api/setup-tokens.js`     | Salva os tokens iniciais no Redis (executar 1 vez)  |
| `/api/renovar-tokens.js`   | Renova os tokens automaticamente (Cron Job)         |
| `/api/produtos.js`         | Busca produtos no ML usando o token do Redis        |
| `vercel.json`              | Configura o Cron Job (a cada 5 horas)               |