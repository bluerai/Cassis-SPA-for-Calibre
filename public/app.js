'use strict';

const DEF_OPTIONS = {
  'target': 'list',
  'type': 'search',
  'searchString': '',
  'bookId': 0,
  'serieId': 0,
  'authorsId': 0,
  'tagId': 0,
  'ccId': 0,
  'ccNum': 0,
  'num': 0,
  'sortString': 'timestamp.desc',
  'screenwidth': '0',
};

let OPTIONS_COUNTER;

let OPTIONS;

function pushOptions(options) {
  OPTIONS_COUNTER = OPTIONS_COUNTER + 1;
  sessionStorage.setItem("cassis" + OPTIONS_COUNTER, JSON.stringify(options));
  sessionStorage.setItem("cassis_OPTIONS_COUNTER", OPTIONS_COUNTER);
  if (OPTIONS_COUNTER > 1) {
    let n = OPTIONS_COUNTER;
    let optionsString;
    do {
      optionsString = sessionStorage.getItem("cassis" + ++n);
      optionsString && sessionStorage.removeItem("cassis" + n);
    } 
    while (optionsString);
  }
}

function getOptions() {
  const optionsString = sessionStorage.getItem("cassis" + OPTIONS_COUNTER)
  return (optionsString) && JSON.parse(optionsString);
}

function getOption(option) {
  const optionsString = sessionStorage.getItem("cassis" + OPTIONS_COUNTER)
  return (optionsString) && JSON.parse(optionsString)[option];
}

function restoreOptions() {
  //alert("restoreOptions()")
  OPTIONS_COUNTER = parseInt(sessionStorage.getItem("cassis_OPTIONS_COUNTER")) || 0;
  let options = getOptions();
  if (!options) { options = DEF_OPTIONS; pushOptions(options); }
  if (OPTIONS_COUNTER == 1)
    document.getElementById('back').classList.add("disabled");
  else
    document.getElementById('back').classList.remove("disabled");
  if (!sessionStorage.getItem("cassis" + (OPTIONS_COUNTER + 1)))
    document.getElementById('forward').classList.add("disabled");
  else
    document.getElementById('forward').classList.remove("disabled");
  if (options.type !== 'search')
    document.getElementById('authorsort').classList.add("disabled");
  else
    document.getElementById('authorsort').classList.remove("disabled");
}

async function historyMove(num) {
  OPTIONS_COUNTER = parseInt(sessionStorage.getItem("cassis_OPTIONS_COUNTER")) + num;
  let options = getOptions();
  if (!options) return;
  document.getElementById('searchInput').value = options.searchString || "";

  if (options.target === 'list') {
    getBooklist(options);
  } else if (options.target === 'book') {
    getBook(options);
  }
  sessionStorage.setItem("cassis_OPTIONS_COUNTER", OPTIONS_COUNTER);
  restoreOptions();
}

function goBack() { historyMove(-1) }
function goForward() { historyMove(1) }

async function getBooklist(options) {
  options.width = window.innerWidth;
  const response = await fetch("/app/list/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options)
  });
  const data = await response.json();
  document.getElementById("books").innerHTML = data.html;
  document.body.scrollIntoView();
  restoreOptions();
}

async function appendToBooklist(options) {
  const response = await fetch("/app/list/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options)
  });
  const data = await response.json();
  document.getElementById("pagedown").remove();
  document.getElementById("books").insertAdjacentHTML("beforeend", data.html);
  CURPAGE = 0;
}

async function getBook(options) {
  const response = await fetch("/app/book/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options)
  })
  const data = await response.json();
  document.getElementById("books").innerHTML = data.html;
  document.body.scrollIntoView();
  document.getElementById('searchInput').value = "";
  restoreOptions();
}

function setOptionsHome() {
  let options = DEF_OPTIONS;
  getBooklist(options);
  pushOptions(options);
  /* OPTIONS_COUNTER = 1;
  sessionStorage.setItem("cassis_OPTIONS_COUNTER", OPTIONS_COUNTER); */
  document.getElementById('searchInput').value = '';
}

function setOptionsSearch() {
  let options = {
    'target': 'list',
    'type': 'search',
    'searchString': document.getElementById('searchInput').value
  };
  getBooklist(options);
  pushOptions(options);
}

function setOptionsTag(newOptions) {
  //alert("setOptionsTag: tagOptions=" + JSON.stringify(newOptions));
  let oldOptions = getOptions();
  let options = {
    'target': 'list',
    'type': 'search',
    'searchString': document.getElementById('searchInput').value,
    'tagId': newOptions.tagId || oldOptions.tagId,
    'sortString': newOptions.sortString || oldOptions.sortString
  };

  getBooklist(options);
  pushOptions(options);
}

function setOptionsCC(newOptions) {
  //alert(("setOptionsCC: newOptions=" + JSON.stringify(newOptions));
  let oldOptions = getOptions();
  let options = {
    'target': 'list',
    'type': 'search',
    'searchString': document.getElementById('searchInput').value,
    'ccNum': newOptions.ccNum || oldOptions.ccNum,
    'ccId': newOptions.ccId || oldOptions.ccId,
    'sortString': newOptions.sortString || oldOptions.sortString
  };
  getBooklist(options);
  pushOptions(options);
}

function setOptionsSerie(newOptions) {
  //("setOptionsSerie: newOptions=" + JSON.stringify(newOptions));
  document.getElementById('searchInput').value = "";
  let options = {
    'target': 'list',
    'type': 'serie',
    'serieId': newOptions.serieId,
    'sortString': 'serie.asc'
  };
  getBooklist(options);
  pushOptions(options);
}

function setOptionsAuthor(newOptions) {
  //alert("setOptionsAuthor: " + JSON.stringify(newOptions));
  document.getElementById('searchInput').value = "";
  let options = {
    'target': 'list',
    'type': 'author',
    'authorsId': newOptions.authorsId,
    'sortString': 'timestamp.desc'
  };
  getBooklist(options);
  document.getElementById('searchInput').value = "";
  pushOptions(options);
}

async function setOptionsBook(newOptions) {
  //alert("setOptionsBook: " + JSON.stringify(newOptions));
  let options = getOptions();
  options.target = 'book';
  options.bookId = newOptions.bookId;
  options.num = newOptions.num;
  getBook(options);
  pushOptions(options);
}

async function setOptionsPage(page) {
  let options = getOptions();
  options.page = page;
  appendToBooklist(options);
  pushOptions(options);
}

function setOptionsHub(type, id) {
  //alert(type + ": " + id);
  switch (type) {
    case "tag": {
      setOptionsTag({ "tagId": id })
      break;
    }
    case "author": {
      setOptionsAuthor({ "authorsId": id })
      break;
    }
    case "serie": {
      setOptionsSerie({ "serieId": id })
      break;
    }
    case "publisher": {
      // TODO
      break;
    }
  }
  document.getElementById('info_popup').style.display = 'none';
  document.getElementById('transparent').style.display = 'none';
}

function setSortString(sortType) {
  //alert("setSortString: sortType=" + sortType);
  const oldSortString = getOption('sortString');
  const newSortString = (oldSortString === sortType + ".asc") ? sortType + ".desc" : sortType + ".asc";
  let options = getOptions();
  options.sortString = newSortString;
  options.page = 0;

  getBooklist(options);
  pushOptions(options);
}

function clearSearchInput() {
  document.getElementById('searchInput').select();
  document.getElementById('searchInput').value = '';
  document.getElementById('searchInput').focus();
}

async function getPage(url) {
  const response = await fetch(url);
  const data = await response.json();
  document.getElementById("books").innerHTML = data.html;
  if (document.getElementById("info_url")) document.getElementById("info_url").innerHTML = location.protocol + "//" + location.host;

  setTimeout(() => {
    hideDropdownMenu();
    document.body.scrollIntoView();
  }, 100);
}

function showDropdownMenu() {
  document.getElementById('dropdown-content').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
}

function hideDropdownMenu() {
  //alert("hideDropdownMenu");
  document.getElementById('transparent').style.display = 'none';
  document.getElementById('dropdown-content').style.display = 'none';
  if (document.getElementById('info_popup').style.display === 'block') document.getElementById('info_popup').style.display = 'none';
}

async function connectDb(connect) {
  const url = (!connect) ? "/app/unconnectdb" : "/app/connectdb";
  const response = await fetch(url);
  const data = await response.json();
  alert(data.msg);
}

async function setLogLevel() {
  let loglevel = document.getElementById('loglevel').value;
  const response = await fetch("/app/log/level/" + loglevel);
  const data = await response.json();
  document.getElementById('loglevel-value').innerHTML = data.level;
  document.getElementById('loglevel').value = "0";
}

async function setLogConTransport() {
  let checked = document.getElementById('logToConsole').checked;
  const response = await fetch("/app/log/con/" + (checked ? "1" : "0"));
  const data = await response.json();
  //alert(JSON.stringify(data));
  document.getElementById('logToConsole').checked = data.consoleOn;
}

async function setLogFilTransport() {
  let checked = document.getElementById('logToFile').checked;
  const response = await fetch("/app/log/fil/" + (checked ? "1" : "0"));
  const data = await response.json();
  //alert(JSON.stringify(data));
  document.getElementById('logToFile').checked = data.fileOn;
}

async function showTagsStats() {
  //alert("showTagsStats");
  const response = await fetch("/app/tags/count");
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function showAuthorsStats() {
  //alert("showAuthorsStats");
  const response = await fetch("/app/authors/count");
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function showSeriesStats() {
  //alert("showSeriesStats");
  const response = await fetch("/app/series/count");
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function showPublisherStats() {
  //alert("showPublisherStats");
  const response = await fetch("/app/publishers/count");
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

function sendMail(authors, title, bookId, tagName) {
  location.href = 'mailto:?' +
    'subject=' + encodeURIComponent('"' + title + ((tagName === 'Zeitschrift') ? '"' : '" von ' + authors)) +
    '&body=' + encodeURIComponent('... mit besten Empfehlungen aus der Cassis-Bibliothek:\n\n'
      + '"' + title + ((tagName === 'Zeitschrift') ? '"' : '" von ' + authors) + '\n\n'
      + location.protocol + '//' + location.host + '/app/book/' + bookId + '\n\n'
      + location.protocol + '//' + location.host + '/app/cover/book/' + bookId);
}

function submitInputOnEnter() {
  document.getElementById("searchInput").addEventListener("keypress", function (event) {
    event.key === "Enter" && document.getElementById("submitSearch").click();
  });
}

async function docReady(type, id) {
  switch (type) {
    case 'book': {
      getBook({ "bookId": id });
      break;
    }
    default: {
      getBooklist(DEF_OPTIONS);
    }
  }
  submitInputOnEnter();
}


let CURPAGE = 0;
window.onscroll = function () {
  if ((window.innerHeight + Math.ceil(window.scrollY)) >= document.body.offsetHeight - 200) {
    const e = document.getElementById("pagedown");
    if (e) {
      const page = parseInt(e.getAttribute("value"));
      if (CURPAGE < page) {
        setOptionsPage(page);
        CURPAGE = page;
      }
    }
  }
};