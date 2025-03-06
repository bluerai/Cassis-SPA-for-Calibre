'use strict'

import express from 'express';
import https from 'https';
import morgan from 'morgan';
import fs from 'fs-extra';
import { join } from 'path';

import { appRouter } from './app/index.js';
import { logger } from './log.js';

const app = express();
const HTTP_PORT = parseInt(process.env.HTTP_PORT) || 80;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 443;

app.set('view engine', 'pug');

app.use(express.static(import.meta.dirname + '/public'));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.use('/get', morgan('combined', { immediate: true }));

app.use('/app', appRouter);

app.use((request, response) => response.redirect('/app'));

if (HTTPS_PORT >= 0) {
  const keyfile = join(process.env.CASSIS_CONFIG, process.env.CASSIS_KEYFILE);
  const certfile = join(process.env.CASSIS_CONFIG, process.env.CASSIS_CERTFILE);
  if (fs.existsSync(keyfile) && fs.existsSync(certfile)) {

    //key + Cert vorhanden, also https, 
    const options = {
      key: fs.readFileSync(keyfile),
      cert: fs.readFileSync(certfile),
    };
    https.createServer(options, app).listen(HTTPS_PORT, () => {
      logger.info(`X: Https-Server is listening to https://${getLocalIp()}:${HTTPS_PORT}`)
    });
  }
}

if (HTTP_PORT >= 0) {
  app.listen(HTTP_PORT, () => {
    logger.info(`X: Http-Server is listening to http://${getLocalIp()}:${HTTP_PORT}`)
  })
}


import os from 'os';

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback auf localhost
};

