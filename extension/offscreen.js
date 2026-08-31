// Offscreen script for running AI Security ONNX Model
if (typeof ort !== 'undefined') {
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('lib/');
  ort.env.wasm.numThreads = 1; // Single-threaded execution for Chrome Extension MV3 safety
}

let session = null;
let initPromise = null;

async function getSession() {
  if (session) return session;
  if (initPromise) return await initPromise;

  initPromise = (async () => {
    try {
      console.log("[Offscreen] Initializing ONNX session with models/model.onnx...");
      const modelUrl = chrome.runtime.getURL('models/model.onnx');
      
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm']
      });
      console.log("[Offscreen] ONNX Model session loaded successfully!");
      return session;
    } catch (err) {
      console.warn("[Offscreen] Local model path load failed, trying ArrayBuffer fetch:", err);
      try {
        const response = await fetch(chrome.runtime.getURL('models/model.onnx'));
        const arrayBuffer = await response.arrayBuffer();
        session = await ort.InferenceSession.create(arrayBuffer, {
          executionProviders: ['wasm']
        });
        console.log("[Offscreen] ONNX Model loaded via ArrayBuffer!");
        return session;
      } catch (innerErr) {
        console.error("[Offscreen] Failed to initialize ONNX session:", innerErr);
        initPromise = null;
        throw innerErr;
      }
    }
  })();

  return await initPromise;
}

// Perform ML inference on a given URL
async function runModelInference(url) {
  try {
    const sess = await getSession();
    const tensor = new ort.Tensor('string', [url], [1]);
    const results = await sess.run({ inputs: tensor });

    let probas = null;
    if (results['probabilities']) {
      probas = results['probabilities'].data;
    } else {
      const keys = Object.keys(results);
      if (keys.length > 1) {
        probas = results[keys[1]].data;
      } else if (keys.length === 1) {
        probas = results[keys[0]].data;
      }
    }

    if (probas && probas.length >= 2) {
      const safeProb = parseFloat(probas[0]);
      const phishingProb = parseFloat(probas[1]);
      return {
        mlScore: phishingProb,
        safeProb: safeProb,
        phishingProb: phishingProb,
        source: 'ONNX_MODEL'
      };
    }
  } catch (err) {
    console.error("[Offscreen] ML Inference error:", err);
  }

  return computeHeuristicRisk(url);
}

// Compute supplementary URL risk features
function computeHeuristicRisk(url) {
  let riskScore = 0.05;
  const reasons = [];

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();
    const fullUrl = url.toLowerCase();

    // 1. Check IP address host
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      riskScore += 0.45;
      reasons.push("Uses raw IP address instead of domain name");
    }

    // 2. Check suspicious TLDs
    const suspiciousTlds = ['.xyz', '.top', '.work', '.click', '.buzz', '.loan', '.gq', '.cf', '.tk', '.ga', '.ml', '.rest', '.fit', '.icu', '.cam'];
    for (const tld of suspiciousTlds) {
      if (hostname.endsWith(tld)) {
        riskScore += 0.30;
        reasons.push(`Suspicious top-level domain (${tld})`);
        break;
      }
    }

    // 3. Check excessive subdomains
    const domainParts = hostname.split('.').filter(p => p.length > 0);
    if (domainParts.length >= 4) {
      riskScore += 0.20;
      reasons.push(`Unusual number of subdomains (${domainParts.length})`);
    }

    // 4. Check @ symbol in URL
    if (fullUrl.includes('@')) {
      riskScore += 0.35;
      reasons.push("URL contains '@' symbol");
    }

    // 5. Check keywords commonly abused in phishing paths
    const phishingKeywords = ['login', 'signin', 'verify', 'account', 'banking', 'secure', 'update', 'credential', 'paypal', 'appleid', 'microsoft', 'netflix', 'wallet', 'security', 'checkpoint'];
    let keywordCount = 0;
    for (const kw of phishingKeywords) {
      if (pathAndQuery.includes(kw) || hostname.includes(kw)) {
        keywordCount++;
      }
    }
    if (keywordCount >= 2) {
      riskScore += 0.30;
      reasons.push(`Contains multiple sensitive security keywords (${keywordCount})`);
    } else if (keywordCount === 1) {
      riskScore += 0.12;
      reasons.push("Contains sensitive authentication keywords");
    }

    // 6. Excessive URL length
    if (url.length > 75) {
      riskScore += 0.15;
      reasons.push(`Abnormally long URL length (${url.length} chars)`);
    }

    // 7. HTTPS check
    if (urlObj.protocol === 'http:') {
      riskScore += 0.15;
      reasons.push("Insecure connection (HTTP instead of HTTPS)");
    }

  } catch (e) {
    console.error("[Offscreen] Error parsing URL for heuristics:", e);
  }

  const finalRisk = Math.min(0.99, Math.max(0.01, riskScore));
  return {
    mlScore: finalRisk,
    safeProb: 1.0 - finalRisk,
    phishingProb: finalRisk,
    reasons: reasons,
    source: 'HEURISTIC'
  };
}

// Pre-warm the ONNX session
getSession().catch(err => console.log("[Offscreen] Warmup status:", err));

// Message listener from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ANALYZE_URL') {
    (async () => {
      const startTime = performance.now();
      const mlResult = await runModelInference(message.url);
      const heuristics = computeHeuristicRisk(message.url);

      let combinedScore = mlResult.phishingProb;
      if (mlResult.source === 'ONNX_MODEL') {
        combinedScore = (mlResult.phishingProb * 0.75) + (heuristics.phishingProb * 0.25);
      } else {
        combinedScore = heuristics.phishingProb;
      }

      const durationMs = Math.round(performance.now() - startTime);

      sendResponse({
        url: message.url,
        phishingScore: combinedScore,
        safeScore: 1 - combinedScore,
        isPhishing: combinedScore >= (message.threshold || 0.50),
        mlScore: mlResult.phishingProb,
        reasons: heuristics.reasons,
        source: mlResult.source,
        durationMs: durationMs
      });
    })();
    return true;
  }
});
