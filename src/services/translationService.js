// src/services/translationService.js - Service de traduction automatique

const TRANSLATION_CONFIG = {
    // API LibreTranslate (gratuite et open source)
    LIBRE_TRANSLATE_URL: 'https://libretranslate.de/translate',

    // API MyMemory (gratuite, 1000 mots/jour)
    MYMEMORY_URL: 'https://api.mymemory.translated.net/get',

    // API Google Translate (via proxy gratuit)
    GOOGLE_PROXY_URL: 'https://translate.googleapis.com/translate_a/single',

    // Cache pour éviter de traduire plusieurs fois la même chose
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 heures

    // Langues
    SOURCE_LANG: 'en',
    TARGET_LANG: 'fr',

    // Timeout
    TIMEOUT: 10000
};

class TranslationService {
    constructor() {
        this.cache = new Map();
        this.stats = {
            translations: 0,
            cacheHits: 0,
            errors: 0,
            apiUsage: {
                libreTranslate: 0,
                myMemory: 0,
                googleProxy: 0
            }
        };
    }

    // 🔄 Méthode principale de traduction avec fallback
    async translateText(text, fromLang = 'en', toLang = 'fr') {
        if (!text || text.trim().length === 0) {
            return text;
        }

        // Vérifier le cache d'abord
        const cacheKey = `${fromLang}-${toLang}-${this.hashText(text)}`;
        const cached = this.getCachedTranslation(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        // Détecter si c'est déjà en français
        if (this.isLikelyFrench(text)) {
            console.log('🇫🇷 Texte déjà en français, pas de traduction nécessaire');
            return text;
        }

        let translatedText = null;

        // Essayer les différentes APIs dans l'ordre
        const translationMethods = [
            () => this.translateWithMyMemory(text, fromLang, toLang),
            () => this.translateWithGoogleProxy(text, fromLang, toLang)
        ];

        for (const method of translationMethods) {
            try {
                translatedText = await method();
                if (translatedText && translatedText !== text) {
                    break;
                }
            } catch (error) {
                console.warn('⚠️ Échec méthode de traduction:', error.message);
                continue;
            }
        }

        // Si toutes les traductions échouent, retourner le texte original
        if (!translatedText) {
            console.warn('❌ Toutes les traductions ont échoué, texte original conservé');
            this.stats.errors++;
            return text;
        }

        // Nettoyer et sauvegarder en cache
        const cleanTranslation = this.cleanTranslatedText(translatedText);
        this.setCachedTranslation(cacheKey, cleanTranslation);
        this.stats.translations++;

        console.log(`✅ Traduction réussie: "${text.substring(0, 50)}..." -> "${cleanTranslation.substring(0, 50)}..."`);
        return cleanTranslation;
    }

    // 🔄 MyMemory (gratuit, 1000 mots/jour)
    async translateWithMyMemory(text, fromLang, toLang) {
        try {
            this.stats.apiUsage.myMemory++;

            const params = new URLSearchParams({
                q: text,
                langpair: `${fromLang}|${toLang}`,
                de: 'user@example.com' // Email fictif requis
            });

            const response = await fetch(`${TRANSLATION_CONFIG.MYMEMORY_URL}?${params.toString()}`, {
                signal: AbortSignal.timeout(TRANSLATION_CONFIG.TIMEOUT)
            });

            if (!response.ok) {
                throw new Error(`MyMemory HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData) {
                return data.responseData.translatedText;
            }

            throw new Error('MyMemory: Réponse invalide');

        } catch (error) {
            console.warn('❌ MyMemory error:', error.message);
            throw error;
        }
    }

    // 🔍 Google Translate Proxy (utilise l'API publique de Google)
    async translateWithGoogleProxy(text, fromLang, toLang) {
        try {
            this.stats.apiUsage.googleProxy++;

            const params = new URLSearchParams({
                client: 'gtx',
                sl: fromLang,
                tl: toLang,
                dt: 't',
                q: text
            });

            const response = await fetch(`${TRANSLATION_CONFIG.GOOGLE_PROXY_URL}?${params.toString()}`, {
                signal: AbortSignal.timeout(TRANSLATION_CONFIG.TIMEOUT)
            });

            if (!response.ok) {
                throw new Error(`Google Proxy HTTP ${response.status}`);
            }

            const data = await response.json();

            // Google renvoie un format complexe [[[traduction, original, ...]]]
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                return data[0][0][0];
            }

            throw new Error('Google Proxy: Format de réponse invalide');

        } catch (error) {
            console.warn('❌ Google Proxy error:', error.message);
            throw error;
        }
    }

    // 🎯 Traduction intelligente d'un article complet
    async translateArticle(article) {
        try {
            console.log(`🔄 Traduction de l'article: "${article.title?.substring(0, 50)}..."`);

            const translatedArticle = { ...article };

            // Traduire le titre
            if (article.title) {
                translatedArticle.title = await this.translateText(article.title);
            }

            // Traduire le contenu
            if (article.content) {
                translatedArticle.content = await this.translateText(article.content);
            }

            // Traduire la catégorie si elle existe
            if (article.category && typeof article.category === 'string') {
                translatedArticle.category = await this.translateText(article.category);
            }

            // Marquer comme traduit
            translatedArticle.translated = true;
            translatedArticle.originalLanguage = 'en';

            return translatedArticle;

        } catch (error) {
            console.error('❌ Erreur traduction article:', error);
            // Retourner l'article original en cas d'erreur
            return { ...article, translated: false };
        }
    }

    // 🇫🇷 Détection simple si le texte est déjà en français
    isLikelyFrench(text) {
        // Mots français très communs
        const frenchWords = [
            'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'est', 'dans',
            'pour', 'avec', 'par', 'sur', 'que', 'qui', 'son', 'sa', 'ses',
            'cette', 'ces', 'tout', 'tous', 'très', 'plus', 'aussi', 'comme',
            'français', 'france', 'paris', 'selon', 'après', 'depuis'
        ];

        // Caractères spécifiquement français
        const frenchChars = /[àâäéèêëïîôöùûüÿç]/i;

        const lowercaseText = text.toLowerCase();

        // Si contient des accents français
        if (frenchChars.test(text)) {
            return true;
        }

        // Compter les mots français
        const words = lowercaseText.split(/\s+/);
        const frenchWordCount = words.filter(word => frenchWords.includes(word)).length;

        // Si plus de 20% des mots sont français (ou 3+ mots pour textes courts)
        return frenchWordCount >= Math.max(3, words.length * 0.2);
    }

    // 🧹 Nettoyer le texte traduit
    cleanTranslatedText(text) {
        return text
            .replace(/\s+/g, ' ') // Normaliser les espaces
            .replace(/\n\s*\n/g, '\n') // Supprimer lignes vides multiples
            .trim();
    }

    // 🔑 Générer un hash simple pour le cache
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir en 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // 💾 Gestion du cache
    getCachedTranslation(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < TRANSLATION_CONFIG.CACHE_DURATION) {
            return cached.text;
        }
        this.cache.delete(key);
        return null;
    }

    setCachedTranslation(key, text) {
        this.cache.set(key, {
            text,
            timestamp: Date.now()
        });
    }

    // 📊 Statistiques
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            successRate: this.stats.translations > 0
                ? ((this.stats.translations / (this.stats.translations + this.stats.errors)) * 100).toFixed(1) + '%'
                : '100%'
        };
    }

    // 🧹 Nettoyer le cache
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache de traduction nettoyé');
    }

    // 🧪 Tester les APIs de traduction
    async testTranslationAPIs() {
        console.log('🧪 Test des APIs de traduction...');

        const testText = "This is a strange news article about weird technology.";
        const results = {
            myMemory: false,
            googleProxy: false
        };

        // Test MyMemory
        try {
            const result = await this.translateWithMyMemory(testText, 'en', 'fr');
            results.myMemory = !!result;
            console.log('MyMemory:', results.myMemory ? '✅ OK' : '❌ Erreur');
        } catch (error) {
            console.log('MyMemory: ❌ Erreur -', error.message);
        }

        // Test Google Proxy
        try {
            const result = await this.translateWithGoogleProxy(testText, 'en', 'fr');
            results.googleProxy = !!result;
            console.log('Google Proxy:', results.googleProxy ? '✅ OK' : '❌ Erreur');
        } catch (error) {
            console.log('Google Proxy: ❌ Erreur -', error.message);
        }

        return results;
    }

    // 🔧 Debug
    debug() {
        console.group('🔧 Debug Translation Service');
        console.log('📊 Statistiques:', this.getStats());
        console.log('🌐 APIs disponibles:', 'LibreTranslate, MyMemory, Google Proxy');
        console.log('💾 Cache:', `${this.cache.size} traductions en cache`);
        console.log('🎯 Direction:', `${TRANSLATION_CONFIG.SOURCE_LANG} -> ${TRANSLATION_CONFIG.TARGET_LANG}`);
        console.groupEnd();
    }
}

// Instance unique du service
export const translationService = new TranslationService();

// Hook React pour utiliser la traduction
export const useTranslation = () => {
    return {
        translate: (text, from = 'en', to = 'fr') => translationService.translateText(text, from, to),
        translateArticle: (article) => translationService.translateArticle(article),
        isLikelyFrench: (text) => translationService.isLikelyFrench(text),
        getStats: () => translationService.getStats(),
        clearCache: () => translationService.clearCache(),
        test: () => translationService.testTranslationAPIs()
    };
};

export default TranslationService;