FROM node:lts-alpine3.22
RUN apk add tzdata
RUN apk add curl

RUN mkdir -p /app;\
  mkdir -p /home/node/apphome;\
  chown -R node:node /app /home/node

USER node
WORKDIR /home/node/apphome

ADD --chown=node:node ./package.json .
RUN npm install
ADD --chown=node:node . .

ENV HTTP_PORT=80
ENV HTTPS_PORT=443

ENV CASSIS_BOOKS=/books
ENV CASSIS_METADATA=/books/metadata.db

ENV CASSIS_CACHE=/app/CACHE
ENV CASSIS_CONFIG=/app/config
ENV CASSIS_LOGS=/app/logs 

ENV CASSIS_KEYFILE=key.pem
ENV CASSIS_CERTFILE=cert.pem

HEALTHCHECK --interval=60m --timeout=5s --retries=3 \
  CMD ["sh", "healthcheck.sh"]

CMD [ "node", "server.js" ]