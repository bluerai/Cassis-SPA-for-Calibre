'use strict'

let TOKEN = localStorage.getItem('token');

//validate
async function validate() {
  try {
    const response = await fetch("/verify", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    const data = await response.json();
    switch (response.status) {
      case 200: {
        console.log("verifyUser: Valid token - user=" + data.user.username + ", expires at: " + (new Date(data.user.exp * 1000).toLocaleString()));
        displayMessage(': Login "' + data.user.username + '" gültig bis ' + (new Date(data.user.exp * 1000).toLocaleDateString()), 5);
        break;
      }
      case 401: {
        console.log(data.error);
        document.getElementById('books').innerHTML = "";
        document.querySelectorAll('button.menu').forEach(el => el.style.display = 'none');
        document.getElementById('searchInput').style.display = 'none';
        document.getElementById('login').innerHTML = data.html;
        break;
      }
      default: {
        responseFail_Handler("verifyUser", response);
      }
    }
  } catch (error) { console.error('Error:', error); }
}

async function login() {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        TOKEN = result.token;
        localStorage.setItem('token', result.token);
        document.getElementById('login').innerHTML = "";
        document.querySelectorAll('.menu').forEach(el => el.style.display = 'block');
        document.getElementById('searchInput').style.display = 'block';

        getBooklist(DEF_OPTIONS);
      } else {
        responseFail_Handler("login", response, 'Credentials not valid. Try again!')
      }
    } catch (error) {
      error_Handler("login", error)
    }
  }
}

let displayMessageTimeoutHandler;

function displayMessage(msg, sec) {
  document.getElementById('message').innerHTML = "<p>" + msg + "</p";
  if (displayMessageTimeoutHandler) displayMessageTimeoutHandler.clear;
  if (sec)
    displayMessageTimeoutHandler = setTimeout(() => { document.getElementById('message').innerHTML = "" }, sec * 1000);
}

function responseFail_Handler(functionName, response, msg) {
  msg = msg || (functionName + ": " + response.statusText + " (#" + response.status + ")");
  console.log(msg);
  displayMessage(msg, 8);
}

function error_Handler(functionName, error, msg) {
  msg = msg || (functionName + ": " + 'Error fetching data: ' + error);
  console.error(msg);
  displayMessage(msg, 8);
}

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
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(options)
  });
  if (response.status === 200) {
    const data = await response.json();
    document.getElementById("books").innerHTML = data.html;
    document.body.scrollIntoView();
    restoreOptions();
  } else {
    responseFail_Handler("getCategory", response);
  }
}

async function appendToBooklist(options) {
  const response = await fetch("/app/list/", {
    method: "POST",
    headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(options)
  });
  const data = await response.json();
  document.getElementById("pagedown").remove();
  document.getElementById("books").insertAdjacentHTML("beforeend", data.html);
  CURPAGE = 0;
}

async function getBook(options) {
  if (options.oldNum) {
    document.getElementById("app").classList.add((options.oldNum > options.num) ? "swipe-right-transition" : "swipe-left-transition");
  }
  const response = await fetch("/app/book/" + options.bookId + `?expires=${options.expires}&signature=${options.signature}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(options)
  })
  const data = await response.json();
  document.getElementById('login').innerHTML = "";
  document.getElementById("books").innerHTML = data.html;
  document.getElementById('searchInput').value = "";
  document.body.scrollIntoView();
  restoreOptions();

  if (options.oldNum) {
    document.getElementById("app").classList.remove((options.oldNum > options.num) ? "swipe-right-transition" : "swipe-left-transition");

    document.getElementById("app").classList.add((options.oldNum < options.num) ? "trans-right" : "trans-left");
    setTimeout(() => {
      document.getElementById("app").classList.add("swipe-null-transition");
    }, 0);
  }
  setTimeout(() => {
    document.getElementById("footer").style.display = "block";
    if (options.oldNum) {
      document.getElementById("app").classList.remove((options.oldNum < options.num) ? "trans-right" : "trans-left");
      document.getElementById("app").classList.remove("swipe-null-transition");
    }

  }, 500)
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
  options.target = 'books';
  options.bookId = newOptions.bookId;
  options.oldNum = options.num;
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
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
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
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  alert(data.msg);
}

async function setLogLevel() {
  let loglevel = document.getElementById('loglevel').value;
  const response = await fetch("/app/log/level/" + loglevel, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  document.getElementById('loglevel-value').innerHTML = data.level;
  document.getElementById('loglevel').value = "0";
}

async function setLogConTransport() {
  let checked = document.getElementById('logToConsole').checked;
  const response = await fetch("/app/log/con/" + (checked ? "1" : "0"), { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  //alert(JSON.stringify(data));
  document.getElementById('logToConsole').checked = data.consoleOn;
}

async function setLogFilTransport() {
  let checked = document.getElementById('logToFile').checked;
  const response = await fetch("/app/log/fil/" + (checked ? "1" : "0"), { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  //alert(JSON.stringify(data));
  document.getElementById('logToFile').checked = data.fileOn;
}

async function showTagsStats() {
  //alert("showTagsStats");
  const response = await fetch("/app/tags/count", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function showAuthorsStats() {
  //alert("showAuthorsStats");
  const response = await fetch("/app/authors/count", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function showSeriesStats() {
  //alert("showSeriesStats");
  const response = await fetch("/app/series/count", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function showPublisherStats() {
  //alert("showPublisherStats");
  const response = await fetch("/app/publishers/count", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  const data = await response.json();
  document.getElementById('info_popup').outerHTML = data.html;
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('info_popup').style.display = 'block';
}

async function sendMail(authors, title, bookId, tagName) {
  const protocol = window.location.origin;
  const data = { authors, title, bookId, tagName, protocol };

  const response = await fetch("/app/booklink/", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(data)
  })
  const result = await response.json();
  location.href = result.content;
}

function submitInputOnEnter() {
  document.getElementById("searchInput").addEventListener("keypress", function (event) {
    event.key === "Enter" && document.getElementById("submitSearch").click();
  });
}

function pageRefresh() {
  localStorage.removeItem('token');
  location.href = `${location.protocol}//${location.hostname}:${location.port}`
}

//===== swipe ==============================================================

let startX = 0;
let endX = 0;
let diff;

function handleSwipe() {
  diff = endX - startX;
  if (Math.abs(diff) > 50) { // Mindest-Swipe-Distanz
    let clickfunc;
    if (diff > 0) {
      clickfunc = document.getElementById("prev_book");
    } else {
      clickfunc = document.getElementById("next_book");
    }
    if (clickfunc) {
      clickfunc.click();
    } else {
      displayMessage("keine weiteren Daten", 5);
    }
  }
}

function initSwipe() {
  let isMouseDown = false;

  const swipeArea = document.getElementById("app");

  // TOUCH-EVENTS (für mobile Geräte)
  swipeArea.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  swipeArea.addEventListener("touchend", (e) => {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
  });

  // MAUS-EVENTS (klassische Maus)
  swipeArea.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    isMouseDown = true;
  });

  swipeArea.addEventListener("mouseup", (e) => {
    if (!isMouseDown) return;
    endX = e.clientX;
    isMouseDown = false;
    handleSwipe();
  });

  swipeArea.addEventListener("mouseleave", () => {
    isMouseDown = false; // Falls die Maus das Element verlässt
  });

  // MAGIC MOUSE Wischgesten (wheel-Event)
  let wheelrunning = false;

  swipeArea.addEventListener("wheel", (e) => {
    if (wheelrunning) return;
    let clickfunc;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { // Prüfen, ob es eine horizontale Bewegung ist
      if (e.deltaX < 0) {
        //displayMessage("Nach rechts geswiped (Magic Mouse)!");
        clickfunc = document.getElementById("prev_book");
        wheelrunning = true;
      } else {
        //displayMessage("Nach links geswiped (Magic Mouse)!");
        clickfunc = document.getElementById("next_book");
        wheelrunning = true;
      }
      if (clickfunc) {
        clickfunc.click();
      } else {
        displayMessage("keine weiteren Daten", 5);
      }
    }
    setTimeout(() => (wheelrunning = false), 1450)
  });

}

//===================================================================

async function docReady(type, id, signature, expires) {
  switch (type) {
    case 'book': {
      getBook({ "bookId": id, "signature": signature || "", "expires": expires || "" });
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

validate();
