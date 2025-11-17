FROM node:20-alpine

WORKDIR /shared
COPY shared/ /shared/
RUN npm install
RUN npm run build


WORKDIR /app
RUN mkdir -p public/dist/shared
RUN cp -r /shared/dist/* public/dist/shared/

COPY client/package*.json ./
RUN npm ci

COPY client/tsconfig.json ./
COPY client/tsconfig.build.json ./
COPY client/src ./src
COPY client/public ./public

RUN npm run build

RUN mkdir -p /output && \
    cp -r /app/public/* /output/

CMD ["echo", "Client build complete"]
