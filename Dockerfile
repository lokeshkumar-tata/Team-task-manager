FROM node:20-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/

RUN npm install

COPY server ./server
COPY client ./client

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
