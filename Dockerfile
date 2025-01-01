FROM node:23.5-alpine3.20 
RUN apk add tzdata

RUN mkdir -p /app/books;\
  mkdir -p /app/cert;\
  mkdir -p /app/CACHE;\
  mkdir -p /home/node/cassis;\
  chown -R node:node /app /home/node

USER node
WORKDIR /home/node/cassis

ADD --chown=node:node ./package.json .
RUN npm install; npm audit fix
ADD --chown=node:node . .

ENV HTTP_PORT=80
ENV HTTPS_PORT=443
ENV KEYFILE=/app/cert/server.key
ENV CERTFILE=/app/cert/server.cert
ENV BOOKDIR=/app/books
ENV METADATA_FILE=/app/books/metadata.db
ENV IMGCACHE=/app/CACHE/
ENV PAGE_LIMIT=30
ENV LOGLEVEL=1

HEALTHCHECK --interval=5m --timeout=5s --retries=3 \
  CMD ["node", "healthcheck.js"]

CMD [ "node", "index.js" ]