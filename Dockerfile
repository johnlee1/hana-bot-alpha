FROM node:8.6-alpine

COPY package.json/ /api/

WORKDIR /api

RUN npm install --production

WORKDIR /

COPY bot.js /api/
COPY all/ /api/all

WORKDIR /api

EXPOSE 3000

CMD ["node", "bot.js"]
