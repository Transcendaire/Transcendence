FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./
RUN npm install

COPY client/tsconfig.json ./
COPY client/tsconfig.build.json ./
COPY client/tailwind.config.js ./
COPY client/postcss.config.js ./
COPY client/vite.config.ts ./
COPY client/index.html ./
COPY client/src ./src
COPY client/public ./public
COPY shared ../shared

RUN npm run build

RUN mkdir -p /output && \
    cp -r /app/dist/* /output/

CMD ["echo", "Client build complete"]
