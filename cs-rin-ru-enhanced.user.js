// ==UserScript==
// @name         CS.RIN.RU Enhanced — Steam Bridge
// @namespace    https://cs.rin.ru/
// @version      1.2.0
// @description  Adds a button on Steam store pages to find or start a CS.RIN.RU forum thread for the game, and autofills the new-post Subject and SteamInfo BBCode.
// @author       oragon
// @homepageURL  https://github.com/Oragonn/cs-rin-ru-steam-bridge
// @supportURL   https://github.com/Oragonn/cs-rin-ru-steam-bridge/issues
// @updateURL    https://raw.githubusercontent.com/Oragonn/cs-rin-ru-steam-bridge/main/cs-rin-ru-enhanced.user.js
// @downloadURL  https://raw.githubusercontent.com/Oragonn/cs-rin-ru-steam-bridge/main/cs-rin-ru-enhanced.user.js
// @match        https://store.steampowered.com/app/*
// @match        https://cs.rin.ru/forum/search.php*
// @match        https://cs.rin.ru/forum/posting.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const LOG_PREFIX = '[CS.RIN.RU Enhanced]';
  const STORAGE_KEY = 'pendingSteamGame';
  // cs.rin.ru's own favicon (https://cs.rin.ru/favicon.ico), embedded so the
  // Steam-page button doesn't depend on hotlinking a third-party image.
  const CSRIN_LOGO_DATA_URI = 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAAeHh4EHh4eCB4eHgAeHh4AHh4eAB4eHgAeHh4iHh4ejB4eHiMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHh4efB4eHqYeHh4BHh4eAB4eHgAeHh4AHh4ehB4eHuUeHh4PAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4eHpIeHh7/Hh4emh4eHgAeHh4AHh4eAB4eHrgeHh63AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeHh4PHh4euR4eHv8eHh4zHh4eAB4eHhIeHh7uExMv/wYGQf8FBTr/BQU6/wUFOf8FBTn/BQU6/wUFQP8GBkf/Hh4eAB4eHjQeHh7/Hh4egR4eHgAeHh5+Hh4e/w4OM/8GBiX/Bwca/wgIG/9WVl//FRUk/wcHG/8HByf/BwdB/x4eHgAeHh4IHh4e2x4eHtceHh5hHh4e/x4eHqIKCjr/EBAk/xMTE/89PT3/09PT/0VFRf8TExP/EBAk/woKPf8KCk3/Dg5M/xkZMv8eHh7/Hh4e/x4eHv8bGzn/MDBH/2pqcP/k5OT/srKy/21tbf/v7+//hoaG/yUlN/8QEEP/DAxN/zIyQv8rKzD/Hh4e/x4eHv8qKjL/UFBa/9PT0/+ZmZv/QEBA/zs7O/87Ozv/f39//9jY2P98fIT/FhZJ/xAQTv9FRVD/ODg4/x4eHv8eHh7/Pz8//1BQUP9WVlb/UFBQ/1BQUP9QUFD/UFBQ/1NTU/9wcHD/ODhM/x0dTv8SElH/V1dh/09PT/8eHh7/Hh4e/ysrK/8/Pz//WVlZ/1paWv9gYGD/ZGRk/2RkZP9kZGT/ZGRk/0ZGXP8jI1T/FBRT/2dncf9iYmL/Hh4e/x4eHv8eHh7/Hh4e/yAgIP8xMTP/U1Nf/0xMZP9MTGP/TExj/0xMZP84OF7/GxtU/xYWVP92doD/hoaG/0FBQf8eHh7/IyMj/ycnJ/8gICD/JSUm/y8vO/8vL1L/Nzdg/zQ0Yf8zM2H/JiZb/xcXU/8XF1b/hoaP/5mZmf+Li4v/JSUl/yYmJv96enr/ioqK/2pqff86OmL/Hh4eDBMTWQATE1n/ExNZ/wAAAAAAAAAAERFU/4eHlv+RkZr/jY2Y/1RUWv9LS1H/f3+P/35+j/9fX3//MTFk/xsbYQAbG2EAGxth/xsbYf8AAAAAAAAAAA4OUv8ZGVj/Jydg/ywsYv8xMWX/NTVo/zo6av8+Pm3/LS1k/yUlXv8bG2EAGxthABsbYf8bG2H/AAAAAAAAAAAbG2EAGxthABsbYQAbG2EAGxthABsbYQAbG2EAGxthABsbYQAbG2EAGxthABsbYQAbG2H/Gxth/wAAAAAAAAAAPH8AABx/AAAc/wAACAAAAIgAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMAAAAzAAAAMwAA//MAAA==';

  function warn(msg, err) {
    console.warn(LOG_PREFIX + ' ' + msg, err || '');
  }

  function getPendingGame() {
    try {
      const raw = GM_getValue(STORAGE_KEY, null);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      warn('Failed to read stored game data.', e);
      return null;
    }
  }

  function setPendingGame(data) {
    try {
      GM_setValue(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      warn('Failed to store game data.', e);
    }
  }

  function clearPendingGame() {
    try {
      GM_deleteValue(STORAGE_KEY);
    } catch (e) {
      warn('Failed to clear stored game data.', e);
    }
  }

  // On the first request of a session (roughly once a day), cs.rin.ru serves a
  // one-time JS/cookie "Security check, please wait..." interstitial at the
  // SAME URL before it sets a cookie and redirects to the real page. It's an
  // empty document, so acting on it (e.g. counting search results) misreads
  // "not loaded yet" as "genuinely zero results". Skip entirely and let it
  // redirect; the script re-initializes on the real page that follows.
  function isSecurityCheckInterstitial() {
    return /security check/i.test(document.title);
  }

  const host = location.hostname;
  if (host === 'store.steampowered.com') {
    initSteamPage();
  } else if (host === 'cs.rin.ru' && !isSecurityCheckInterstitial()) {
    if (/\/forum\/search\.php/.test(location.pathname)) {
      initSearchResultsPage();
    } else if (/\/forum\/posting\.php/.test(location.pathname)) {
      initPostingPage();
    }
  }

  // ---------- Steam store page ----------

  function extractAppId() {
    const m = location.pathname.match(/\/app\/(\d+)/);
    return m ? m[1] : null;
  }

  function extractGameName() {
    const el = document.querySelector('.apphub_AppName');
    return el ? el.textContent.trim() : null;
  }

  function initSteamPage() {
    try {
      const appid = extractAppId();
      const gameName = extractGameName();
      if (!appid || !gameName) {
        warn('Could not read AppID/game name from this Steam page; skipping button injection.');
        return;
      }

      // Mirrors Steam's own icon-only button pattern (as used by e.g. the
      // SteamDB/PCGamingWiki browser extensions): same btnv6_blue_hoverfade
      // pill as Community Hub, an "ico16"-sized icon, and Steam's native
      // data-tooltip-text tooltip instead of a visible label.
      const button = document.createElement('a');
      button.className = 'btnv6_blue_hoverfade btn_medium';
      // A real href lets the browser handle middle-click / ctrl-click (new tab)
      // natively; the pending game is stored before any of those navigations.
      button.href = buildAppIdSearchUrl(appid);
      button.style.marginLeft = '4px';
      const tooltipSpan = document.createElement('span');
      tooltipSpan.setAttribute('data-tooltip-text', 'Search CS.RIN.RU for this game');
      const icon = document.createElement('img');
      icon.className = 'ico16';
      icon.src = CSRIN_LOGO_DATA_URI;
      tooltipSpan.appendChild(icon);
      button.appendChild(tooltipSpan);
      const storePending = function () {
        setPendingGame({ appid: appid, gameName: gameName, ts: Date.now() });
      };
      // mousedown covers left and middle click (button 0/1) before the browser
      // navigates; click covers keyboard activation (Enter on the focused link).
      button.addEventListener('mousedown', function (e) {
        if (e.button === 0 || e.button === 1) storePending();
      });
      button.addEventListener('click', storePending);

      // Steam's own Community Hub link, e.g. <a href="https://steamcommunity.com/app/620">
      const hubLink = document.querySelector('a[href*="steamcommunity.com/app/"]');
      if (hubLink && hubLink.parentElement) {
        hubLink.parentElement.insertBefore(button, hubLink.nextSibling);
      } else {
        warn('Community Hub button not found; using fallback insertion point.');
        const fallback = document.querySelector('.apphub_HeaderStandardTop') || document.querySelector('.apphub_AppName') || document.body;
        fallback.appendChild(button);
      }
    } catch (e) {
      warn('Failed to initialize Steam page button.', e);
    }
  }

  function buildSearchUrl(gameName) {
    // Field names/values below were confirmed against cs.rin.ru's own search form.
    // sf is deliberately "titleonly" rather than "all" (subjects+message text): the
    // forum's search silently drops short words (e.g. a lone "2") and has no real
    // relevance ranking, only a post-time sort. Searching full message bodies for a
    // single leftover word previously surfaced totally unrelated, recently-bumped
    // threads that merely mentioned that word in passing. Release threads are named
    // after the game, so restricting to topic titles avoids that class of false match.
    const params = new URLSearchParams({
      keywords: gameName,
      terms: 'all',
      sf: 'titleonly',
      sr: 'topics',
      sk: 't',
      sd: 'd',
      submit: 'Search'
    });
    return 'https://cs.rin.ru/forum/search.php?' + params.toString();
  }

  // Game threads open with the SteamInfo block, whose Steam image URLs
  // (".../steam/apps/<appid>/header.jpg") put the AppID in the first post's
  // search index. This finds threads whose title differs from the Steam name
  // (Steam "Baldur's Gate 3" vs forum "Baldur's Gate III").
  function buildAppIdSearchUrl(appid) {
    const params = new URLSearchParams({
      keywords: String(appid),
      terms: 'all',
      sf: 'firstpost',
      sr: 'topics',
      sk: 't',
      sd: 'd',
      submit: 'Search'
    });
    return 'https://cs.rin.ru/forum/search.php?' + params.toString();
  }

  // ---------- CS.RIN.RU search results page ----------

  // Results come 100 per page; a common word can bury the real thread a few
  // pages deep. Paging a cached search isn't subject to the search flood limit.
  const MAX_RESULT_PAGES = 5;
  // A short AppID like 620 also matches unrelated first posts (file sizes,
  // other numbers), so AppID hits without a matching title are confirmed by
  // opening the topic. Caps how many topics that fetches.
  const MAX_APPID_VERIFY = 5;
  // Anonymous searches are rate-limited to roughly one per 5-10 seconds.
  const FLOOD_RETRY_DELAY_MS = 10000;
  const MAX_FLOOD_RETRIES = 5;

  async function initSearchResultsPage() {
    try {
      const pending = getPendingGame();
      if (!pending) return; // Manual/unrelated visit to search.php; leave the page alone.

      // The forum's search flood limit renders an empty result page; wait and
      // reload instead of reading it as "no results".
      if (isSearchFloodLimited(document)) {
        retryAfterFloodLimit(pending);
        return;
      }

      const results = await collectSearchResults();
      const target = normalizeTitle(pending.gameName);
      // The search matches any topic whose title merely contains the words, so
      // the first result is often unrelated (e.g. the game "CRACK" matched
      // "[Release] WeMod Crack"). Only follow a result whose title is the game.
      const titled = results.find(function (r) {
        return target && normalizeTitle(r.title) === target;
      });

      const keywords = new URLSearchParams(location.search).get('keywords');
      if (keywords === String(pending.appid)) {
        // Step 1 of 2: first posts mentioning the AppID.
        const href = titled ? titled.href : await findTopicMentioningAppId(results, pending.appid);
        if (href) {
          clearPendingGame();
          location.href = href;
        } else {
          // Step 2: older threads may lack the SteamInfo block; search titles.
          location.href = buildSearchUrl(pending.gameName);
        }
        return;
      }

      if (titled) {
        clearPendingGame();
        location.href = titled.href;
        return;
      }

      const proceed = window.confirm(
        (results.length > 0
          ? 'None of the search results is a thread for "' + pending.gameName + '".'
          : 'No thread found for "' + pending.gameName + '".') +
        ' Create a new request post?'
      );
      if (proceed) {
        location.href = 'https://cs.rin.ru/forum/posting.php?mode=post&f=10';
      } else {
        clearPendingGame();
      }
    } catch (e) {
      warn('Failed to process search results page.', e);
    }
  }

  function isSearchFloodLimited(doc) {
    return /cannot use search at this time/i.test(doc.body ? doc.body.textContent : '');
  }

  function retryAfterFloodLimit(pending) {
    const retries = (pending.floodRetries || 0) + 1;
    if (retries > MAX_FLOOD_RETRIES) {
      warn('Search is still flood-limited; giving up. Reload the page to try again.');
      return;
    }
    pending.floodRetries = retries;
    setPendingGame(pending);

    const notice = document.createElement('div');
    notice.textContent = 'CS.RIN.RU Enhanced: search cooldown, retrying in ' +
      (FLOOD_RETRY_DELAY_MS / 1000) + 's (' + retries + '/' + MAX_FLOOD_RETRIES + ')...';
    notice.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;padding:6px 10px;' +
      'background:#333;color:#fff;border:1px solid #888;font:12px sans-serif;';
    document.body.appendChild(notice);
    setTimeout(function () { location.reload(); }, FLOOD_RETRY_DELAY_MS);
  }

  // Confirms that a topic's first post links this AppID (SteamInfo image URLs
  // ".../steam/apps/<appid>/..." or store/SteamDB ".../app/<appid>").
  async function findTopicMentioningAppId(results, appid) {
    const idPattern = new RegExp('/apps?/' + appid + '(?![0-9])');
    for (const r of results.slice(0, MAX_APPID_VERIFY)) {
      try {
        const res = await fetch(r.href, { credentials: 'same-origin' });
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const firstPost = doc.querySelector('.postbody');
        if (firstPost && idPattern.test(firstPost.innerHTML)) return r.href;
      } catch (e) {
        warn('Failed to fetch a topic to check its AppID.', e);
      }
    }
    return null;
  }

  // Collects { title, href } for up to MAX_RESULT_PAGES of results. Titles are
  // matched exactly (see normalizeTitle); looser "<name> - <suffix>" matching
  // was tried and rejected: for "CRACK" it picked
  // "[Request] Crack - Cactus League Basketball".
  async function collectSearchResults() {
    const results = [];
    let doc = document;
    let pageUrl = location.href;

    for (let page = 0; page < MAX_RESULT_PAGES; page++) {
      // Search results (in "topics" mode) render as a.topictitle rows inside #wrapcentre.
      const container = doc.querySelector('#wrapcentre') || doc;
      for (const link of container.querySelectorAll('a.topictitle')) {
        results.push({
          title: link.textContent,
          href: new URL(link.getAttribute('href'), pageUrl).toString()
        });
      }

      const next = Array.from(doc.querySelectorAll('a')).find(function (a) {
        return a.textContent.trim() === 'Next';
      });
      if (!next || page === MAX_RESULT_PAGES - 1) break;
      pageUrl = new URL(next.getAttribute('href'), pageUrl).toString();
      try {
        const res = await fetch(pageUrl, { credentials: 'same-origin' });
        doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      } catch (e) {
        warn('Failed to fetch the next page of search results.', e);
        break;
      }
      if (isSearchFloodLimited(doc)) break;
    }

    return results;
  }

  // Thread titles look like "[Info] Elden Ring" or
  // "[Info] Need for Speed (2015) (Online Only-NO Crack)": drop the leading
  // [Tag] prefixes and trailing (...) / [...] annotations.
  function stripTitleTags(title) {
    let t = title.trim();
    let prev;
    do {
      prev = t;
      t = t.replace(/^\[[^\]]*\]\s*/, '').replace(/\s*(\([^()]*\)|\[[^\[\]]*\])$/, '').trim();
    } while (t !== prev);
    return t;
  }

  // Lowercased, accents/trademark symbols removed, "&" read as "and".
  function looseTitle(title) {
    return title
      .replace(/[\u2122\u00ae\u00a9]/g, '') // before NFKD, which turns the TM sign into "TM"
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Letters and digits only, so "Tom Clancy’s The Division® 2" (Steam) equals
  // "Tom Clancy's The Division 2" (forum).
  function normalizeTitle(title) {
    return looseTitle(stripTitleTags(title)).replace(/[^\p{L}\p{N}]+/gu, '');
  }

  // ---------- CS.RIN.RU posting page ----------

  function initPostingPage() {
    try {
      const pending = getPendingGame();
      if (!pending) return; // No stored game data; don't touch unrelated/manual posts.

      const subjectField = document.querySelector('#subject, input[name="subject"]');
      if (!subjectField) {
        warn('Subject field not found on posting page; skipping autofill button.');
        return;
      }

      const btn = document.createElement('input');
      btn.type = 'button';
      btn.value = 'Autofill from Steam';
      btn.title = 'Fill Subject and generate SteamInfo BBCode using the game captured from Steam';
      btn.style.marginLeft = '6px';
      btn.addEventListener('click', function () {
        autofillFromSteam(pending);
        clearPendingGame();
      });

      subjectField.insertAdjacentElement('afterend', btn);
    } catch (e) {
      warn('Failed to initialize posting page autofill button.', e);
    }
  }

  function autofillFromSteam(pending) {
    const subjectField = document.querySelector('#subject, input[name="subject"]');
    if (subjectField) {
      subjectField.value = pending.gameName;
    } else {
      warn('Subject field disappeared before autofill.');
    }

    generateSteamInfoBBCode(pending.appid);
  }

  const STEAM_INFO_DEFAULT_COLOR = '#FF0000'; // cs.rin.ru's own suggested default

  // Overriding window.prompt (even via unsafeWindow) from the userscript did not
  // intercept the page's own prompt() call in practice — Tampermonkey's isolated
  // world and the page's real JS realm aren't guaranteed to share that binding.
  // The reliable fix is to inject a real <script> element: code inside it runs
  // natively in the page's own realm, so it sees the real SteamInfoBBCode,
  // insert_text and window.prompt exactly as the page's own code does.
  function generateSteamInfoBBCode(appid) {
    const payload = JSON.stringify({
      appId: Number(appid),
      appIdString: String(appid),
      color: STEAM_INFO_DEFAULT_COLOR
    });

    const script = document.createElement('script');
    script.textContent =
      '(function (data) {\n' +
      '  try {\n' +
      '    if (typeof SteamInfoBBCode !== "undefined" && typeof insert_text === "function") {\n' +
      '      SteamInfoBBCode.generate({\n' +
      '        appID: data.appId,\n' +
      '        color: data.color,\n' +
      '        outputCallback: insert_text,\n' +
      '        processingCallback: SteamInfoBBCode.process\n' +
      '      });\n' +
      '      return;\n' +
      '    }\n' +
      '  } catch (e) {\n' +
      '    console.warn("[CS.RIN.RU Enhanced] Direct SteamInfoBBCode.generate() call failed; falling back to native button click.", e);\n' +
      '  }\n' +
      '  try {\n' +
      '    var btn = document.querySelector(\'input[name="addsteaminfo"]\');\n' +
      '    if (!btn) { console.warn("[CS.RIN.RU Enhanced] Could not find the Generate SteamInfo BBCode control on this page."); return; }\n' +
      '    var orig = window.prompt;\n' +
      '    window.prompt = function () {\n' +
      '      window.prompt = orig;\n' +
      '      return data.appIdString;\n' +
      '    };\n' +
      '    try { btn.click(); } finally { window.prompt = orig; }\n' +
      '  } catch (e) {\n' +
      '    console.warn("[CS.RIN.RU Enhanced] Fallback click on the native SteamInfo control failed.", e);\n' +
      '  }\n' +
      '})(' + payload + ');';

    try {
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      warn('Failed to inject SteamInfo generation script.', e);
    } finally {
      script.remove();
    }
  }
})();
