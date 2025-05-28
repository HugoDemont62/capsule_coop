// src/components/TwitchAuthHandler.jsx - VERSION CORRIGÉE
import { useEffect } from 'react';

/**
 * Composant pour gérer le retour de l'authentification OAuth Twitch
 * Intégré dans App.jsx pour capturer les tokens de l'URL
 */
const TwitchAuthHandler = () => {
    useEffect(() => {
        // ⭐ FONCTION PRINCIPALE DE GESTION AUTH
        const handleTwitchAuth = () => {
            // Vérifier les deux types de retour possibles
            const hash = window.location.hash;
            const search = window.location.search;

            console.log('🔍 Vérification auth Twitch...');
            console.log('Hash:', hash);
            console.log('Search:', search);

            // ⭐ CAS 1: Token dans le hash (flow implicit)
            if (hash && hash.includes('access_token')) {
                console.log('🔐 Token trouvé dans le hash');
                processTokenFromHash(hash);
                return;
            }

            // ⭐ CAS 2: Token dans les paramètres de recherche
            if (search && search.includes('access_token')) {
                console.log('🔐 Token trouvé dans les paramètres');
                processTokenFromSearch(search);
                return;
            }

            // ⭐ CAS 3: Erreur d'autorisation
            if (hash.includes('error') || search.includes('error')) {
                const error = hash.includes('error') 
                    ? new URLSearchParams(hash.substring(1)).get('error')
                    : new URLSearchParams(search).get('error');
                console.error('❌ Erreur d\'autorisation Twitch:', error);
                
                // Notifier l'erreur
                window.dispatchEvent(new CustomEvent('twitch-auth-error', {
                    detail: { error }
                }));
                return;
            }
        };

        // ⭐ TRAITEMENT TOKEN DEPUIS LE HASH
        const processTokenFromHash = async (hash) => {
            try {
                // Parser le hash
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const tokenType = params.get('token_type');
                const scope = params.get('scope');
                const state = params.get('state');

                console.log('📦 Paramètres reçus:', { accessToken: !!accessToken, tokenType, scope, state });

                if (accessToken) {
                    await processToken(accessToken, tokenType, scope);
                } else {
                    throw new Error('Token manquant dans la réponse');
                }

            } catch (error) {
                console.error('❌ Erreur traitement hash:', error);
                notifyError(error.message);
            }
        };

        // ⭐ TRAITEMENT TOKEN DEPUIS LES PARAMÈTRES
        const processTokenFromSearch = async (search) => {
            try {
                const params = new URLSearchParams(search);
                const accessToken = params.get('access_token');
                const tokenType = params.get('token_type');
                const scope = params.get('scope');

                console.log('📦 Paramètres search reçus:', { accessToken: !!accessToken, tokenType, scope });

                if (accessToken) {
                    await processToken(accessToken, tokenType, scope);
                } else {
                    throw new Error('Token manquant dans les paramètres');
                }

            } catch (error) {
                console.error('❌ Erreur traitement search:', error);
                notifyError(error.message);
            }
        };

        // ⭐ TRAITEMENT PRINCIPAL DU TOKEN
        const processToken = async (accessToken, tokenType, scope) => {
            try {
                console.log('🔑 Processing token...');

                // ⭐ ÉTAPE 1: Valider le token
                const isValid = await validateToken(accessToken);
                if (!isValid) {
                    throw new Error('Token invalide ou expiré');
                }

                // ⭐ ÉTAPE 2: Récupérer les infos utilisateur
                const userInfo = await getUserInfo(accessToken);
                console.log('👤 Info utilisateur récupérées:', userInfo);

                // ⭐ ÉTAPE 3: Sauvegarder les données
                const authData = {
                    accessToken,
                    tokenType: tokenType || 'Bearer',
                    scope: scope || '',
                    username: userInfo.login,
                    userId: userInfo.id,
                    displayName: userInfo.display_name || userInfo.login,
                    profileImage: userInfo.profile_image_url,
                    timestamp: Date.now()
                };

                // Sauvegarder dans localStorage
                localStorage.setItem('twitch_access_token', accessToken);
                localStorage.setItem('twitch_username', userInfo.login);
                localStorage.setItem('twitch_user_id', userInfo.id);
                localStorage.setItem('twitch_display_name', userInfo.display_name || userInfo.login);
                localStorage.setItem('twitch_auth_data', JSON.stringify(authData));

                console.log('💾 Données Twitch sauvegardées:', {
                    username: userInfo.login,
                    displayName: userInfo.display_name
                });

                // ⭐ ÉTAPE 4: Nettoyer l'URL
                cleanURL();

                // ⭐ ÉTAPE 5: Notifier le succès
                window.dispatchEvent(new CustomEvent('twitch-auth-success', {
                    detail: authData
                }));

                // ⭐ ÉTAPE 6: Fermer popup si applicable
                if (window.opener && window.opener !== window) {
                    // On est dans une popup, informer la fenêtre parent
                    window.opener.postMessage({
                        type: 'TWITCH_AUTH_SUCCESS',
                        data: authData
                    }, window.location.origin);
                    
                    // Fermer la popup après un délai
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                }

            } catch (error) {
                console.error('❌ Erreur processing token:', error);
                localStorage.removeItem('twitch_access_token');
                localStorage.removeItem('twitch_username');
                localStorage.removeItem('twitch_user_id');
                localStorage.removeItem('twitch_display_name');
                localStorage.removeItem('twitch_auth_data');
                notifyError(error.message);
            }
        };

        // ⭐ VALIDATION DU TOKEN
        const validateToken = async (accessToken) => {
            try {
                const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                if (response.ok) {
                    const validation = await response.json();
                    console.log('✅ Token validé:', validation);
                    return true;
                } else {
                    console.error('❌ Token invalide:', response.status);
                    return false;
                }
            } catch (error) {
                console.error('❌ Erreur validation token:', error);
                return false;
            }
        };

        // ⭐ RÉCUPÉRATION INFOS UTILISATEUR
        const getUserInfo = async (accessToken) => {
            const response = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': import.meta.env.VITE_TWITCH_CLIENT_ID
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur API utilisateur: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.data && data.data.length > 0) {
                return data.data[0];
            } else {
                throw new Error('Aucune donnée utilisateur trouvée');
            }
        };

        // ⭐ NETTOYER L'URL
        const cleanURL = () => {
            try {
                // Supprimer hash et paramètres de l'URL
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                console.log('🧹 URL nettoyée');
            } catch (error) {
                console.warn('⚠️ Impossible de nettoyer l\'URL:', error);
            }
        };

        // ⭐ NOTIFIER LES ERREURS
        const notifyError = (errorMessage) => {
            window.dispatchEvent(new CustomEvent('twitch-auth-error', {
                detail: { error: errorMessage }
            }));

            if (window.opener && window.opener !== window) {
                window.opener.postMessage({
                    type: 'TWITCH_AUTH_ERROR',
                    error: errorMessage
                }, window.location.origin);
                
                setTimeout(() => {
                    window.close();
                }, 2000);
            }
        };

        // ⭐ EXÉCUTION PRINCIPALE
        // Exécuter au montage du composant
        handleTwitchAuth();

        // ⭐ ÉCOUTER LES CHANGEMENTS D'URL (pour les SPA)
        const handlePopState = () => {
            handleTwitchAuth();
        };

        const handleMessage = (event) => {
            // Écouter les messages de la popup
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'TWITCH_AUTH_SUCCESS') {
                window.dispatchEvent(new CustomEvent('twitch-auth-success', {
                    detail: event.data.data
                }));
            } else if (event.data.type === 'TWITCH_AUTH_ERROR') {
                window.dispatchEvent(new CustomEvent('twitch-auth-error', {
                    detail: { error: event.data.error }
                }));
            }
        };

        // ⭐ ÉVÉNEMENTS
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('message', handleMessage);

        // ⭐ NETTOYAGE
        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // Ce composant ne rend rien visuellement
    return null;
};

export default TwitchAuthHandler;
