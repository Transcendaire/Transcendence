FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY shared/ /shared/

COPY server/package*.json ./

RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build:server

RUN npm prune --production

RUN cp dist/app/src/index.docker.js dist/app/src/index.js || true

EXPOSE 8080

CMD ["node", "dist/app/src/index.js"]
