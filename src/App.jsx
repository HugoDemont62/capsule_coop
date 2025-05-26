import React, { useState, useEffect } from 'react';
import './App.css';
import NewsGame from './components/NewsGame';
import { apiManager } from './services/apiManager';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState({});

  useEffect(() => {
    // Test des APIs au démarrage
    const initAPIs = async () => {
      try {
        const status = await apiManager.testAPIs();
        setApiStatus(status);
        console.log('📊 Status des APIs:', status);
      } catch (error) {
        console.error('❌ Erreur lors du test des APIs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAPIs();
  }, []);

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading-screen">
            <div className="spinner"></div>
            <h2>🎮 CAPSULE NEWS 📰</h2>
            <p>Initialisation des APIs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1 className="logo">CAPSULE NEWS</h1>
          <p className="subtitle">Quiz d'actualités interactif</p>
          <p className="description">Explorez l'univers de l'information • Vrai ou Faux ?</p>

          {/* Indicateur de statut des APIs */}
          <div className="api-status">
            <span className={`status-dot ${apiStatus.newsAPI ? 'online' : 'offline'}`}></span>
            <span className={`status-dot ${apiStatus.factCheckAPI ? 'online' : 'offline'}`}></span>
            <span className={`status-dot ${apiStatus.uselessFactsAPI ? 'online' : 'offline'}`}></span>
            <span className={`status-dot ${apiStatus.apiNinjas ? 'online' : 'offline'}`}></span>
            <small>Système connecté</small>
          </div>
        </header>

        <NewsGame apiStatus={apiStatus} />
      </div>
    </div>
  );
}

export default App;