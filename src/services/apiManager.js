// src/services/apiManager.js - VERSION SANS NEWS EN DUR
import { translationService } from './translationService.js';

const CONFIG = {
  // API The Guardian (gratuite, 12k appels/jour) - EXCELLENTE POUR ARTICLES COMPLETS
  GUARDIAN_API_URL: 'https://content.guardianapis.com/search',
  GUARDIAN_API_KEY: import.meta.env.VITE_GUARDIAN_API_KEY || 'test',

  // GNews API (gratuite, 100 appels/jour)
  GNEWS_API_URL: 'https://gnews.io/api/v4/search',
  GNEWS_API_KEY: import.meta.env.VITE_GNEWS_API_KEY,

  // API News from various sources (gratuit)
  CURRENTS_API_URL: 'https://api.currentsapi.services/v1/search',
  CURRENTS_API_KEY: import.meta.env.VITE_CURRENTS_API_KEY,

  // NewsAPI (optionnel) - 1000 appels/jour gratuits
  NEWS_API_URL: 'https://newsapi.org/v2/everything',
  NEWS_API_KEY: import.meta.env.VITE_NEWS_API_KEY,

  // Hacker News API (pas de clé requise) - actualités tech
  HACKER_NEWS_API: 'https://hacker-news.firebaseio.com/v0',

  CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
  MAX_RETRIES: 3,
  TIMEOUT: 15000
};

class APIManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      guardianAPI: { calls: 0, errors: 0, lastCall: null },
      newsAPI: { calls: 0, errors: 0, lastCall: null },
      hackerNewsAPI: { calls: 0, errors: 0, lastCall: null },
      gnewsAPI: { calls: 0, errors: 0, lastCall: null },
      currentsAPI: { calls: 0, errors: 0, lastCall: null }
    };

    // Debug des clés au démarrage
    console.log('🔑 Configuration des APIs:');
    console.log('Guardian API Key:', CONFIG.GUARDIAN_API_KEY ? '✅ Configurée' : '❌ Manquante');
    console.log('GNews API Key:', CONFIG.GNEWS_API_KEY ? '✅ Configurée' : '❌ Manquante');
    console.log('Currents API Key:', CONFIG.CURRENTS_API_KEY ? '✅ Configurée' : '❌ Manquante');
    console.log('NewsAPI Key:', CONFIG.NEWS_API_KEY ? '✅ Configurée' : '❌ Manquante');
    console.log('Hacker News:', '✅ Pas de clé requise');
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
        'funny', 'unexpected', 'surprising', 'unusual news'
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
      throw error; // ⚠️ MAINTENANT ON THROW L'ERREUR AU LIEU DE RETOURNER NULL
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

      // Prendre 20 premières stories au hasard
      const randomStoryIds = topStoryIds.slice(0, 50).sort(() => 0.5 - Math.random()).slice(0, 20);

      // Récupérer les détails de 5 stories random
      const storyPromises = randomStoryIds.slice(0, 5).map(async (id) => {
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
          (story.title.toLowerCase().includes('ai') ||
              story.title.toLowerCase().includes('tech') ||
              story.title.toLowerCase().includes('robot') ||
              story.title.toLowerCase().includes('weird') ||
              story.title.toLowerCase().includes('unusual') ||
              story.title.toLowerCase().includes('strange'))
      );

      if (validStories.length > 0) {
        const randomStory = validStories[Math.floor(Math.random() * validStories.length)];

        // Créer un contenu basé sur le titre et le score
        const content = `Cette actualité tech a été partagée sur Hacker News avec ${randomStory.score || 0} points et ${randomStory.descendants || 0} commentaires. ${randomStory.title}. Cette histoire a attiré l'attention de la communauté technologique pour son caractère inhabituel ou innovant.`;

        const article = {
          title: randomStory.title,
          content: content,
          source: randomStory.url,
          category: "Hacker News Tech",
          publishedAt: new Date(randomStory.time * 1000).toISOString(),
          isReal: true,
          verified: true,
          author: `u/${randomStory.by || 'HackerNews'}`,
          score: randomStory.score,
          comments: randomStory.descendants
        };

        console.log('✅ Histoire Hacker News récupérée');

        // 🇫🇷 Traduire automatiquement en français
        const translatedArticle = await translationService.translateArticle(article);
        return translatedArticle;
      }

      throw new Error('Aucune histoire tech trouvée sur Hacker News');

    } catch (error) {
      this.stats.hackerNewsAPI.errors++;
      console.error('❌ Hacker News API Error:', error.message);
      throw error; // ⚠️ MAINTENANT ON THROW L'ERREUR AU LIEU DE RETOURNER NULL
    }
  }

  // 📡 GNews API (100 appels/jour gratuits)
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
        'funny news', 'surprising news', 'unexpected discovery'
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
            !article.title.includes('[Removed]')
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

          console.log('✅ Article GNews récupéré');

          // 🇫🇷 Traduire automatiquement en français
          const translatedArticle = await translationService.translateArticle(article);
          return translatedArticle;
        }
      }

      throw new Error('Aucun article GNews valide trouvé');

    } catch (error) {
      this.stats.gnewsAPI.errors++;
      console.error('❌ GNews API Error:', error.message);
      throw error; // ⚠️ MAINTENANT ON THROW L'ERREUR AU LIEU DE RETOURNER NULL
    }
  }

  // 📊 Currents API (gratuite, bons articles complets)
  async getCurrentsNews() {
    if (!CONFIG.CURRENTS_API_KEY || CONFIG.CURRENTS_API_KEY === 'your_currents_api_key_here') {
      throw new Error('Currents API: Clé manquante');
    }

    try {
      this.stats.currentsAPI.calls++;
      this.stats.currentsAPI.lastCall = new Date();

      const techKeywords = [
        'artificial intelligence', 'robot', 'technology', 'weird tech',
        'internet', 'viral', 'bizarre science', 'unusual study',
        'funny discovery', 'strange invention', 'tech news'
      ];

      const randomKeyword = techKeywords[Math.floor(Math.random() * techKeywords.length)];

      const params = new URLSearchParams({
        keywords: randomKeyword,
        language: 'en',
        apiKey: CONFIG.CURRENTS_API_KEY
      });

      const url = `${CONFIG.CURRENTS_API_URL}?${params.toString()}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.status === 'ok' && data.news && data.news.length > 0) {
        // Filtrer les articles avec description substantielle
        const validArticles = data.news.filter(article =>
            article.title &&
            article.description &&
            article.description.length > 150
        );

        if (validArticles.length > 0) {
          const randomArticle = validArticles[Math.floor(Math.random() * validArticles.length)];

          const article = {
            title: randomArticle.title,
            content: randomArticle.description,
            source: randomArticle.url,
            category: "Tech News",
            publishedAt: randomArticle.published,
            isReal: true,
            verified: true,
            author: randomArticle.author || 'Currents API',
            thumbnail: randomArticle.image
          };

          console.log('✅ Article Currents récupéré');

          // 🇫🇷 Traduire automatiquement en français
          const translatedArticle = await translationService.translateArticle(article);
          return translatedArticle;
        }
      }

      throw new Error('Aucun article Currents valide trouvé');

    } catch (error) {
      this.stats.currentsAPI.errors++;
      console.error('❌ Currents API Error:', error.message);
      throw error; // ⚠️ MAINTENANT ON THROW L'ERREUR AU LIEU DE RETOURNER NULL
    }
  }

  // 📰 NewsAPI comme backup (si clé fournie)
  async getNewsAPIWeirdNews() {
    if (!CONFIG.NEWS_API_KEY || CONFIG.NEWS_API_KEY === 'your_news_api_key_here') {
      throw new Error('NewsAPI: Clé manquante');
    }

    try {
      this.stats.newsAPI.calls++;
      this.stats.newsAPI.lastCall = new Date();

      const weirdQuery = [
        'weird technology', 'bizarre incident', 'unusual story', 'viral news',
        'artificial intelligence', 'robot malfunction', 'tech gone wrong',
        'funny discovery', 'strange science', 'unexpected news'
      ];

      const randomQuery = weirdQuery[Math.floor(Math.random() * weirdQuery.length)];

      const params = new URLSearchParams({
        q: randomQuery,
        sortBy: 'publishedAt',
        pageSize: '20',
        language: 'en',
        apiKey: CONFIG.NEWS_API_KEY
      });

      const url = `${CONFIG.NEWS_API_URL}?${params.toString()}`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.articles && data.articles.length > 0) {
        const validArticles = data.articles.filter(article =>
            article.title &&
            article.description &&
            article.description.length > 100 &&
            !article.title.includes('[Removed]')
        );

        if (validArticles.length > 0) {
          const randomArticle = validArticles[Math.floor(Math.random() * validArticles.length)];

          let content = randomArticle.description;
          if (randomArticle.content) {
            content += ' ' + this.extractReadableContent(randomArticle.content);
          }

          const article = {
            title: randomArticle.title,
            content: content,
            source: randomArticle.url,
            category: "NewsAPI",
            publishedAt: randomArticle.publishedAt,
            isReal: true,
            verified: true,
            author: randomArticle.author || randomArticle.source?.name
          };

          console.log('✅ Article NewsAPI récupéré');

          // 🇫🇷 Traduire automatiquement en français
          const translatedArticle = await translationService.translateArticle(article);
          return translatedArticle;
        }
      }

      throw new Error('Aucun article NewsAPI valide trouvé');

    } catch (error) {
      this.stats.newsAPI.errors++;
      console.error('❌ NewsAPI Error:', error.message);
      throw error; // ⚠️ MAINTENANT ON THROW L'ERREUR AU LIEU DE RETOURNER NULL
    }
  }

  // 🧪 Test de toutes les APIs
  async testAPIs() {
    console.log('🧪 Test des APIs d\'actualités...');

    const results = {
      guardianAPI: false,
      hackerNewsAPI: false,
      gnewsAPI: false,
      currentsAPI: false,
      newsAPI: false,
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

    // Test Currents API (si clé disponible)
    if (CONFIG.CURRENTS_API_KEY && CONFIG.CURRENTS_API_KEY !== 'your_currents_api_key_here') {
      try {
        const currentsResult = await this.getCurrentsNews();
        results.currentsAPI = !!currentsResult;
        console.log('Currents API:', results.currentsAPI ? '✅ OK' : '❌ Erreur');
      } catch (error) {
        console.log('Currents API: ❌ Erreur -', error.message);
      }
    } else {
      console.log('Currents API: ⚠️ Pas de clé configurée');
    }

    // Test NewsAPI (si clé disponible)
    if (CONFIG.NEWS_API_KEY && CONFIG.NEWS_API_KEY !== 'your_news_api_key_here') {
      try {
        const newsResult = await this.getNewsAPIWeirdNews();
        results.newsAPI = !!newsResult;
        console.log('NewsAPI:', results.newsAPI ? '✅ OK' : '❌ Erreur');
      } catch (error) {
        console.log('NewsAPI: ❌ Erreur -', error.message);
      }
    } else {
      console.log('NewsAPI: ⚠️ Pas de clé configurée');
    }

    console.log('📊 Résumé des tests:', results);
    return results;
  }

  // 🌟 Méthode principale : récupération d'UNE actualité au hasard
  async getMixedNews() {
    console.log('🔄 Récupération d\'actualités via APIs...');

    // ⚠️ STRATÉGIE: Essayer les APIs dans un ordre aléatoire jusqu'à ce qu'une fonctionne
    const newsAPIs = [
      { name: 'Guardian', method: () => this.getGuardianDetailedNews() },
      { name: 'Hacker News', method: () => this.getHackerNewsStories() },
      { name: 'GNews', method: () => this.getGNewsWeirdNews() },
      { name: 'Currents', method: () => this.getCurrentsNews() },
      { name: 'NewsAPI', method: () => this.getNewsAPIWeirdNews() }
    ];

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
    throw new Error('Toutes les APIs d\'actualités ont échoué');
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

  cleanHTMLContent(html) {
    if (!html) return '';

    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Supprimer styles
        .replace(/<[^>]*>/g, ' ') // Supprimer toutes les balises HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
    console.group('🔧 Debug API Manager - Actualités uniquement via APIs');
    console.log('📊 Statistiques:', this.getStats());
    console.log('🗞️ APIs configurées:', 'Guardian, Hacker News, GNews, Currents, NewsAPI');
    console.log('💾 Cache:', `${this.cache.size} entrées`);
    console.log('🎯 Stratégie:', 'Aucune news en dur, APIs uniquement');
    console.log('⚠️ Fallback:', 'Si toutes les APIs échouent = erreur');
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
