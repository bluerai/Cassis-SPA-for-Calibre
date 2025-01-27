'use strict';

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs-extra';
import { logger, errorLogger } from '../log.js';

const METADATA_PATH = process.env.METADATA_PATH || process.env.HOME + "/Documents/Calibre/metadata.db"

if (!fs.existsSync(METADATA_PATH)) {
  logger.error("Calibre-Datenbank nicht gefunden im Pfad: " + METADATA_PATH);
  process.exit(1);
}

const METADATA_DB = new DatabaseSync(METADATA_PATH, { open: true });
if (METADATA_DB) logger.info("Connected to Calibre Database at " + METADATA_PATH)

// SQL 
const bookColumns = ' t1.id as bookId, t1.title, t1.sort, t1.timestamp, t1.pubdate, t1.timestamp, t1.series_index as seriesIndex, t1.path ';

const queryBook = 'select ' + bookColumns + ', (select text from comments where comments.book = ?) as comment '
  + ' from books as t1 where bookId = ?';

function queryAuthorsOfBooks(bookIdString) {
  return `
    select books_authors_link.book as bookId, authors.name as authorsName, authors.id as authorsId 
      from authors, books_authors_link 
      where bookId in (` + bookIdString + `) and books_authors_link.author = authors.id`;
};

function querySeriesOfBooks(bookIdString) {
  return `
    select books.id as bookId, series.id as seriesId, series.name as seriesName
      from books, books_series_link, series 
      where bookId in (` + bookIdString + `) and books_series_link.book = bookId  and series.id = books_series_link.series`
};

function queryPublisherOfBook(bookIdString) {
  return `
    select publishers.id, publishers.name 
      from publishers, books_publishers_link 
      where books_publishers_link.book in (` + bookIdString + `) and publishers.id = books_publishers_link.publisher`
}

function queryTagsOfBook(bookIdString) {
  return `
    select books.id as bookId, tags.name as tagName, 
      (select custom_columns.id as colId 
        from custom_columns 
        where custom_columns.name = tags.name
      ) as colId 
      from books, books_tags_link, tags 
      where bookId in (` + bookIdString + `) and bookId = books_tags_link.book and books_tags_link.tag = tags.id`
}

function queryFormatsOfBooks(bookIdString) {
  return `
    select books.id as bookId, LOWER(format) as name 
      from books, data 
      where bookId in (` + bookIdString + `) and data.book = bookId`
};

const queryCustomColumnsIds = 'select id as colId, label, name from custom_columns';

function queryCustomColumns(colId) {
  return 'select id, value from custom_column_' + colId;
}

function queryCustomColumnsOfBooks(colId, bookIdString) {
  return `
    select books.id as bookId, custom_column_` + colId + `.value 
      from books, custom_column_` + colId + `, books_custom_column_` + colId + `_link 
      where bookId in (` + bookIdString + `) and bookId = books_custom_column_` + colId + `_link.book
        and custom_column_` + colId + `.id = books_custom_column_` + colId + `_link.value`
}

const queryCoverData = `select books.id as bookId, books.path, 'cover.jpg' as filename from books, data 
      where bookId = ? and bookId = data.book`

const queryFileData = `select books.path, data.name || '.' || LOWER(data.format) as filename 
      from books, data where books.id = ? and books.id = data.book and data.format = ?`

const queryTags = 'select id as tagId, name as tagName from tags';

const queryCounts = `
  select 
    (select count(*) from books) as books, 
    (select count(*) from series) as series, 
    (select count(*) from Authors) as authors, 
    (select count(*) from publishers) as publishers,
    (select count(*) from tags) as tags`

function searchClause(searchArray) {
  //logger.debug("searchClause: searchArray=" + searchArray);
  if (searchArray && searchArray.length > 0) {
    let clause = "";
    searchArray.sort((a, b) => { return b.length - a.length }).forEach(element => {
      clause += " and search like '%" + element + "%'";
    });
    return " where " + clause.substring(4);
  }
  return "";
}

const sortArray = [];
sortArray["timestamp.asc"] = "order by t1.timestamp asc";
sortArray["timestamp.desc"] = "order by t1.timestamp desc";
sortArray["author.asc"] = "order by t1.author_sort asc, t1.sort asc";
sortArray["author.desc"] = "order by t1.author_sort desc, t1.sort desc";
sortArray["title.asc"] = "order by t1.sort asc";
sortArray["title.desc"] = "order by t1.sort desc";
sortArray["serie.asc"] = "order by t1.series_index asc";
sortArray["serie.desc"] = "order by t1.series_index desc";

function findBooksQuery(searchArray, sortString) {
  return `
    select row_number() over win as num, ` + bookColumns + `,
      t1.sort || ' ' || t1.title || ' ' || coalesce(t2.sort, '') || ' ' || t1.path as search 
      from (select books.*, group_concat(authors.name) name from authors, books, books_authors_link 
      where authors.id = books_authors_link.author and books.id = books_authors_link.book group by books.id
    ) as t1 
    left join 
    (select books.id as bookId, series.sort 
      from books, series, books_series_link 
      where bookId = books_series_link.book and books_series_link.series = series.id
    ) as t2 
    on t1.id = t2.bookId ` + searchClause(searchArray) + `
    group by t1.id window win as (` + (sortArray[sortString] || sortArray['timestamp.desc']) + `) limit ? offset ?`;
};

function countBooksQuery(searchArray) {
  return `
    select count(*) as count from 
      (select t1.name || ' ' || t1.title || ' ' || coalesce(t2.name, '') || ' ' || t1.path as search 
        from 
          (select books.*, group_concat(authors.name)name from authors, books, books_authors_link 
            where authors.id = books_authors_link.author and books.id = books_authors_link.book group by books.id
      ) as t1 
      left join 
      (select books.id as bookId, series.name from books, series, books_series_link 
        where bookId = books_series_link.book and books_series_link.series = series.id
      ) as t2 
        on t1.id = t2.bookId ` + searchClause(searchArray) + `
      group by t1.id )`;
};

function findBooksWithTagsQuery(searchArray, sortString, tagIdString) {
  return `
    select row_number() over win as num, ` + bookColumns + `, t1.name || ' ' || t1.title || ' ' || coalesce(t2.name, '') || ' '
     || t1.path as search 
      from 
        (select books.*, group_concat(authors.name) name
          from authors, books, books_authors_link, tags, books_tags_link 
          where authors.id = books_authors_link.author and books.id = books_authors_link.book and 
            books.id = books_tags_link.book and books_tags_link.tag = tags.id and tags.id in (` + tagIdString + `)
            group by books.id ) as t1 
        left join 
        (select books.id as bookId, series.name from books, series, books_series_link 
          where bookId = books_series_link.book and books_series_link.series = series.id) as t2 
        on t1.id = t2.bookId
      ` + searchClause(searchArray) + `
      group by t1.id
      window win as (` + (sortArray[sortString] || sortArray['timestamp.desc']) + `) limit ? offset ?`;
}

function countBooksWithTagsQuery(searchArray, tagIdString) {
  return `
    select count(*) as count from (select t1.name || ' ' || t1.title || ' ' || coalesce(t2.name, '') || ' ' || t1.path as search 
      from 
        (select books.*, group_concat(authors.name)name 
          from authors, books, books_authors_link, tags, books_tags_link 
          where authors.id = books_authors_link.author and books.id = books_authors_link.book and 
            books.id = books_tags_link.book and books_tags_link.tag = tags.id and tags.id in (` + tagIdString + `) group by books.id 
        ) as t1
        left join 
        (select books.id as bookId, series.name from books, series, books_series_link 
          where bookId = books_series_link.book and books_series_link.series = series.id
        ) as t2 
        on t1.id = t2.bookId
      ` + searchClause(searchArray) + `
      group by t1.id )`;
}

function findBooksWithCCQuery(ccNum, searchArray, sortString, ccIdString) {
  return `
    select row_number() over win as num, ` + bookColumns + `, t1.name || ' ' || t1.title || ' ' || coalesce(t2.name, '') || ' ' || t1.path as search 
    from 
      (select books.*, group_concat(authors.name)name from authors, books, books_authors_link, 
          custom_column_` + ccNum + ` as cc, books_custom_column_` + ccNum + `_link as ccl 
        where authors.id = books_authors_link.author and books.id = books_authors_link.book and 
          books.id = ccl.book and ccl.value = cc.id and cc.id in (` + ccIdString + `) 
        group by books.id 
      ) as t1 
      left join 
      (select books.id as bookId, series.name from books, series, books_series_link 
        where bookId = books_series_link.book and books_series_link.series = series.id
      ) as t2 
      on t1.id = t2.bookId
      ` + searchClause(searchArray) + `
      group by t1.id window win as (` + (sortArray[sortString] || sortArray['timestamp.desc']) + `) limit ? offset ?`;
}


function countBooksWithCCQuery(ccNum, searchArray, ccIdString) {
  return `
    select count(*) as count 
    from 
      (select t1.name || ' ' || t1.title || ' ' || coalesce(t2.name, '') || ' ' || t1.path as search from 
        (select books.*, group_concat(authors.name)name 
          from authors, books, books_authors_link, custom_column_` + ccNum + ` as cc, books_custom_column_` + ccNum + `_link as ccl 
          where authors.id = books_authors_link.author and books.id = books_authors_link.book and 
            books.id = ccl.book and ccl.value = cc.id and cc.id in ('` + ccIdString + `') 
          group by books.id
        ) as t1 
      left join 
      (select books.id as bookId, series.name 
        from books, series, books_series_link 
        where bookId = books_series_link.book and books_series_link.series = series.id
      ) as t2 
      on t1.id = t2.bookId
      ` + searchClause(searchArray) + `
      group by t1.id)`;
}

function findBooksByAuthorQuery(sortString) {
  return `
    select row_number() over win as num, ` + bookColumns + ` 
      from books as t1, authors, books_authors_link
      where authors.id = ? and books_authors_link.author = authors.id and books_authors_link.book = bookId 
      window win as (` + (sortArray[sortString] || sortArray['serie.asc']) + `) 
      limit ? offset ?`;
}

const countBooksByAuthorQuery = `select count(*) as count from authors, books, books_authors_link 
  where authors.id = ? and books_authors_link.author = authors.id and books_authors_link.book = books.id`;

function findBooksBySerieQuery(sortString) {
  return `
    select row_number() over win as num, ` + bookColumns + `, series.name as seriesName, series.id as seriesId 
      from books as t1, series, books_series_link where series.id = ? and books_series_link.series = series.id 
        and books_series_link.book = bookId 
      window win as (` + (sortArray[sortString] || sortArray['serie.asc']) + `) 
      limit ? offset ?`;
}

const countBooksBySerieQuery = 'select count(*) as count from books, series, books_series_link '
  + ' where series.id = ? and books_series_link.series = series.id and books_series_link.book = books.id ';

// Global prepared STMTs (for better performance of often used prepared STMTs)
let COVERDATA_STMT;
try {
  COVERDATA_STMT = METADATA_DB.prepare(queryCoverData);
} catch (error) {
  errorLogger(error);
  process.exit(1);
}

// Exported functions **************************************
export function connectDb() {  // open database 
  try {
    METADATA_DB.open();
    logger.info("connectDb: DB opened");
    return { state: true, msg: "Calibre Database connected." }
  } catch (error) {
    return { state: false, msg: error.message };
  }
}

export function unconnectDb() {  // close database 
  try {
    METADATA_DB.close();
    logger.warn("unconnectDb: DB closed");
    return { state: true, msg: "Calibre Database closed" }
  } catch (error) {
    return { state: false, msg: error.message };
  }
}

export function findBooks(searchArray, sortString, limit, offset) {
  logger.debug("findBooks: searchArray=" + searchArray + ", sortString=" + sortString + ", limit=" + limit + ", offset=" + offset);
  logger.silly(findBooksQuery(searchArray, sortString));
  try {
    const selectAllStmt = METADATA_DB.prepare(findBooksQuery(searchArray, sortString));
    return selectAllStmt.all(limit, offset);
  } catch (error) { errorLogger(error); return [] }
}

export function countBooks(searchArray) {
  logger.debug("countBooks: searchArray=" + searchArray);
  try {
    const selectOneStmt = METADATA_DB.prepare(countBooksQuery(searchArray));
    return selectOneStmt.get().count;
  } catch (error) { errorLogger(error); return -1 }
}

export function findBooksWithTags(searchArray, sortString, tagIdString, limit, offset) {
  logger.debug("findBooksWithTags: searchArray=" + searchArray + ", sortString=" + sortString + ", tagIdString=" + tagIdString + ", limit=" + limit + ", offset=" + offset)
  try {
    const selectAllStmt = METADATA_DB.prepare(findBooksWithTagsQuery(searchArray, sortString, tagIdString));
    return selectAllStmt.all(limit, offset);
  } catch (error) { errorLogger(error); return []; }
}

export function countBooksWithTags(searchArray, tagIdString) {
  logger.debug("countBooksWithTags: searchArray=" + searchArray + ", tagIdString=" + tagIdString);
  try {
    const selectOneStmt = METADATA_DB.prepare(countBooksWithTagsQuery(searchArray, tagIdString));
    return selectOneStmt.get().count;
  } catch (error) { errorLogger(error); return -1; }
}

export function findBooksWithCC(ccNum, searchArray, sortString, ccIdString, limit, offset) {
  logger.debug("findBooksWithCC: ccNum=" + ccNum + ", searchArray=" + searchArray + ", sortString=" + sortString + ", ccIdString=" + ccIdString + ", limit=" + limit + ", offset=" + offset)
  try {
    const selectAllStmt = METADATA_DB.prepare(findBooksWithCCQuery(ccNum, searchArray, sortString, ccIdString));
    return selectAllStmt.all(limit, offset);
  } catch (error) { errorLogger(error); return []; }
}

export function countBooksWithCC(ccNum, searchArray, ccIdString) {
  logger.debug("countBooksWithCC: ccNum=" + ccNum + ", searchArray=" + searchArray + ", ccIdString=" + ccIdString);
  try {
    const selectOneStmt = METADATA_DB.prepare(countBooksWithCCQuery(ccNum, searchArray, ccIdString));
    return selectOneStmt.get().count;
  } catch (error) { errorLogger(error); return -1; }
}

export function findBooksBySerie(seriesId, sortString, limit, offset) {
  logger.debug("findBooksBySerie: seriesId=" + seriesId + ", sortString=" + sortString + ", limit=" + limit + ", offset=" + offset);
  try {
    const selectAllStmt = METADATA_DB.prepare(findBooksBySerieQuery(sortString));
    return selectAllStmt.all(seriesId, limit, offset);
  } catch (error) { errorLogger(error); return []; }
}

export function countBooksBySerie(seriesId) {
  try {
    const selectOneStmt = METADATA_DB.prepare(countBooksBySerieQuery);
    return selectOneStmt.get(seriesId).count;
  } catch (error) { errorLogger(error); return -1; }
}

export function findBooksByAuthor(authorsId, sortString, limit, offset) {
  logger.debug("findBooksByAuthor: authorsId=" + authorsId + ", sortString=" + sortString + ", limit=" + limit + ", offset=" + offset);
  try {
    const selectAllStmt = METADATA_DB.prepare(findBooksByAuthorQuery(sortString));
    return selectAllStmt.all(authorsId, limit, offset);
  } catch (error) { errorLogger(error); return []; }
}

export function countBooksByAuthor(authorsId) {
  try {
    const selectOneStmt = METADATA_DB.prepare(countBooksByAuthorQuery);
    return selectOneStmt.get(authorsId).count;
  } catch (error) { errorLogger(error); return -1; }
}

export function getBook(bookId) {
  try {
    const selectOneStmt = METADATA_DB.prepare(queryBook);
    return selectOneStmt.get(bookId, bookId);
  } catch (error) { errorLogger(error); return null; }
}

export function getAuthorsOfBooks(bookIdString) {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryAuthorsOfBooks(bookIdString));
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getFormatsOfBooks(bookIdString) {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryFormatsOfBooks(bookIdString));
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getSeriesOfBooks(bookIdString) {
  try {
    const selectAllStmt = METADATA_DB.prepare(querySeriesOfBooks(bookIdString));
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getTagsOfBooks(bookIdString) {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryTagsOfBook(bookIdString));
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getPublisherOfBooks(bookIdString) {
  try {
    const selectOneStmt = METADATA_DB.prepare(queryPublisherOfBook(bookIdString));
    return selectOneStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getCustomColumnOfBooks(colId, bookIdString) {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryCustomColumnsOfBooks(colId, bookIdString));
    return selectAllStmt.all().map(res => res.value);
  } catch (error) { errorLogger(error); return []; }
}

export function getTags() {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryTags);
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getCustomColumnsIds() {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryCustomColumnsIds);
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getCustomColumns(ccNum) {
  try {
    const selectAllStmt = METADATA_DB.prepare(queryCustomColumns(ccNum));
    return selectAllStmt.all();
  } catch (error) { errorLogger(error); return []; }
}

export function getCoverData(bookId) {
  try {
    return COVERDATA_STMT.get(bookId);
  } catch (error) {
    if (error.code === "ERR_INVALID_STATE") {
      try {
        logger.warn("*** getCoverData: re-prepared global STMT");
        COVERDATA_STMT = METADATA_DB.prepare(queryCoverData);
        return COVERDATA_STMT.get(bookId);
      } catch (error) { errorLogger(error); return null; }
    } else { errorLogger(error); return null; }
  }
}

export function getFileData(bookId, format) {
  try {
    return METADATA_DB.prepare(queryFileData,).get(bookId, format);
  } catch (error) { errorLogger(error); return null; }
}

export function getStatistics() {
  try {
    return METADATA_DB.prepare(queryCounts).get();
  } catch (error) { errorLogger(error); return {}; }
}

