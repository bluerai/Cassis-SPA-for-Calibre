import express from 'express';
import cookieParser from 'cookie-parser';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { router as cassisRouter } from './cassis/index.js';
import https from 'https';
import fs from 'fs-extra';

const app = express();
const HTTP_PORT = parseInt(process.env.HTTP_PORT) || 80;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 443;

app.set('view engine', 'pug');

app.use(express.static(dirname(fileURLToPath(import.meta.url)) + '/public'));

app.use(express.urlencoded({ extended: false }));

app.use(cookieParser())

app.use('/cassis', cassisRouter);

app.get('/', (request, response) => response.redirect('/cassis'));

if (HTTP_PORT > 0) {
  app.listen(HTTP_PORT, () => {
    console.log(new Date().toLocaleString('de') + ' - Http-Server is listening to Port ' + HTTP_PORT);
  });
}

if (HTTPS_PORT > 0 && fs.existsSync(process.env.KEY) && fs.existsSync(process.env.CERT)) {
  const options = {
    key: fs.readFileSync(process.env.KEY),
    cert: fs.readFileSync(process.env.CERT),
  };
  https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(new Date().toLocaleString('de') + ' - Https-Server is listening to Port ' + HTTPS_PORT);
  });
}