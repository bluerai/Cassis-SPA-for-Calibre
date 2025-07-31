'use strict'; 

import { Router } from 'express';

import {
  startAction, listAction, bookAction, bookLinkAction, fileAction, coverListAction, coverBookAction,
  statsAction, settingsAction, tagsAction, ccAction, logAction, tagsCountAction, authorsCountAction, 
  seriesCountAction, publishersCountAction
} from './controller.js';

export const appRouter = Router();

appRouter.get('/', startAction);

//APP-Calls - geschützt
appRouter.post('/list/:type?', listAction);
appRouter.get('/stats', statsAction);
appRouter.get('/settings', settingsAction);

appRouter.post('/book/:id', bookAction);
appRouter.post('/booklink', bookLinkAction);
appRouter.get('/tags/count', tagsCountAction);
appRouter.get('/authors/count', authorsCountAction);
appRouter.get('/series/count', seriesCountAction);
appRouter.get('/publishers/count', publishersCountAction);

appRouter.get('/tags/:tagId', tagsAction);
appRouter.get('/cc/:ccNum/:ccId', ccAction);
appRouter.get('/log/:key/:value', logAction);

// mit Signatur geschützt
appRouter.get('/cover/book/:id', coverBookAction);
appRouter.get('/cover/list/:id', coverListAction);
appRouter.get('/file/:format/:id', fileAction);

//special
appRouter.get('/:type/:id', startAction);




