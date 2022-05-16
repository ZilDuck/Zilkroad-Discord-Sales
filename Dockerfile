FROM node:16.4.2-alpine

# hadolint ignore=DL3018
RUN apk --no-cache add --update python3 make g++\
   && rm -rf /var/cache/apk/*

WORKDIR /app

COPY ./package.json ./
RUN npm i

COPY . .


CMD ["npm", "run", "start"]
