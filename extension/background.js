// Service Worker for Phishing URL Detection Chrome Extension
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
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['settings', 'blockedDomains']);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!existing.blockedDomains) {
    await chrome.storage.local.set({ blockedDomains: [] });
  }
  ensureOffscreenDocument();
});

// Pre-warm offscreen document on service worker start
ensureOffscreenDocument();

async function ensureOffscreenDocument() {
  try {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
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
  const skipProtocols = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'devtools:', 'view-source:'];
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

// Automatically open window on phishing site detection
function autoOpenPhishingWindow(tabId, data) {
  if (!data || !data.isPhishing) return;
  const key = `${tabId}_${data.url}`;
  if (openedPhishingWindows.has(key)) return;
  openedPhishingWindows.add(key);

  console.log("[Background] Auto-opening phishing alert window for tab:", tabId, data.url);

  // Attempt chrome.action.openPopup first
  if (chrome.action && typeof chrome.action.openPopup === 'function') {
    chrome.action.openPopup().catch(() => {
      openStandaloneWindow();
    });
  } else {
    openStandaloneWindow();
  }

  function openStandaloneWindow() {
    try {
      chrome.windows.create({
        url: chrome.runtime.getURL(`popup/popup.html?tabId=${tabId}&auto=true`),
        type: 'popup',
        width: 500,
        height: 620,
        focused: true
      });
    } catch (e) {
      console.error("[Background] Error opening standalone popup window:", e);
    }
  }
}

// Analyze tab URL (instant fast result + async ONNX refinement)
async function analyzeTabUrl(tabId, url) {
  if (shouldSkipUrl(url)) {
    updateBadge(tabId, 'SKIP', '#6B7280', 'icons/icon48.png');
    const result = { url, isSkipped: true, isPhishing: false, phishingScore: 0, status: 'SYSTEM' };
    tabAnalysisCache.set(tabId, result);
    return result;
  }

  const { settings, blockedDomains = [] } = await chrome.storage.local.get(['settings', 'blockedDomains']);
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

    const blockedPageUrl = chrome.runtime.getURL(
      `blocked.html?url=${encodeURIComponent(url)}&domain=${encodeURIComponent(new URL(url).hostname)}&score=0.99`
    );
    chrome.tabs.update(tabId, { url: blockedPageUrl }).catch(() => {});
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

  // 2. ASYNC ONNX REFINEMENT: Refine score in offscreen model without blocking UI
  ensureOffscreenDocument().then(() => {
    chrome.runtime.sendMessage({
      action: 'ANALYZE_URL',
      url: url,
      threshold: currentSettings.threshold
    }, (response) => {
      if (!chrome.runtime.lastError && response) {
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

  return instantResult;
}

function updateBadge(tabId, text, color, iconPath) {
  try {
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color });
    if (iconPath) {
      chrome.action.setIcon({ tabId, path: iconPath });
    }
  } catch (e) {}
}

function notifyContentScript(tabId, data) {
  const sendWithRetry = (retriesLeft) => {
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_PHISHING_WARNING', data })
      .then(() => {})
      .catch(() => {
        if (retriesLeft > 0) {
          setTimeout(() => sendWithRetry(retriesLeft - 1), 300);
        } else {
          chrome.scripting?.executeScript({
            target: { tabId },
            files: ['content.js']
          }).catch(() => {});
        }
      });
  };

  sendWithRetry(6);
}

// Listen to early navigation events
chrome.webNavigation?.onCommitted.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    analyzeTabUrl(details.tabId, details.url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.status === 'loading' || changeInfo.status === 'complete') && tab.url) {
    analyzeTabUrl(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
  if (tab && tab.url) {
    if (!tabAnalysisCache.has(activeInfo.tabId)) {
      analyzeTabUrl(activeInfo.tabId, tab.url);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabAnalysisCache.delete(tabId);
});

// Communication endpoint for Popup UI and Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_TAB_ANALYSIS') {
    if (message.tabId) {
      const cachedByTab = tabAnalysisCache.get(parseInt(message.tabId));
      if (cachedByTab) {
        sendResponse(cachedByTab);
        return true;
      }
    }

    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
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

        const { blockedDomains = [] } = await chrome.storage.local.get(['blockedDomains']);
        if (!blockedDomains.includes(domainToBlock)) {
          blockedDomains.push(domainToBlock);
          await chrome.storage.local.set({ blockedDomains });
        }

        const redirectUrl = chrome.runtime.getURL(
          `blocked.html?url=${encodeURIComponent(message.url || '')}&domain=${encodeURIComponent(domainToBlock)}&score=${encodeURIComponent(message.score || '0.90')}&reasons=${encodeURIComponent(JSON.stringify(message.reasons || []))}`
        );

        const targetTabId = message.tabId || (sender && sender.tab ? sender.tab.id : null);
        if (targetTabId) {
          updateBadge(targetTabId, 'BLOCK', '#EF4444', 'icons/icon_danger48.png');
          chrome.tabs.update(targetTabId, { url: redirectUrl }).catch(() => {});
        } else {
          chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs && tabs[0]) {
              updateBadge(tabs[0].id, 'BLOCK', '#EF4444', 'icons/icon_danger48.png');
              chrome.tabs.update(tabs[0].id, { url: redirectUrl }).catch(() => {});
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

        const { blockedDomains = [] } = await chrome.storage.local.get(['blockedDomains']);
        const updated = blockedDomains.filter(d => d.toLowerCase() !== domainToUnblock);
        await chrome.storage.local.set({ blockedDomains: updated });

        sendResponse({ success: true, blockedDomains: updated });
      } catch (err) {
        console.error("Error unblocking domain:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'GET_BLOCKED_DOMAINS') {
    chrome.storage.local.get(['blockedDomains']).then(({ blockedDomains = [] }) => {
      sendResponse({ blockedDomains });
    });
    return true;
  }

  if (message.action === 'SCAN_CUSTOM_URL') {
    (async () => {
      const { settings } = await chrome.storage.local.get(['settings']);
      const currentSettings = settings || DEFAULT_SETTINGS;
      const fastRes = fastHeuristicCheck(message.url);
      fastRes.isPhishing = fastRes.phishingScore >= currentSettings.threshold;

      await ensureOffscreenDocument();
      chrome.runtime.sendMessage({
        action: 'ANALYZE_URL',
        url: message.url,
        threshold: currentSettings.threshold
      }, (response) => {
        sendResponse(response || fastRes);
      });
    })();
    return true;
  }

  if (message.action === 'RE_ANALYZE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        const fresh = await analyzeTabUrl(activeTab.id, activeTab.url);
        sendResponse(fresh);
      }
    });
    return true;
  }
});
