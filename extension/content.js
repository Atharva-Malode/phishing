// Injected content script for rendering interactive phishing blocking prompt & indicators
(function () {
  const extAPI = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : (typeof browser !== 'undefined' ? browser : window);
  let rootContainer = null;
  let currentAnalysis = null;
  let userDismissedWarning = false;

  // Listen for messages from background script
  extAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_PHISHING_WARNING' && message.data) {
      currentAnalysis = message.data;
      if (!userDismissedWarning || !message.data.isPhishing) {
        renderTooltipWidget(message.data);
      }
      if (sendResponse) sendResponse({ status: 'ACKNOWLEDGED' });
    }
  });

  // Query tab analysis as soon as DOM is ready
  function initTabAnalysis() {
    try {
      extAPI.runtime.sendMessage({ action: 'GET_TAB_ANALYSIS' }, (response) => {
        if (response && !response.isSkipped && !response.error) {
          currentAnalysis = response;
          renderTooltipWidget(response);
        }
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabAnalysis);
  } else {
    initTabAnalysis();
  }

  // Render security card modal or floating pill
  function renderTooltipWidget(data) {
    if (!data || data.isSkipped) return;

    if (document.getElementById('ai-phishing-shield-root')) {
      document.getElementById('ai-phishing-shield-root').remove();
    }

    rootContainer = document.createElement('div');
    rootContainer.id = 'ai-phishing-shield-root';

    const isPhishing = data.isPhishing;

    if (isPhishing) {
      // 🔴 PHISHING THREAT: Show interactive blocking prompt modal centered with backdrop
      rootContainer.className = 'aps-overlay-wrapper';
      rootContainer.appendChild(createPhishingPromptModal(data));
    } else {
      // 🟢 SAFE / WHITELISTED SITE: Render floating traffic light pill at top-right
      rootContainer.className = 'aps-top-right-wrapper';
      const pill = createTooltipPill(data);
      rootContainer.appendChild(pill);

      // Automatically disappear after 3.5 seconds if site is safe
      setTimeout(() => {
        if (rootContainer && rootContainer.parentNode) {
          rootContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          rootContainer.style.opacity = '0';
          rootContainer.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            if (rootContainer && rootContainer.parentNode) {
              rootContainer.remove();
            }
          }, 400);
        }
      }, 3500);
    }

    (document.body || document.documentElement).appendChild(rootContainer);
  }

  // Create compact floating tooltip pill with traffic lights
  function createTooltipPill(data) {
    const pill = document.createElement('div');
    const isWhitelisted = data.isWhitelisted;
    const isPhishing = data.isPhishing;
    const scorePct = Math.round((data.phishingScore || 0) * 100);
    const safePct = 100 - scorePct;

    pill.className = `aps-tooltip-pill ${isPhishing ? 'aps-danger' : 'aps-safe'}`;
    pill.title = "Click to expand AI Phishing Shield analysis";

    pill.innerHTML = `
      <div class="aps-traffic-lights">
        <div class="aps-light ${isPhishing ? 'aps-red' : ''}"></div>
        <div class="aps-light ${!isPhishing ? 'aps-green' : ''}"></div>
      </div>
      <span class="aps-pill-text">${isPhishing ? 'PHISHING THREAT' : (isWhitelisted ? 'TRUSTED SITE' : 'VERIFIED SAFE')}</span>
      <span class="aps-pill-score">${isPhishing ? scorePct + '% Risk' : (isWhitelisted ? '100% Trust' : safePct + '% Safe')}</span>
    `;

    pill.addEventListener('click', () => {
      rootContainer.innerHTML = '';
      if (isPhishing) {
        rootContainer.className = 'aps-overlay-wrapper';
        rootContainer.appendChild(createPhishingPromptModal(data));
      } else {
        rootContainer.className = 'aps-top-right-wrapper';
        rootContainer.appendChild(createFocusedCard(data));
      }
    });

    return pill;
  }

  // Create Interactive Phishing Prompt Modal: "Do you want to block this website?"
  function createPhishingPromptModal(data) {
    const modal = document.createElement('div');
    const scorePct = Math.round((data.phishingScore || 0) * 100);
    modal.className = 'aps-prompt-modal';

    let reasonsHtml = '';
    if (data.reasons && data.reasons.length > 0) {
      data.reasons.forEach(r => {
        reasonsHtml += `<div class="aps-reason-row"><span class="aps-icon-warn">⚠️</span> <span>${r}</span></div>`;
      });
    } else {
      reasonsHtml = `
        <div class="aps-reason-row"><span class="aps-icon-warn">⚠️</span> <span>Suspicious domain structure and deceptive characteristics detected.</span></div>
      `;
    }

    modal.innerHTML = `
      <div class="aps-modal-backdrop"></div>
      <div class="aps-prompt-card">
        <!-- Top Security Badge -->
        <div class="aps-prompt-header">
          <div class="aps-danger-icon-pulse">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
              <path d="M12 2L3 6V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6L12 2Z" fill="rgba(239,68,68,0.2)"/>
              <path d="M12 8V12M12 16H12.01" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="aps-header-text">
            <span class="aps-danger-pill">CRITICAL SECURITY WARNING</span>
            <h2>Phishing Website Detected!</h2>
          </div>
          <button class="aps-modal-close-btn" id="aps-prompt-dismiss" title="Dismiss dialog">&times;</button>
        </div>

        <!-- URL Target -->
        <div class="aps-url-box">
          <span class="aps-url-label">SUSPICIOUS URL:</span>
          <span class="aps-url-value">${data.url}</span>
        </div>

        <!-- Risk Probability Bar -->
        <div class="aps-risk-section">
          <div class="aps-risk-meta">
            <span class="aps-risk-title">AI Phishing Confidence Score</span>
            <span class="aps-risk-score">${scorePct}% High Risk</span>
          </div>
          <div class="aps-risk-bar-track">
            <div class="aps-risk-bar-fill" style="width: ${Math.max(5, scorePct)}%;"></div>
          </div>
        </div>

        <!-- Reasons Breakdown -->
        <div class="aps-reasons-box">
          <div class="aps-reasons-title">Detected Threat Indicators:</div>
          <div class="aps-reasons-list">
            ${reasonsHtml}
          </div>
        </div>

        <!-- The Core Question / Prompt -->
        <div class="aps-question-box">
          <h3>Do you want to block this website?</h3>
          <p>Blocking this website prevents malicious scripts, credential theft, and deceptive links from endangering your device.</p>
        </div>

        <!-- Action Choice Buttons -->
        <div class="aps-modal-buttons">
          <button class="aps-btn-danger" id="aps-btn-confirm-block">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Yes, Block Website
          </button>
          
          <button class="aps-btn-subtle" id="aps-btn-cancel-proceed">
            No, Proceed Anyway
          </button>
        </div>
      </div>
    `;

    // Attach Event Listeners
    setTimeout(() => {
      const blockBtn = modal.querySelector('#aps-btn-confirm-block');
      const proceedBtn = modal.querySelector('#aps-btn-cancel-proceed');
      const dismissBtn = modal.querySelector('#aps-prompt-dismiss');
      const backdrop = modal.querySelector('.aps-modal-backdrop');

      // YES: Block website
      if (blockBtn) {
        blockBtn.addEventListener('click', () => {
          blockBtn.disabled = true;
          blockBtn.textContent = 'Blocking Website...';
          
          let hostname = '';
          try {
            hostname = new URL(data.url).hostname;
          } catch (e) {
            hostname = window.location.hostname;
          }

          chrome.runtime.sendMessage({
            action: 'BLOCK_DOMAIN',
            url: data.url,
            domain: hostname,
            score: data.phishingScore,
            reasons: data.reasons
          });
        });
      }

      // NO: Proceed anyway
      function handleProceed() {
        userDismissedWarning = true;
        rootContainer.className = 'aps-top-right-wrapper';
        rootContainer.innerHTML = '';
        rootContainer.appendChild(createTooltipPill(data));
      }

      if (proceedBtn) proceedBtn.addEventListener('click', handleProceed);
      if (dismissBtn) dismissBtn.addEventListener('click', handleProceed);
      if (backdrop) backdrop.addEventListener('click', handleProceed);
    }, 50);

    return modal;
  }

  // Create Safe / Information Card for non-phishing sites
  function createFocusedCard(data) {
    const card = document.createElement('div');
    const isWhitelisted = data.isWhitelisted;
    const scorePct = Math.round((data.phishingScore || 0) * 100);

    card.className = 'aps-focused-card aps-card-safe';

    let reasonsHtml = isWhitelisted
      ? `<div class="aps-reason-row"><span>✓</span> <span>Domain is on your trusted whitelist.</span></div>`
      : `
        <div class="aps-reason-row"><span>✓</span> <span>AI Security Model verified clean URL behavior.</span></div>
        <div class="aps-reason-row"><span>✓</span> <span>No deceptive spoofing patterns detected.</span></div>
      `;

    card.innerHTML = `
      <div class="aps-card-header">
        <div class="aps-card-title-group">
          <div class="aps-traffic-light-box">
            <div class="aps-big-light"></div>
            <div class="aps-big-light aps-green-active"></div>
          </div>
          <div class="aps-card-titles">
            <h2>${isWhitelisted ? 'TRUSTED DOMAIN' : 'VERIFIED SAFE WEBSITE'}</h2>
            <p>${data.url}</p>
          </div>
        </div>
        <button class="aps-close-btn" id="aps-card-close" title="Minimize">&times;</button>
      </div>

      <div class="aps-card-risk-section">
        <div class="aps-risk-top">
          <span class="aps-risk-label">Phishing Risk Score</span>
          <span class="aps-risk-value" style="color: #10B981;">${scorePct}%</span>
        </div>
        <div class="aps-risk-track">
          <div class="aps-risk-fill" style="width: ${scorePct}%; background-color: #10B981;"></div>
        </div>
      </div>

      <div class="aps-reasons-container">
        ${reasonsHtml}
      </div>

      <div class="aps-card-actions">
        <button class="aps-btn-primary" id="aps-btn-got-it">Got it</button>
      </div>
    `;

    setTimeout(() => {
      const closeBtn = card.querySelector('#aps-card-close');
      const gotItBtn = card.querySelector('#aps-btn-got-it');

      function minimize() {
        rootContainer.innerHTML = '';
        rootContainer.appendChild(createTooltipPill(data));
      }

      if (closeBtn) closeBtn.addEventListener('click', minimize);
      if (gotItBtn) gotItBtn.addEventListener('click', minimize);
    }, 50);

    return card;
  }
})();
