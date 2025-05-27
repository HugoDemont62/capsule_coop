const CONFIG = {
  NEWS_API_KEY: import.meta.env.VITE_NEWS_API_KEY || null, // ← Changé ici

  // URLs des APIs gratuites - TOUTES EN HTTPS
  USELESS_FACTS_URL: 'https://uselessfacts.jsph.pl/api/v2',
  CAT_FACTS_URL: 'https://catfact.ninja',
  COUNTRIES_API_URL: 'https://restcountries.com/v3.1',
  JOKE_API_URL: 'https://v2.jokeapi.dev',

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
    this.cache = new Map();
    this.stats = {
      newsAPI: { calls: 0, errors: 0, lastCall: null },
      uselessFacts: { calls: 0, errors: 0, lastCall: null },
      catFacts: { calls: 0, errors: 0, lastCall: null },
      numbersAPI: { calls: 0, errors: 0, lastCall: null },
      countriesAPI: { calls: 0, errors: 0, lastCall: null },
      jokeAPI: { calls: 0, errors: 0, lastCall: null },
      historyAPI: { calls: 0, errors: 0, lastCall: null }
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  // Gestion du cache
  getCacheKey(prefix, params) {
    return `${prefix}_${JSON.stringify(params)}`;
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

  // 📰 News API - DÉSACTIVÉE PAR DÉFAUT
  async fetchNewsAPI(category = 'general', pageSize = 5) {
    try {
      // 🔧 Vérification stricte de la clé API
      if (!this.newsApiKey || this.newsApiKey === 'your_news_api_key_here' || this.newsApiKey === null) {
        console.log('⚠️ News API désactivée (pas de clé configurée)');
        return [];
      }

      console.log('ℹ️ News API configurée, tentative d\'utilisation...');
      
      const cacheKey = this.getCacheKey('news', { category, pageSize });
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        console.log('📦 Actualités News API depuis le cache');
        return cached;
      }

      this.stats.newsAPI.calls++;
      this.stats.newsAPI.lastCall = new Date();

      const url = `https://newsapi.org/v2/top-headlines?country=${CONFIG.COUNTRY}&category=${category}&pageSize=${pageSize}&apiKey=${this.newsApiKey}`;

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

  // 🎲 Useless Facts API (100% gratuite)
  async getUselessFact() {
    try {
      this.stats.uselessFacts.calls++;
      this.stats.uselessFacts.lastCall = new Date();

      const response = await this.fetchWithRetry(`${CONFIG.USELESS_FACTS_URL}/facts/random?language=en`);
      const data = await response.json();

      const fact = {
        title: "Fait insolite authentique",
        content: data.text,
        source: "https://uselessfacts.jsph.pl",
        category: "Insolite",
        publishedAt: new Date().toISOString(),
        isReal: true,
        verified: true
      };

      console.log('✅ Fait insolite récupéré');
      return fact;
    } catch (error) {
      this.stats.uselessFacts.errors++;
      console.error('❌ Useless Facts Error:', error.message);
      return null;
    }
  }

  // 🐱 Cat Facts API (100% gratuite)
  async getCatFact() {
    try {
      this.stats.catFacts.calls++;
      this.stats.catFacts.lastCall = new Date();

      const response = await this.fetchWithRetry(`${CONFIG.CAT_FACTS_URL}/fact`);
      const data = await response.json();

      const fact = {
        title: "Fait authentique sur les chats",
        content: data.fact,
        source: "https://catfact.ninja",
        category: "Animaux",
        publishedAt: new Date().toISOString(),
        isReal: true,
        verified: true
      };

      console.log('✅ Fait sur les chats récupéré');
      return fact;
    } catch (error) {
      this.stats.catFacts.errors++;
      console.error('❌ Cat Facts Error:', error.message);
      return null;
    }
  }

  // 🔢 Numbers API - VERSION LOCALE (pas d'API externe)
  async getNumberFact() {
    try {
      this.stats.numbersAPI.calls++;
      this.stats.numbersAPI.lastCall = new Date();

      const randomNum = Math.floor(Math.random() * 1000);
      
      const mathFacts = [
        `Le nombre ${randomNum} est ${randomNum % 2 === 0 ? 'pair' : 'impair'}.`,
        `${randomNum} en binaire s'écrit ${randomNum.toString(2)}.`,
        `La racine carrée de ${randomNum} est environ ${Math.sqrt(randomNum).toFixed(2)}.`,
        `${randomNum} au carré égale ${randomNum * randomNum}.`,
        `${randomNum} divisé par 3 donne un reste de ${randomNum % 3}.`,
        `En hexadécimal, ${randomNum} s'écrit ${randomNum.toString(16).toUpperCase()}.`,
        `Le nombre ${randomNum} a ${randomNum.toString().length} chiffre(s).`,
        `${randomNum} multiplié par 9 égale ${randomNum * 9}.`,
        `${randomNum} est ${isPrime(randomNum) ? 'un nombre premier' : 'un nombre composé'}.`,
        `La somme des chiffres de ${randomNum} est ${randomNum.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0)}.`
      ];

      const randomFact = mathFacts[Math.floor(Math.random() * mathFacts.length)];

      const fact = {
        title: `Fait mathématique sur le nombre ${randomNum}`,
        content: randomFact,
        source: "https://fr.wikipedia.org/wiki/Mathématiques",
        category: "Mathématiques",
        publishedAt: new Date().toISOString(),
        isReal: true,
        verified: true
      };

      console.log('✅ Fait mathématique généré');
      return fact;
    } catch (error) {
      this.stats.numbersAPI.errors++;
      console.error('❌ Numbers API Error:', error.message);
      return null;
    }
  }

  // 🌍 REST Countries API (100% gratuite)
  async getCountryFact() {
    try {
      this.stats.countriesAPI.calls++;
      this.stats.countriesAPI.lastCall = new Date();

      const countries = ['france', 'japan', 'brazil', 'canada', 'australia', 'norway', 'chile', 'italy', 'spain', 'germany'];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];

      const response = await this.fetchWithRetry(`${CONFIG.COUNTRIES_API_URL}/name/${randomCountry}?fields=name,capital,population,area,languages`);
      const data = await response.json();
      const country = data[0];

      const fact = {
        title: `Informations sur ${country.name.common}`,
        content: `Capitale : ${country.capital?.[0] || 'Non spécifiée'}. Population : ${(country.population || 0).toLocaleString('fr-FR')} habitants. Superficie : ${(country.area || 0).toLocaleString('fr-FR')} km².`,
        source: "https://restcountries.com",
        category: "Géographie",
        publishedAt: new Date().toISOString(),
        isReal: true,
        verified: true
      };

      console.log('✅ Fait géographique récupéré');
      return fact;
    } catch (error) {
      this.stats.countriesAPI.errors++;
      console.error('❌ Countries API Error:', error.message);
      return null;
    }
  }

  // 🎭 Joke API (100% gratuite)
  async getJoke() {
    try {
      this.stats.jokeAPI.calls++;
      this.stats.jokeAPI.lastCall = new Date();

      const response = await this.fetchWithRetry(`${CONFIG.JOKE_API_URL}/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single`);
      const data = await response.json();

      const joke = {
        title: "Blague du jour",
        content: data.joke,
        source: "https://jokeapi.dev",
        category: "Humour",
        publishedAt: new Date().toISOString(),
        isReal: true,
        verified: true
      };

      console.log('✅ Blague récupérée');
      return joke;
    } catch (error) {
      this.stats.jokeAPI.errors++;
      console.error('❌ Joke API Error:', error.message);
      return null;
    }
  }

  // 🏛️ History API - VERSION LOCALE
  async getHistoryFact() {
    try {
      this.stats.historyAPI.calls++;
      this.stats.historyAPI.lastCall = new Date();

      const historicalEvents = [
        { year: 1969, text: "Premier alunissage de Neil Armstrong et Buzz Aldrin" },
        { year: 1989, text: "Chute du mur de Berlin" },
        { year: 1945, text: "Fin de la Seconde Guerre mondiale en Europe" },
        { year: 1776, text: "Déclaration d'indépendance des États-Unis" },
        { year: 1789, text: "Début de la Révolution française" },
        { year: 1492, text: "Christophe Colomb découvre l'Amérique" },
        { year: 1969, text: "Festival de Woodstock" },
        { year: 1963, text: "Discours 'I Have a Dream' de Martin Luther King" },
        { year: 1991, text: "Invention du World Wide Web par Tim Berners-Lee" },
        { year: 2001, text: "Lancement de Wikipedia" },
        { year: 1969, text: "Premier vol du Concorde" },
        { year: 1981, text: "Lancement de MTV" },
        { year: 1990, text: "Unification de l'Allemagne" },
        { year: 1957, text: "Lancement de Spoutnik 1" },
        { year: 1969, text: "Création d'ARPANET, ancêtre d'Internet" }
      ];

      const randomEvent = historicalEvents[Math.floor(Math.random() * historicalEvents.length)];

      const fact = {
        title: `Il s'est passé en ${randomEvent.year}`,
        content: randomEvent.text,
        source: "https://fr.wikipedia.org/wiki/Histoire",
        category: "Histoire",
        publishedAt: new Date().toISOString(),
        isReal: true,
        verified: true
      };

      console.log('✅ Fait historique généré');
      return fact;
    } catch (error) {
      this.stats.historyAPI.errors++;
      console.error('❌ History API Error:', error.message);
      return null;
    }
  }

  // 🧪 Test de toutes les APIs
  async testAPIs() {
    console.log('🧪 Test de toutes les APIs...');

    const results = {
      newsAPI: false,
      uselessFacts: false,
      catFacts: false,
      numbersAPI: false,
      countriesAPI: false,
      jokeAPI: false,
      historyAPI: false
    };

    try {
      if (this.newsApiKey && this.newsApiKey !== null) {
        const news = await this.fetchNewsAPI('technology', 1);
        results.newsAPI = news.length > 0;
        console.log('News API:', results.newsAPI ? '✅ OK' : '❌ Erreur');
      } else {
        console.log('News API: 💤 Désactivée (pas de clé configurée)');
      }
    } catch (error) {
      console.log('News API: ❌ Erreur -', error.message);
    }

    // Test APIs gratuites
    const freeAPIs = [
      { name: 'Useless Facts', test: () => this.getUselessFact(), key: 'uselessFacts' },
      { name: 'Cat Facts', test: () => this.getCatFact(), key: 'catFacts' },
      { name: 'Numbers API', test: () => this.getNumberFact(), key: 'numbersAPI' },
      { name: 'Countries API', test: () => this.getCountryFact(), key: 'countriesAPI' },
      { name: 'Joke API', test: () => this.getJoke(), key: 'jokeAPI' },
      { name: 'History API', test: () => this.getHistoryFact(), key: 'historyAPI' }
    ];

    for (const api of freeAPIs) {
      try {
        const result = await api.test();
        results[api.key] = !!result;
        console.log(`${api.name}:`, results[api.key] ? '✅ OK' : '❌ Erreur');
      } catch (error) {
        console.log(`${api.name}: ❌ Erreur -`, error.message);
      }
    }

    console.log('📊 Résumé des tests:', results);
    return results;
  }

  // 🌟 Méthode principale : mélange de toutes les actualités
  async getMixedNews() {
    const results = [];

    try {
      console.log('🔄 Récupération d\'un mélange d\'actualités...');

      // 🔧 DÉSACTIVER News API par défaut
      if (this.newsApiKey && this.newsApiKey !== null) {
        try {
          console.log('📰 Tentative News API...');
          const recentNews = await this.fetchNewsAPI('general', 2);
          results.push(...recentNews);

          const techNews = await this.fetchNewsAPI('technology', 1);
          results.push(...techNews);
        } catch (error) {
          console.warn('⚠️ News API non disponible:', error.message);
        }
      } else {
        console.log('📰 News API désactivée, utilisation des APIs gratuites uniquement');
      }

      // Récupérer des contenus depuis les APIs gratuites
      const freeAPIs = [
        () => this.getUselessFact(),
        () => this.getCatFact(),
        () => this.getNumberFact(),
        () => this.getCountryFact(),
        () => this.getJoke(),
        () => this.getHistoryFact()
      ];

      // Exécuter toutes les APIs gratuites en parallèle
      const promises = freeAPIs.map(api => api().catch(err => null));
      const freeResults = await Promise.all(promises);

      // Filtrer les résultats valides
      const validFreeResults = freeResults.filter(result => result !== null);
      results.push(...validFreeResults);

    } catch (error) {
      console.error('❌ Erreur lors du mélange des actualités:', error);
    }

    console.log(`📊 Total: ${results.length} actualités récupérées`);
    return results;
  }

  // Obtenir les statistiques d'utilisation
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

  // Méthode de debug
  debug() {
    console.group('🔧 Debug API Manager');
    console.log('📊 Statistiques:', this.getStats());
    console.log('🔑 Clés configurées:', {
      newsAPI: !!(this.newsApiKey && this.newsApiKey !== null)
    });
    console.log('🆓 APIs gratuites:', 'Toutes disponibles sans clé');
    console.log('💾 Cache:', `${this.cache.size} entrées`);
    console.groupEnd();
  }
}

// 🔧 Fonction utilitaire pour vérifier si un nombre est premier
function isPrime(num) {
  if (num < 2) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;
  
  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }
  return true;
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
