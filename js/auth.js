// ============================================================
//  js/auth.js — Frontend: gerencia JWT, login/logout, favoritos
//  Inclua ANTES de busca.js em todas as páginas
// ============================================================

const AUTH_KEY = 'compleal_token';

// ---- Token --------------------------------------------------------
function getToken()          { return localStorage.getItem(AUTH_KEY); }
function setToken(t)         { localStorage.setItem(AUTH_KEY, t); }
function removeToken()       { localStorage.removeItem(AUTH_KEY); }

function getUsuario() {
  const token = getToken();
  if (!token) return null;
  try {
    // JWT payload é a parte do meio (base64)
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

function estaLogado() { return !!getUsuario(); }

// ---- Requisição autenticada ---------------------------------------
async function fetchAuth(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ---- Captura token vindo do Google callback (?token=...) ----------
function capturarTokenDaUrl() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const erro   = params.get('erro');

  if (token) {
    setToken(token);
    // Limpa a URL sem recarregar a página
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (erro) {
    console.warn('[Auth] Erro no login:', erro);
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// ---- Favoritos ----------------------------------------------------
let _favoritosCache = new Set();

async function carregarFavoritos() {
  if (!estaLogado()) return;
  try {
    const resp = await fetchAuth('/api/favoritos');
    if (resp.ok) {
      const lista = await resp.json();
      _favoritosCache = new Set(lista.map(p => p.id));
      atualizarBotoesFavorito();
    }
  } catch {}
}

async function toggleFavorito(produto_id, btn) {
  if (!estaLogado()) {
    window.location.href = '/login/';
    return;
  }

  const eraFavorito = _favoritosCache.has(produto_id);

  if (eraFavorito) {
    await fetchAuth(`/api/favoritos?id=${produto_id}`, { method: 'DELETE' });
    _favoritosCache.delete(produto_id);
  } else {
    await fetchAuth('/api/favoritos', {
      method: 'POST',
      body:   JSON.stringify({ produto_id }),
    });
    _favoritosCache.add(produto_id);
  }

  if (btn) {
    btn.classList.toggle('favoritado', _favoritosCache.has(produto_id));
    btn.title = _favoritosCache.has(produto_id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  }
}

function ehFavorito(produto_id) { return _favoritosCache.has(produto_id); }

function atualizarBotoesFavorito() {
  document.querySelectorAll('[data-fav-id]').forEach(btn => {
    const id = btn.getAttribute('data-fav-id');
    btn.classList.toggle('favoritado', _favoritosCache.has(id));
    btn.title = _favoritosCache.has(id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  });
}

// ---- UI: botão de login/logout no header --------------------------
function atualizarHeaderAuth() {
  const usuario = getUsuario();
  const btn = document.getElementById('btn-header-auth');
  if (!btn) return;

  if (usuario) {
    const i1 = (usuario.nome || '').trim()[0] || '';
    const i2 = (usuario.sobrenome || '').trim()[0] || '';
    btn.innerHTML = '<span class="iniciais-login">' + (i1+i2).toUpperCase() + '</span>';
    btn.href = '/login/login.html';
    btn.title = 'Minha conta';
    btn.style.padding = '4px';
  } else {
    btn.innerHTML = '<img class="imgLogin" src="../logo/Persona.png" alt="Imagen de Login"><br><strong>Login</strong>';
    btn.href = '/login/login.html';
    btn.title = 'Fazer login';
    btn.style.padding = '';
  }
}

// Aguarda o header ser injetado via fetch antes de atualizar o botão
function observarHeader() {
  if (document.getElementById('btn-header-auth')) { atualizarHeaderAuth(); return; }
  const placeholder = document.getElementById('cabeca-menu');
  if (!placeholder) return;
  const obs = new MutationObserver(function() {
    if (document.getElementById('btn-header-auth')) { obs.disconnect(); atualizarHeaderAuth(); }
  });
  obs.observe(placeholder, { childList: true, subtree: true });
}

function logout() {
  removeToken();
  window.location.href = '/';
}

// ---- Init ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  capturarTokenDaUrl();
  observarHeader(); // ← era atualizarHeaderAuth()
  carregarFavoritos();
});

// Expõe globalmente para uso inline no HTML
window.Auth = {
  estaLogado, getUsuario, getToken, setToken, removeToken,
  fetchAuth, toggleFavorito, ehFavorito, logout, atualizarHeaderAuth,
};
