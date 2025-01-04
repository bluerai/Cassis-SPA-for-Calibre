FROM node:23.5-alpine3.20 
RUN apk add tzdata

RUN mkdir -p /app/books;\
  mkdir -p /app/cert;\
  mkdir -p /app/CACHE;\
  mkdir -p /app/logs;\
  mkdir -p /home/node/apphome;\
  chown -R node:node /app /home/node

USER node
WORKDIR /home/node/apphome

ADD --chown=node:node ./package.json .
RUN npm install; npm audit fix
ADD --chown=node:node . .

ENV HTTP_PORT=80
ENV HTTPS_PORT=443
ENV BOOKDIR=/books
ENV METADATA_PATH=/books/metadata.db
ENV KEYFILE=/app/cert/server.key
ENV CERTFILE=/app/cert/server.crt
ENV LOGDIR=/app/logs 
ENV IMGCACHE=/app/CACHE/

HEALTHCHECK --interval=5m --timeout=5s --retries=3 \
  CMD ["node", "healthcheck.js"]

CMD [ "node", "index.js" ]