//apiRouter

import { Router } from 'express';
import { logger } from '../log.js';
import { connectDb, unconnectDb, countBooks } from '../app/model.js';

export const apiRouter = Router();

apiRouter.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (isPrivateIP(clientIP)) {
    logger.debug(`LAN access from: ${clientIP}`);
    return next();
  } else {
    logger.warn(`WAN access from ip ${clientIP} blocked`);
    return res.status(403).json({ message: "No access." });
  }
});

appRouter.get('/count', countAction);
appRouter.get('/connectdb', dbAction);
appRouter.get('/unconnectdb', dbAction);


//==== Actions ================================================================

export async function countAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("countAction: request.query=" + JSON.stringify(request.query));
    const searchString = request.query.search || "";
    const count = countBooks(searchString);
    response.json({ count, healthy: true });
  }
  catch (error) { errorHandler(error, response, 'countAction') }
}

export async function dbAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("dbAction: request.url=" + request.url);
    const result = (request.url === "/unconnectdb") ? unconnectDb() : connectDb();
    response.json(result);
  }
  catch (error) { errorHandler(error, response, 'dbAction') }
}
