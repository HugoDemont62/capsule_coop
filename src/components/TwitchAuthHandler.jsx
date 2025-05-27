// src/components/TwitchAuthHandler.jsx
import { useEffect } from 'react';

/**
 * Composant pour gérer le retour de l'authentification OAuth Twitch
 * À ajouter dans App.jsx pour capturer les tokens de l'URL
 */
const TwitchAuthHandler = () => {
    useEffect(() => {
        // Vérifier si on revient de l'authentification Twitch
        const handleTwitchAuth = () => {
            const hash = window.location.hash;

            if (hash.includes('access_token')) {
                console.log('🔐 Retour d\'authentification Twitch détecté');

                try {
                    // Parser l'URL pour extraire le token
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get('access_token');
                    const tokenType = params.get('token_type');
                    const scope = params.get('scope');

                    if (accessToken) {
                        console.log('✅ Token Twitch reçu');

                        // Récupérer les informations utilisateur
                        getUserInfo(accessToken)
                            .then(userInfo => {
                                // Sauvegarder dans localStorage
                                localStorage.setItem('twitch_access_token', accessToken);
                                localStorage.setItem('twitch_username', userInfo.login);
                                localStorage.setItem('twitch_user_id', userInfo.id);
                                localStorage.setItem('twitch_display_name', userInfo.display_name);

                                console.log('💾 Informations Twitch sauvegardées:', {
                                    username: userInfo.login,
                                    displayName: userInfo.display_name
                                });

                                // Nettoyer l'URL
                                window.history.replaceState({}, document.title, window.location.pathname);

                                // Notifier que l'auth est réussie
                                window.dispatchEvent(new CustomEvent('twitch-auth-success', {
                                    detail: {
                                        token: accessToken,
                                        username: userInfo.login,
                                        displayName: userInfo.display_name
                                    }
                                }));

                                // Si on est dans une popup, fermer et notifier la fenêtre parent
                                if (window.opener) {
                                    window.close();
                                }

                            })
                            .catch(error => {
                                console.error('❌ Erreur récupération infos utilisateur:', error);
                                localStorage.removeItem('twitch_access_token');
                            });
                    }

                } catch (error) {
                    console.error('❌ Erreur parsing token Twitch:', error);
                }
            }
        };

        // Exécuter au montage
        handleTwitchAuth();

        // Écouter les changements d'URL (pour les SPA)
        const handlePopState = () => {
            handleTwitchAuth();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Fonction pour récupérer les infos utilisateur depuis l'API Twitch
    const getUserInfo = async (accessToken) => {
        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': import.meta.env.VITE_TWITCH_CLIENT_ID
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            return data.data[0];
        } else {
            throw new Error('Aucune donnée utilisateur trouvée');
        }
    };

    // Ce composant ne rend rien visuellement
    return null;
};

export default TwitchAuthHandler;