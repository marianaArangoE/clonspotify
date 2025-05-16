import { auth } from "./firebase";

const STORAGE_KEY = "spotify_token_data";

/**
 * Guarda tokens en localStorage
 */
export function cacheSpotifyTokens({ access_token, refresh_token, expires_in }) {
  const expires_at = Date.now() + expires_in * 1000;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ access_token, refresh_token, expires_at })
  );
}

/**
 * Borra TODOS los datos de Spotify (tokens y code_verifier)
 */
export function clearSpotifyTokens() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("spotify_code_verifier");
}

/**
 * Lee los tokens en localStorage o null si no hay nada
 */
export function getStoredTokens() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearSpotifyTokens();
    return null;
  }
}

/**
 * Retorna un access_token válido, renovándolo si expiró
 */
export async function getSpotifyAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  const { access_token, refresh_token, expires_at } = tokens;
  // Si aún es válido, lo devolvemos
  if (Date.now() < expires_at - 60_000) {
    return access_token;
  }

  // Si expiró, renovamos
  const params = new URLSearchParams({
    grant_type:    "refresh_token",
    refresh_token,
    client_id:     import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  });
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params,
  });
  const data = await resp.json();
  if (!data.access_token) {
    console.error("Error al renovar token:", data);
    clearSpotifyTokens();
    return null;
  }
  // Cacheamos de nuevo con el nuevo expires_in (refresh_token llega solo la primera vez)
  cacheSpotifyTokens({
    access_token:  data.access_token,
    refresh_token: data.refresh_token || refresh_token,
    expires_in:    data.expires_in,
  });
  return data.access_token;
}

/**
 * Cierra sesión remota de Spotify y Google
 */
export function logoutSpotifySession() {
  // 1) Spotify
  const s = window.open(
    "https://accounts.spotify.com/logout",
    "SpotifyLogout",
    "width=200,height=100"
  );
  // 2) Google
  const g = window.open(
    "https://accounts.google.com/Logout",
    "GoogleLogout",
    "width=200,height=100"
  );
  setTimeout(() => {
    s?.close();
    g?.close();
  }, 1000);
}
