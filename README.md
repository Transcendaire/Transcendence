# Transcendence

## Démarrage rapide avec Docker

```bash
make run              # Build et lance l'application
```

L'application sera accessible sur : **http://localhost**

### Autres commandes Docker

```bash
make build            # Construire les images
make up               # Démarrer les conteneurs
make down             # Arrêter les conteneurs
make restart          # Redémarrer
make logs             # Voir les logs
make clean            # Tout supprimer (images, volumes, conteneurs)
make ps               # Voir les conteneurs actifs
```

## Développement local (sans Docker)

```bash
nvm use 22
npm install           # Installe les dépendances client + serveur
npm run dev           # Lance client + serveur en mode watch (se relance a chaque fois qu'un fichier est save)
```

Serveur accessible sur : **http://localhost:8080**

### Commandes disponibles

```bash
npm run build         # Compile tout le projet
npm start             # Lance le serveur
npm run clean         # Nettoie les fichiers générés

# Spécifiques
npm run dev:client    # Client en mode watch
npm run dev:server    # Serveur en mode watch
npm run build:client  # Compile uniquement le client
npm run build:server  # Compile uniquement le serveur
```

## Architecture Docker

```
┌─────────────────────────────────────┐
│  http://localhost:8080              │
│  ┌────────────────────────────────┐ │
│  │         NGINX                  │ │
│  │  - Sert les fichiers statiques │ │
│  │  - Reverse proxy               │ │
│  └──────────┬─────────────────────┘ │
│             │ Proxy /game           │
│             ▼                        │
│  ┌────────────────────────────────┐ │
│  │   SERVER (Port 8080 interne)   │ │
│  │  - WebSocket /game             │ │
│  │  - API endpoints               │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
       Docker Network: transcendence
```

### Services

- **nginx** : Reverse proxy sur port 8080, sert les fichiers statiques
- **server** : Backend Node.js/Fastify sur port 8080 (interne uniquement)
- **client** : Builder, compile TypeScript et génère les fichiers statiques

## Debugging

```bash
# Logs d'un service spécifique
docker compose logs -f nginx
docker compose logs -f server

# Accéder à un conteneur
docker compose exec nginx sh
docker compose exec server sh

# Reconstruire un service
docker compose build server
docker compose up -d server
```

## Troubleshooting

**Port 8080 déjà utilisé :**
```bash
sudo lsof -i:8080
# Changer le port dans docker-compose.yml
```

**Le serveur redémarre en boucle :**
```bash
make logs             # Voir les erreurs
make clean && make run # Rebuild complet
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