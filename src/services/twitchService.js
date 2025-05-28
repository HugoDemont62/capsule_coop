// src/services/twitchService.js - VERSION CORRIGÉE

// Configuration Twitch
const TWITCH_CONFIG = {
    CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID,
    REDIRECT_URI: import.meta.env.VITE_TWITCH_REDIRECT_URI || window.location.origin,
    CHANNEL_NAME: import.meta.env.VITE_TWITCH_CHANNEL,

    // WebSocket pour le chat Twitch
    WEBSOCKET_URL: 'wss://irc-ws.chat.twitch.tv:443',

    // Commandes de vote
    VOTE_COMMANDS: {
        TRUE: ['!vrai', '!true', '!v', '!1', '!oui', '!yes'],
        FALSE: ['!faux', '!false', '!f', '!0', '!non', '!no']
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

        // ⭐ LOGS DE DEBUG
        console.log('🎮 TwitchChatService initialisé');
        console.log('📺 Canal cible:', this.channelName);
        console.log('🔑 Client ID:', TWITCH_CONFIG.CLIENT_ID ? '✅ Configuré' : '❌ Manquant');
    }

    // 🔐 Authentification OAuth Twitch
    async authenticate() {
        try {
            console.log('🔐 Début authentification Twitch...');

            // ⭐ VÉRIFIER TOKEN EXISTANT
            const savedToken = localStorage.getItem('twitch_access_token');
            const savedUsername = localStorage.getItem('twitch_username');

            if (savedToken && savedUsername) {
                console.log('🔍 Token trouvé en cache...');
                const isValid = await this.validateToken(savedToken);
                if (isValid) {
                    this.accessToken = savedToken;
                    this.username = savedUsername;
                    console.log('✅ Token cache valide pour:', savedUsername);
                    return true;
                } else {
                    console.log('❌ Token cache expiré, nettoyage...');
                    this.clearStoredAuth();
                }
            }

            // ⭐ NOUVELLE AUTHENTIFICATION
            console.log('🚀 Lancement nouvelle authentification...');
            const authUrl = this.buildAuthUrl();
            console.log('🔗 URL auth générée:', authUrl);

            // ⭐ OUVRIR POPUP D'AUTH
            const popup = window.open(
                authUrl, 
                'twitchAuth', 
                'width=500,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
            );

            if (!popup) {
                throw new Error('Popup bloquée par le navigateur. Autorisez les popups pour ce site.');
            }

            return new Promise((resolve, reject) => {
                let resolved = false;

                // ⭐ ÉCOUTER LES ÉVÉNEMENTS DE SUCCÈS
                const handleAuthSuccess = (event) => {
                    if (resolved) return;
                    resolved = true;

                    console.log('✅ Authentification réussie via événement:', event.detail);
                    this.accessToken = event.detail.accessToken;
                    this.username = event.detail.username;

                    window.removeEventListener('twitch-auth-success', handleAuthSuccess);
                    window.removeEventListener('twitch-auth-error', handleAuthError);
                    
                    if (!popup.closed) popup.close();
                    resolve(true);
                };

                // ⭐ ÉCOUTER LES ERREURS
                const handleAuthError = (event) => {
                    if (resolved) return;
                    resolved = true;

                    console.error('❌ Erreur authentification:', event.detail.error);
                    window.removeEventListener('twitch-auth-success', handleAuthSuccess);
                    window.removeEventListener('twitch-auth-error', handleAuthError);
                    
                    if (!popup.closed) popup.close();
                    reject(new Error('Authentification échouée: ' + event.detail.error));
                };

                // ⭐ VÉRIFIER FERMETURE POPUP
                const checkClosed = setInterval(() => {
                    if (popup.closed && !resolved) {
                        resolved = true;
                        clearInterval(checkClosed);
                        clearTimeout(timeoutId);

                        // Vérifier si l'auth a réussi malgré la fermeture
                        const token = localStorage.getItem('twitch_access_token');
                        const username = localStorage.getItem('twitch_username');

                        if (token && username) {
                            console.log('✅ Auth réussie après fermeture popup');
                            this.accessToken = token;
                            this.username = username;
                            window.removeEventListener('twitch-auth-success', handleAuthSuccess);
                            window.removeEventListener('twitch-auth-error', handleAuthError);
                            resolve(true);
                        } else {
                            console.log('❌ Popup fermée sans authentification');
                            window.removeEventListener('twitch-auth-success', handleAuthSuccess);
                            window.removeEventListener('twitch-auth-error', handleAuthError);
                            reject(new Error('Authentification annulée par l\'utilisateur'));
                        }
                    }
                }, 1000);

                // ⭐ TIMEOUT DE SÉCURITÉ
                const timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        clearInterval(checkClosed);
                        window.removeEventListener('twitch-auth-success', handleAuthSuccess);
                        window.removeEventListener('twitch-auth-error', handleAuthError);
                        
                        if (!popup.closed) popup.close();
                        reject(new Error('Timeout d\'authentification (5 minutes)'));
                    }
                }, 300000); // 5 minutes

                // ⭐ ENREGISTRER LES LISTENERS
                window.addEventListener('twitch-auth-success', handleAuthSuccess);
                window.addEventListener('twitch-auth-error', handleAuthError);
            });

        } catch (error) {
            console.error('❌ Erreur authentification Twitch:', error);
            throw error;
        }
    }

    // ⭐ CONSTRUIRE URL D'AUTHENTIFICATION
    buildAuthUrl() {
        const state = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('twitch_auth_state', state);

        const params = new URLSearchParams({
            client_id: TWITCH_CONFIG.CLIENT_ID,
            redirect_uri: TWITCH_CONFIG.REDIRECT_URI,
            response_type: 'token',
            scope: 'chat:read chat:edit',
            state: state,
            force_verify: 'true' // Force l'utilisateur à reconfirmer
        });

        return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    }

    // ⭐ VALIDER LE TOKEN
    async validateToken(token) {
        try {
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Token valide pour:', data.login);
                return true;
            } else {
                console.log('❌ Token invalide:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur validation token:', error);
            return false;
        }
    }

    // ⭐ NETTOYER L'AUTHENTIFICATION STOCKÉE
    clearStoredAuth() {
        localStorage.removeItem('twitch_access_token');
        localStorage.removeItem('twitch_username');
        localStorage.removeItem('twitch_user_id');
        localStorage.removeItem('twitch_display_name');
        localStorage.removeItem('twitch_auth_data');
        localStorage.removeItem('twitch_auth_state');
    }

    // 🔌 Connexion au chat Twitch via WebSocket
    async connectToChat() {
        try {
            if (!this.accessToken) {
                throw new Error('Token d\'accès requis - authentifiez-vous d\'abord');
            }

            if (!this.channelName) {
                throw new Error('Nom de canal requis - vérifiez VITE_TWITCH_CHANNEL');
            }

            console.log('🔌 Connexion au chat Twitch...');
            console.log('👤 Utilisateur:', this.username);
            console.log('📺 Canal:', this.channelName);

            // ⭐ FERMER CONNEXION EXISTANTE
            if (this.websocket) {
                this.websocket.close();
                this.websocket = null;
            }

            this.websocket = new WebSocket(TWITCH_CONFIG.WEBSOCKET_URL);

            // ⭐ PROMESSE POUR ATTENDRE LA CONNEXION
            return new Promise((resolve, reject) => {
                let connected = false;

                this.websocket.onopen = () => {
                    console.log('✅ WebSocket ouvert');

                    // ⭐ SÉQUENCE D'AUTHENTIFICATION IRC
                    this.websocket.send('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
                    this.websocket.send(`PASS oauth:${this.accessToken}`);
                    this.websocket.send(`NICK ${this.username}`);
                };

                this.websocket.onmessage = (event) => {
                    const message = event.data.trim();
                    
                    // ⭐ VÉRIFIER AUTHENTIFICATION RÉUSSIE
                    if (message.includes('001') && !connected) {
                        connected = true;
                        console.log('✅ Authentifié sur Twitch IRC');
                        
                        // ⭐ REJOINDRE LE CANAL
                        setTimeout(() => {
                            this.websocket.send(`JOIN #${this.channelName.toLowerCase()}`);
                            console.log(`📺 Rejoint le canal #${this.channelName}`);
                            
                            this.isConnected = true;
                            if (this.onConnectionChange) {
                                this.onConnectionChange(true);
                            }
                            resolve();
                        }, 1000);
                        return;
                    }

                    // ⭐ TRAITER LES AUTRES MESSAGES
                    this.handleChatMessage(message);
                };

                this.websocket.onclose = (event) => {
                    console.log('🔌 WebSocket fermé:', event.code, event.reason);
                    this.isConnected = false;
                    if (this.onConnectionChange) {
                        this.onConnectionChange(false);
                    }
                    
                    if (!connected) {
                        reject(new Error('Connexion fermée avant authentification'));
                    }
                };

                this.websocket.onerror = (error) => {
                    console.error('❌ Erreur WebSocket:', error);
                    if (!connected) {
                        reject(error);
                    }
                };

                // ⭐ TIMEOUT DE CONNEXION
                setTimeout(() => {
                    if (!connected) {
                        reject(new Error('Timeout de connexion'));
                    }
                }, 10000);
            });

        } catch (error) {
            console.error('❌ Erreur connexion chat:', error);
            throw error;
        }
    }

    // 💬 Traitement des messages du chat
    handleChatMessage(rawMessage) {
        const lines = rawMessage.split('\r\n').filter(line => line.length > 0);

        lines.forEach(line => {
            // ⭐ GÉRER LES PING
            if (line.startsWith('PING')) {
                this.websocket.send(line.replace('PING', 'PONG'));
                return;
            }

            // ⭐ TRAITER LES MESSAGES PRIVMSG
            if (line.includes('PRIVMSG')) {
                this.parsePrivateMessage(line);
            }
        });
    }

    // ⭐ ANALYSER LES MESSAGES PRIVÉS
    parsePrivateMessage(message) {
        try {
            // Extraire le contenu du message
            const messageParts = message.split(' :');
            const messageContent = messageParts[messageParts.length - 1].trim().toLowerCase();

            // Extraire le nom d'utilisateur
            const userMatch = message.match(/:(\w+)!/);
            const username = userMatch ? userMatch[1] : 'unknown';

            console.log(`💬 ${username}: ${messageContent}`);

            // ⭐ NOTIFIER LES LISTENERS DU MESSAGE
            if (this.onChatMessage) {
                this.onChatMessage({
                    username,
                    message: messageContent,
                    timestamp: Date.now()
                });
            }

            // ⭐ TRAITER LES VOTES SI ACTIFS
            if (this.isVotingActive) {
                this.processVote(username, messageContent);
            }

        } catch (error) {
            console.error('❌ Erreur parsing message:', error);
        }
    }

    // 🗳️ Traitement des votes
    processVote(username, message) {
        // ⭐ ÉVITER LES VOTES MULTIPLES
        const voterId = `${this.currentQuestionId}_${username}`;
        if (this.votes.voters.has(voterId)) {
            return; // Utilisateur a déjà voté pour cette question
        }

        let voteType = null;

        // ⭐ VÉRIFIER LES COMMANDES VRAI
        if (TWITCH_CONFIG.VOTE_COMMANDS.TRUE.some(cmd => message.startsWith(cmd))) {
            voteType = 'true';
        }
        // ⭐ VÉRIFIER LES COMMANDES FAUX
        else if (TWITCH_CONFIG.VOTE_COMMANDS.FALSE.some(cmd => message.startsWith(cmd))) {
            voteType = 'false';
        }

        if (voteType) {
            // ⭐ ENREGISTRER LE VOTE
            this.votes[voteType]++;
            this.votes.voters.add(voterId);

            console.log(`🗳️ Vote de ${username}: ${voteType.toUpperCase()}`);
            console.log(`📊 Scores actuels - VRAI: ${this.votes.true}, FAUX: ${this.votes.false}`);

            // ⭐ NOTIFIER LES COMPOSANTS REACT
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

        // ⭐ ANNONCER DANS LE CHAT
        this.sendChatMessage('🎮 Nouveau quiz ! Votez avec !vrai ou !faux dans le chat ! 🗳️');
    }

    stopVoting() {
        console.log('🛑 Fin du vote');
        console.log(`📊 Résultats finaux - VRAI: ${this.votes.true}, FAUX: ${this.votes.false}`);

        this.isVotingActive = false;

        // ⭐ ANNONCER LES RÉSULTATS
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
        } else {
            console.warn('⚠️ Impossible d\'envoyer le message: pas connecté');
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

    // 🧹 Nettoyage
    disconnect() {
        console.log('🧹 Déconnexion Twitch');

        this.isVotingActive = false;
        this.isConnected = false;

        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        if (this.onConnectionChange) {
            this.onConnectionChange(false);
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

    // 🔧 Debug
    debug() {
        console.group('🔧 Debug Twitch Service');
        console.log('📊 Status:', this.getConnectionStatus());
        console.log('🔑 Token:', this.accessToken ? '✅ Présent' : '❌ Manquant');
        console.log('👤 Utilisateur:', this.username || 'Non défini');
        console.log('📺 Canal:', this.channelName || 'Non défini');
        console.log('🌐 WebSocket:', this.websocket ? 'Créé' : 'Non créé');
        console.log('🔌 Connecté:', this.isConnected);
        console.log('🗳️ Vote actif:', this.isVotingActive);
        console.log('📊 Votes:', this.votes);
        console.groupEnd();
    }
}

// ⭐ INSTANCE UNIQUE DU SERVICE
export const twitchService = new TwitchChatService();

// ⭐ HOOK REACT PERSONNALISÉ
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
        sendMessage: (msg) => twitchService.sendChatMessage(msg),
        debug: () => twitchService.debug()
    };
};

export default TwitchChatService;
