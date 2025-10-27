FROM node:20-alpine

WORKDIR /shared

COPY shared/package*.json ./
RUN npm install

COPY shared/tsconfig.json ./
COPY shared/src ./src

RUN npm run build


WORKDIR /app

COPY server/package*.json ./
RUN npm ci

RUN mkdir -p node_modules/@shared
RUN cp -r /shared/dist/* node_modules/@shared/

COPY server/tsconfig.json ./
COPY server/src ./src


RUN npm run build:server

RUN npm prune --production

EXPOSE 8080

CMD ["node", "dist/index.js"]
