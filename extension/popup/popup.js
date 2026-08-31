document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const statusCard = document.getElementById('statusCard');
  const lightRed = document.getElementById('lightRed');
  const lightGreen = document.getElementById('lightGreen');
  const statusBadge = document.getElementById('statusBadge');
  const statusTitle = document.getElementById('statusTitle');
  const urlDisplay = document.getElementById('urlDisplay');
  const riskPercent = document.getElementById('riskPercent');
  const riskMeterFill = document.getElementById('riskMeterFill');
  const reasonsList = document.getElementById('reasonsList');
  const rescanBtn = document.getElementById('rescanBtn');
  const whitelistToggleBtn = document.getElementById('whitelistToggleBtn');

  // Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Custom Scanner
  const customUrlInput = document.getElementById('customUrlInput');
  const runScanBtn = document.getElementById('runScanBtn');
  const scanResultCard = document.getElementById('scanResultCard');
  const scanResultBadge = document.getElementById('scanResultBadge');
  const scanScoreText = document.getElementById('scanScoreText');
  const scanUrlText = document.getElementById('scanUrlText');
  const scanReasonsList = document.getElementById('scanReasonsList');

  // Whitelist
  const newWhitelistInput = document.getElementById('newWhitelistInput');
  const addWhitelistBtn = document.getElementById('addWhitelistBtn');
  const whitelistItems = document.getElementById('whitelistItems');

  // Settings
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdValueText = document.getElementById('thresholdValueText');
  const bannerToggle = document.getElementById('bannerToggle');

  let currentAnalysis = null;
  let activeTabUrl = "";

  // 1. Initialize Active Tab Analysis
  function loadActiveTabAnalysis() {
    setStatusLoading();
    const urlParams = new URLSearchParams(window.location.search);
    const targetTabId = urlParams.get('tabId') ? parseInt(urlParams.get('tabId')) : null;

    chrome.runtime.sendMessage({ action: 'GET_TAB_ANALYSIS', tabId: targetTabId }, (response) => {
      if (chrome.runtime.lastError || !response) {
        setStatusError("Unable to analyze current page");
        return;
      }
      currentAnalysis = response;
      activeTabUrl = response.url || "";
      renderAnalysis(response);
    });
  }

  // Set loading visual state
  function setStatusLoading() {
    statusCard.className = 'status-card status-loading';
    lightRed.classList.remove('active');
    lightGreen.classList.remove('active');
    statusBadge.textContent = 'EVALUATING';
    statusTitle.textContent = 'Scanning Website Security';
    urlDisplay.textContent = 'Checking URL safety signals...';
    riskPercent.textContent = '--%';
    riskMeterFill.style.width = '0%';
    riskMeterFill.style.backgroundColor = '#3B82F6';
    reasonsList.innerHTML = '<div class="reason-item neutral"><span>• Running pirocheto/phishing-url ONNX model...</span></div>';
  }

  function setStatusError(msg) {
    statusCard.className = 'status-card status-loading';
    lightRed.classList.remove('active');
    lightGreen.classList.remove('active');
    statusBadge.textContent = 'SYSTEM TAB';
    statusTitle.textContent = msg;
    urlDisplay.textContent = activeTabUrl || 'Local browser tab';
    riskPercent.textContent = '0%';
    riskMeterFill.style.width = '0%';
    reasonsList.innerHTML = '<div class="reason-item neutral"><span>• Internal browser tab cannot be scanned.</span></div>';
  }

  // Render Green Light vs Red Light
  function renderAnalysis(data) {
    if (data.isSkipped) {
      setStatusError("Chrome System Page");
      urlDisplay.textContent = data.url;
      return;
    }

    if (data.isWhitelisted) {
      statusCard.className = 'status-card status-whitelisted';
      lightRed.classList.remove('active');
      lightGreen.classList.add('active');
      statusBadge.textContent = 'TRUSTED DOMAIN';
      statusTitle.textContent = 'Domain Whitelisted';
      urlDisplay.textContent = data.url;
      riskPercent.textContent = '0%';
      riskMeterFill.style.width = '0%';
      riskMeterFill.style.backgroundColor = '#3B82F6';
      whitelistToggleBtn.textContent = 'Remove Trust';
      reasonsList.innerHTML = '<div class="reason-item positive"><span>✓ Domain is manually added to your trusted whitelist.</span></div>';
      return;
    }

    const scorePct = Math.round((data.phishingScore || 0) * 100);
    urlDisplay.textContent = data.url;
    riskPercent.textContent = `${scorePct}%`;
    riskMeterFill.style.width = `${scorePct}%`;

    whitelistToggleBtn.textContent = 'Trust Domain';

    if (data.isPhishing) {
      // 🔴 RED TRAFFIC LIGHT ACTIVE
      statusCard.className = 'status-card status-danger';
      lightRed.classList.add('active');
      lightGreen.classList.remove('active');
      statusBadge.textContent = 'PHISHING DANGER';
      statusTitle.textContent = 'Phishing Threat Detected!';
      riskMeterFill.style.backgroundColor = '#EF4444';
      riskPercent.style.color = '#EF4444';
    } else {
      // 🟢 GREEN TRAFFIC LIGHT ACTIVE
      statusCard.className = 'status-card status-safe';
      lightGreen.classList.add('active');
      lightRed.classList.remove('active');
      statusBadge.textContent = 'VERIFIED SAFE';
      statusTitle.textContent = 'Safe Website Verified';
      riskMeterFill.style.backgroundColor = '#10B981';
      riskPercent.style.color = '#10B981';
    }

    // Populate Safety Reasons
    let html = '';

    if (data.source === 'ONNX_MODEL') {
      html += `<div class="reason-item positive"><span>✓ Scanned via AI Security Model</span></div>`;
    }

    if (data.reasons && data.reasons.length > 0) {
      data.reasons.forEach(reason => {
        html += `<div class="reason-item negative"><span>⚠️ ${reason}</span></div>`;
      });
    } else if (!data.isPhishing) {
      html += `<div class="reason-item positive"><span>✓ Domain structure & URL match clean web behavior.</span></div>`;
      html += `<div class="reason-item positive"><span>✓ No deceptive phishing patterns detected.</span></div>`;
    }

    reasonsList.innerHTML = html;
  }

  // 2. Tab Navigation
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // 3. Re-analyze Button
  rescanBtn.addEventListener('click', () => {
    setStatusLoading();
    chrome.runtime.sendMessage({ action: 'RE_ANALYZE_TAB' }, (response) => {
      if (response) {
        currentAnalysis = response;
        renderAnalysis(response);
      }
    });
  });

  // 4. Whitelist Domain Toggle Button
  whitelistToggleBtn.addEventListener('click', async () => {
    if (!activeTabUrl) return;
    try {
      const hostname = new URL(activeTabUrl).hostname;
      const { settings } = await chrome.storage.local.get(['settings']);
      const currentSettings = settings || { whitelist: [] };
      let list = currentSettings.whitelist || [];

      if (currentAnalysis && currentAnalysis.isWhitelisted) {
        list = list.filter(d => d.toLowerCase() !== hostname.toLowerCase());
      } else {
        if (!list.includes(hostname)) list.push(hostname);
      }

      currentSettings.whitelist = list;
      await chrome.storage.local.set({ settings: currentSettings });
      loadWhitelistUI(list);
      loadActiveTabAnalysis();
    } catch (e) {
      console.error(e);
    }
  });

  // 5. Manual URL Scanner
  runScanBtn.addEventListener('click', () => {
    const inputUrl = customUrlInput.value.trim();
    if (!inputUrl) return;

    scanResultCard.classList.remove('hidden');
    scanResultBadge.textContent = 'SCANNING...';
    scanScoreText.textContent = '--%';
    scanUrlText.textContent = inputUrl;
    scanReasonsList.innerHTML = '<div class="reason-item neutral"><span>• Evaluating target URL...</span></div>';

    chrome.runtime.sendMessage({ action: 'SCAN_CUSTOM_URL', url: inputUrl }, (response) => {
      if (!response) return;
      const scorePct = Math.round((response.phishingScore || 0) * 100);
      scanScoreText.textContent = `${scorePct}% Risk`;
      scanUrlText.textContent = response.url;

      if (response.isPhishing) {
        scanResultBadge.textContent = 'PHISHING';
        scanResultBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        scanResultBadge.style.color = '#EF4444';
      } else {
        scanResultBadge.textContent = 'SAFE';
        scanResultBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        scanResultBadge.style.color = '#10B981';
      }

      let html = '';
      if (response.reasons && response.reasons.length > 0) {
        response.reasons.forEach(r => html += `<div class="reason-item negative"><span>⚠️ ${r}</span></div>`);
      } else {
        html += `<div class="reason-item positive"><span>✓ Low phishing probability score (${scorePct}%).</span></div>`;
      }
      scanReasonsList.innerHTML = html;
    });
  });

  // 6. Whitelist Manager
  async function loadWhitelistUI(list) {
    const { settings } = await chrome.storage.local.get(['settings']);
    const domains = list || (settings ? settings.whitelist : []) || [];
    whitelistItems.innerHTML = '';

    domains.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'whitelist-item';
      li.innerHTML = `
        <span>${domain}</span>
        <button class="remove-whitelist-btn" data-domain="${domain}">&times;</button>
      `;
      whitelistItems.appendChild(li);
    });

    document.querySelectorAll('.remove-whitelist-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const dom = e.target.getAttribute('data-domain');
        const updated = domains.filter(d => d !== dom);
        const { settings: curSettings } = await chrome.storage.local.get(['settings']);
        if (curSettings) {
          curSettings.whitelist = updated;
          await chrome.storage.local.set({ settings: curSettings });
        }
        loadWhitelistUI(updated);
        loadActiveTabAnalysis();
      });
    });
  }

  addWhitelistBtn.addEventListener('click', async () => {
    const dom = newWhitelistInput.value.trim().toLowerCase();
    if (!dom) return;
    const { settings } = await chrome.storage.local.get(['settings']);
    const curSettings = settings || { whitelist: [] };
    if (!curSettings.whitelist.includes(dom)) {
      curSettings.whitelist.push(dom);
      await chrome.storage.local.set({ settings: curSettings });
      newWhitelistInput.value = '';
      loadWhitelistUI(curSettings.whitelist);
      loadActiveTabAnalysis();
    }
  });

  // 7. Settings Modal
  settingsBtn.addEventListener('click', async () => {
    const { settings } = await chrome.storage.local.get(['settings']);
    if (settings) {
      thresholdSlider.value = Math.round((settings.threshold || 0.50) * 100);
      thresholdValueText.textContent = `${thresholdSlider.value}%`;
      bannerToggle.checked = settings.enableBanner !== false;
    }
    settingsModal.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  thresholdSlider.addEventListener('input', () => {
    thresholdValueText.textContent = `${thresholdSlider.value}%`;
  });

  thresholdSlider.addEventListener('change', async () => {
    const { settings } = await chrome.storage.local.get(['settings']);
    if (settings) {
      settings.threshold = parseFloat(thresholdSlider.value) / 100.0;
      await chrome.storage.local.set({ settings });
      loadActiveTabAnalysis();
    }
  });

  bannerToggle.addEventListener('change', async () => {
    const { settings } = await chrome.storage.local.get(['settings']);
    if (settings) {
      settings.enableBanner = bannerToggle.checked;
      await chrome.storage.local.set({ settings });
    }
  });

  // Initial loads
  loadActiveTabAnalysis();
  loadWhitelistUI();
});
