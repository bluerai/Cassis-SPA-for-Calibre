'use strict'; 

import { Router } from 'express';

import {
  startAction, listAction, bookAction, fileAction, coverListAction, coverBookAction,
  infoAction, countAction, dbAction, tagsAction, ccAction, logAction, tagsCountAction,
  authorsCountAction, seriesCountAction, publishersCountAction
} from './controller.js';

export const appRouter = Router();

appRouter.get('/', startAction);

//APP-Calls
appRouter.post('/list/:type?', listAction);
appRouter.get('/cover/book/:id', coverBookAction);
appRouter.get('/cover/list/:id', coverListAction);
appRouter.post('/book', bookAction);
appRouter.get('/info', infoAction);

appRouter.get('/tags/count', tagsCountAction);
appRouter.get('/authors/count', authorsCountAction);
appRouter.get('/series/count', seriesCountAction);
appRouter.get('/publishers/count', publishersCountAction);

appRouter.get('/tags/:tagId', tagsAction);
appRouter.get('/cc/:ccNum/:ccId', ccAction);
appRouter.get('/log/:key/:value', logAction);
appRouter.get('/file/:format/:id', fileAction);

appRouter.get('/:type/:id', startAction);

//API-Calls
appRouter.get('/count', countAction);
appRouter.get('/connectdb', dbAction);
appRouter.get('/unconnectdb', dbAction);

