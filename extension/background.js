// Cross-Browser Service Worker / Background Script for Phishing URL Detection
const extAPI = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : (typeof browser !== 'undefined' ? browser : self);
const actionAPI = extAPI.action || extAPI.browserAction;
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// In-memory tab results cache (populated instantly on navigation)
const tabAnalysisCache = new Map();

// Track opened warning windows to avoid duplicate popups per URL session
const openedPhishingWindows = new Set();

// Default extension settings
const DEFAULT_SETTINGS = {
  threshold: 0.50,
  enableBanner: true,
  whitelist: ["google.com", "github.com", "microsoft.com", "wikipedia.org", "apple.com", "amazon.com"]
};

// Ensure settings & offscreen document are pre-warmed immediately on background startup
extAPI.runtime.onInstalled?.addListener(async () => {
  try {
    const existing = await extAPI.storage.local.get(['settings', 'blockedDomains']);
    if (!existing.settings) {
      await extAPI.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
    if (!existing.blockedDomains) {
      await extAPI.storage.local.set({ blockedDomains: [] });
    }
  } catch (e) {
    console.error("Storage init error:", e);
  }
  ensureOffscreenDocument();
});

// Pre-warm offscreen document on service worker start if supported
ensureOffscreenDocument();

async function ensureOffscreenDocument() {
  try {
    if (!extAPI.offscreen || typeof extAPI.offscreen.hasDocument !== 'function') {
      return; // Not supported on current browser (e.g., Firefox / Safari)
    }
    if (await extAPI.offscreen.hasDocument()) return;
    await extAPI.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['WORKERS', 'DOM_PARSER'],
      justification: 'Run AI Security Model ONNX inference'
    });
  } catch (err) {
    // Ignore duplicate document errors
  }
}

function shouldSkipUrl(url) {
  if (!url) return true;
  const skipProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:', 'devtools:', 'view-source:'];
  return skipProtocols.some(proto => url.startsWith(proto));
}

function isDomainWhitelisted(url, whitelist) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return whitelist.some(domain => {
      const d = domain.trim().toLowerCase();
      return d && (hostname === d || hostname.endsWith('.' + d));
    });
  } catch (e) {
    return false;
  }
}

function isDomainBlocked(url, blockedList) {
  if (!url || !blockedList || blockedList.length === 0) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blockedList.some(domain => {
      const d = domain.trim().toLowerCase();
      return d && (hostname === d || hostname.endsWith('.' + d));
    });
  } catch (e) {
    return false;
  }
}

// Synchronous fast heuristic score (< 0.01ms) for instant responsiveness
function fastHeuristicCheck(url) {
  let riskScore = 0.05;
  const reasons = [];

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();

    // Check IP host
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      riskScore += 0.45;
      reasons.push("Uses raw IP address host");
    }

    // Check suspicious TLDs
    const suspiciousTlds = ['.xyz', '.top', '.work', '.click', '.buzz', '.loan', '.gq', '.cf', '.tk', '.ga', '.ml', '.rest', '.fit', '.icu', '.cam'];
    for (const tld of suspiciousTlds) {
      if (hostname.endsWith(tld)) {
        riskScore += 0.30;
        reasons.push(`Suspicious top-level domain (${tld})`);
        break;
      }
    }

    // Check subdomains count
    const parts = hostname.split('.').filter(p => p.length > 0);
    if (parts.length >= 4) {
      riskScore += 0.20;
      reasons.push(`Unusual subdomains count (${parts.length})`);
    }

    // Keywords check
    const keywords = ['login', 'signin', 'verify', 'account', 'banking', 'secure', 'update', 'credential', 'paypal', 'appleid', 'microsoft', 'netflix', 'wallet', 'security', 'checkpoint'];
    let kwCount = 0;
    for (const kw of keywords) {
      if (pathAndQuery.includes(kw) || hostname.includes(kw)) kwCount++;
    }
    if (kwCount >= 2) {
      riskScore += 0.30;
      reasons.push(`Multiple sensitive security keywords (${kwCount})`);
    } else if (kwCount === 1) {
      riskScore += 0.12;
      reasons.push("Contains sensitive authentication keywords");
    }

    if (url.length > 75) {
      riskScore += 0.15;
      reasons.push(`Abnormally long URL length (${url.length} chars)`);
    }

    if (urlObj.protocol === 'http:') {
      riskScore += 0.15;
      reasons.push("Insecure connection (HTTP)");
    }
  } catch (e) {}

  const finalScore = Math.min(0.99, Math.max(0.01, riskScore));
  return {
    url,
    phishingScore: finalScore,
    safeScore: 1 - finalScore,
    isPhishing: finalScore >= 0.50,
    reasons,
    source: 'FAST_HEURISTIC'
  };
}

// Automatically open alert window on phishing site detection
function autoOpenPhishingWindow(tabId, data) {
  if (!data || !data.isPhishing) return;
  const key = `${tabId}_${data.url}`;
  if (openedPhishingWindows.has(key)) return;
  openedPhishingWindows.add(key);

  console.log("[Background] Auto-opening phishing alert window for tab:", tabId, data.url);

  // Attempt action.openPopup if available, fallback to windows.create
  if (actionAPI && typeof actionAPI.openPopup === 'function') {
    actionAPI.openPopup().catch(() => {
      openStandaloneWindow();
    });
  } else {
    openStandaloneWindow();
  }

  function openStandaloneWindow() {
    try {
      if (extAPI.windows && typeof extAPI.windows.create === 'function') {
        extAPI.windows.create({
          url: extAPI.runtime.getURL(`popup/popup.html?tabId=${tabId}&auto=true`),
          type: 'popup',
          width: 500,
          height: 620,
          focused: true
        });
      }
    } catch (e) {
      console.error("[Background] Error opening popup window:", e);
    }
  }
}

// Analyze tab URL (instant fast result + async ONNX refinement where supported)
async function analyzeTabUrl(tabId, url) {
  if (shouldSkipUrl(url)) {
    updateBadge(tabId, 'SKIP', '#6B7280', 'icons/icon48.png');
    const result = { url, isSkipped: true, isPhishing: false, phishingScore: 0, status: 'SYSTEM' };
    tabAnalysisCache.set(tabId, result);
    return result;
  }

  const { settings, blockedDomains = [] } = await extAPI.storage.local.get(['settings', 'blockedDomains']);
  const currentSettings = settings || DEFAULT_SETTINGS;

  // Check if domain is blocked by user
  if (isDomainBlocked(url, blockedDomains)) {
    updateBadge(tabId, 'BLOCK', '#EF4444', 'icons/icon_danger48.png');
    const result = {
      url,
      isBlocked: true,
      isPhishing: true,
      phishingScore: 0.99,
      status: 'BLOCKED',
      reasons: ['Website blocked by user after phishing warning']
    };
    tabAnalysisCache.set(tabId, result);

    const blockedPageUrl = extAPI.runtime.getURL(
      `blocked.html?url=${encodeURIComponent(url)}&domain=${encodeURIComponent(new URL(url).hostname)}&score=0.99`
    );
    extAPI.tabs.update(tabId, { url: blockedPageUrl }).catch(() => {});
    return result;
  }

  if (isDomainWhitelisted(url, currentSettings.whitelist || [])) {
    updateBadge(tabId, 'TRUST', '#3B82F6', 'icons/icon_safe48.png');
    const result = { url, isWhitelisted: true, isPhishing: false, phishingScore: 0, status: 'WHITELISTED' };
    tabAnalysisCache.set(tabId, result);
    return result;
  }

  // 1. INSTANT RESULT: Populate cache immediately with fast heuristic check (< 0.01ms)
  const instantResult = fastHeuristicCheck(url);
  instantResult.isPhishing = instantResult.phishingScore >= currentSettings.threshold;
  tabAnalysisCache.set(tabId, instantResult);

  if (instantResult.isPhishing) {
    updateBadge(tabId, 'ALERT', '#EF4444', 'icons/icon_danger48.png');
    autoOpenPhishingWindow(tabId, instantResult);
  } else {
    updateBadge(tabId, 'SAFE', '#10B981', 'icons/icon_safe48.png');
  }

  if (currentSettings.enableBanner) {
    notifyContentScript(tabId, instantResult);
  }

  // 2. ASYNC ONNX REFINEMENT: Refine score if offscreen document is supported
  if (extAPI.offscreen) {
    ensureOffscreenDocument().then(() => {
      extAPI.runtime.sendMessage({
        action: 'ANALYZE_URL',
        url: url,
        threshold: currentSettings.threshold
      }, (response) => {
        if (!extAPI.runtime.lastError && response) {
          tabAnalysisCache.set(tabId, response);
          if (response.isPhishing) {
            updateBadge(tabId, 'ALERT', '#EF4444', 'icons/icon_danger48.png');
            autoOpenPhishingWindow(tabId, response);
          } else {
            updateBadge(tabId, 'SAFE', '#10B981', 'icons/icon_safe48.png');
          }
          if (currentSettings.enableBanner) {
            notifyContentScript(tabId, response);
          }
        }
      });
    }).catch(() => {});
  }

  return instantResult;
}

function updateBadge(tabId, text, color, iconPath) {
  try {
    if (actionAPI && typeof actionAPI.setBadgeText === 'function') {
      actionAPI.setBadgeText({ tabId, text });
      actionAPI.setBadgeBackgroundColor({ tabId, color });
      if (iconPath && typeof actionAPI.setIcon === 'function') {
        actionAPI.setIcon({ tabId, path: iconPath });
      }
    }
  } catch (e) {}
}

function notifyContentScript(tabId, data) {
  const sendWithRetry = (retriesLeft) => {
    extAPI.tabs.sendMessage(tabId, { action: 'SHOW_PHISHING_WARNING', data })
      .then(() => {})
      .catch(() => {
        if (retriesLeft > 0) {
          setTimeout(() => sendWithRetry(retriesLeft - 1), 300);
        } else if (extAPI.scripting && typeof extAPI.scripting.executeScript === 'function') {
          extAPI.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          }).catch(() => {});
        }
      });
  };

  sendWithRetry(5);
}

// Navigation event listeners
extAPI.webNavigation?.onCommitted.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    analyzeTabUrl(details.tabId, details.url);
  }
});

extAPI.tabs?.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.status === 'loading' || changeInfo.status === 'complete') && tab.url) {
    analyzeTabUrl(tabId, tab.url);
  }
});

extAPI.tabs?.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await extAPI.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      if (!tabAnalysisCache.has(activeInfo.tabId)) {
        analyzeTabUrl(activeInfo.tabId, tab.url);
      }
    }
  } catch (e) {}
});

extAPI.tabs?.onRemoved.addListener((tabId) => {
  tabAnalysisCache.delete(tabId);
});

// Runtime message listener for Popup UI and Content Script
extAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_TAB_ANALYSIS') {
    if (message.tabId) {
      const cachedByTab = tabAnalysisCache.get(parseInt(message.tabId));
      if (cachedByTab) {
        sendResponse(cachedByTab);
        return true;
      }
    }

    extAPI.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ error: 'No active tab found' });
        return;
      }
      const activeTab = tabs[0];
      let cached = tabAnalysisCache.get(activeTab.id);

      if (!cached || cached.url !== activeTab.url) {
        cached = await analyzeTabUrl(activeTab.id, activeTab.url);
      }

      sendResponse(cached);
    });
    return true;
  }

  if (message.action === 'BLOCK_DOMAIN') {
    (async () => {
      try {
        let domainToBlock = message.domain;
        if (!domainToBlock && message.url) {
          domainToBlock = new URL(message.url).hostname;
        }
        if (domainToBlock) domainToBlock = domainToBlock.toLowerCase();

        if (!domainToBlock) {
          sendResponse({ success: false, error: 'No domain provided' });
          return;
        }

        const { blockedDomains = [] } = await extAPI.storage.local.get(['blockedDomains']);
        if (!blockedDomains.includes(domainToBlock)) {
          blockedDomains.push(domainToBlock);
          await extAPI.storage.local.set({ blockedDomains });
        }

        const redirectUrl = extAPI.runtime.getURL(
          `blocked.html?url=${encodeURIComponent(message.url || '')}&domain=${encodeURIComponent(domainToBlock)}&score=${encodeURIComponent(message.score || '0.90')}&reasons=${encodeURIComponent(JSON.stringify(message.reasons || []))}`
        );

        const targetTabId = message.tabId || (sender && sender.tab ? sender.tab.id : null);
        if (targetTabId) {
          updateBadge(targetTabId, 'BLOCK', '#EF4444', 'icons/icon_danger48.png');
          extAPI.tabs.update(targetTabId, { url: redirectUrl }).catch(() => {});
        } else {
          extAPI.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs && tabs[0]) {
              updateBadge(tabs[0].id, 'BLOCK', '#EF4444', 'icons/icon_danger48.png');
              extAPI.tabs.update(tabs[0].id, { url: redirectUrl }).catch(() => {});
            }
          });
        }

        sendResponse({ success: true, blockedDomains });
      } catch (err) {
        console.error("Error blocking domain:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'UNBLOCK_DOMAIN') {
    (async () => {
      try {
        let domainToUnblock = message.domain;
        if (!domainToUnblock && message.url) {
          domainToUnblock = new URL(message.url).hostname;
        }
        if (domainToUnblock) domainToUnblock = domainToUnblock.toLowerCase();

        const { blockedDomains = [] } = await extAPI.storage.local.get(['blockedDomains']);
        const updated = blockedDomains.filter(d => d.toLowerCase() !== domainToUnblock);
        await extAPI.storage.local.set({ blockedDomains: updated });

        sendResponse({ success: true, blockedDomains: updated });
      } catch (err) {
        console.error("Error unblocking domain:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'GET_BLOCKED_DOMAINS') {
    extAPI.storage.local.get(['blockedDomains']).then(({ blockedDomains = [] }) => {
      sendResponse({ blockedDomains });
    });
    return true;
  }

  if (message.action === 'SCAN_CUSTOM_URL') {
    (async () => {
      const { settings } = await extAPI.storage.local.get(['settings']);
      const currentSettings = settings || DEFAULT_SETTINGS;
      const fastRes = fastHeuristicCheck(message.url);
      fastRes.isPhishing = fastRes.phishingScore >= currentSettings.threshold;

      if (extAPI.offscreen) {
        await ensureOffscreenDocument();
        extAPI.runtime.sendMessage({
          action: 'ANALYZE_URL',
          url: message.url,
          threshold: currentSettings.threshold
        }, (response) => {
          sendResponse(response || fastRes);
        });
      } else {
        sendResponse(fastRes);
      }
    })();
    return true;
  }

  if (message.action === 'RE_ANALYZE_TAB') {
    extAPI.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        const fresh = await analyzeTabUrl(activeTab.id, activeTab.url);
        sendResponse(fresh);
      }
    });
    return true;
  }
});
