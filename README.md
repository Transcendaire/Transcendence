# Transcendence

## Installation rapide

```bash
nvm use 22
npm install  # Installe automatiquement les dépendances client + serveur
```

## Commandes disponibles

```bash
npm run build     # Compile tout le projet (client + serveur)
npm start 		  # Lance le serveur

npm run dev       # Lance client + serveur en mode développement
npm run clean     # Nettoie les fichiers générés (similaire à make fclean)

# Commandes spécifiques
npm run dev:client    # Lance uniquement le client en mode watch
npm run dev:server    # Lance uniquement le serveur
npm run build:client  # Compile uniquement le client
npm run build:server  # Compile uniquement le serveur
```

## Accès au jeu

Une fois `npm start` lancé :
- **Jeu** : Ouvrir `http://localhost:8080/` dans le navigateur


**Le serveur ne démarre pas (port 8080 occupé) :**
```bash
# En général un serveur est deja lancé sur un terminal, le fermer avec CTRL+C
lsof -i:8080        # Voir qui utilise le port
pkill -f "node"     # Tuer les processus Node.js
```

## Architecture des fichiers
```bash
server/      # Backend (API, DB, logique métier)
│   ├── src/               # Source TypeScript du serveur
│   │   ├── controllers/   # Handlers API/WS (reçoit les messages du client, appelle la logique du jeu, renvoie la réponse)
│   │   ├── models/        # Modèles de données (définitions des objets du jeu : Ball, Paddle, Player, etc.)
│   │   ├── services/      # Logique métier (gestion du jeu, calculs, etc.)
│   │   ├── db/            # Accès et init DB (connexion, requêtes)
│   │   ├── routes/        # Définition des routes HTTP/WS
│   │   ├── utils/         # Fonctions utilitaires
│   │   ├── index.ts       # Entrée principale serveur
│   │   └── types.ts       # Types globaux
│   ├── dist/              # JS compilé du serveur
│   ├── migrations/        # Fichiers SQL
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
client/      # Frontend (SPA, assets, styles…)
│   ├── src/               # Source TypeScript/JS du client (affichage, gestion des inputs)
│   ├── public/            # Fichiers statiques (index.html, images…)
│   ├── dist/              # Build JS/CSS du client
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
nginx/       # Configuration Nginx (reverse proxy, TLS, proxy WebSocket)
│   └── nginx.conf         # Fichier de config Nginx
migrations/  # Fichiers SQL pour la base de données
docs/        # Documentation
README.md    # <- On est ici
```