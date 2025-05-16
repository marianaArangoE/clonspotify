// src/hooks/usePersistSpotifyTokens.js

import { useEffect } from "react";
import { auth }       from "../services/firebase";
import {
  getFirestore,
  doc,
  getDoc
} from "firebase/firestore";

/**
 * Al cambiar el usuario de Firebase:
 *  – Si ya hay tokens Spotify en Firestore y NO están en localStorage,
 *    los vuelca allí para no tener que volver a vincular.
 *  – Si user === null (logout), borra también los tokens de localStorage.
 */
export function usePersistSpotifyTokens() {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Si cerró sesión, limpia todo
      if (!user) {
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_refresh_token");
        localStorage.removeItem("spotify_token_expiry");
        return;
      }

      // Sólo si NO hay ya un access_token
      if (!localStorage.getItem("spotify_access_token")) {
        try {
          const db     = getFirestore();              // usa tu app por defecto
          const ref    = doc(db, "users", user.uid);
          const snap   = await getDoc(ref);
          const spotify = snap.exists() && snap.data().spotify;
          if (spotify?.access_token && spotify?.refresh_token && spotify?.expiry) {
            localStorage.setItem("spotify_access_token", spotify.access_token);
            localStorage.setItem("spotify_refresh_token", spotify.refresh_token);
            localStorage.setItem("spotify_token_expiry", spotify.expiry);
            console.log("✅ Tokens de Spotify persistidos desde Firestore");
          }
        } catch (e) {
          console.warn("❌ No se pudo cargar tokens de Spotify:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);
}
