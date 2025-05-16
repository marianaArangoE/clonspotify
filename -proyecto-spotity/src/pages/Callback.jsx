// src/pages/Callback.jsx

import { useEffect, useState, useRef } from "react";
import { useNavigate }                from "react-router-dom";
import app, { auth }                  from "../services/firebase";
import { CLIENT_ID, REDIRECT_URI }    from "../services/spotifyAuth";
import { cacheSpotifyTokens }         from "../services/spotifyService";
import { getFirestore, doc, setDoc }  from "firebase/firestore";

export default function Callback() {
  const [status, setStatus] = useState("Conectando con Spotify…");
  const navigate = useNavigate();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    // Si a los 10s no hemos avanzado, avisamos y redirigimos
    const fallbackTimer = setTimeout(() => {
      if (status === "Conectando con Spotify…") {
        setStatus("❌ Tiempo de espera agotado. Vuelve a intentarlo.");
        // descomenta si quieres auto-redirigir:
        // navigate("/login", { replace: true });
      }
    }, 10000);

    const params       = new URLSearchParams(window.location.search);
    const code         = params.get("code");
    const codeVerifier = localStorage.getItem("spotify_code_verifier");

    console.log("[Callback] code:", code);
    console.log("[Callback] codeVerifier:", codeVerifier);

    // Limpiar URL y almacenamiento temporal
    window.history.replaceState({}, "", REDIRECT_URI);
    localStorage.removeItem("spotify_code_verifier");

    if (!code || !codeVerifier) {
      const msg = !code
        ? "❌ Error: no recibí el parámetro `code`."
        : "❌ Error: no encontré el `code_verifier` en localStorage.";
      console.warn("[Callback]", msg);
      setStatus(msg);
      clearTimeout(fallbackTimer);
      return;
    }

    (async () => {
      try {
        const body = new URLSearchParams({
          grant_type:    "authorization_code",
          code,
          redirect_uri:  REDIRECT_URI,
          client_id:     CLIENT_ID,
          code_verifier: codeVerifier,
        });

        const res  = await fetch("https://accounts.spotify.com/api/token", {
          method:  "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });

        const data = await res.json();
        console.log("[Callback] token response:", data);

        if (res.ok && data.access_token) {
          // 1) Guardar tokens para la sesión actual
          cacheSpotifyTokens(data);

          // 2) Persistir en Firestore
          const db   = getFirestore(app);
          const user = auth.currentUser;
          if (user) {
            await setDoc(
              doc(db, "users", user.uid),
              {
                spotify: {
                  access_token:  data.access_token,
                  refresh_token: data.refresh_token,
                  expiry:        Date.now() + data.expires_in * 1000,
                },
              },
              { merge: true }
            );
          }

          setStatus("✅ Spotify vinculado con éxito!");
          clearTimeout(fallbackTimer);
          setTimeout(() => navigate("/profile"), 800);
        } else {
          console.error("[Callback] Spotify auth error:", data);
          const errMsg =
            data.error === "invalid_grant"
              ? "❌ Código inválido, reinicia el flujo."
              : `❌ ${data.error_description || "Falló la autenticación"}`;
          setStatus(errMsg);
          clearTimeout(fallbackTimer);
        }
      } catch (err) {
        console.error("[Callback] network error:", err);
        setStatus("❌ Error de red con Spotify.");
        clearTimeout(fallbackTimer);
      }
    })();

    return () => clearTimeout(fallbackTimer);
  }, [navigate, status]);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-white">
      <h1>{status}</h1>
    </div>
  );
}