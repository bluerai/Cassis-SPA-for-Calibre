//apiRouter

import { Router } from 'express';
import { logger } from '../log.js';
import { connectDb, unconnectDb, countBooks, searchForBooks } from '../app/model.js';

export const apiRouter = Router();

apiRouter.get('/count', countAction);
apiRouter.get('/search', searchAction);
apiRouter.get('/health/', healthAction);
apiRouter.get('/connectdb', dbAction);
apiRouter.get('/unconnectdb', dbAction);


//==== Actions ================================================================

export async function countAction(request, response) {
  try {
    logger.debug("countAction: request.query=" + JSON.stringify(request.query));
    const searchString = request.query.search || "";
    const count = countBooks(searchString);
    response.json({ count, healthy: true });
  }
  catch (error) { errorHandler(error, response, 'countAction') }
}

export async function searchAction(request, response) {
  try {
    logger.debug("searchAction: request.query=" + JSON.stringify(request.query));
    const searchString = request.query.search || "";
    const books = searchForBooks(searchString, 24);
    response.json({ books });
  }
  catch (error) { errorHandler(error, response, 'findAction') }
}


export async function healthAction(request, response) {
  try {
    logger.debug("healthAction");
    const count = countBooks().length;
    logger.debug(request.protocol + "-Server still healthy!");
    response.json({ healthy: true, count });
  }
  catch (error) {
    const message = "Cassis: Error on " + request.protocol + "-Server: " + error.message;
    logger.error(message);
    if (error.stack) logger.debug(error.stack);
    if (response) {
      response.json({ healthy: false, error: error.message });
    }
  }
}

export async function dbAction(request, response) {
  try {
    logger.debug("dbAction: request.url=" + request.url);
    const result = (request.url === "/unconnectdb") ? unconnectDb() : connectDb();
    response.json(result);
  }
  catch (error) { errorHandler(error, response, 'dbAction') }
}


//==== Actions end ================================================================

const isPrivateIP = (ip) => {
  if (!ip) return false;

  // IPv4 private Netzwerke
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(ip)) {
    return true;
  }

  // IPv6 private Netzwerke
  if (/^(::1|fc00:|fd00:|fe80:)/.test(ip)) {
    return true;
  }

  // IPv4-Mapped IPv6 (::ffff:192.168.x.x)
  if (ip.startsWith("::ffff:")) {
    const ipv4Part = ip.split(":").pop();
    return isPrivateIP(ipv4Part);
  }

  return false;
};