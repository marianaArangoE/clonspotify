// spotifyService.js
import { auth } from "./firebase";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

const BASE_KEY = "spotify_token_data";
const GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 días en ms

const db = getFirestore();

function namespacedKey(uid) {
  return `${BASE_KEY}_${uid}`;
}

function namespacedLastKey(uid) {
  return `${BASE_KEY}_${uid}_last_linked`;
}

// Referencia a documento de "gracia" de este usuario
function graceDocRef(uid) {
  return doc(db, "spotifyGrace", uid);
}

/**
 * Busca en localStorage la entrada de tokens del usuario actual.
 */
function findRawEntry() {
  const user = auth.currentUser;
  if (user) {
    const key = namespacedKey(user.uid);
    const raw = localStorage.getItem(key);
    if (raw != null) return { raw, key };
  }
  const rawBase = localStorage.getItem(BASE_KEY);
  if (rawBase != null) return { raw: rawBase, key: BASE_KEY };
  return null;
}

/**
 * Lee los tokens; si han pasado >3d desde la última vinculación,
 * los limpia (local + remoto) y devuelve null.
 */
export async function getStoredTokens() {
  const entry = findRawEntry();
  if (!entry) return null;

  let tokens;
  try {
    tokens = JSON.parse(entry.raw);
  } catch (err) {
    console.error("Error parseando Spotify tokens:", err);
    await clearSpotifyTokens({ force: true });
    return null;
  }

  const user = auth.currentUser;
  if (user) {
    const lastKey = namespacedLastKey(user.uid);
    let last = localStorage.getItem(lastKey);

    // 1) Si no hay timestamp local, lo traemos de Firestore y cacheamos
    if (!last) {
      const snap = await getDoc(graceDocRef(user.uid));
      if (snap.exists()) {
        last = String(snap.data().lastLinked);
        localStorage.setItem(lastKey, last);
      }
    }

    // 2) Si existe timestamp y ya expiró la gracia, limpio todo
    if (last && Date.now() - parseInt(last, 10) > GRACE_MS) {
      await clearSpotifyTokens({ force: true });
      return null;
    }
  }

  // Migración base → namespaced (solo la primera vez)
  if (entry.key === BASE_KEY && user) {
    localStorage.setItem(namespacedKey(user.uid), entry.raw);
    localStorage.removeItem(BASE_KEY);
  }

  return tokens;  // { access_token, refresh_token, expires_at }
}

/**
 * Guarda tokens y marca "last linked" (local + Firestore).
 */
export async function cacheSpotifyTokens({ access_token, refresh_token, expires_in }) {
  const now     = Date.now();
  const payload = JSON.stringify({
    access_token,
    refresh_token,
    expires_at: now + expires_in * 1000,
  });

  const user = auth.currentUser;
  if (!user) return;

  // 1) Local
  localStorage.setItem(namespacedKey(user.uid), payload);
  localStorage.setItem(namespacedLastKey(user.uid), String(now));

  // 2) Firestore
  await setDoc(graceDocRef(user.uid), {
    lastLinked: now
  });
}

/**
 * Borra tokens local y remoto si expiró la gracia o force=true.
 */
export async function clearSpotifyTokens({ force = false } = {}) {
  const user = auth.currentUser;
  if (!user) return;

  const last = localStorage.getItem(namespacedLastKey(user.uid));

  // Si aún estamos dentro de la ventana de gracia y no es force → no borrar
  if (!force && last && Date.now() - parseInt(last, 10) < GRACE_MS) {
    return;
  }

  // Borra localStorage
  Object.keys(localStorage).forEach(k => {
    if (k === BASE_KEY || k.startsWith(`${BASE_KEY}_`)) {
      localStorage.removeItem(k);
    }
  });
  localStorage.removeItem("spotify_code_verifier");

  // Borra Firestore
  await deleteDoc(graceDocRef(user.uid));
}

/**
 * Cierra sesión en Spotify & Google (popups).
 */
export async function logoutSpotifySession() {
  const spotifyWin = window.open(
    "https://accounts.spotify.com/logout",
    "SpotifyLogout",
    "width=200,height=100"
  );
  const googleWin = window.open(
    "https://accounts.google.com/Logout",
    "GoogleLogout",
    "width=200,height=100"
  );
  await new Promise(resolve => {
    setTimeout(() => {
      spotifyWin?.close();
      googleWin?.close();
      resolve();
    }, 1000);
  });
}

/**
 * Retorna un access_token válido, refrescándolo si es necesario.
 * IMPORTANTE: siempre usar `await getSpotifyAccessToken()`
 */
export async function getSpotifyAccessToken() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  const { access_token, refresh_token, expires_at } = tokens;
  // Si el token aún es válido por 1+ minuto:
  if (Date.now() < expires_at - 60_000) {
    return access_token;
  }

  // Sino: renovar
  try {
    const params = new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token,
      client_id:     import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    });
    const res  = await fetch("https://accounts.spotify.com/api/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    params,
    });
    const data = await res.json();
    if (!data.access_token) {
      console.error("Error al renovar token:", data);
      await clearSpotifyTokens({ force: true });
      return null;
    }
    await cacheSpotifyTokens({
      access_token:  data.access_token,
      refresh_token: data.refresh_token || refresh_token,
      expires_in:    data.expires_in,
    });
    return data.access_token;
  } catch (err) {
    console.error("Error al renovar token:", err);
    await clearSpotifyTokens({ force: true });
    return null;
  }
}
