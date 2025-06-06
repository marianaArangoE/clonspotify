// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { getSpotifyAuthUrl } from "../services/spotifyAuth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import SpotifyBadge from "../components/SpotifyBadge";
import { useAuth } from "../hooks/useAuth";
import {
  clearSpotifyTokens,
  cacheSpotifyTokens,
  getStoredTokens,
  logoutSpotifySession,
} from "../services/spotifyService";
import "../styles/Profile.css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [spotifyLinked, setSpotifyLinked] = useState(!!getStoredTokens());
  const navigate = useNavigate();
  const { handleLogout } = useAuth();

  // 1) Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2) Al entrar usuario, importamos tokens desde Firestore
  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const s = snap.data().spotify;
        if (s?.access_token && s?.refresh_token && s?.expiry) {
          cacheSpotifyTokens({
            access_token: s.access_token,
            refresh_token: s.refresh_token,
            expires_in: Math.floor((s.expiry - Date.now()) / 1000),
          });
          setSpotifyLinked(true);
        }
      })
      .catch((e) => console.error("❌ Error cargando tokens:", e));
  }, [user]);

  // 3) Vincular o Re-vincular Spotify
  const handleLinkSpotify = async () => {
    try {
      // Limpia TODO cache local y cookies remotas
      clearSpotifyTokens({ force: true });
      await logoutSpotifySession();

      // Genera URL con diálogo forzado
      const authUrl = await getSpotifyAuthUrl({ showDialog: true });
      // Redirige
      window.location.href = authUrl;
    } catch (err) {
      console.error("❌ Error iniciando flujo Spotify:", err);
      setError("Hubo un problema al vincular tu cuenta de Spotify.");
    }
  };

  // 4) Cerrar sesión total (Spotify + Firebase)
  const handleFullLogout = async () => {
    try {
      // 4.1) Limpia cookies remotas
      await logoutSpotifySession();
      // 4.2) Limpia cache local
      clearSpotifyTokens({ force: true });
      setSpotifyLinked(false);
      // 4.3) Logout de Firebase
      await handleLogout();
      // 4.4) Redirige al login de la app
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("❌ Error cerrando sesión completa:", e);
      setError("Hubo un problema al cerrar sesión.");
    }
  };

  if (loading) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center bg-dark text-white">
        <h2>Cargando usuario…</h2>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="profile-background">
      <div
        className="d-flex justify-content-center align-items-center vh-100"
        style={{ backgroundColor: "#1c1c1e" }}
      >
        <div
          className="text-white p-5 rounded-4 position-relative"
          style={{
            width: "100%",
            maxWidth: "420px",
            backgroundColor: "#000",
            boxShadow: "0 0 40px rgba(255,0,0,0.4)",
          }}
        >
          <div className="text-center mb-4">
            <h1 style={{ fontSize: "4rem", fontWeight: 900, color: "#e50914", marginBottom: 0 }}>
              👤
            </h1>
            <h2 className="fw-bold">Perfil de Usuario</h2>
          </div>

          <div className="d-flex flex-column align-items-center gap-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="rounded-circle"
                style={{ width: 80, height: 80 }}
              />
            ) : (
              <div
                className="rounded-circle bg-secondary d-flex justify-content-center align-items-center"
                style={{ width: 80, height: 80, fontSize: "1.5rem" }}
              >
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : "NN"}
              </div>
            )}

            <p className="mb-0 font-semibold">
              {user.displayName || "Usuario sin nombre"}
            </p>
            <p className="text-muted small">{user.email}</p>

            <div className="mt-3">
              <SpotifyBadge />
            </div>

            <button
              type="button"
              onClick={handleLinkSpotify}
              className="btn btn-success mt-4 w-100 rounded-pill"
            >
              {spotifyLinked ? "Re-vincular cuenta de Spotify" : "Vincular cuenta de Spotify"}
            </button>

            <button
              type="button"
              onClick={handleFullLogout}
              className="btn btn-outline-light mt-4 w-100 rounded-pill"
            >
              Cerrar sesión
            </button>

            {error && <p className="text-danger mt-3">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
