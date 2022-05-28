FROM node:16-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY . ./
RUN yarn install

RUN yarn prisma generate

EXPOSE 3000

CMD yarn run dev