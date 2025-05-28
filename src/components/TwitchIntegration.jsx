// src/components/TwitchIntegration.jsx - VERSION CORRIGÉE POUR LES VOTES
import React, { useState, useEffect, useCallback } from 'react';
import { twitchService } from '../services/twitchService';

const TwitchIntegration = ({ onVoteUpdate, currentQuestionId, isQuestionActive }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [chatMessages, setChatMessages] = useState([]);
    const [votes, setVotes] = useState({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });
    const [lastVoter, setLastVoter] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // 🔄 Mettre à jour le statut
    const updateStatus = useCallback(() => {
        const status = twitchService.getConnectionStatus();
        console.log('🔄 Status update:', status); // DEBUG
        setIsConnected(status.isConnected);
        setIsAuthenticated(status.isAuthenticated);
        setVotes({
            trueVotes: status.votes.trueVotes,
            falseVotes: status.votes.falseVotes,
            totalVotes: status.votes.totalVotes
        });
    }, []);

    // 🎮 Initialisation et setup des callbacks
    useEffect(() => {
        console.log('🎮 TwitchIntegration mounted'); // DEBUG

        // Callbacks pour les événements Twitch
        twitchService.setOnConnectionChange((connected) => {
            console.log('🔌 Connection changed:', connected); // DEBUG
            setIsConnected(connected);
            setConnectionStatus(connected ? 'connected' : 'disconnected');
            updateStatus();
        });

        twitchService.setOnVoteUpdate((voteData) => {
            console.log('🗳️ Vote update received:', voteData); // DEBUG
            setVotes({
                trueVotes: voteData.trueVotes,
                falseVotes: voteData.falseVotes,
                totalVotes: voteData.totalVotes
            });
            setLastVoter(voteData.lastVoter);

            // 📤 IMPORTANT: Notifier le composant parent (NewsGame)
            if (onVoteUpdate) {
                console.log('📤 Forwarding vote to parent:', voteData); // DEBUG
                onVoteUpdate(voteData);
            } else {
                console.warn('⚠️ onVoteUpdate callback is null!'); // DEBUG
            }
        });

        twitchService.setOnChatMessage((messageData) => {
            console.log('💬 Chat message:', messageData); // DEBUG
            setChatMessages(prev => [...prev.slice(-19), messageData]);
        });

        // Vérifier l'état initial
        updateStatus();

        // 🧹 Nettoyage au démontage
        return () => {
            console.log('🧹 TwitchIntegration unmounting');
            twitchService.setOnConnectionChange(null);
            twitchService.setOnVoteUpdate(null);
            twitchService.setOnChatMessage(null);
        };
    }, [onVoteUpdate, updateStatus]);

    // 🎯 Gérer les changements de question - CORRIGÉ
    useEffect(() => {
        console.log('🎯 Question state changed:', {
            isConnected,
            currentQuestionId,
            isQuestionActive
        }); // DEBUG

        if (isConnected && currentQuestionId) {
            if (isQuestionActive) {
                console.log('▶️ Starting voting for question:', currentQuestionId); // DEBUG
                twitchService.startVoting(currentQuestionId);
            } else {
                console.log('⏹️ Stopping voting'); // DEBUG
                twitchService.stopVoting();
            }
        }
    }, [currentQuestionId, isQuestionActive, isConnected]);

    // 🔐 Authentification
    const handleAuthenticate = async () => {
        setIsLoading(true);
        setConnectionStatus('authenticating');

        try {
            console.log('🔐 Starting authentication...'); // DEBUG
            await twitchService.authenticate();
            setIsAuthenticated(true);
            updateStatus();
            console.log('✅ Authentication successful'); // DEBUG
        } catch (error) {
            console.error('❌ Auth error:', error);
            setConnectionStatus('auth-failed');
        } finally {
            setIsLoading(false);
        }
    };

    // 🔌 Connexion au chat
    const handleConnect = async () => {
        setIsLoading(true);
        setConnectionStatus('connecting');

        try {
            console.log('🔌 Connecting to chat...'); // DEBUG
            await twitchService.connectToChat();
            updateStatus();
            console.log('✅ Connected to chat'); // DEBUG
        } catch (error) {
            console.error('❌ Connection error:', error);
            setConnectionStatus('connection-failed');
        } finally {
            setIsLoading(false);
        }
    };

    // 🔌 Déconnexion
    const handleDisconnect = () => {
        console.log('🔌 Disconnecting...'); // DEBUG
        twitchService.disconnect();
        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionStatus('disconnected');
        setChatMessages([]);
        setVotes({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });
    };

    // 🧪 BOUTON DE TEST POUR DEBUG
    const handleTestVote = () => {
        console.log('🧪 Test vote simulated');
        const testVoteData = {
            trueVotes: votes.trueVotes + 1,
            falseVotes: votes.falseVotes,
            totalVotes: votes.totalVotes + 1,
            lastVoter: 'TestUser'
        };

        setVotes(testVoteData);
        if (onVoteUpdate) {
            onVoteUpdate(testVoteData);
        }
    };

    return (
      <div className="twitch-integration">
          {/* Status Connection */}
          <div className="twitch-status">
              <div className="status-header">
                  <div className="twitch-logo">📺</div>
                  <h3>Twitch Chat</h3>
                  <div className={`status-indicator ${connectionStatus}`}>
                      <span className="status-dot"></span>
                      {connectionStatus === 'connected' && <span>Connecté</span>}
                      {connectionStatus === 'connecting' && <span>Connexion...</span>}
                      {connectionStatus === 'authenticating' && <span>Authentification...</span>}
                      {connectionStatus === 'disconnected' && <span>Déconnecté</span>}
                      {connectionStatus === 'auth-failed' && <span>Erreur Auth</span>}
                      {connectionStatus === 'connection-failed' && <span>Erreur Connexion</span>}
                  </div>
              </div>

              {/* DEBUG INFO */}
              <div style={{
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  marginBottom: '10px',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px'
              }}>
                  <div>🔍 Debug Info:</div>
                  <div>Auth: {isAuthenticated ? '✅' : '❌'} | Connected: {isConnected ? '✅' : '❌'}</div>
                  <div>Question ID: {currentQuestionId || 'None'}</div>
                  <div>Voting Active: {isQuestionActive ? '✅' : '❌'}</div>
                  <div>Service Voting: {twitchService.isVotingActive ? '✅' : '❌'}</div>
              </div>

              {/* Boutons de contrôle */}
              <div className="twitch-controls">
                  {!isAuthenticated && (
                    <button
                      className="btn-twitch auth"
                      onClick={handleAuthenticate}
                      disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔐'} S'authentifier
                    </button>
                  )}

                  {isAuthenticated && !isConnected && (
                    <button
                      className="btn-twitch connect"
                      onClick={handleConnect}
                      disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔌'} Se connecter au chat
                    </button>
                  )}

                  {isConnected && (
                    <>
                        <button
                          className="btn-twitch disconnect"
                          onClick={handleDisconnect}
                        >
                            🔌 Déconnecter
                        </button>

                        {/* BOUTON DE TEST - À ENLEVER EN PRODUCTION */}
                        <button
                          className="btn-twitch"
                          onClick={handleTestVote}
                          style={{ background: 'rgba(255,165,0,0.2)', color: '#ffa500' }}
                        >
                            🧪 Test Vote
                        </button>
                    </>
                  )}
              </div>
          </div>

          {/* Compteurs de votes */}
          {(isConnected || votes.totalVotes > 0) && (
            <div className="vote-display">
                <h4>🗳️ Votes du Chat</h4>
                <div className="vote-counters">
                    <div className="vote-counter true">
                        <span className="vote-label">✓ VRAI</span>
                        <span className="vote-count">{votes.trueVotes}</span>
                    </div>
                    <div className="vote-counter false">
                        <span className="vote-label">✗ FAUX</span>
                        <span className="vote-count">{votes.falseVotes}</span>
                    </div>
                    <div className="vote-total">
                        Total: {votes.totalVotes} votes
                    </div>
                </div>

                {lastVoter && (
                  <div className="last-voter">
                      Dernier vote: <strong>{lastVoter}</strong>
                  </div>
                )}

                {isConnected && (
                  <div className="vote-instructions">
                      💬 Les viewers peuvent voter avec: <code>!vrai</code> ou <code>!faux</code>
                      <br />
                      <small>État du vote: {twitchService.isVotingActive ? '🟢 ACTIF' : '🔴 INACTIF'}</small>
                  </div>
                )}
            </div>
          )}

          {/* Mini chat (optionnel) */}
          {isConnected && chatMessages.length > 0 && (
            <div className="mini-chat">
                <h4>💬 Chat récent</h4>
                <div className="chat-messages">
                    {chatMessages.slice(-5).map((msg, index) => (
                      <div key={index} className="chat-message">
                          <span className="username">{msg.username}:</span>
                          <span className="message">{msg.message}</span>
                          {/* DEBUG: Montrer si c'est reconnu comme vote */}
                          {(msg.message.startsWith('!vrai') || msg.message.startsWith('!faux')) && (
                            <span style={{ color: '#9146ff', marginLeft: '5px' }}>🗳️</span>
                          )}
                      </div>
                    ))}
                </div>
            </div>
          )}
      </div>
    );
};

export default TwitchIntegration;