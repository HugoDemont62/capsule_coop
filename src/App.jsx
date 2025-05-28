// src/App.jsx - VERSION AVEC TWITCH INTÉGRÉ
import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/twitch.css'; // ⭐ AJOUTER L'IMPORT CSS TWITCH
import NewsGame from './components/NewsGame';
import TwitchAuthHandler from './components/TwitchAuthHandler'; // ⭐ AJOUTER LE HANDLER
import { apiManager } from './services/apiManager';
import { twitchService } from './services/twitchService'; // ⭐ AJOUTER LE SERVICE

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState({});
  
  // ⭐ ÉTATS TWITCH
  const [twitchStatus, setTwitchStatus] = useState({
    isAuthenticated: false,
    isConnected: false,
    username: null,
    isConnecting: false
  });

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

    // ⭐ INITIALISER TWITCH
    initTwitch();
  }, []);

  // ⭐ FONCTION D'INITIALISATION TWITCH
  const initTwitch = () => {
    // Vérifier si on a déjà un token
    const savedToken = localStorage.getItem('twitch_access_token');
    const savedUsername = localStorage.getItem('twitch_username');

    if (savedToken && savedUsername) {
      setTwitchStatus(prev => ({
        ...prev,
        isAuthenticated: true,
        username: savedUsername
      }));
    }

    // ⭐ ÉCOUTER LES ÉVÉNEMENTS TWITCH
    window.addEventListener('twitch-auth-success', (event) => {
      console.log('✅ Authentification Twitch réussie:', event.detail);
      setTwitchStatus(prev => ({
        ...prev,
        isAuthenticated: true,
        username: event.detail.username
      }));
    });

    // Callback pour changement de connexion
    twitchService.setOnConnectionChange((connected) => {
      setTwitchStatus(prev => ({
        ...prev,
        isConnected: connected,
        isConnecting: false
      }));
    });
  };

  // ⭐ GESTION DE L'AUTHENTIFICATION TWITCH
  const handleTwitchAuth = async () => {
    try {
      setTwitchStatus(prev => ({ ...prev, isConnecting: true }));
      await twitchService.authenticate();
      
      // L'état sera mis à jour via l'événement window
    } catch (error) {
      console.error('❌ Erreur auth Twitch:', error);
      setTwitchStatus(prev => ({ ...prev, isConnecting: false }));
    }
  };

  // ⭐ CONNEXION AU CHAT
  const handleTwitchConnect = async () => {
    try {
      setTwitchStatus(prev => ({ ...prev, isConnecting: true }));
      await twitchService.connectToChat();
    } catch (error) {
      console.error('❌ Erreur connexion chat:', error);
      setTwitchStatus(prev => ({ ...prev, isConnecting: false }));
    }
  };

  // ⭐ DÉCONNEXION
  const handleTwitchDisconnect = () => {
    twitchService.disconnect();
    localStorage.removeItem('twitch_access_token');
    localStorage.removeItem('twitch_username');
    localStorage.removeItem('twitch_user_id');
    localStorage.removeItem('twitch_display_name');
    
    setTwitchStatus({
      isAuthenticated: false,
      isConnected: false,
      username: null,
      isConnecting: false
    });
  };

  if (isLoading) {
    return (
        <div className="app">
          <div className="container">
            <div className="loading-screen">
              <div className="spinner"></div>
              <h2>🎮 CAPSULE NEWS 📰</h2>
              <p>Initialisation des APIs et traduction...</p>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="app">
        {/* ⭐ HANDLER D'AUTHENTIFICATION TWITCH */}
        <TwitchAuthHandler />
        
        <div className="container">
          <header className="header">
            <h1 className="logo">CAPSULE NEWS</h1>
            <p className="subtitle">Quiz d'actualités insolites interactif</p>
            <p className="description">Vraies actualités bizarres vs Fausses news délirantes • Vrai ou Faux ?</p>

            {/* ⭐ STATUS CONTAINER AVEC APIS ET TWITCH */}
            <div className="status-container">
              {/* Indicateur de statut des APIs */}
              <div className="api-status">
                <span className={`status-dot ${apiStatus.guardianAPI ? 'online' : 'offline'}`}></span>
                <span className={`status-dot ${apiStatus.gnewsAPI ? 'online' : 'offline'}`}></span>
                <span className={`status-dot ${apiStatus.currentsAPI ? 'online' : 'offline'}`}></span>
                <span className={`status-dot ${apiStatus.translation ? 'online' : 'offline'}`}></span>
                <small>Articles Complets + Traduction 🇫🇷</small>
              </div>

              {/* ⭐ STATUS TWITCH EN HAUT À DROITE */}
              <div className="twitch-header-status">
                <div className="twitch-status-mini">
                  <span className="twitch-icon">📺</span>
                  <div className="twitch-info">
                    {!twitchStatus.isAuthenticated ? (
                      <button 
                        className="btn-twitch-mini auth" 
                        onClick={handleTwitchAuth}
                        disabled={twitchStatus.isConnecting}
                      >
                        {twitchStatus.isConnecting ? '⏳' : '🔐'} Se connecter à Twitch
                      </button>
                    ) : !twitchStatus.isConnected ? (
                      <div className="twitch-authenticated">
                        <span className="twitch-user">👋 {twitchStatus.username}</span>
                        <button 
                          className="btn-twitch-mini connect" 
                          onClick={handleTwitchConnect}
                          disabled={twitchStatus.isConnecting}
                        >
                          {twitchStatus.isConnecting ? '⏳' : '💬'} Rejoindre le chat
                        </button>
                      </div>
                    ) : (
                      <div className="twitch-connected">
                        <span className="twitch-user">🎮 {twitchStatus.username}</span>
                        <span className="twitch-status-text">Chat connecté ✅</span>
                        <button 
                          className="btn-twitch-mini disconnect" 
                          onClick={handleTwitchDisconnect}
                        >
                          🔌 Déconnecter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <NewsGame apiStatus={apiStatus} />
        </div>
      </div>
  );
}

export default App;
