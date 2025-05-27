// src/components/TwitchIntegration.jsx
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
        setIsConnected(status.isConnected);
        setIsAuthenticated(status.isAuthenticated);
        setVotes(status.votes);
    }, []);

    // 🎮 Initialisation
    useEffect(() => {
        // Callbacks pour les événements Twitch
        twitchService.setOnConnectionChange((connected) => {
            setIsConnected(connected);
            setConnectionStatus(connected ? 'connected' : 'disconnected');
            updateStatus();
        });

        twitchService.setOnVoteUpdate((voteData) => {
            setVotes({
                trueVotes: voteData.trueVotes,
                falseVotes: voteData.falseVotes,
                totalVotes: voteData.totalVotes
            });
            setLastVoter(voteData.lastVoter);

            // Notifier le composant parent
            if (onVoteUpdate) {
                onVoteUpdate(voteData);
            }
        });

        twitchService.setOnChatMessage((messageData) => {
            setChatMessages(prev => [...prev.slice(-19), messageData]); // Garder les 20 derniers messages
        });

        // Vérifier l'état initial
        updateStatus();

        return () => {
            // Nettoyage
            twitchService.setOnConnectionChange(null);
            twitchService.setOnVoteUpdate(null);
            twitchService.setOnChatMessage(null);
        };
    }, [onVoteUpdate, updateStatus]);

    // 🎯 Gérer les changements de question
    useEffect(() => {
        if (isConnected && currentQuestionId) {
            if (isQuestionActive) {
                twitchService.startVoting(currentQuestionId);
            } else {
                twitchService.stopVoting();
            }
        }
    }, [currentQuestionId, isQuestionActive, isConnected]);

    // 🔐 Authentification
    const handleAuthenticate = async () => {
        setIsLoading(true);
        setConnectionStatus('authenticating');

        try {
            await twitchService.authenticate();
            setIsAuthenticated(true);
            updateStatus();
        } catch (error) {
            console.error('Erreur auth:', error);
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
            await twitchService.connectToChat();
            updateStatus();
        } catch (error) {
            console.error('Erreur connexion:', error);
            setConnectionStatus('connection-failed');
        } finally {
            setIsLoading(false);
        }
    };

    // 🔌 Déconnexion
    const handleDisconnect = () => {
        twitchService.disconnect();
        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionStatus('disconnected');
        setChatMessages([]);
        setVotes({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });
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
                        <button
                            className="btn-twitch disconnect"
                            onClick={handleDisconnect}
                        >
                            🔌 Déconnecter
                        </button>
                    )}
                </div>
            </div>

            {/* Compteurs de votes */}
            {isConnected && (
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

                    <div className="vote-instructions">
                        💬 Les viewers peuvent voter avec: <code>!vrai</code> ou <code>!faux</code>
                    </div>
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
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TwitchIntegration;