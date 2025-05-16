// src/hooks/useAuth.js

import { useState, useCallback } from "react";
import { useNavigate }            from "react-router-dom";
import { signInWithPopup, signOut } from "firebase/auth";

// 🔑 IMPORT CORRECTO de tus exports de Firebase (están en services/firebase.js)
import {
  auth,
  googleProvider,
  facebookProvider
} from "../services/firebase";

// 🔑 IMPORT CORRECTO de tu helper de Spotify (está en services/spotifyAuth.js)
import { getSpotifyAuthUrl } from "../services/spotifyAuth";

// ————————————————————————————————————————
// Utils de limpieza de sesión
// ————————————————————————————————————————

function clearSpotifyTokens() {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_expiry");
  localStorage.removeItem("spotify_code_verifier");
}

async function clearAllSessions() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("⚠️ No se pudo cerrar sesión de Firebase:", err);
  }
}

// ————————————————————————————————————————
// Hook de autenticación
// ————————————————————————————————————————

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const navigate              = useNavigate();

  const handleGoogleLogin = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await clearAllSessions();
      clearSpotifyTokens();
      await signInWithPopup(auth, googleProvider);
      const url = await getSpotifyAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Error con Google login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleFacebookLogin = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await clearAllSessions();
      clearSpotifyTokens();
      await signInWithPopup(auth, facebookProvider);
      const url = await getSpotifyAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Error con Facebook login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    clearAllSessions();
    clearSpotifyTokens();
    navigate("/login", { replace: true });
  }, [navigate]);

  return {
    loading,
    error,
    handleGoogleLogin,
    handleFacebookLogin,
    handleLogout,
  };
}
