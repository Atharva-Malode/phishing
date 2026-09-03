document.addEventListener('DOMContentLoaded', () => {
  const extAPI = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : (typeof browser !== 'undefined' ? browser : window);
  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get('url') || 'Unknown URL';
  const targetDomain = urlParams.get('domain') || extractDomain(targetUrl);
  const scoreParam = urlParams.get('score');
  const reasonsParam = urlParams.get('reasons');

  const blockedUrlDisplay = document.getElementById('blockedUrlDisplay');
  const riskScoreDisplay = document.getElementById('riskScoreDisplay');
  const reasonsList = document.getElementById('reasonsList');
  const backToSafetyBtn = document.getElementById('backToSafetyBtn');
  const unblockBtn = document.getElementById('unblockBtn');

  blockedUrlDisplay.textContent = targetUrl;
  blockedUrlDisplay.title = targetUrl;

  if (scoreParam) {
    const scoreVal = Math.round(parseFloat(scoreParam) * 100);
    riskScoreDisplay.textContent = `${scoreVal}% Phishing Probability`;
  } else {
    riskScoreDisplay.textContent = 'High Phishing Risk';
  }

  if (reasonsParam) {
    try {
      const reasons = JSON.parse(reasonsParam);
      if (Array.isArray(reasons) && reasons.length > 0) {
        reasonsList.innerHTML = '';
        reasons.forEach(r => {
          const div = document.createElement('div');
          div.className = 'reason-item';
          div.textContent = `⚠️ ${r}`;
          reasonsList.appendChild(div);
        });
      }
    } catch (e) {}
  }

  backToSafetyBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'https://www.google.com';
    }
  });

  unblockBtn.addEventListener('click', () => {
    if (confirm(`Are you sure you want to unblock "${targetDomain}" and proceed? This site may be dangerous.`)) {
      extAPI.runtime.sendMessage({
        action: 'UNBLOCK_DOMAIN',
        domain: targetDomain,
        url: targetUrl
      }, (response) => {
        if (targetUrl && targetUrl.startsWith('http')) {
          window.location.href = targetUrl;
        } else {
          window.history.back();
        }
      });
    }
  });

  function extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  }
});
