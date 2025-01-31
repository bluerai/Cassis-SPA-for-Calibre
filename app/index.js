'use strict'; 

import { Router } from 'express';

import {
  startAction, listAction, bookAction, fileAction, coverListAction, coverBookAction,
  infoAction, countAction, dbAction, tagsAction, ccAction, logAction, tagsCountAction,
  authorsCountAction, seriesCountAction, publishersCountAction
} from './controller.js';

const router = Router();

router.get('/', startAction);

//APP-Calls
router.post('/list/:type?', listAction);
router.get('/cover/book/:id', coverBookAction);
router.get('/cover/list/:id', coverListAction);
router.post('/book', bookAction);
router.get('/info', infoAction);

router.get('/tags/count', tagsCountAction);
router.get('/authors/count', authorsCountAction);
router.get('/series/count', seriesCountAction);
router.get('/publishers/count', publishersCountAction);

router.get('/tags/:tagId', tagsAction);
router.get('/cc/:ccNum/:ccId', ccAction);
router.get('/log/:key/:value', logAction);
router.get('/file/:format/:id', fileAction);

router.get('/:type/:id', startAction);

//API-Calls
router.get('/count', countAction);
router.get('/connectdb', dbAction);
router.get('/unconnectdb', dbAction);

export { router };
