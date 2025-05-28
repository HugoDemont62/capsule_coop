// src/components/NewsGame.jsx - VERSION SANS NEWS EN DUR
import React, { useState, useEffect } from 'react';
import { apiManager } from '../services/apiManager';
import { fakeNewsData } from '../data/fakeNews';
import TwitchIntegration from './TwitchIntegration';

const NewsGame = () => {
  const [correctScore, setCorrectScore] = useState(0);
  const [incorrectScore, setIncorrectScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameResult, setGameResult] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [error, setError] = useState(null);

  // 🎮 États Twitch
  const [twitchVotes, setTwitchVotes] = useState({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });
  const [currentQuestionId, setCurrentQuestionId] = useState(null);

  useEffect(() => {
    loadFirstQuestion();
  }, []);

  const loadFirstQuestion = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await showNextQuestion();
    } catch (error) {
      console.error('❌ Erreur lors du chargement initial:', error);
      setError('Impossible de charger les actualités. Vérifiez votre connexion internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNextQuestion = async () => {
    setIsAnswered(false);
    setGameResult(null);
    setError(null);

    // 🎮 Générer un ID unique pour la question
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentQuestionId(questionId);

    // Réinitialiser les votes Twitch
    setTwitchVotes({ trueVotes: 0, falseVotes: 0, totalVotes: 0 });

    // 50% de chance d'avoir une vraie news, 50% fausse news
    const isRealNews = Math.random() > 0.5;

    if (isRealNews) {
      // 🌐 TOUJOURS RÉCUPÉRER VIA API - PAS DE FALLBACK
      try {
        console.log('🔄 Récupération d\'une vraie actualité via API...');

        // Récupérer une actualité via les APIs
        const newsData = await apiManager.getMixedNews();

        if (newsData && newsData.length > 0) {
          // Prendre une actualité au hasard
          const randomIndex = Math.floor(Math.random() * newsData.length);
          const selectedNews = newsData[randomIndex];

          setCurrentQuestion({
            ...selectedNews,
            isReal: true,
            id: questionId
          });

          console.log('✅ Vraie actualité récupérée:', selectedNews.title);
        } else {
          throw new Error('Aucune actualité récupérée');
        }

      } catch (error) {
        console.error('❌ Erreur récupération API:', error);

        // ⚠️ EN CAS D'ÉCHEC API : Utiliser une fausse news à la place
        console.log('⚠️ Échec API - Utilisation d\'une fausse news à la place');
        const randomIndex = Math.floor(Math.random() * fakeNewsData.length);
        setCurrentQuestion({
          ...fakeNewsData[randomIndex],
          isReal: false,
          source: null,
          id: questionId
        });
      }
    } else {
      // 🎭 Fausse news
      const randomIndex = Math.floor(Math.random() * fakeNewsData.length);
      setCurrentQuestion({
        ...fakeNewsData[randomIndex],
        isReal: false,
        source: null,
        id: questionId
      });

      console.log('🎭 Fausse actualité sélectionnée');
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

    setGameResult({
      isCorrect
    });
  };

  const nextQuestion = async () => {
    setIsLoading(true);
    try {
      await showNextQuestion();
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la question suivante:', error);
      setError('Erreur lors du chargement de la question suivante');
    } finally {
      setIsLoading(false);
    }
  };

  // 🎮 Callback pour recevoir les votes Twitch
  const handleTwitchVoteUpdate = (voteData) => {
    setTwitchVotes({
      trueVotes: voteData.trueVotes,
      falseVotes: voteData.falseVotes,
      totalVotes: voteData.totalVotes
    });
  };

  if (isLoading && !currentQuestion) {
    return (
        <div className="game-container">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner"></div>
            <p>Chargement des actualités...</p>
          </div>
        </div>
    );
  }

  if (error && !currentQuestion) {
    return (
        <div className="game-container">
          <div className="error">
            <h3>❌ Erreur</h3>
            <p>{error}</p>
            <button className="next-btn" onClick={loadFirstQuestion}>
              🔄 Réessayer
            </button>
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

              {!isAnswered && !isLoading && (
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

              {isLoading && isAnswered && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="spinner"></div>
                    <p>Chargement de la prochaine question...</p>
                  </div>
              )}

              {gameResult && !isLoading && (
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

              {error && isAnswered && (
                  <div className="error">
                    <p>{error}</p>
                    <button className="next-btn" onClick={nextQuestion}>
                      🔄 Réessayer la question suivante
                    </button>
                  </div>
              )}
            </>
        )}
      </div>
  );
};

export default NewsGame;
