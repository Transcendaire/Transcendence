FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /shared
COPY shared/package*.json ./
RUN npm install
COPY shared/tsconfig.json ./
COPY shared/src ./src
RUN npm run build

WORKDIR /app
COPY server/package*.json ./

RUN npm install /shared

RUN npm ci

COPY server/tsconfig.json ./
COPY server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build:server

RUN npm prune --production

EXPOSE 8080
CMD ["node", "dist/index.js"]