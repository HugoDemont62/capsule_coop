import React, { useState, useEffect } from 'react';
import { apiManager } from '../services/apiManager';
import { fakeNewsData } from '../data/fakeNews';

const NewsGame = ({ apiStatus }) => {
  const [correctScore, setCorrectScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realNews, setRealNews] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [usedRealNews, setUsedRealNews] = useState(new Set());

  useEffect(() => {
    loadRealNews();
  }, []);

  const loadRealNews = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Chargement des actualités...');

      let newsData = [];

      // Essayer de récupérer des actualités via les APIs
      if (apiStatus.newsAPI || apiStatus.uselessFactsAPI) {
        try {
          newsData = await apiManager.getMixedNews();
          console.log(`✅ ${newsData.length} actualités récupérées via APIs`);
        } catch (error) {
          console.warn('⚠️ Erreur APIs, utilisation du fallback');
        }
      }

      // Ajouter les actualités de fallback si nécessaire
      if (newsData.length < 5) {
        newsData = [...newsData, ...getFallbackNews()];
      }

      setRealNews(newsData);
      showNextQuestion(newsData);

    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
      const fallback = getFallbackNews();
      setRealNews(fallback);
      showNextQuestion(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackNews = () => [
    {
      title: "L'intelligence artificielle révolutionne la médecine",
      content: "De nouveaux algorithmes permettent de diagnostiquer des maladies avec une précision de 95%, surpassant les médecins dans certains domaines.",
      source: "https://www.nature.com/articles/ai-medicine",
      category: "Technology",
      publishedAt: new Date().toISOString(),
      isReal: true
    },
    {
      title: "Découverte d'eau liquide sur Mars confirmée",
      content: "La NASA confirme la présence d'un lac souterrain sous la calotte glaciaire polaire sud de Mars, relançant l'espoir de vie extraterrestre.",
      source: "https://www.nasa.gov/mars-water-discovery",
      category: "Science",
      publishedAt: new Date().toISOString(),
      isReal: true
    },
    {
      title: "Record mondial : une éolienne produit de l'électricité pendant 365 jours",
      content: "Une éolienne offshore au Danemark a fonctionné sans interruption pendant une année complète, établissant un nouveau record de fiabilité.",
      source: "https://www.energy.gov/wind-record",
      category: "Environment",
      publishedAt: new Date().toISOString(),
      isReal: true
    },
    {
      title: "Première greffe de cœur artificiel réussie",
      content: "Un patient français a reçu avec succès le premier cœur artificiel totalement autonome, marquant une révolution en cardiologie.",
      source: "https://www.medical-breakthrough.com",
      category: "Health",
      publishedAt: new Date().toISOString(),
      isReal: true
    }
  ];

  const showNextQuestion = (newsData = realNews) => {
    setIsAnswered(false);
    setGameResult(null);

    // 50% de chance d'avoir une vraie news
    const isRealNews = Math.random() > 0.5;

    if (isRealNews && newsData.length > 0) {
      // Choisir une vraie news pas encore utilisée
      const availableNews = newsData.filter(news => !usedRealNews.has(news.title));

      if (availableNews.length === 0) {
        // Réinitialiser si toutes les news ont été utilisées
        setUsedRealNews(new Set());
      }

      const newsToUse = availableNews.length > 0 ? availableNews : newsData;
      const randomIndex = Math.floor(Math.random() * newsToUse.length);
      const selectedNews = newsToUse[randomIndex];

      setCurrentQuestion({
        ...selectedNews,
        isReal: true
      });

      setUsedRealNews(prev => new Set([...prev, selectedNews.title]));

    } else {
      // Fausse news
      const randomIndex = Math.floor(Math.random() * fakeNewsData.length);
      setCurrentQuestion({
        ...fakeNewsData[randomIndex],
        isReal: false,
        source: null
      });
    }
  };

  const checkAnswer = async (userAnswer) => {
    if (isAnswered) return;

    setIsAnswered(true);
    const isCorrect = userAnswer === currentQuestion.isReal;

    if (isCorrect) {
      setCorrectScore(prev => prev + 1);
    } else {
      setIncorrectScore(prev => prev + 1);
    }

    // Optionnel : Vérifier avec Google Fact Check pour les vraies news
    let factCheckResult = null;
    if (currentQuestion.isReal && apiStatus.factCheckAPI) {
      try {
        factCheckResult = await apiManager.validateNews(currentQuestion);
      } catch (error) {
        console.log('ℹ️ Fact check non disponible');
      }
    }

    setGameResult({
      isCorrect,
      factCheck: factCheckResult
    });
  };

  const nextQuestion = () => {
    showNextQuestion();
  };

  if (isLoading) {
    return (
      <div className="game-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner"></div>
          <p>Chargement des actualités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="score-board">
        <div className="score">
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✓</div>
          <div>Réponses correctes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '5px' }}>{correctScore}</div>
        </div>
        <div className="score">
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✗</div>
          <div>Réponses incorrectes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '5px' }}>{incorrectScore}</div>
        </div>
      </div>

      {currentQuestion && (
        <>
          <div className="news-card">
            <div className="news-title">{currentQuestion.title}</div>
            <div className="news-content">{currentQuestion.content}</div>

            {currentQuestion.category && (
              <div className="news-meta">
                <span className="news-category">
                  📂 {currentQuestion.category}
                </span>
                {currentQuestion.publishedAt && (
                  <span>
                    📅 {new Date(currentQuestion.publishedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            )}
          </div>

          {!isAnswered && (
            <div className="buttons-container">
              <button
                className="btn btn-true"
                onClick={() => checkAnswer(true)}
              >
                ✓ VRAI
              </button>
              <button
                className="btn btn-false"
                onClick={() => checkAnswer(false)}
              >
                ✗ FAUX
              </button>
            </div>
          )}

          {gameResult && (
            <div className={`result ${gameResult.isCorrect ? 'correct' : 'incorrect'}`}>
              <div style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
                {gameResult.isCorrect ? '🎯 Excellente réponse !' : '⚠️ Réponse incorrecte'}
              </div>

              <div className="result-details">
                {currentQuestion.isReal ? (
                  <>
                    <div>Cette actualité est {gameResult.isCorrect ? 'effectivement' : 'pourtant'} authentique</div>
                    {currentQuestion.source && (
                      <a
                        href={currentQuestion.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        🔗 Explorer la source
                      </a>
                    )}
                    {gameResult.factCheck?.isValidated && (
                      <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#4ade80' }}>
                        ✅ Vérification : {gameResult.factCheck.rating}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    {gameResult.isCorrect
                      ? 'Bravo ! Cette information était effectivement fictive'
                      : 'Cette actualité était inventée • Il fallait répondre FAUX'
                    }
                  </div>
                )}
              </div>

              <button className="next-btn" onClick={nextQuestion}>
                ➤ Actualité suivante • {correctScore + incorrectScore}/∞
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NewsGame;