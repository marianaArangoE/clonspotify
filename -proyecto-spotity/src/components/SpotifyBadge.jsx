// src/components/SpotifyBadge.jsx
import { useEffect, useState } from "react";
import { getSpotifyAccessToken, clearSpotifyTokens } from "../services/spotifyService";

export default function SpotifyBadge() {
  const [status, setStatus] = useState("checking");
  const [spotifyUser, setSpotifyUser] = useState(null);

  useEffect(() => {
    const fetchSpotifyUser = async () => {
      const token = await getSpotifyAccessToken();
      if (!token) {
        setStatus("disconnected");
        return;
      }

      try {
        const res = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearSpotifyTokens();
          setStatus("disconnected");
        } else if (res.ok) {
          const data = await res.json();
          setSpotifyUser(data);
          setStatus("connected");
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    };

    fetchSpotifyUser();
  }, []);

  if (status === "checking") {
    return <span>⏳ Verificando Spotify...</span>;
  }

  if (status === "connected" && spotifyUser) {
    const avatarUrl = spotifyUser.images?.[0]?.url || "";
    const displayName = spotifyUser.display_name || "Usuario desconocido";
    const email = spotifyUser.email || "Correo no disponible";

    return (
      <div>
        <span>🎵 Spotify conectado</span>
        <div>
          {avatarUrl && <img src={avatarUrl} alt="Spotify Avatar" />}
          <p>{displayName}</p>
          <p>{email}</p>
        </div>
      </div>
    );
  }

  if (status === "disconnected") {
    return <span>❌ Spotify no vinculado</span>;
  }

  if (status === "error") {
    return <span>⚠️ Error al validar Spotify</span>;
  }

  return null;
}
