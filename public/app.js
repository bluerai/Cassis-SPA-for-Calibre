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
  'screenwidth': '0'
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
  if (options.type !== 'search') document.getElementById('authorsort').classList.add("disabled");
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
  const response = await fetch("/cassis/list/", {
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
  const response = await fetch("/cassis/list/", {
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
  const response = await fetch("/cassis/book/", {
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
  //alert(("setOptionsTag: newOptions=" + JSON.stringify(newOptions));
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
  setTimeout(() => {
    document.getElementById('dropdown-content').style.display = 'none';
    document.body.scrollIntoView();
  }, 200);
}

function showDropdownMenu() {
  document.getElementById('dropdown-content').style.display = 'block';
}

async function connectDb(connect) {
  const url = (!connect) ? "/cassis/unconnectdb" : "/cassis/connectdb";
  const response = await fetch(url);
  const data = await response.json();
  alert(data.msg);
}

async function setLogLevel() {
  const loglevel = document.getElementById('loglevel').value;
  confirm("Bitte bestätigen:\nDas Log-Level wird auf den Wert " + loglevel +
    "  gesetzt.\n\nBeim nächsten Neustart wird das Log-Level auf den Standardwert zurückgesetzt.");
  const response = await fetch("/cassis/log/" + loglevel);

  const data = await response.json();
  document.getElementById('loglevel-value').innerHTML = data.LOGLEVEL;
}

function sendMail(authors, title, bookId, tagName) {
  location.href = 'mailto:?' +
    'subject=' + encodeURIComponent('"' + title + ((tagName === 'Zeitschrift') ? '"' : '" von ' + authors)) +
    '&body=' + encodeURIComponent('... mit besten Empfehlungen aus der Cassis-Bibliothek:\n\n'
      + '"' + title + ((tagName === 'Zeitschrift') ? '"' : '" von ' + authors) + '\n\n'
      + 'http://' + location.host + '/cassis/book/' + bookId + '\n\n'
      + 'http://' + location.host + '/cassis/cover/book/' + bookId);
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