// Configuration des APIs
const CONFIG = {
  NEWS_API_KEY: import.meta.env.VITE_NEWS_API_KEY || 'YOUR_NEWS_API_KEY',
  GOOGLE_FACT_CHECK_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY',
  API_NINJAS_KEY: import.meta.env.VITE_API_NINJAS_KEY || 'YOUR_API_NINJAS_KEY',

  NEWS_API_URL: 'https://newsapi.org/v2',
  GOOGLE_FACT_CHECK_URL: 'https://factchecktools.googleapis.com/v1alpha1',
  USELESS_FACTS_URL: 'https://uselessfacts.jsph.pl/api/v2',
  API_NINJAS_URL: 'https://api.api-ninjas.com/v1',

  COUNTRY: 'fr',
  NEWS_CATEGORIES: ['general', 'technology', 'science', 'health', 'business'],

  // Paramètres de cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  TIMEOUT: 10000 // 10 secondes
};

class APIManager {
  constructor() {
    this.newsApiKey = CONFIG.NEWS_API_KEY;
    this.googleApiKey = CONFIG.GOOGLE_FACT_CHECK_API_KEY;
    this.apiNinjasKey = CONFIG.API_NINJAS_KEY;

    // Cache simple pour éviter les appels répétés
    this.cache = new Map();

    // Statistiques d'utilisation
    this.stats = {
      newsAPI: { calls: 0, errors: 0, lastCall: null },
      factCheckAPI: { calls: 0, errors: 0, lastCall: null },
      uselessFactsAPI: { calls: 0, errors: 0, lastCall: null },
      apiNinjas: { calls: 0, errors: 0, lastCall: null }
    };
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

      if (retries > 0 && !error.name === 'AbortError') {
        console.warn(`Retry ${CONFIG.MAX_RETRIES - retries + 1}/${CONFIG.MAX_RETRIES} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  // Gestion du cache
  getCacheKey(prefix, params) {
    return `${prefix}_${JSON.stringify(params)}_${Date.now()}`;
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Récupérer des actualités depuis News API
  async fetchNewsAPI(category = 'general', pageSize = 10) {
    const cacheKey = this.getCacheKey('news', { category, pageSize });
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      console.log('📦 Actualités récupérées depuis le cache');
      return cached;
    }

    try {
      if (this.newsApiKey === 'VITE_NEWS_API_KEY') {
        throw new Error('News API key not configured');
      }

      this.stats.newsAPI.calls++;
      this.stats.newsAPI.lastCall = new Date();

      const url = `${CONFIG.NEWS_API_URL}/top-headlines?country=${CONFIG.COUNTRY}&category=${category}&pageSize=${pageSize}&apiKey=${this.newsApiKey}`;

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.status === 'ok') {
        const processedNews = data.articles
        .filter(article => article.title && article.description && !article.title.includes('[Removed]'))
        .map(article => ({
          title: article.title,
          content: this.truncateText(article.description || article.content, 200),
          source: article.url,
          publishedAt: article.publishedAt,
          category: category.charAt(0).toUpperCase() + category.slice(1),
          author: article.author,
          sourceName: article.source?.name,
          imageUrl: article.urlToImage,
          isReal: true,
          verified: true
        }));

        this.setCachedData(cacheKey, processedNews);
        console.log(`✅ ${processedNews.length} actualités News API récupérées`);
        return processedNews;
      } else {
        throw new Error(data.message || 'News API Error');
      }
    } catch (error) {
      this.stats.newsAPI.errors++;
      console.error('❌ News API Error:', error.message);
      return [];
    }
  }

  // Rechercher des actualités par mot-clé
  async searchNews(query, pageSize = 5) {
    const cacheKey = this.getCacheKey('search', { query, pageSize });
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      if (this.newsApiKey === 'YOUR_NEWS_API_KEY') {
        throw new Error('News API key not configured');
      }

      this.stats.newsAPI.calls++;

      const url = `${CONFIG.NEWS_API_URL}/everything?q=${encodeURIComponent(query)}&language=fr&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${this.newsApiKey}`;

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.status === 'ok') {
        const results = data.articles
        .filter(article => article.title && article.description)
        .map(article => ({
          title: article.title,
          content: this.truncateText(article.description, 200),
          source: article.url,
          publishedAt: article.publishedAt,
          category: 'Recherche',
          sourceName: article.source?.name,
          isReal: true,
          verified: true
        }));

        this.setCachedData(cacheKey, results);
        return results;
      }
      return [];
    } catch (error) {
      this.stats.newsAPI.errors++;
      console.error('❌ Search News API Error:', error.message);
      return [];
    }
  }

  // Vérifier une information avec Google Fact Check
  async checkFactWithGoogle(query) {
    const cacheKey = this.getCacheKey('factcheck', { query });
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      if (this.googleApiKey === 'YOUR_GOOGLE_API_KEY') {
        throw new Error('Google API key not configured');
      }

      this.stats.factCheckAPI.calls++;
      this.stats.factCheckAPI.lastCall = new Date();

      const url = `${CONFIG.GOOGLE_FACT_CHECK_URL}/claims:search?query=${encodeURIComponent(query)}&languageCode=fr&key=${this.googleApiKey}`;

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.claims && data.claims.length > 0) {
        const result = {
          isFactChecked: true,
          claims: data.claims.map(claim => ({
            text: claim.text,
            claimant: claim.claimant,
            claimDate: claim.claimDate,
            claimReview: claim.claimReview ? claim.claimReview.map(review => ({
              publisher: review.publisher?.name,
              url: review.url,
              title: review.title,
              reviewDate: review.reviewDate,
              textualRating: review.textualRating,
              languageCode: review.languageCode
            })) : []
          }))
        };

        this.setCachedData(cacheKey, result);
        return result;
      }

      const noResultsResponse = {
        isFactChecked: false,
        claims: []
      };

      this.setCachedData(cacheKey, noResultsResponse);
      return noResultsResponse;
    } catch (error) {
      this.stats.factCheckAPI.errors++;
      console.error('❌ Google Fact Check Error:', error.message);
      return {
        isFactChecked: false,
        claims: [],
        error: error.message
      };
    }
  }

  // Récupérer un fait aléatoire depuis Useless Facts API
  async getRandomFact() {
    try {
      this.stats.uselessFactsAPI.calls++;
      this.stats.uselessFactsAPI.lastCall = new Date();

      const response = await this.fetchWithRetry(`${CONFIG.USELESS_FACTS_URL}/facts/random?language=en`);
      const data = await response.json();

      const fact = {
        title: "Fait insolite du jour",
        content: data.text,
        source: data.source_url || "https://uselessfacts.jsph.pl",
        category: "Insolite",
        publishedAt: new Date().toISOString(),
        isReal: true
      };

      console.log('✅ Fait insolite récupéré');
      return fact;
    } catch (error) {
      this.stats.uselessFactsAPI.errors++;
      console.error('❌ Useless Facts API Error:', error.message);
      return null;
    }
  }

  // Récupérer des faits depuis API Ninjas
  async getFactsFromNinjas(limit = 1) {
    const cacheKey = this.getCacheKey('ninjas', { limit });
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      if (this.apiNinjasKey === 'YOUR_API_NINJAS_KEY') {
        throw new Error('API Ninjas key not configured');
      }

      this.stats.apiNinjas.calls++;
      this.stats.apiNinjas.lastCall = new Date();

      const response = await this.fetchWithRetry(`${CONFIG.API_NINJAS_URL}/facts?limit=${limit}`, {
        headers: {
          'X-Api-Key': this.apiNinjasKey
        }
      });

      const data = await response.json();

      const facts = data.map(fact => ({
        title: "Fait scientifique",
        content: fact.fact,
        source: "https://api.api-ninjas.com",
        category: "Science",
        publishedAt: new Date().toISOString(),
        isReal: true
      }));

      this.setCachedData(cacheKey, facts);
      console.log(`✅ ${facts.length} faits scientifiques récupérés`);
      return facts;
    } catch (error) {
      this.stats.apiNinjas.errors++;
      console.error('❌ API Ninjas Error:', error.message);
      return [];
    }
  }

  // Méthode pour tester toutes les APIs
  async testAPIs() {
    console.log('🧪 Test complet des APIs...');

    const results = {
      newsAPI: false,
      factCheckAPI: false,
      uselessFactsAPI: false,
      apiNinjas: false
    };

    // Test News API
    try {
      console.log('📰 Test News API...');
      const news = await this.fetchNewsAPI('technology', 1);
      results.newsAPI = news.length > 0;
      console.log('News API:', results.newsAPI ? '✅ OK' : '❌ Erreur');
    } catch (error) {
      console.log('News API: ❌ Erreur -', error.message);
    }

    // Test Google Fact Check
    try {
      console.log('🔍 Test Google Fact Check...');
      const factCheck = await this.checkFactWithGoogle('covid vaccin');
      results.factCheckAPI = factCheck.isFactChecked;
      console.log('Fact Check API:', results.factCheckAPI ? '✅ OK' : '❌ Aucun résultat');
    } catch (error) {
      console.log('Fact Check API: ❌ Erreur -', error.message);
    }

    // Test Useless Facts
    try {
      console.log('🎲 Test Useless Facts...');
      const randomFact = await this.getRandomFact();
      results.uselessFactsAPI = !!randomFact;
      console.log('Useless Facts API:', results.uselessFactsAPI ? '✅ OK' : '❌ Erreur');
    } catch (error) {
      console.log('Useless Facts API: ❌ Erreur -', error.message);
    }

    // Test API Ninjas
    try {
      console.log('🥷 Test API Ninjas...');
      const facts = await this.getFactsFromNinjas(1);
      results.apiNinjas = facts.length > 0;
      console.log('API Ninjas:', results.apiNinjas ? '✅ OK' : '❌ Erreur');
    } catch (error) {
      console.log('API Ninjas: ❌ Erreur -', error.message);
    }

    console.log('📊 Résumé des tests:', results);
    return results;
  }

  // Méthode pour obtenir un mélange d'actualités
  async getMixedNews() {
    const results = [];

    try {
      console.log('🔄 Récupération d\'un mélange d\'actualités...');

      // Récupérer des actualités récentes (si API disponible)
      if (this.newsApiKey !== 'YOUR_NEWS_API_KEY') {
        try {
          const recentNews = await this.fetchNewsAPI('general', 3);
          results.push(...recentNews);

          const techNews = await this.fetchNewsAPI('technology', 2);
          results.push(...techNews);

          console.log(`📰 ${recentNews.length + techNews.length} actualités News API ajoutées`);
        } catch (error) {
          console.warn('⚠️ News API non disponible:', error.message);
        }
      }

      // Récupérer des faits insolites
      try {
        const randomFact = await this.getRandomFact();
        if (randomFact) {
          results.push(randomFact);
          console.log('🎲 1 fait insolite ajouté');
        }
      } catch (error) {
        console.warn('⚠️ Useless Facts API non disponible:', error.message);
      }

      // Récupérer des faits scientifiques
      if (this.apiNinjasKey !== 'YOUR_API_NINJAS_KEY') {
        try {
          const scienceFacts = await this.getFactsFromNinjas(2);
          results.push(...scienceFacts);
          console.log(`🔬 ${scienceFacts.length} faits scientifiques ajoutés`);
        } catch (error) {
          console.warn('⚠️ API Ninjas non disponible:', error.message);
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors du mélange des actualités:', error);
    }

    console.log(`📊 Total: ${results.length} actualités récupérées via APIs`);
    return results;
  }

  // Méthode pour valider une actualité
  async validateNews(newsItem) {
    try {
      if (this.googleApiKey === 'YOUR_GOOGLE_API_KEY') {
        return {
          isValidated: false,
          message: "Google API key not configured"
        };
      }

      console.log(`🔍 Validation de: "${newsItem.title.substring(0, 50)}..."`);

      // Vérifier avec Google Fact Check
      const factCheck = await this.checkFactWithGoogle(newsItem.title);

      if (factCheck.isFactChecked && factCheck.claims.length > 0) {
        const claim = factCheck.claims[0];
        const reviews = claim.claimReview;

        if (reviews && reviews.length > 0) {
          const review = reviews[0];
          return {
            isValidated: true,
            rating: review.textualRating,
            source: review.url,
            publisher: review.publisher,
            reviewDate: review.reviewDate,
            claim: claim.text
          };
        }
      }

      return {
        isValidated: false,
        message: "Aucune vérification trouvée dans la base de données"
      };
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error);
      return {
        isValidated: false,
        error: error.message
      };
    }
  }

  // Méthode pour récupérer des actualités par catégorie
  async getNewsByCategory(category) {
    try {
      console.log(`📂 Récupération actualités catégorie: ${category}`);
      return await this.fetchNewsAPI(category, 5);
    } catch (error) {
      console.error(`❌ Erreur catégorie ${category}:`, error);
      return [];
    }
  }

  // Méthode pour vérifier la connectivité des APIs
  async checkAPIHealth() {
    const health = {
      newsAPI: { status: 'checking', lastCheck: new Date(), responseTime: null },
      factCheckAPI: { status: 'checking', lastCheck: new Date(), responseTime: null },
      uselessFactsAPI: { status: 'checking', lastCheck: new Date(), responseTime: null },
      apiNinjas: { status: 'checking', lastCheck: new Date(), responseTime: null }
    };

    console.log('🩺 Vérification de la santé des APIs...');

    // Test rapide de chaque API avec mesure du temps de réponse
    const testResults = await this.testAPIs();

    health.newsAPI.status = testResults.newsAPI ? 'online' : 'offline';
    health.factCheckAPI.status = testResults.factCheckAPI ? 'online' : 'offline';
    health.uselessFactsAPI.status = testResults.uselessFactsAPI ? 'online' : 'offline';
    health.apiNinjas.status = testResults.apiNinjas ? 'online' : 'offline';

    return health;
  }

  // Obtenir les statistiques d'utilisation
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      totalCalls: Object.values(this.stats).reduce((sum, api) => sum + api.calls, 0),
      totalErrors: Object.values(this.stats).reduce((sum, api) => sum + api.errors, 0)
    };
  }

  // Nettoyer le cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache nettoyé');
  }

  // Méthode utilitaire pour tronquer le texte
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  // Méthode pour obtenir des actualités de sources françaises spécifiques
  async getFrenchNews() {
    try {
      if (this.newsApiKey === 'YOUR_NEWS_API_KEY') {
        throw new Error('News API key not configured');
      }

      const sources = 'le-monde,les-echos,liberation,le-figaro';
      const url = `${CONFIG.NEWS_API_URL}/top-headlines?sources=${sources}&apiKey=${this.newsApiKey}`;

      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (data.status === 'ok') {
        return data.articles.map(article => ({
          title: article.title,
          content: this.truncateText(article.description, 200),
          source: article.url,
          publishedAt: article.publishedAt,
          category: 'France',
          sourceName: article.source.name,
          isReal: true,
          verified: true
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ Erreur actualités françaises:', error);
      return [];
    }
  }

  // Méthode de debug pour afficher l'état de l'API Manager
  debug() {
    console.group('🔧 Debug API Manager');
    console.log('📊 Statistiques:', this.getStats());
    console.log('🔑 Clés configurées:', {
      newsAPI: this.newsApiKey !== 'YOUR_NEWS_API_KEY',
      googleAPI: this.googleApiKey !== 'YOUR_GOOGLE_API_KEY',
      apiNinjas: this.apiNinjasKey !== 'YOUR_API_NINJAS_KEY'
    });
    console.log('💾 Cache:', `${this.cache.size} entrées`);
    console.groupEnd();
  }
}

// Créer une instance unique
export const apiManager = new APIManager();

// Export de la configuration pour utilisation ailleurs
export { CONFIG };

// Export des fonctions utilitaires
export const utils = {
  truncateText: (text, maxLength) => apiManager.truncateText(text, maxLength),
  clearCache: () => apiManager.clearCache(),
  getStats: () => apiManager.getStats(),
  debug: () => apiManager.debug()
};