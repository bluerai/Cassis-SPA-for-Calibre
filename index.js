import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs-extra';

import { router } from './cassis/index.js';
import { logger } from './log.js';

const app = express();
const HTTP_PORT = parseInt(process.env.HTTP_PORT) || 80;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 443;

app.set('view engine', 'pug');

app.use(express.static(import.meta.dirname + '/public'));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.use('/cassis', router);

app.get('/', (request, response) => response.redirect('/cassis'));

//app.use((request, response) => response.redirect('/cassis'));


if (HTTP_PORT > 0) {
  app.listen(HTTP_PORT, () => {
    logger.info('Http-Server is listening to Port ' + HTTP_PORT);
  });
}

if (HTTPS_PORT > 0) {
  if (fs.existsSync(process.env.KEYFILE) && fs.existsSync(process.env.CERTFILE)) {
    //key + Cert vorhanden, also https, 
    const options = {
      key: fs.readFileSync(process.env.KEYFILE),
      cert: fs.readFileSync(process.env.CERTFILE),
    };
    https.createServer(options, app).listen(HTTPS_PORT, () => {
      logger.info('Https-Server is listening to Port ' + HTTPS_PORT);
    });
  }
}



