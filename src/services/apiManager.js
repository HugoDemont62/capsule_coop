// src/services/apiManager.js - VERSION COMPATIBLE NAVIGATEUR
import { translationService } from './translationService.js';

const CONFIG = {
  // API The Guardian (gratuite, 12k appels/jour) - ✅ FONCTIONNE EN PROD
  GUARDIAN_API_URL: 'https://content.guardianapis.com/search',
  GUARDIAN_API_KEY: import.meta.env.VITE_GUARDIAN_API_KEY || 'test',

  // GNews API (gratuite, 100 appels/jour) - ✅ DEVRAIT FONCTIONNER
  GNEWS_API_URL: 'https://gnews.io/api/v4/search',
  GNEWS_API_KEY: import.meta.env.VITE_GNEWS_API_KEY,

  // Hacker News API (pas de clé requise) - ✅ FONCTIONNE EN PROD
  HACKER_NEWS_API: 'https://hacker-news.firebaseio.com/v0',

  // ❌ SUPPRIMÉES - NE FONCTIONNENT PAS DEPUIS LE NAVIGATEUR :
  // - Currents API (CORS bloqué)
  // - NewsAPI (Error 426 - ne supporte plus les appels directs front-end)

  CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
  MAX_RETRIES: 3,
  TIMEOUT: 15000
};

class APIManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      guardianAPI: { calls: 0, errors: 0, lastCall: null },
      hackerNewsAPI: { calls: 0, errors: 0, lastCall: null },
      gnewsAPI: { calls: 0, errors: 0, lastCall: null }
    };

    // Debug des clés au démarrage
    console.log('🔑 Configuration des APIs (compatible navigateur):');
    console.log('Guardian API Key:', CONFIG.GUARDIAN_API_KEY ? '✅ Configurée' : '❌ Manquante');
    console.log('GNews API Key:', CONFIG.GNEWS_API_KEY ? '✅ Configurée' : '❌ Manquante');
    console.log('Hacker News:', '✅ Pas de clé requise');
    console.log('⚠️ Currents API & NewsAPI supprimées (incompatibles navigateur)');
  }

  // Méthode utilitaire pour les appels HTTP avec timeout et retry
  async fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0 && error.name !== 'AbortError') {
        console.warn(`Retry ${CONFIG.MAX_RETRIES - retries + 1}/${CONFIG.MAX_RETRIES} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  // 🗞️ The Guardian API - Articles complets avec corps de texte
  async getGuardianDetailedNews() {
    try {
      this.stats.guardianAPI.calls++;
      this.stats.guardianAPI.lastCall = new Date();

      // Mots-clés pour des actualités bizarres/insolites
      const weirdKeywords = [
        'strange', 'weird', 'bizarre', 'unusual', 'odd', 'mysterious',
        'viral', 'social media', 'internet', 'technology gone wrong',
        'artificial intelligence', 'robot', 'smartphone', 'app',
        'florida', 'japan weird', 'unusual discovery', 'bizarre study',
        'funny', 'unexpected', 'surprising', 'unusual news',
        'quirky', 'offbeat', 'eccentric', 'peculiar'
      ];

      const randomKeyword = weirdKeywords[Math.floor(Math.random() * weirdKeywords.length)];

      const params = new URLSearchParams({
        q: randomKeyword,
        'page-size': '20',
        'order-by': 'relevance',
        'show-fields': 'headline,bodyText,webUrl,thumbnail,byline,standfirst',
        'show-tags': 'keyword',
        'api-key': CONFIG.GUARDIAN_API_KEY
      });

      const url = `${CONFIG.GUARDIAN_API_URL}?${params.toString()}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.response && data.response.results && data.response.results.length > 0) {
        // Filtrer les articles avec du contenu substantiel
        const articlesWithContent = data.response.results.filter(article =>
            article.fields?.bodyText &&
            article.fields.bodyText.length > 200 &&
            article.webTitle
        );

        if (articlesWithContent.length === 0) {
          throw new Error('Aucun article avec contenu substantiel trouvé');
        }

        const randomArticle = articlesWithContent[Math.floor(Math.random() * articlesWithContent.length)];

        // Extraire et nettoyer le contenu
        let content = randomArticle.fields.bodyText || '';

        // Utiliser standfirst (résumé) si disponible pour commencer
        if (randomArticle.fields.standfirst) {
          content = randomArticle.fields.standfirst + ' ' + content;
        }

        const cleanContent = this.extractReadableContent(content);

        const article = {
          title: randomArticle.webTitle,
          content: cleanContent,
          source: randomArticle.webUrl,
          category: "Actualités Insolites",
          publishedAt: randomArticle.webPublicationDate || new Date().toISOString(),
          isReal: true,
          verified: true,
          author: randomArticle.fields?.byline || 'The Guardian',
          thumbnail: randomArticle.fields?.thumbnail,
          keyword: randomKeyword
        };

        console.log('✅ Article Guardian complet récupéré:', randomKeyword);

        // 🇫🇷 Traduire automatiquement en français
        const translatedArticle = await translationService.translateArticle(article);
        return translatedArticle;
      }

      throw new Error('Aucun article trouvé');

    } catch (error) {
      this.stats.guardianAPI.errors++;
      console.error('❌ Guardian API Error:', error.message);
      throw error;
    }
  }

  // 🌐 Hacker News API (gratuit, pas de clé requise, actualités tech)
  async getHackerNewsStories() {
    try {
      this.stats.hackerNewsAPI.calls++;
      this.stats.hackerNewsAPI.lastCall = new Date();

      // Récupérer les top stories de Hacker News
      const topStoriesResponse = await this.fetchWithRetry(`${CONFIG.HACKER_NEWS_API}/topstories.json`);
      const topStoryIds = await topStoriesResponse.json();

      // Prendre 50 premières stories et en sélectionner 10 au hasard
      const randomStoryIds = topStoryIds.slice(0, 50).sort(() => 0.5 - Math.random()).slice(0, 10);

      // Récupérer les détails des stories
      const storyPromises = randomStoryIds.map(async (id) => {
        try {
          const storyResponse = await this.fetchWithRetry(`${CONFIG.HACKER_NEWS_API}/item/${id}.json`);
          return await storyResponse.json();
        } catch (error) {
          return null;
        }
      });

      const stories = await Promise.all(storyPromises);
      const validStories = stories.filter(story =>
          story &&
          story.title &&
          story.url &&
          !story.deleted &&
          story.type === 'story' &&
          story.title.length > 20 && // Titre minimum
          // Rechercher des histoires intéressantes/bizarres
          (story.title.toLowerCase().includes('ai') ||
              story.title.toLowerCase().includes('tech') ||
              story.title.toLowerCase().includes('robot') ||
              story.title.toLowerCase().includes('weird') ||
              story.title.toLowerCase().includes('unusual') ||
              story.title.toLowerCase().includes('strange') ||
              story.title.toLowerCase().includes('breakthrough') ||
              story.title.toLowerCase().includes('discovery') ||
              story.title.toLowerCase().includes('innovation') ||
              story.score > 100) // Ou simplement populaires
      );

      if (validStories.length > 0) {
        const randomStory = validStories[Math.floor(Math.random() * validStories.length)];

        // Créer un contenu enrichi basé sur le titre et les métriques
        const content = `Cette actualité technologique a été partagée sur Hacker News et a généré ${randomStory.score || 0} points et ${randomStory.descendants || 0} commentaires de la part de la communauté tech. L'histoire : ${randomStory.title}. Cette nouvelle a particulièrement attiré l'attention des développeurs et entrepreneurs pour son caractère innovant ou surprenant.`;

        const article = {
          title: randomStory.title,
          content: content,
          source: randomStory.url,
          category: "Tech Community",
          publishedAt: new Date(randomStory.time * 1000).toISOString(),
          isReal: true,
          verified: true,
          author: `u/${randomStory.by || 'HackerNews'}`,
          score: randomStory.score,
          comments: randomStory.descendants
        };

        console.log('✅ Histoire Hacker News récupérée:', randomStory.title.substring(0, 60));

        // 🇫🇷 Traduire automatiquement en français
        const translatedArticle = await translationService.translateArticle(article);
        return translatedArticle;
      }

      throw new Error('Aucune histoire intéressante trouvée sur Hacker News');

    } catch (error) {
      this.stats.hackerNewsAPI.errors++;
      console.error('❌ Hacker News API Error:', error.message);
      throw error;
    }
  }

  // 📡 GNews API (100 appels/jour gratuits) - SI ELLE FONCTIONNE
  async getGNewsWeirdNews() {
    if (!CONFIG.GNEWS_API_KEY || CONFIG.GNEWS_API_KEY === 'your_gnews_api_key_here') {
      throw new Error('GNews API: Clé manquante');
    }

    try {
      this.stats.gnewsAPI.calls++;
      this.stats.gnewsAPI.lastCall = new Date();

      const weirdQueries = [
        'weird technology', 'bizarre science', 'unusual discovery',
        'strange invention', 'viral news', 'internet phenomenon',
        'artificial intelligence news', 'robot news', 'tech fail',
        'funny news', 'surprising news', 'unexpected discovery',
        'breakthrough', 'innovation', 'startup news'
      ];

      const randomQuery = weirdQueries[Math.floor(Math.random() * weirdQueries.length)];

      const params = new URLSearchParams({
        q: randomQuery,
        lang: 'en',
        country: 'us',
        max: '20',
        apikey: CONFIG.GNEWS_API_KEY
      });

      const url = `${CONFIG.GNEWS_API_URL}?${params.toString()}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.articles && data.articles.length > 0) {
        // Filtrer les articles avec contenu substantiel
        const validArticles = data.articles.filter(article =>
            article.title &&
            article.description &&
            article.description.length > 100 &&
            article.content &&
            !article.title.includes('[Removed]') &&
            !article.description.includes('[Removed]')
        );

        if (validArticles.length > 0) {
          const randomArticle = validArticles[Math.floor(Math.random() * validArticles.length)];

          // Combiner description et début du contenu
          let fullContent = randomArticle.description;
          if (randomArticle.content && randomArticle.content !== randomArticle.description) {
            fullContent += ' ' + this.extractReadableContent(randomArticle.content);
          }

          const article = {
            title: randomArticle.title,
            content: fullContent,
            source: randomArticle.url,
            category: "Actualités Tech",
            publishedAt: randomArticle.publishedAt,
            isReal: true,
            verified: true,
            author: randomArticle.source?.name || 'GNews',
            thumbnail: randomArticle.image
          };

          console.log('✅ Article GNews récupéré:', randomQuery);

          // 🇫🇷 Traduire automatiquement en français
          const translatedArticle = await translationService.translateArticle(article);
          return translatedArticle;
        }
      }

      throw new Error('Aucun article GNews valide trouvé');

    } catch (error) {
      this.stats.gnewsAPI.errors++;
      console.error('❌ GNews API Error:', error.message);
      throw error;
    }
  }

  // 🧪 Test de toutes les APIs (version réduite)
  async testAPIs() {
    console.log('🧪 Test des APIs compatibles navigateur...');

    const results = {
      guardianAPI: false,
      hackerNewsAPI: false,
      gnewsAPI: false,
      translation: false
    };

    // Test des APIs de traduction d'abord
    try {
      const translationResults = await translationService.testTranslationAPIs();
      results.translation = Object.values(translationResults).some(result => result);
      console.log('Traduction:', results.translation ? '✅ Au moins une API fonctionne' : '❌ Aucune API de traduction');
    } catch (error) {
      console.log('Traduction: ❌ Erreur -', error.message);
    }

    // Test Guardian API
    try {
      const guardianResult = await this.getGuardianDetailedNews();
      results.guardianAPI = !!guardianResult;
      console.log('Guardian API:', results.guardianAPI ? '✅ OK' : '❌ Erreur');
    } catch (error) {
      console.log('Guardian API: ❌ Erreur -', error.message);
    }

    // Test Hacker News API
    try {
      const hackerNewsResult = await this.getHackerNewsStories();
      results.hackerNewsAPI = !!hackerNewsResult;
      console.log('Hacker News API:', results.hackerNewsAPI ? '✅ OK' : '❌ Erreur');
    } catch (error) {
      console.log('Hacker News API: ❌ Erreur -', error.message);
    }

    // Test GNews API (si clé disponible)
    if (CONFIG.GNEWS_API_KEY && CONFIG.GNEWS_API_KEY !== 'your_gnews_api_key_here') {
      try {
        const gnewsResult = await this.getGNewsWeirdNews();
        results.gnewsAPI = !!gnewsResult;
        console.log('GNews API:', results.gnewsAPI ? '✅ OK' : '❌ Erreur');
      } catch (error) {
        console.log('GNews API: ❌ Erreur -', error.message);
      }
    } else {
      console.log('GNews API: ⚠️ Pas de clé configurée');
    }

    console.log('📊 Résumé des tests:', results);
    return results;
  }

  // 🌟 Méthode principale : récupération d'UNE actualité au hasard
  async getMixedNews() {
    console.log('🔄 Récupération d\'actualités via APIs compatibles...');

    // ⚠️ STRATÉGIE: Essayer les APIs fonctionnelles dans un ordre aléatoire
    const newsAPIs = [
      { name: 'Guardian', method: () => this.getGuardianDetailedNews() },
      { name: 'Hacker News', method: () => this.getHackerNewsStories() }
    ];

    // Ajouter GNews si configurée
    if (CONFIG.GNEWS_API_KEY && CONFIG.GNEWS_API_KEY !== 'your_gnews_api_key_here') {
      newsAPIs.push({ name: 'GNews', method: () => this.getGNewsWeirdNews() });
    }

    // Mélanger l'ordre des APIs pour varier les sources
    const shuffledAPIs = newsAPIs.sort(() => 0.5 - Math.random());

    // Essayer chaque API jusqu'à ce qu'une fonctionne
    for (const api of shuffledAPIs) {
      try {
        console.log(`🔄 Tentative ${api.name}...`);
        const result = await api.method();
        
        if (result) {
          console.log(`✅ Succès avec ${api.name}`);
          return [result]; // Retourner un tableau avec une seule actualité
        }
      } catch (error) {
        console.warn(`⚠️ ${api.name} a échoué:`, error.message);
        continue; // Passer à l'API suivante
      }
    }

    // Si toutes les APIs échouent
    throw new Error('Toutes les APIs d\'actualités compatibles ont échoué');
  }

  // 🧹 Méthodes utilitaires pour nettoyer le contenu
  extractReadableContent(text, maxLength = 500) {
    if (!text) return '';

    // Nettoyer le HTML et les caractères bizarres
    const cleanText = text
        .replace(/<[^>]*>/g, ' ') // Supprimer HTML
        .replace(/&[^;]+;/g, ' ') // Supprimer entités HTML
        .replace(/\s+/g, ' ') // Normaliser espaces
        .replace(/\[.*?\]/g, '') // Supprimer crochets [...]
        .replace(/\.\.\./g, '') // Supprimer points de suspension multiples
        .trim();

    // Couper aux phrases complètes
    const sentences = cleanText.split(/[.!?]+/)
        .filter(sentence => sentence.trim().length > 20)
        .slice(0, 3); // Maximum 3 phrases

    let result = sentences.join('. ').trim();
    if (result && !result.endsWith('.')) {
      result += '.';
    }

    // Limiter la longueur si nécessaire
    if (result.length > maxLength) {
      result = result.substring(0, maxLength).trim();
      // Couper au dernier mot complet
      const lastSpace = result.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.8) {
        result = result.substring(0, lastSpace) + '...';
      }
    }

    return result;
  }

  // Statistiques
  getStats() {
    const totalCalls = Object.values(this.stats).reduce((sum, api) => sum + api.calls, 0);
    const totalErrors = Object.values(this.stats).reduce((sum, api) => sum + api.errors, 0);

    return {
      ...this.stats,
      cacheSize: this.cache.size,
      totalCalls,
      totalErrors,
      successRate: totalCalls > 0 ? ((totalCalls - totalErrors) / totalCalls * 100).toFixed(1) + '%' : '100%'
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache nettoyé');
  }

  debug() {
    console.group('🔧 Debug API Manager - Compatible Navigateur');
    console.log('📊 Statistiques:', this.getStats());
    console.log('🗞️ APIs actives:', 'Guardian, Hacker News, GNews (si configurée)');
    console.log('❌ APIs supprimées:', 'Currents (CORS), NewsAPI (Error 426)');
    console.log('💾 Cache:', `${this.cache.size} entrées`);
    console.log('🎯 Stratégie:', 'APIs compatibles navigateur uniquement');
    console.groupEnd();
  }
}

// Instance unique
export const apiManager = new APIManager();

// Export des utilitaires
export { CONFIG };
export const utils = {
  clearCache: () => apiManager.clearCache(),
  getStats: () => apiManager.getStats(),
  debug: () => apiManager.debug()
};
