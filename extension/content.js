// Injected content script for rendering focused tooltip & traffic light indicators
(function () {
  let rootContainer = null;
  let currentAnalysis = null;

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_PHISHING_WARNING' && message.data) {
      currentAnalysis = message.data;
      renderTooltipWidget(message.data);
      if (sendResponse) sendResponse({ status: 'ACKNOWLEDGED' });
    }
  });

  // Query tab analysis as soon as DOM is ready
  function initTabAnalysis() {
    try {
      chrome.runtime.sendMessage({ action: 'GET_TAB_ANALYSIS' }, (response) => {
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

  // Render automatic in-page security card / floating tooltip
  function renderTooltipWidget(data) {
    if (!data || data.isSkipped) return;

    if (document.getElementById('ai-phishing-shield-root')) {
      document.getElementById('ai-phishing-shield-root').remove();
    }

    rootContainer = document.createElement('div');
    rootContainer.id = 'ai-phishing-shield-root';

    const isPhishing = data.isPhishing;

    if (isPhishing) {
      // 🔴 PHISHING THREAT: Automatically opens the Big Focused Security Card Modal right in front of the user!
      rootContainer.appendChild(createFocusedCard(data, true));
    } else {
      // 🟢 SAFE / WHITELISTED SITE: Render floating traffic light pill at top-right
      const pill = createTooltipPill(data);
      rootContainer.appendChild(pill);

      // Automatically disappear completely after 3 seconds if site is safe
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
      }, 3000);
    }

    (document.body || document.documentElement).appendChild(rootContainer);
  }

  // Create compact floating tooltip pill with traffic lights
  function createTooltipPill(data) {
    const pill = document.createElement('div');
    const isWhitelisted = data.isWhitelisted;
    const scorePct = Math.round((data.phishingScore || 0) * 100);
    const safePct = 100 - scorePct;

    pill.className = `aps-tooltip-pill ${data.isPhishing ? 'aps-danger' : 'aps-safe'}`;
    pill.title = "Click to expand AI Phishing Shield analysis";

    pill.innerHTML = `
      <div class="aps-traffic-lights">
        <div class="aps-light aps-red"></div>
        <div class="aps-light aps-green"></div>
      </div>
      <span class="aps-pill-text">${isWhitelisted ? 'TRUSTED SITE' : 'VERIFIED SAFE'}</span>
      <span class="aps-pill-score">${isWhitelisted ? '100% Trust' : safePct + '% Safe'}</span>
    `;

    pill.addEventListener('mouseenter', () => pill.setAttribute('data-hovered', 'true'));
    pill.addEventListener('click', () => {
      rootContainer.innerHTML = '';
      rootContainer.appendChild(createFocusedCard(data, false));
    });

    return pill;
  }

  // Create Big Focused Security Card (Gains Complete Automatic Focus)
  function createFocusedCard(data, isInitialPhishingAlert) {
    const card = document.createElement('div');
    const isPhishing = data.isPhishing;
    const isWhitelisted = data.isWhitelisted;
    const scorePct = Math.round((data.phishingScore || 0) * 100);

    card.className = `aps-focused-card ${isPhishing ? 'aps-card-danger' : 'aps-card-safe'}`;

    let reasonsHtml = '';
    if (data.reasons && data.reasons.length > 0) {
      data.reasons.forEach(r => {
        reasonsHtml += `<div class="aps-reason-row"><span>⚠️</span> <span>${r}</span></div>`;
      });
    } else if (isWhitelisted) {
      reasonsHtml = `<div class="aps-reason-row"><span>✓</span> <span>Domain added to your trusted whitelist.</span></div>`;
    } else {
      reasonsHtml = `
        <div class="aps-reason-row"><span>✓</span> <span>AI Security Model inference clear.</span></div>
        <div class="aps-reason-row"><span>✓</span> <span>No deceptive domain or spoofing patterns detected.</span></div>
      `;
    }

    card.innerHTML = `
      <div class="aps-card-header">
        <div class="aps-card-title-group">
          <!-- Big Dual Traffic Light Housing -->
          <div class="aps-traffic-light-box">
            <div class="aps-big-light ${isPhishing ? 'aps-red-active' : ''}"></div>
            <div class="aps-big-light ${!isPhishing ? 'aps-green-active' : ''}"></div>
          </div>
          <div class="aps-card-titles">
            <h2>${isPhishing ? '🚨 PHISHING THREAT DETECTED' : (isWhitelisted ? 'TRUSTED DOMAIN' : 'VERIFIED SAFE WEBSITE')}</h2>
            <p>${data.url}</p>
          </div>
        </div>
        <button class="aps-close-btn" id="aps-card-close" title="Minimize Warning">&times;</button>
      </div>

      <div class="aps-card-risk-section">
        <div class="aps-risk-top">
          <span class="aps-risk-label">Phishing Risk Score</span>
          <span class="aps-risk-value" style="color: ${isPhishing ? '#EF4444' : '#10B981'};">${scorePct}%</span>
        </div>
        <div class="aps-risk-track">
          <div class="aps-risk-fill" style="width: ${scorePct}%; background-color: ${isPhishing ? '#EF4444' : '#10B981'};"></div>
        </div>
      </div>

      <div class="aps-reasons-container">
        ${reasonsHtml}
      </div>

      <div class="aps-card-actions">
        ${isPhishing ? '<button class="aps-btn-primary" id="aps-btn-leave-safe">Back to Safety</button>' : ''}
        <button class="${isPhishing ? 'aps-btn-secondary' : 'aps-btn-primary'}" id="aps-btn-minimize">${isPhishing ? 'Proceed with Caution' : 'Got it'}</button>
      </div>
    `;

    // Event handlers
    setTimeout(() => {
      const closeBtn = card.querySelector('#aps-card-close');
      const minBtn = card.querySelector('#aps-btn-minimize');
      const leaveBtn = card.querySelector('#aps-btn-leave-safe');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          rootContainer.innerHTML = '';
          rootContainer.appendChild(createTooltipPill(data));
        });
      }

      if (minBtn) {
        minBtn.addEventListener('click', () => {
          rootContainer.innerHTML = '';
          rootContainer.appendChild(createTooltipPill(data));
        });
      }

      if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
          window.history.back();
        });
      }
    }, 50);

    return card;
  }
})();
