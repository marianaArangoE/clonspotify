// src/App.jsx

import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useApi from './hooks/useApi';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

// Hooks
import { usePersistSpotifyTokens } from './hooks/usePersistSpotifyTokens';

// Páginas
import Login    from './pages/Loging';   // si renombraras Loging.jsx → Login.jsx, aquí pondrías './pages/Login'
import Loading  from './pages/Loading';
import Profile  from './pages/Profile';
import Callback from './pages/Callback';

function Home() {
  const [count, setCount] = useState(0);
  const { data, loading, error } = useApi("https://jsonplaceholder.typicode.com/posts/1");

  useEffect(() => {
    console.log("✅ Firebase está conectado");
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React Esta monda</h1>
      <div className="card">
        <button onClick={() => setCount(count + 1)}>
          count is {count}
        </button>
        <p>Edit <code>src/App.jsx</code> and save to test HMR</p>
      </div>

      <h2>🌐 Ejemplo de uso de useApi</h2>
      {loading && <p>Cargando datos...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && (
        <div>
          <h3>Título: {data.title}</h3>
          <p>Cuerpo: {data.body}</p>
        </div>
      )}

      <Link to="/login" className="text-blue-500 underline mt-4 block">
        Ir al Login
      </Link>
    </>
  );
}

function App() {
  // Reinyecta tokens de Spotify si ya están en Firestore
  usePersistSpotifyTokens();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/loading" element={<Loading />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
    </Routes>
  );
}

export default App;
