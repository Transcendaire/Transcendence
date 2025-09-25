# Transcendence
## Brief
Branche pour faciliter le merge avec la branche Game, en évitant les conflits et prevoyant cette future architecture de fichiers:
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