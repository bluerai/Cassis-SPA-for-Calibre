'use strict';

import fs from 'fs-extra';
import sharp from 'sharp';

import { logger, consoleTransport, fileTransport, errorLogger, log_levels } from '../log.js';
import packagejson from '../package.json' with {type: 'json'}
import {
  findBooks, countBooks, findBooksWithTags, countBooksWithTags, findBooksWithCC, countBooksWithCC, findBooksBySerie, countBooksBySerie,
  findBooksByAuthor, countBooksByAuthor, getSeriesOfBooks, getAuthorsOfBooks, getFormatsOfBooks, getPublisherOfBooks, getTagsOfBooks, getBook,
  getCoverData, getFileData, getStatistics, connectDb, unconnectDb, getCustomColumnOfBooks, getTags, getCustomColumns, getTagsStatistics,
  getAuthorsStatistics, getSeriesStatistics, getPublishersStatistics
} from './model.js';

const appInfo = {
  "version": packagejson.name.toUpperCase() + ", Version " + packagejson.version + " (2024)",
  "author": packagejson.author + " (License " + packagejson.license + ")"
};

const BOOKDIR = process.env.BOOKDIR || process.env.HOME + "/Documents/Calibre"
const IMGCACHE = process.env.IMGCACHE || "./Cache";
const PAGE_LIMIT = parseInt(process.env.PAGE_LIMIT) || 30;

// Bookdir einrichten:
logger.info("Calibre e-book directory found at " + BOOKDIR);
fs.existsSync(BOOKDIR, (error, exists) => {
  if (error) { errorLogger(error); process.exit(1) }
})

// Image-Cache einrichten:
logger.info("Cache for bookcovers found at " + IMGCACHE);
fs.ensureDirSync(IMGCACHE, (error, exists) => {
  if (error) { errorLogger(error); process.exit(1) }
})

// Base functions ***********************

function getPageNavigation(page, count) {
  if (count <= PAGE_LIMIT) return { size: count };

  const lastpage = Math.ceil(count / PAGE_LIMIT) - 1;  // Nummerierung beginnt mit 0
  if (page < 0) { page = 0 }
  else if (page > lastpage) { page = lastpage }

  return {
    size: count,
    currentpage: page,
    firstpage: (0 < page) ? "0" : null,
    prevpage: (page > 0) ? (page - 1) : null,
    nextpage: (page < lastpage) ? (page + 1) : null,
    lastpage: (page <= lastpage) ? lastpage : null
  }
}

function addFields(books) {

  if (books.length > 0) {
    const bookIdString = books.map((book) => book.bookId).toString();

    const authors = getAuthorsOfBooks(bookIdString);
    books.map((book) => {
      book.authors = authors.filter((author) => author.bookId == book.bookId).map((author) => {
        author.authorsName = decode(author.authorsName); return author
      });
    })

    const formats = getFormatsOfBooks(bookIdString);
    books.map((book) => {
      book.formats = formats.filter((format) => format.bookId == book.bookId).map((format) => decode(format.name));
    })

    const series = getSeriesOfBooks(bookIdString);
    books.map((book) => {
      let serie = series.find((serie) => serie.bookId == book.bookId);
      if (serie) { serie.seriesName = decode(serie.seriesName); book.serie = serie; }
    })

    const tags = getTagsOfBooks(bookIdString);
    books.map((book) => {
      book.tags = tags.filter((tag) => tag.bookId == book.bookId).map((tag) => decode(tag.tagName));
    })

  }
  return (books);
}

// Actions **************************

export async function startAction(request, response) {
  (logger.isLevelEnabled('debug')) && logger.debug("*** startAction: request.params=" + JSON.stringify(request.params));
  try {
    const type = request.params.type;
    const id = request.params.id;
    response.render(import.meta.dirname + '/views/start', { "type": type, "id": id });
  }
  catch (error) { errorHandler(error, response, 'startAction') }
}

export async function listAction(request, response) {
  try {
    const options = request.body;
    (logger.isLevelEnabled('debug')) && logger.debug("*** listAction: options=" + JSON.stringify(options));

    const page = (!options.page || isNaN(options.page)) ? 0 : parseInt(options.page, 10);
    const sortString = (!options.sortString) ? "" : options.sortString;
    const type = options.type || request.params.type;

    let books = {};
    let count = 0;

    switch (type) {
      case "serie":
        const seriesId = (!options.serieId || isNaN(options.serieId)) ? 0 : parseInt(options.serieId, 10);
        count = countBooksBySerie(seriesId);
        if (count !== 0)
          books = findBooksBySerie(seriesId, sortString, PAGE_LIMIT, page * PAGE_LIMIT);
        break;

      case "author":
        const authorsId = (!options.authorsId || isNaN(options.authorsId)) ? 0 : parseInt(options.authorsId, 10);
        count = countBooksByAuthor(authorsId);
        if (count !== 0)
          books = findBooksByAuthor(authorsId, sortString, PAGE_LIMIT, page * PAGE_LIMIT);
        break

      default:
        const tagId = (!options.tagId || isNaN(options.tagId)) ? 0 : parseInt(options.tagId, 10);
        const ccNum = (!options.ccNum || isNaN(options.ccNum)) ? 0 : parseInt(options.ccNum, 10);
        const ccId = (!options.ccId || isNaN(options.ccId)) ? 0 : parseInt(options.ccId, 10);

        if (tagId && tagId > 0) {
          (logger.isLevelEnabled('debug')) && logger.debug("listAction: tagId: " + tagId);
          count = countBooksWithTags(options.searchString, tagId);
          if (count !== 0) books = findBooksWithTags(options.searchString, sortString, tagId, PAGE_LIMIT, page * PAGE_LIMIT);

        } else {
          if (ccNum && ccNum > 0) {
            (logger.isLevelEnabled('debug')) && logger.debug("listAction: ccNum: " + ccNum + ", ccId: " + ccId);
            count = countBooksWithCC(ccNum, options.searchString, ccId);
            if (count !== 0) books = findBooksWithCC(ccNum, options.searchString, sortString, ccId, PAGE_LIMIT, page * PAGE_LIMIT);

          } else {
            if (tagId === 0 && ccNum === 0) {
              count = countBooks(options.searchString);
              if (count && count !== 0) books = findBooks(options.searchString, sortString, PAGE_LIMIT, page * PAGE_LIMIT);
            }
          }
        }
        break;
    }

    if (count <= 0 || books.length === 0) {
      const message = (count === 0) ? "Keine Bücher/Zeitschriften gefunden!" : "Fehler beim Zugriff auf die Datenbank!";
      response.send({ "html": "<div class='message'><h3>" + message + "</h3></div>" });
      return;
    }

    books = addFields(books);
    const pageNav = getPageNavigation(page, count);

    (logger.isLevelEnabled('silly'))
      && logger.silly("listAction: books=" + JSON.stringify(books))
      && logger.silly("listAction: pageNav=" + JSON.stringify(pageNav));

    response.render(import.meta.dirname + '/views/booklist', { books, pageNav }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render booklist page');
      } else {
        response.send({ html });
      }
    });

  }
  catch (error) { errorHandler(error, response, 'listAction') }
}

export async function bookAction(request, response) {
  try {
    const options = request.body;
    (logger.isLevelEnabled('debug')) && logger.debug("*** bookAction: options=" + JSON.stringify(options));

    const bookId = parseInt(options.bookId, 10);
    const book = getBook(bookId);
    (logger.isLevelEnabled('silly')) && logger.silly("*** bookAction: book=" + JSON.stringify(book));

    let nextBook;
    let prevBook;


    if (options.bookId !== undefined && options.num) {
      const rowNum = parseInt(options.num, 10) - 1;
      const sortString = (!options.sortString) ? "" : options.sortString;
      const type = options.type;
      let nextBookArray;
      let prevBookArray;

      switch (type) {
        case "serie":
          const seriesId = (!options.serieId || isNaN(options.serieId)) ? 0 : parseInt(options.serieId, 10);
          prevBookArray = (rowNum === 0) ? [] : findBooksBySerie(seriesId, sortString, 1, rowNum - 1);
          nextBookArray = findBooksBySerie(seriesId, sortString, 1, rowNum + 1);
          break;

        case "author":
          const authorsId = (!options.authorsId || isNaN(options.authorsId)) ? 0 : parseInt(options.authorsId, 10);
          prevBookArray = (rowNum === 0) ? [] : findBooksByAuthor(authorsId, sortString, 1, rowNum - 1);
          nextBookArray = findBooksByAuthor(authorsId, sortString, 1, rowNum + 1);
          break

        default:
          const tagId = (!options.tagId || isNaN(options.tagId)) ? 0 : parseInt(options.tagId, 10);
          const ccNum = (!options.ccNum || isNaN(options.ccNum)) ? 0 : parseInt(options.ccNum, 10);
          const ccId = (!options.ccId || isNaN(options.ccId)) ? 0 : parseInt(options.ccId, 10);

          if (tagId && tagId > 0) {
            prevBookArray = (rowNum === 0) ? [] : findBooksWithTags(options.searchString, sortString, tagId, 1, rowNum - 1);
            nextBookArray = findBooksWithTags(options.searchString, sortString, tagId, 1, rowNum + 1);

          } else {
            if (ccNum && ccNum > 0) {
              prevBookArray = (rowNum == 0) ? [] : findBooksWithCC(ccNum, options.searchString, sortString, ccId, 1, rowNum - 1);
              nextBookArray = findBooksWithCC(ccNum, options.searchString, sortString, ccId, 1, rowNum + 1);

            } else {
              if (tagId === 0 && ccNum === 0) {
                prevBookArray = (rowNum === 0) ? [] : findBooks(options.searchString, sortString, 1, rowNum - 1);
                nextBookArray = findBooks(options.searchString, sortString, 1, rowNum + 1);
              }
            }
          }
          break;
      }
      nextBook = nextBookArray[0];
      prevBook = prevBookArray[0];

    }

    const formats = getFormatsOfBooks(bookId);
    book.formats = formats.map((format) => decode(format.name));

    const authors = getAuthorsOfBooks(bookId);
    book.authors = authors.map((author) => {
      author.authorsName = decode(author.authorsName); return author
    });

    const publisher = getPublisherOfBooks(bookId);
    if (publisher) { publisher.name = decode(publisher.name); book.publisher = publisher }

    const tags = getTagsOfBooks(bookId);
    for (let t in tags) {
      tags[t].tagName = decode(tags[t].tagName);
      if (tags[t].colId) {
        tags[t].subTags = getCustomColumnOfBooks(tags[t].colId, bookId);
      };
    }
    book.tags = tags

    const series = getSeriesOfBooks(bookId);
    if (series[0]) { series[0].seriesName = decode(series[0].seriesName); book.serie = series[0] }
    if (book.pubdate.substr(0, 1) == "0") { book.pubdate = null };

    (logger.isLevelEnabled('silly'))
    && logger.silly("bookAction: " + JSON.stringify(book))
    && logger.silly("bookAction: prevBook=" + JSON.stringify(prevBook))
    && logger.silly("bookAction: nextBook=" + JSON.stringify(nextBook));

    response.render(import.meta.dirname + '/views/book', { book, prevBook, nextBook }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render book page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'bookAction') }
}

export async function tagsAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("*** tagsAction: request.params=" + JSON.stringify(request.params));
    const selectedId = (!request.params.tagId || isNaN(request.params.tagId)) ? 0 : parseInt(request.params.tagId, 10);
    const tags =
      getTags()
        .map(tag => { tag.class = (tag.tagId === selectedId) ? "selected" : ""; return tag });

    const options = { tags };
    (logger.isLevelEnabled('silly')) && logger.silly("tagsAction: appInfo=" + JSON.stringify(appInfo) + ", " + "options=" + JSON.stringify(options));
    response.render(import.meta.dirname + '/views/info', { appInfo, options }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'tagsAction') }
}

export async function ccAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("*** ccAction: request.params=" + JSON.stringify(request.params));
    const ccNum = (!request.params.ccNum || isNaN(request.params.ccNum)) ? 0 : parseInt(request.params.ccNum, 10);
    const selectedId = (!request.params.ccId || isNaN(request.params.ccId)) ? 0 : parseInt(request.params.ccId, 10);

    const custCols =
      getCustomColumns(ccNum)
        .map(cc => { cc.class = (cc.id === selectedId) ? "selected" : ""; return cc });

    const options = { ccNum, custCols };
    (logger.isLevelEnabled('silly')) && logger.silly("ccAction: appInfo=" + appInfo + ", " + "options=" + JSON.stringify(options));
    response.render(import.meta.dirname + '/views/info', { appInfo, options }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'ccAction') }
}

async function sendResizedCover2(response, source, targetDir, targetFile, resizeOptions) {
  try {
    const options = { root: targetDir, headers: { 'Content-Type': 'image/jpeg' } }
    fs.pathExists(targetDir + "/" + targetFile, async (error, exists) => {
      if (error) { errorLogger(error) }
      else {
        if (exists) {
          response.sendFile(targetFile, options, function (error) {
            if (error) { errorLogger(error) }
          })
        } else {
          sharp(source)
            .resize(resizeOptions)
            .toFile(targetDir + "/" + targetFile, function (error, info) {
              if (!error) {
                response.sendFile(targetFile, options, function (error) {
                  if (error) { errorLogger(error) }
                })
              } else { errorLogger(error) }
            });
        }
      }
    })
  }
  catch (error) { errorHandler(error, response, 'sendResizedCover') }
}


async function sendResizedCover(response, source, targetDir, targetFile, resizeOptions) {
  try {
    const options = { root: targetDir, headers: { 'Content-Type': 'image/jpeg' } }
    const exists = await fs.pathExists(targetDir + "/" + targetFile);

    if (!exists) {
      await sharp(source)
        .resize(resizeOptions)
        .toFile(targetDir + "/" + targetFile);
    }
    response.sendFile(targetFile, options);
  }
  catch (error) { errorHandler(error, response, 'sendResizedCover') }
}


export async function coverListAction(request, response) {
  try {
    let fileData = getCoverData(parseInt(request.params.id, 10));
    if (fileData) {
      (logger.isLevelEnabled('silly')) && logger.silly("*** coverListAction: fileData=" + JSON.stringify(fileData));
      const source = BOOKDIR + "/" + fileData.path + "/cover.jpg";
      const targetDir = IMGCACHE + "/1" + ("0000" + fileData.bookId).slice(-5).substring(0, 2);
      fs.ensureDirSync(targetDir);
      sendResizedCover(response, source, targetDir, fileData.bookId + ".jpg", { height: 250 });
    }
  }
  catch (error) { errorHandler(error, response, 'coverListAction') }
}

export async function coverBookAction(request, response) {
  try {
    let fileData = getCoverData(parseInt(request.params.id, 10));
    (logger.isLevelEnabled('debug')) && logger.debug("*** coverBookAction: fileData=" + JSON.stringify(fileData));
    const source = BOOKDIR + "/" + fileData.path + "/cover.jpg";
    const targetDir = IMGCACHE + "/0" + ("0000" + fileData.bookId).slice(-5).substring(0, 2);
    fs.ensureDirSync(targetDir);
    sendResizedCover(response, source, targetDir, fileData.bookId + ".jpg", { width: 320 });
  }
  catch (error) { errorHandler(error, response, 'coverBookAction') }
}

export async function fileAction(request, response) {
  try {
    let fileData = getFileData(parseInt(request.params.id, 10), request.params.format);
    (logger.isLevelEnabled('debug')) && logger.debug("*** fileAction: fileData=" + JSON.stringify(fileData));
    const options = {
      root: BOOKDIR + "/" + fileData.path,
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    }
    response.sendFile(fileData.filename, options, function (error) {
      if (error)
        errorHandler(error, response, 'response.sendFile');
      else
        (logger.isLevelEnabled('debug')) && logger.debug('response.sendFile: filename=' + fileData.filename);
    })
  }
  catch (error) { errorHandler(error, 'fileAction') }
}

export async function infoAction(request, response) {
  try {
    const stats = getStatistics();
    const options = { stats, logger: { level: logger.level, levels: log_levels, consoleOn: !consoleTransport.silent, fileOn: !fileTransport.silent } };
    (logger.isLevelEnabled('debug')) && logger.debug("*** infoAction: appInfo=" + JSON.stringify(appInfo) + ", " + "options=" + JSON.stringify(options));
    response.render(import.meta.dirname + '/views/info', { appInfo, options }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'infoAction') }
}

export async function tagsCountAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("*** tagsCountAction");
    const popup = { "type": "tag", "head_name": "Genres", "head_count": "Bücher, Zeitschriften", "content": getTagsStatistics()};
    response.render(import.meta.dirname + '/views/info_popup', { popup }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'tagsCountAction') }
}


export async function authorsCountAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("*** authorsCountAction");
    const popup = { "type": "author", "head_name": "Autoren", "head_count": "Bücher, Zeitschriften", "content": getAuthorsStatistics() };
    response.render(import.meta.dirname + '/views/info_popup', { popup }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'tagsCountAction') }
}

export async function seriesCountAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("*** seriesCountAction");
    const popup = { "type": "serie", "head_name": "Serie", "head_count": "Bücher, Zeitschriften", "content": getSeriesStatistics() };
    response.render(import.meta.dirname + '/views/info_popup', { popup }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'tagsCountAction') }
}

export async function publishersCountAction(request, response) {
  try {
    (logger.isLevelEnabled('debug')) && logger.debug("*** publishersCountAction");
    const popup = { "type": "publisher", "head_name": "Verlag", "head_count": "Bücher, Zeitschriften", "content": getPublishersStatistics() };
    response.render(import.meta.dirname + '/views/info_popup', { popup }, function (error, html) {
      if (error) {
        errorHandler(error, response, 'render info page');
      } else {
        response.send({ html });
      }
    });
  }
  catch (error) { errorHandler(error, response, 'tagsCountAction') }
}

export async function logAction(request, response) {
  try {
    logger.info("*** logAction: request.params=" + JSON.stringify(request.params));
    const key = request.params.key;
    switch (key) {
      case 'level':
        const level = request.params.value;
        if (log_levels.indexOf(level) && logger.level !== level) logger.level = level;
        response.send({ level: logger.level });
        break;
      case 'con':
        consoleTransport.silent = (request.params.value === "1") ? false : true;
        response.send({ consoleOn: !consoleTransport.silent });
        break;
      case 'fil':
        fileTransport.silent = (request.params.value === "1") ? false : true;
        response.send({ fileOn: !fileTransport.silent });
        break;
    }
    (logger.isLevelEnabled('debug')) && logger.debug("Logging level: " + logger.level + ", logging to console: " + !consoleTransport.silent + ", logging to file: " + !fileTransport.silent);
  }
  catch (error) { errorHandler(error, response, 'logLevelAction') }
}

// externe API-Funktionen:

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

// Helper functions ***********************

function decode(str) {
  return (str) ? str.toString().replaceAll('|', ',') : "";
}

function errorHandler(error, response, actionName) {
  const message = "Cassis: Internal server error in '" + actionName + "': " + error.message;
  logger.error(message);
  errorLogger(error);
  response.writeHead(500, message, { 'content-type': 'text/html' });
  response.end();
}
