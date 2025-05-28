# 🎮 Capsule News Quiz - React + Vite

## Description
Application React de quiz d'actualités pour la **Capsule_coop**. Le jeu propose de deviner si une actualité est vraie ou fausse, avec vérification par des APIs externes.

## 🚀 Installation et lancement

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone https://github.com/capsule-coop/news-quiz
cd capsule-news-quiz

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Lancer en mode développement
npm run dev

# Construire pour la production
npm run build
```

## 📁 Structure du projet

```
src/
├── components/
│   └── NewsGame.jsx       # Composant principal du jeu
├── services/
│   └── apiManager.js      # Gestionnaire des APIs
├── data/
│   └── fakeNews.js        # Base de fausses actualités
├── App.jsx                # Composant racine
├── App.css                # Styles principaux
└── main.jsx               # Point d'entrée React

public/
├── vite.svg               # Logo Vite
└── index.html             # Template HTML

.env.example               # Variables d'environnement
package.json               # Dépendances et scripts
vite.config.js             # Configuration Vite
```

## 🔑 Configuration des APIs

### 1. **News API** (actualités récentes)
```bash
# Dans .env
VITE_NEWS_API_KEY=votre_cle_news_api
```
- 📍 **Obtenir** : https://newsapi.org/
- 🆓 **Gratuit** : 500 requêtes/jour
- 📖 **Usage** : Récupérer vraies actualités

### 2. **Google Fact Check Tools API**
```bash
# Dans .env  
VITE_GOOGLE_API_KEY=votre_cle_google
```
- 📍 **Obtenir** : https://console.developers.google.com/
- 🆓 **Gratuit** : Avec quota
- 📖 **Usage** : Vérifier véracité des infos

### 3. **API Ninjas** (faits scientifiques)
```bash
# Dans .env
VITE_API_NINJAS_KEY=votre_cle_api_ninjas  
```
- 📍 **Obtenir** : https://api.api-ninjas.com/
- 🆓 **Gratuit** : 1000 requêtes/mois
- 📖 **Usage** : Faits scientifiques

### 4. **Useless Facts API** (faits insolites)
- ✅ **Aucune clé requise**
- 🆓 **Totalement gratuit**
- 📖 **Usage** : Faits amusants

## 🎯 Fonctionnalités

### ✨ **Interface**
- Design gaming moderne avec glassmorphism
- Animations fluides et transitions
- Responsive mobile/desktop
- Indicateurs de statut API en temps réel

### 🎮 **Gameplay**
- Quiz vrai/faux interactif
- Score en temps réel
- Mélange automatique vraies/fausses news
- Liens vers sources pour vérification
- Questions infinies

### 🔧 **Technique**
- React 18 avec hooks
- Vite pour le build rapide
- APIs externes intégrées
- Gestion d'erreur robuste
- Variables d'environnement sécurisées

## 🛠️ Développement

### Commandes utiles
```bash
# Développement avec hot-reload
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Linter
npm run lint
```

### Ajouter de fausses actualités
```javascript
// Dans src/data/fakeNews.js
{
  title: "Votre titre inventé",
  content: "Description amusante...", 
  category: "Catégorie"
}
```

### Tester les APIs
```javascript
// Dans la console du navigateur
import { apiManager } from './src/services/apiManager.js';
await apiManager.testAPIs();
```

## 🎨 Personnalisation

### Thème Capsule_coop
```css
/* Dans App.css - Variables CSS personnalisables */
:root {
  --primary-gradient: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --glass-bg: rgba(255, 255, 255, 0.1);
}
```

### Ajout de nouvelles APIs
```javascript
// Dans src/services/apiManager.js
async getNewSourceAPI() {
  // Votre logique d'API
  return data;
}
```

## 📱 Responsive

- 💻 **Desktop** : Optimisé pour grands écrans
- 📱 **Mobile** : Interface adaptée tactile
- 📋 **Tablette** : Mise en page flexible

## 🚀 Déploiement

### Netlify
```bash
npm run build
# Glisser-déposer le dossier dist/
```

### Vercel
```bash
npm i -g vercel
vercel --prod
```

### GitHub Pages
```bash
npm run build
# Configurer GitHub Pages sur la branche gh-pages
```

## 🔧 Variables d'environnement

Le projet utilise Vite, donc toutes les variables doivent commencer par `VITE_` :

```bash
# ✅ Correct
VITE_NEWS_API_KEY=ma_cle

# ❌ Incorrect  
NEWS_API_KEY=ma_cle
```

## 🐛 Dépannage

### Problèmes courants

**APIs ne fonctionnent pas**
```bash
# Vérifier les clés dans .env
echo $VITE_NEWS_API_KEY

# Tester une API
curl "https://newsapi.org/v2/top-headlines?country=fr&apiKey=VOTRE_CLE"
```

**Erreurs CORS**
- Les APIs sont appelées côté client
- Certaines APIs nécessitent un proxy en production

**Build échoue**
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## 📊 Monitoring

### Statut des APIs en temps réel
L'app affiche des indicateurs visuels :
- 🟢 **Vert** : API fonctionnelle
- 🔴 **Rouge** : API indisponible
- 🟡 **Jaune** : API partiellement fonctionnelle

### Logs de debug
```javascript
// Activer les logs détaillés
localStorage.setItem('debug', 'true');
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - voir le fichier LICENSE

---

**Fait avec ❤️ et React pour la Capsule_coop by Hugo DEMONT**

🎮 Happy gaming! 🎮