// src/components/NewsGame.jsx - MODIFIÉ pour Twitch
import React, { useState, useEffect } from 'react';
import { apiManager } from '../services/apiManager';
import { fakeNewsData } from '../data/fakeNews';
import TwitchIntegration from './TwitchIntegration';

const NewsGame = ({ apiStatus }) => {
  const [correctScore, setCorrectScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realNews, setRealNews] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [usedRealNews, setUsedRealNews] = useState(new Set());

  // 🎮 États Twitch
  const [twitchVotes, setTwitchVotes] = useState({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });
  const [currentQuestionId, setCurrentQuestionId] = useState(null);

  useEffect(() => {
    loadRealNews();
  }, []);

  const loadRealNews = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Chargement des actualités...');

      let newsData = [];

      // Essayer de récupérer des actualités via les APIs
      if (Object.values(apiStatus).some(status => status)) {
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

    // 🎮 Générer un ID unique pour la question
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentQuestionId(questionId);

    // Réinitialiser les votes Twitch
    setTwitchVotes({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });

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
        isReal: true,
        id: questionId
      });

      setUsedRealNews(prev => new Set([...prev, selectedNews.title]));

    } else {
      // Fausse news
      const randomIndex = Math.floor(Math.random() * fakeNewsData.length);
      setCurrentQuestion({
        ...fakeNewsData[randomIndex],
        isReal: false,
        source: null,
        id: questionId
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

    // Optionnel : Plus de validation nécessaire maintenant que Google est supprimé
    let validationResult = null;

    setGameResult({
      isCorrect,
      validation: validationResult
    });
  };

  const nextQuestion = () => {
    showNextQuestion();
  };

  // 🎮 Callback pour recevoir les votes Twitch
  const handleTwitchVoteUpdate = (voteData) => {
    setTwitchVotes({
      trueVotes: voteData.trueVotes,
      falseVotes: voteData.falseVotes,
      totalVotes: voteData.totalVotes
    });
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
        {/* 🎮 Intégration Twitch */}
        <TwitchIntegration
            onVoteUpdate={handleTwitchVoteUpdate}
            currentQuestionId={currentQuestionId}
            isQuestionActive={!isAnswered}
        />

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
                      <div className="btn-content">
                        <span className="btn-text">✓ VRAI</span>
                        {twitchVotes.totalVotes > 0 && (
                            <span className="btn-vote-count">
                      {twitchVotes.trueVotes} 👥
                    </span>
                        )}
                      </div>
                    </button>
                    <button
                        className="btn btn-false"
                        onClick={() => checkAnswer(false)}
                    >
                      <div className="btn-content">
                        <span className="btn-text">✗ FAUX</span>
                        {twitchVotes.totalVotes > 0 && (
                            <span className="btn-vote-count">
                      {twitchVotes.falseVotes} 👥
                    </span>
                        )}
                      </div>
                    </button>
                  </div>
              )}

              {gameResult && (
                  <div className={`result ${gameResult.isCorrect ? 'correct' : 'incorrect'}`}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '15px' }}>
                      {gameResult.isCorrect ? '🎯 Excellente réponse !' : '⚠️ Réponse incorrecte'}
                    </div>

                    {/* 🎮 Résultats des votes Twitch */}
                    {twitchVotes.totalVotes > 0 && (
                        <div className="twitch-results">
                          <h4>📊 Résultats du chat Twitch:</h4>
                          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '10px 0' }}>
                    <span style={{ color: '#4ade80' }}>
                      VRAI: {twitchVotes.trueVotes} ({Math.round((twitchVotes.trueVotes / twitchVotes.totalVotes) * 100)}%)
                    </span>
                            <span style={{ color: '#f87171' }}>
                      FAUX: {twitchVotes.falseVotes} ({Math.round((twitchVotes.falseVotes / twitchVotes.totalVotes) * 100)}%)
                    </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                            Total: {twitchVotes.totalVotes} votes du chat
                          </div>
                        </div>
                    )}

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
                            {gameResult.validation?.isValidated && (
                                <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#4ade80' }}>
                                  ✅ Validation : {gameResult.validation.rating}
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
