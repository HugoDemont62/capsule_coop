// src/services/twitchService.js

// Configuration Twitch
const TWITCH_CONFIG = {
    // Tu devras remplacer ces valeurs par les tiennes
    CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID || 'ton_client_id',
    REDIRECT_URI: import.meta.env.VITE_TWITCH_REDIRECT_URI || 'http://localhost:5173',
    CHANNEL_NAME: import.meta.env.VITE_TWITCH_CHANNEL || 'ton_nom_de_chaine',

    // WebSocket pour le chat Twitch
    WEBSOCKET_URL: 'wss://irc-ws.chat.twitch.tv:443',

    // Commandes de vote
    VOTE_COMMANDS: {
        TRUE: ['!vrai', '!true', '!v', '!1'],
        FALSE: ['!faux', '!false', '!f', '!0']
    }
};

class TwitchChatService {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.accessToken = null;
        this.username = null;
        this.channelName = TWITCH_CONFIG.CHANNEL_NAME;

        // Compteurs de votes
        this.votes = {
            true: 0,
            false: 0,
            voters: new Set() // Pour éviter les votes multiples
        };

        // Callbacks pour les événements
        this.onVoteUpdate = null;
        this.onChatMessage = null;
        this.onConnectionChange = null;

        // État du quiz
        this.isVotingActive = false;
        this.currentQuestionId = null;
    }

    // 🔐 Authentification OAuth Twitch
    async authenticate() {
        try {
            // Vérifier si on a déjà un token dans le localStorage
            const savedToken = localStorage.getItem('twitch_access_token');
            const savedUsername = localStorage.getItem('twitch_username');

            if (savedToken && savedUsername) {
                // Vérifier si le token est encore valide
                const isValid = await this.validateToken(savedToken);
                if (isValid) {
                    this.accessToken = savedToken;
                    this.username = savedUsername;
                    console.log('✅ Token Twitch valide trouvé');
                    return true;
                } else {
                    // Token expiré, nettoyer
                    localStorage.removeItem('twitch_access_token');
                    localStorage.removeItem('twitch_username');
                }
            }

            // Rediriger vers l'auth Twitch
            const authUrl = this.buildAuthUrl();

            console.log('🔐 Authentification Twitch requise');
            console.log('URL d\'auth:', authUrl);

            // Option 1: Ouvrir dans une popup
            const popup = window.open(authUrl, 'twitchAuth', 'width=500,height=600');

            return new Promise((resolve, reject) => {
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        // Vérifier si l'auth a réussi
                        const token = localStorage.getItem('twitch_access_token');
                        const username = localStorage.getItem('twitch_username');

                        if (token && username) {
                            this.accessToken = token;
                            this.username = username;
                            resolve(true);
                        } else {
                            reject(new Error('Authentification annulée'));
                        }
                    }
                }, 1000);

                // Timeout après 5 minutes
                setTimeout(() => {
                    clearInterval(checkClosed);
                    if (!popup.closed) {
                        popup.close();
                    }
                    reject(new Error('Timeout d\'authentification'));
                }, 300000);
            });

        } catch (error) {
            console.error('❌ Erreur d\'authentification Twitch:', error);
            throw error;
        }
    }

    // Construire l'URL d'authentification
    buildAuthUrl() {
        const params = new URLSearchParams({
            client_id: TWITCH_CONFIG.CLIENT_ID,
            redirect_uri: TWITCH_CONFIG.REDIRECT_URI,
            response_type: 'token',
            scope: 'chat:read chat:edit',
            state: Math.random().toString(36).substring(7) // Protection CSRF
        });

        return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    }

    // Valider le token
    async validateToken(token) {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Erreur validation token:', error);
            return false;
        }
    }

    // 🔌 Connexion au chat Twitch via WebSocket
    async connectToChat() {
        try {
            if (!this.accessToken) {
                throw new Error('Token d\'accès requis');
            }

            console.log('🔌 Connexion au chat Twitch...');

            this.websocket = new WebSocket(TWITCH_CONFIG.WEBSOCKET_URL);

            this.websocket.onopen = () => {
                console.log('✅ Connexion WebSocket ouverte');

                // Authentification IRC
                this.websocket.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
                this.websocket.send(`PASS oauth:${this.accessToken}`);
                this.websocket.send(`NICK ${this.username}`);

                // Rejoindre le canal
                setTimeout(() => {
                    this.websocket.send(`JOIN #${this.channelName.toLowerCase()}`);
                    console.log(`📺 Rejoint le canal #${this.channelName}`);
                }, 1000);
            };

            this.websocket.onmessage = (event) => {
                this.handleChatMessage(event.data);
            };

            this.websocket.onclose = () => {
                console.log('🔌 Connexion WebSocket fermée');
                this.isConnected = false;
                if (this.onConnectionChange) {
                    this.onConnectionChange(false);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('❌ Erreur WebSocket:', error);
            };

        } catch (error) {
            console.error('❌ Erreur connexion chat:', error);
            throw error;
        }
    }

    // 💬 Traitement des messages du chat
    handleChatMessage(rawMessage) {
        const lines = rawMessage.split('\r\n').filter(line => line.length > 0);

        lines.forEach(line => {
            // Gérer les PING pour maintenir la connexion
            if (line.startsWith('PING')) {
                this.websocket.send(line.replace('PING', 'PONG'));
                return;
            }

            // Vérifier si on est connecté
            if (line.includes('001')) {
                this.isConnected = true;
                console.log('✅ Authentifié sur Twitch IRC');
                if (this.onConnectionChange) {
                    this.onConnectionChange(true);
                }
                return;
            }

            // Traiter les messages PRIVMSG (messages du chat)
            if (line.includes('PRIVMSG')) {
                this.parsePrivateMessage(line);
            }
        });
    }

    // Analyser les messages privés
    parsePrivateMessage(message) {
        try {
            // Extraire les métadonnées et le contenu
            const tagsPart = message.split(' :')[0];
            const messageParts = message.split(' :');
            const messageContent = messageParts[messageParts.length - 1].trim().toLowerCase();

            // Extraire le nom d'utilisateur
            const userMatch = message.match(/:(\w+)!/);
            const username = userMatch ? userMatch[1] : 'unknown';

            console.log(`💬 ${username}: ${messageContent}`);

            // Notifier les listeners du message
            if (this.onChatMessage) {
                this.onChatMessage({
                    username,
                    message: messageContent,
                    timestamp: Date.now()
                });
            }

            // Vérifier si c'est un vote et si le vote est actif
            if (this.isVotingActive) {
                this.processVote(username, messageContent);
            }

        } catch (error) {
            console.error('Erreur parsing message:', error);
        }
    }

    // 🗳️ Traitement des votes
    processVote(username, message) {
        // Éviter les votes multiples du même utilisateur
        const voterId = `${this.currentQuestionId}_${username}`;
        if (this.votes.voters.has(voterId)) {
            return; // Utilisateur a déjà voté pour cette question
        }

        let voteType = null;

        // Vérifier les commandes VRAI
        if (TWITCH_CONFIG.VOTE_COMMANDS.TRUE.some(cmd => message.startsWith(cmd))) {
            voteType = 'true';
        }
        // Vérifier les commandes FAUX
        else if (TWITCH_CONFIG.VOTE_COMMANDS.FALSE.some(cmd => message.startsWith(cmd))) {
            voteType = 'false';
        }

        if (voteType) {
            // Enregistrer le vote
            this.votes[voteType]++;
            this.votes.voters.add(voterId);

            console.log(`🗳️ Vote de ${username}: ${voteType.toUpperCase()}`);
            console.log(`📊 Scores actuels - VRAI: ${this.votes.true}, FAUX: ${this.votes.false}`);

            // Notifier les composants React
            if (this.onVoteUpdate) {
                this.onVoteUpdate({
                    trueVotes: this.votes.true,
                    falseVotes: this.votes.false,
                    totalVotes: this.votes.true + this.votes.false,
                    lastVoter: username
                });
            }
        }
    }

    // 🎮 Gestion du système de vote
    startVoting(questionId) {
        console.log('🎬 Début du vote pour la question:', questionId);

        this.currentQuestionId = questionId;
        this.isVotingActive = true;
        this.resetVotes();

        // Annoncer dans le chat
        this.sendChatMessage('🎮 Nouveau quiz ! Votez avec !vrai ou !faux dans le chat ! 🗳️');
    }

    stopVoting() {
        console.log('🛑 Fin du vote');
        console.log(`📊 Résultats finaux - VRAI: ${this.votes.true}, FAUX: ${this.votes.false}`);

        this.isVotingActive = false;

        // Annoncer les résultats
        const total = this.votes.true + this.votes.false;
        if (total > 0) {
            const truePercent = Math.round((this.votes.true / total) * 100);
            const falsePercent = Math.round((this.votes.false / total) * 100);

            this.sendChatMessage(
                `📊 Résultats: ${this.votes.true} VRAI (${truePercent}%) vs ${this.votes.false} FAUX (${falsePercent}%) sur ${total} votes !`
            );
        }
    }

    resetVotes() {
        this.votes.true = 0;
        this.votes.false = 0;
        this.votes.voters.clear();
    }

    // 📤 Envoyer un message dans le chat
    sendChatMessage(message) {
        if (this.websocket && this.isConnected) {
            this.websocket.send(`PRIVMSG #${this.channelName.toLowerCase()} :${message}`);
            console.log(`📤 Message envoyé: ${message}`);
        }
    }

    // 📊 Obtenir les statistiques actuelles
    getVoteStats() {
        const total = this.votes.true + this.votes.false;
        return {
            trueVotes: this.votes.true,
            falseVotes: this.votes.false,
            totalVotes: total,
            truePercentage: total > 0 ? Math.round((this.votes.true / total) * 100) : 0,
            falsePercentage: total > 0 ? Math.round((this.votes.false / total) * 100) : 0,
            isActive: this.isVotingActive
        };
    }

    // 🔄 Reconnecter si nécessaire
    async reconnect() {
        if (this.websocket) {
            this.websocket.close();
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s
        await this.connectToChat();
    }

    // 🧹 Nettoyage
    disconnect() {
        console.log('🧹 Déconnexion Twitch');

        this.isVotingActive = false;
        this.isConnected = false;

        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    // 🔧 Setters pour les callbacks
    setOnVoteUpdate(callback) {
        this.onVoteUpdate = callback;
    }

    setOnChatMessage(callback) {
        this.onChatMessage = callback;
    }

    setOnConnectionChange(callback) {
        this.onConnectionChange = callback;
    }

    // ℹ️ État de la connexion
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            isAuthenticated: !!this.accessToken,
            username: this.username,
            channel: this.channelName,
            isVotingActive: this.isVotingActive,
            votes: this.getVoteStats()
        };
    }
}

// Instance unique du service
export const twitchService = new TwitchChatService();

// Hook React personnalisé pour utiliser Twitch
export const useTwitchChat = () => {
    return {
        service: twitchService,
        authenticate: () => twitchService.authenticate(),
        connect: () => twitchService.connectToChat(),
        disconnect: () => twitchService.disconnect(),
        startVoting: (questionId) => twitchService.startVoting(questionId),
        stopVoting: () => twitchService.stopVoting(),
        getStats: () => twitchService.getVoteStats(),
        getStatus: () => twitchService.getConnectionStatus(),
        sendMessage: (msg) => twitchService.sendChatMessage(msg)
    };
};

export default TwitchChatService;
