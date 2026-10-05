/**
 * Resume Tracker - Extension Popup Controller (popup.js)
 * Manages UI views, content extraction, duplicate detection, and communication
 * with the Resume Tracker Express backend.
 */

// Shared application state
export const state = {
  serverUrl: 'http://localhost:3050',
  customApiKey: '',
  currentView: 'loading',
  previousView: 'loading',
  extractedData: null,
  matchedDuplicate: null,
  skills: [],
  activeWorkType: '',
};

/**
 * Resets runtime state between sessions/runs.
 */
export function resetState() {
  state.serverUrl = 'http://localhost:3050';
  state.customApiKey = '';
  state.currentView = 'loading';
  state.previousView = 'loading';
  state.extractedData = null;
  state.matchedDuplicate = null;
  state.skills = [];
  state.activeWorkType = '';
}

/**
 * Normalizes a URL by stripping tracking parameters, trailing slashes,
 * and standardizing protocols and hosts.
 * @param {string} rawUrl
 * @returns {string}
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const trackingPrefixes = ['utm_', 'gad_'];
    const exactTrackingParams = new Set([
      'gclid',
      'gbraid',
      'eclid',
      'fbclid',
      'refid',
      'trackingid',
      'origin',
      'origintolandingjobpostings',
      'ebp',
      'campaignid',
      'adgroupid',
      'keyword',
      'searchid',
      'source',
      's',
    ]);

    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      const isTracking =
        exactTrackingParams.has(lowerKey) ||
        trackingPrefixes.some((prefix) => lowerKey.startsWith(prefix));
      if (!isTracking) {
        cleanParams.append(key, val);
      }
    });

    const queryString = cleanParams.toString();
    const cleanProtocol = parsed.protocol.toLowerCase();
    return `${cleanProtocol}//${host}${pathname}${queryString ? `?${queryString}` : ''}`;
  } catch {
    return trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }
}

/**
 * Checks existing applications for duplicates against the candidate job.
 * Matches either identical normalized URL or case-insensitive trimmed company and role.
 * @param {Array<object>} applications
 * @param {{ url?: string, company?: string, role?: string }} currentJob
 * @returns {object|null} Matched duplicate application or null
 */
export function findDuplicate(applications, currentJob) {
  if (!Array.isArray(applications) || !currentJob) return null;

  const candNormUrl = normalizeUrl(currentJob.url);
  const candCompany = (currentJob.company || '').trim().toLowerCase();
  const candRole = (currentJob.role || '').trim().toLowerCase();

  for (const app of applications) {
    if (!app) continue;

    // Check 1: Exact URL match
    const appNormUrl = normalizeUrl(app.url);
    if (candNormUrl && appNormUrl && candNormUrl === appNormUrl) {
      return app;
    }

    // Check 2: Same company and role match
    const appCompany = (app.company || '').trim().toLowerCase();
    const appRole = (app.role || '').trim().toLowerCase();
    if (candCompany && appCompany && candRole && appRole) {
      if (candCompany === appCompany && candRole === appRole) {
        return app;
      }
    }
  }

  return null;
}

/**
 * Tests connection to the Resume Tracker server health endpoint.
 * @param {string} serverUrl
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function testServerHealth(serverUrl) {
  const base = (serverUrl || 'http://localhost:3050').trim().replace(/\/+$/, '');

  try {
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) {
      return { ok: false, error: `Błąd serwera (status ${res.status})` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'Błąd połączenia z serwerem' };
  }
}

/**
 * Parses job details via backend Gemini LLM / Heuristics endpoint.
 * @param {string} serverUrl
 * @param {object} extractedData
 * @param {string} [customApiKey]
 * @returns {Promise<object>} Parsed job details
 */
export async function parseJobDetails(serverUrl, extractedData, customApiKey) {
  const base = (serverUrl || 'http://localhost:3050').trim().replace(/\/+$/, '');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (customApiKey) {
    headers['x-gemini-key'] = customApiKey;
  }

  const payload = {
    url: extractedData?.url || '',
    linkTitle: extractedData?.linkTitle || extractedData?.title || '',
    rawText: extractedData?.rawText || '',
    customApiKey: customApiKey || undefined,
  };

  let res = await fetch(`${base}/api/jobs/parse-job`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  // Backward compatibility: try /api/parse-job if instance has not been updated yet
  if (res.status === 404) {
    res = await fetch(`${base}/api/parse-job`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    throw new Error(`Błąd analizy oferty: status ${res.status}`);
  }

  return await res.json();
}

/**
 * Saves a new job application to the backend database.
 * @param {string} serverUrl
 * @param {object} applicationData
 * @returns {Promise<object>} Created application record
 */
export async function saveApplication(serverUrl, applicationData) {
  const base = (serverUrl || 'http://localhost:3050').trim().replace(/\/+$/, '');

  const res = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(applicationData),
  });

  if (!res.ok) {
    throw new Error(`Błąd zapisu aplikacji: status ${res.status}`);
  }

  return await res.json();
}

/**
 * Updates an existing job application in the backend database.
 * @param {string} serverUrl
 * @param {string} id
 * @param {object} applicationData
 * @returns {Promise<object>} Updated application record
 */
export async function updateApplication(serverUrl, id, applicationData) {
  const base = (serverUrl || 'http://localhost:3050').trim().replace(/\/+$/, '');

  const res = await fetch(`${base}/api/applications/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(applicationData),
  });

  if (!res.ok) {
    throw new Error(`Błąd aktualizacji aplikacji: status ${res.status}`);
  }

  return await res.json();
}

/**
 * Switches the active visible view panel in popup.html.
 * @param {'loading'|'form'|'success'|'settings'|'error'} viewName
 */
export function switchView(viewName) {
  const views = ['loading', 'form', 'success', 'settings', 'error'];
  for (const name of views) {
    const el = document.getElementById(`view-${name}`);
    if (el) {
      if (name === viewName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  }
  state.previousView = state.currentView;
  state.currentView = viewName;
}

/**
 * Updates the visual status dot in the header.
 * @param {'online'|'offline'|'unknown'} status
 */
export function updateServerStatusDot(status) {
  const dot = document.getElementById('server-status-dot');
  if (!dot) return;

  dot.classList.remove('dot-online', 'dot-offline', 'dot-unknown');
  dot.classList.add(`dot-${status}`);
  dot.title =
    status === 'online'
      ? 'Połączono z serwerem'
      : status === 'offline'
      ? 'Brak połączenia z serwerem'
      : 'Status połączenia nieznany';
}

/**
 * Deduce portal name from URL for display.
 * @param {string} url
 * @returns {string}
 */
export function deducePortalFromUrl(url) {
  if (!url) return 'Oferta pracy';
  const lower = url.toLowerCase();
  if (lower.includes('linkedin.com')) return 'LinkedIn';
  if (lower.includes('pracuj.pl')) return 'Pracuj.pl';
  if (lower.includes('nofluffjobs.com')) return 'NoFluffJobs';
  if (lower.includes('justjoin.it')) return 'Just Join IT';
  if (lower.includes('theprotocol.it')) return 'the:protocol';
  if (lower.includes('solid.jobs')) return 'Solid.Jobs';
  if (lower.includes('bulldogjob.pl')) return 'Bulldogjob';
  return 'Oferta pracy';
}

/**
 * Loads stored settings from chrome.storage.sync (or falls back to defaults).
 * @returns {Promise<void>}
 */
export async function loadStoredSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage?.sync?.get) {
    try {
      const data = await chrome.storage.sync.get(['serverUrl', 'customApiKey']);
      if (data?.serverUrl) {
        state.serverUrl = data.serverUrl.trim().replace(/\/+$/, '');
      }
      if (data?.customApiKey !== undefined) {
        state.customApiKey = data.customApiKey.trim();
      }
    } catch (err) {
      console.warn('Nie udało się odczytać ustawień z chrome.storage:', err);
    }
  }

  const inputUrl = document.getElementById('input-server-url');
  if (inputUrl) {
    inputUrl.value = state.serverUrl;
  }

  const inputApiKey = document.getElementById('input-custom-api-key');
  if (inputApiKey) {
    inputApiKey.value = state.customApiKey;
  }
}

/**
 * Saves settings to chrome.storage.sync.
 * @returns {Promise<void>}
 */
export async function saveStoredSettings() {
  const inputUrl = document.getElementById('input-server-url');
  const inputApiKey = document.getElementById('input-custom-api-key');

  if (inputUrl) {
    state.serverUrl = inputUrl.value.trim().replace(/\/+$/, '') || 'http://localhost:3050';
  }
  if (inputApiKey) {
    state.customApiKey = inputApiKey.value.trim();
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.sync?.set) {
    try {
      await chrome.storage.sync.set({
        serverUrl: state.serverUrl,
        customApiKey: state.customApiKey,
      });
    } catch (err) {
      console.error('Błąd zapisu ustawień w chrome.storage:', err);
    }
  }
}

/**
 * Renders skill badges inside #skills-container.
 */
export function renderSkillChips() {
  const container = document.getElementById('skills-container');
  if (!container) return;

  container.innerHTML = '';
  for (const skill of state.skills) {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';

    const textSpan = document.createElement('span');
    textSpan.textContent = skill;
    chip.appendChild(textSpan);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'skill-remove';
    removeBtn.setAttribute('data-skill', skill);
    removeBtn.setAttribute('aria-label', `Usuń ${skill}`);
    removeBtn.textContent = '×';

    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.skills = state.skills.filter((s) => s.toLowerCase() !== skill.toLowerCase());
      renderSkillChips();
    });

    chip.appendChild(removeBtn);
    container.appendChild(chip);
  }
}

/**
 * Adds a new skill chip to the skills list.
 * @param {string} skillName
 */
export function addSkillChip(skillName) {
  const trimmed = (skillName || '').trim();
  if (!trimmed) return;

  const exists = state.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    state.skills.push(trimmed);
    renderSkillChips();
  }

  const inputSkill = document.getElementById('input-new-skill');
  if (inputSkill) {
    inputSkill.value = '';
    inputSkill.focus();
  }
}

/**
 * Highlights active work type pill.
 * @param {string} workType
 */
export function setActiveWorkType(workType) {
  let normalized = workType;
  if (normalized === 'Stacjonarnie') normalized = 'Biuro';
  state.activeWorkType = normalized;
  const pills = document.querySelectorAll('#work-type-group .pill-btn');
  pills.forEach((pill) => {
    if (pill.getAttribute('data-value') === normalized) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

/**
 * Detects work type from location or notes strings.
 * @param {string} location
 * @param {string} notes
 */
export function detectAndSetWorkType(location, notes) {
  const combined = `${location || ''} ${notes || ''}`.toLowerCase();
  if (combined.includes('hybryd')) {
    setActiveWorkType('Hybrydowo');
  } else if (combined.includes('zdalnie') || combined.includes('remote')) {
    setActiveWorkType('Zdalnie');
  } else if (combined.includes('biuro') || combined.includes('on-site') || combined.includes('office') || combined.includes('stacjonarnie')) {
    setActiveWorkType('Biuro');
  }
}

/**
 * Builds the JobApplication payload from current form inputs and extracted data.
 * @returns {object}
 */
export function buildApplicationPayload() {
  const roleInput = document.getElementById('field-role');
  const companyInput = document.getElementById('field-company');
  const locationInput = document.getElementById('field-location');
  const salaryInput = document.getElementById('field-salary');
  const portalInput = document.getElementById('field-portal');
  const statusSelect = document.getElementById('field-status');
  const notesTextarea = document.getElementById('field-notes');
  const chkIncludeFullText = document.getElementById('chk-include-full-text');

  let notes = notesTextarea ? notesTextarea.value.trim() : '';

  if (chkIncludeFullText && chkIncludeFullText.checked) {
    const raw = state.extractedData?.rawText || '';
    if (raw && !notes.includes('--- Pełna treść ogłoszenia ---')) {
      notes = (notes ? `${notes}\n\n` : '') + `--- Pełna treść ogłoszenia ---\n${raw}`;
    }
  }

  const status = statusSelect ? statusSelect.value : 'Do zaaplikowania';
  const appliedDate = new Date().toISOString().split('T')[0];

  return {
    role: roleInput ? roleInput.value.trim() : '',
    company: companyInput ? companyInput.value.trim() : '',
    location: locationInput ? locationInput.value.trim() : undefined,
    salary: salaryInput ? salaryInput.value.trim() : undefined,
    portal: portalInput ? portalInput.value.trim() : 'Inny portal',
    status,
    skills: [...state.skills],
    notes: notes || undefined,
    url: state.extractedData?.url || '',
    appliedDate,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        status,
        date: appliedDate,
        note: 'Zapisano przez wtyczkę Chrome',
      },
    ],
  };
}

/**
 * Handles saving application to backend (new or update) and transitioning to success.
 * @param {'save'|'update'} mode
 */
export async function handleFormSubmit(mode = 'save') {
  const payload = buildApplicationPayload();
  if (!payload.role || !payload.company) {
    alert('Uzupełnij wymagane pola: Stanowisko oraz Firma.');
    return;
  }

  const saveBtn = document.getElementById('btn-save');
  const updateBtn = document.getElementById('btn-update');
  if (saveBtn) saveBtn.disabled = true;
  if (updateBtn) updateBtn.disabled = true;

  try {
    if (mode === 'update' && state.matchedDuplicate?.id) {
      await updateApplication(state.serverUrl, state.matchedDuplicate.id, payload);
    } else {
      await saveApplication(state.serverUrl, payload);
    }

    // Configure success view open app button
    const btnOpenApp = document.getElementById('btn-open-app');
    if (btnOpenApp) {
      btnOpenApp.onclick = () => {
        if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
          chrome.tabs.create({ url: state.serverUrl });
        } else {
          window.open(state.serverUrl, '_blank');
        }
      };
    }

    switchView('success');
  } catch (err) {
    console.error('Błąd zapisu aplikacji:', err);
    alert(`Nie udało się zapisać aplikacji: ${err.message || 'Błąd sieci'}`);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (updateBtn) updateBtn.disabled = false;
  }
}

/**
 * Binds UI event listeners to elements currently present in the DOM.
 */
export function setupEventListeners() {
  // Header settings button
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings && !btnSettings.dataset.listenerAttached) {
    btnSettings.dataset.listenerAttached = 'true';
    btnSettings.addEventListener('click', () => {
      switchView('settings');
    });
  }

  // Back from settings buttons
  const btnBack = document.getElementById('btn-back-from-settings') || document.getElementById('btn-back');
  if (btnBack && !btnBack.dataset.listenerAttached) {
    btnBack.dataset.listenerAttached = 'true';
    btnBack.addEventListener('click', () => {
      switchView(state.previousView === 'settings' ? 'form' : state.previousView || 'form');
    });
  }

  // Work type pill buttons
  const workTypeGroup = document.getElementById('work-type-group');
  if (workTypeGroup && !workTypeGroup.dataset.listenerAttached) {
    workTypeGroup.dataset.listenerAttached = 'true';
    workTypeGroup.addEventListener('click', (e) => {
      const target = e.target.closest('.pill-btn');
      if (!target) return;
      const value = target.getAttribute('data-value');
      if (target.classList.contains('active')) {
        target.classList.remove('active');
        state.activeWorkType = '';
      } else {
        setActiveWorkType(value);
      }
    });
  }

  // Add skill button and Enter key
  const btnAddSkill = document.getElementById('btn-add-skill');
  const inputNewSkill = document.getElementById('input-new-skill');

  if (btnAddSkill && !btnAddSkill.dataset.listenerAttached) {
    btnAddSkill.dataset.listenerAttached = 'true';
    btnAddSkill.addEventListener('click', () => {
      if (inputNewSkill) addSkillChip(inputNewSkill.value);
    });
  }

  if (inputNewSkill && !inputNewSkill.dataset.listenerAttached) {
    inputNewSkill.dataset.listenerAttached = 'true';
    inputNewSkill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillChip(inputNewSkill.value);
      }
    });
  }

  // Save button direct click
  const btnSave = document.getElementById('btn-save');
  if (btnSave && !btnSave.dataset.listenerAttached) {
    btnSave.dataset.listenerAttached = 'true';
    btnSave.addEventListener('click', (e) => {
      e.preventDefault();
      handleFormSubmit('save');
    });
  }

  // Form submit
  const form = document.getElementById('job-form');
  if (form && !form.dataset.listenerAttached) {
    form.dataset.listenerAttached = 'true';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit('save');
    });
  }

  // Duplicate update button
  const btnUpdate = document.getElementById('btn-update');
  if (btnUpdate && !btnUpdate.dataset.listenerAttached) {
    btnUpdate.dataset.listenerAttached = 'true';
    btnUpdate.addEventListener('click', () => {
      handleFormSubmit('update');
    });
  }

  // Duplicate save as new button
  const btnSaveNew = document.getElementById('btn-save-new');
  if (btnSaveNew && !btnSaveNew.dataset.listenerAttached) {
    btnSaveNew.dataset.listenerAttached = 'true';
    btnSaveNew.addEventListener('click', () => {
      handleFormSubmit('save');
    });
  }

  // Cancel buttons
  const btnCancel = document.getElementById('btn-cancel');
  if (btnCancel && !btnCancel.dataset.listenerAttached) {
    btnCancel.dataset.listenerAttached = 'true';
    btnCancel.addEventListener('click', () => {
      window.close();
    });
  }

  const btnCloseSuccess = document.getElementById('btn-close-success');
  if (btnCloseSuccess && !btnCloseSuccess.dataset.listenerAttached) {
    btnCloseSuccess.dataset.listenerAttached = 'true';
    btnCloseSuccess.addEventListener('click', () => {
      window.close();
    });
  }

  // Error view buttons
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry && !btnRetry.dataset.listenerAttached) {
    btnRetry.dataset.listenerAttached = 'true';
    btnRetry.addEventListener('click', () => {
      initPopup();
    });
  }

  const btnGotoSettings = document.getElementById('btn-goto-settings');
  if (btnGotoSettings && !btnGotoSettings.dataset.listenerAttached) {
    btnGotoSettings.dataset.listenerAttached = 'true';
    btnGotoSettings.addEventListener('click', () => {
      switchView('settings');
    });
  }

  // Settings view: Test connection button
  const btnTestConnection = document.getElementById('btn-test-connection');
  const testStatusIndicator = document.getElementById('test-connection-status');
  if (btnTestConnection && !btnTestConnection.dataset.listenerAttached) {
    btnTestConnection.dataset.listenerAttached = 'true';
    btnTestConnection.addEventListener('click', async () => {
      const inputUrl = document.getElementById('input-server-url');
      const testUrl = inputUrl ? inputUrl.value.trim() : state.serverUrl;

      if (testStatusIndicator) {
        testStatusIndicator.textContent = 'Testowanie...';
        testStatusIndicator.className = 'test-status-indicator testing';
      }

      const result = await testServerHealth(testUrl);
      if (result.ok) {
        if (testStatusIndicator) {
          testStatusIndicator.textContent = 'Połączono!';
          testStatusIndicator.className = 'test-status-indicator success';
        }
        updateServerStatusDot('online');
      } else {
        if (testStatusIndicator) {
          testStatusIndicator.textContent = result.error || 'Błąd połączenia';
          testStatusIndicator.className = 'test-status-indicator error';
        }
        updateServerStatusDot('offline');
      }
    });
  }

  // Settings view: Save settings button
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings && !btnSaveSettings.dataset.listenerAttached) {
    btnSaveSettings.dataset.listenerAttached = 'true';
    btnSaveSettings.addEventListener('click', async () => {
      await saveStoredSettings();
      // Test new connection in background
      (async () => {
        try {
          const res = await testServerHealth(state.serverUrl);
          updateServerStatusDot(res.ok ? 'online' : 'offline');
        } catch {
          updateServerStatusDot('offline');
        }
      })();
      switchView(state.previousView === 'settings' ? 'form' : state.previousView || 'form');
    });
  }
}

/**
 * Initializes the Extension Popup lifecycle.
 * Injects extractor into active tab, fetches existing apps for duplicate checking,
 * calls backend AI/heuristic parser, and populates the form.
 * @returns {Promise<void>}
 */
export async function initPopup() {
  setupEventListeners();
  await loadStoredSettings();

  // Test server health in background to update status dot
  (async () => {
    try {
      const health = await testServerHealth(state.serverUrl);
      updateServerStatusDot(health.ok ? 'online' : 'offline');
    } catch {
      updateServerStatusDot('offline');
    }
  })();

  // 1. Check active browser tab
  let tab = null;
  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs?.[0];
    } catch (tabErr) {
      console.warn('Nie udało się pobrać aktywnej karty:', tabErr);
    }
  }

  if (!tab || !tab.url) {
    switchView('error');
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.textContent = 'Nie znaleziono aktywnej karty przeglądarki z ofertą pracy.';
    }
    return;
  }

  // 2. Check for restricted browser pages
  const restrictedSchemes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'view-source:',
    'brave://',
    'opera://',
  ];

  if (restrictedSchemes.some((scheme) => tab.url.startsWith(scheme))) {
    switchView('error');
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.textContent =
        'Wtyczka działa na stronach z ofertami pracy. Otwórz kartę z ogłoszeniem (np. Pracuj.pl, LinkedIn, Just Join IT).';
    }
    return;
  }

  // 3. Switch to loading view and update portal pill
  switchView('loading');
  const portalPill = document.getElementById('loading-portal-pill');
  if (portalPill) {
    portalPill.textContent = deducePortalFromUrl(tab.url);
  }

  // 4. Inject extractor.js and extract offer content
  let extracted = null;
  if (typeof chrome !== 'undefined' && chrome.scripting?.executeScript && tab.id) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['extractor.js'],
      });
      extracted = results?.[0]?.result;
    } catch (scriptErr) {
      console.warn('Nie udało się wykonać skryptu extractor.js w karcie:', scriptErr);
    }
  }

  if (!extracted) {
    extracted = {
      url: tab.url,
      title: tab.title || '',
      rawText: '',
      selectedText: '',
      metaDescription: '',
    };
  }
  state.extractedData = extracted;

  // 5. Query server in parallel: fetch existing applications and parse job details
  try {
    const base = state.serverUrl.trim().replace(/\/+$/, '');

    // Fetch existing apps for duplicate detection
    const appsPromise = (async () => {
      try {
        const res = await fetch(`${base}/api/applications`);
        if (res.ok) {
          return await res.json();
        }
        return [];
      } catch {
        return [];
      }
    })();

    // Parse job details via backend AI/heuristics
    const parsedPromise = parseJobDetails(state.serverUrl, extracted, state.customApiKey);

    const [existingApps, parsedData] = await Promise.all([appsPromise, parsedPromise]);

    // 6. Populate form view
    const roleInput = document.getElementById('field-role');
    const companyInput = document.getElementById('field-company');
    const locationInput = document.getElementById('field-location');
    const salaryInput = document.getElementById('field-salary');
    const portalInput = document.getElementById('field-portal');
    const statusSelect = document.getElementById('field-status');
    const notesTextarea = document.getElementById('field-notes');

    const deducedPortal = deducePortalFromUrl(extracted.url);
    const portalVal = parsedData.portal || deducedPortal;
    let finalCompany = (parsedData.company || '').trim();

    // Safeguard: Never populate portal name as company
    if (
      finalCompany &&
      portalVal &&
      (finalCompany.toLowerCase() === portalVal.toLowerCase() ||
        finalCompany.toLowerCase() === 'the protocol' ||
        finalCompany.toLowerCase() === 'the:protocol' ||
        finalCompany.toLowerCase() === 'nofluffjobs' ||
        finalCompany.toLowerCase() === 'pracuj.pl')
    ) {
      finalCompany = '';
    }

    let safeSalary = (parsedData.salary || '').trim();
    if (
      safeSalary.length > 70 ||
      /(?:wymagani|obowiązk|oferujem|stanowisk|doświadczeni|nasz|zespół|projekt|poszukuj|aplikuj|kandydat|praca|benefity)/i.test(
        safeSalary
      )
    ) {
      const match = safeSalary.match(
        /^(\d[\d\s,.]*(?:[-–—]|do)?\s*(?:\d[\d\s,.]*)?\s*(?:zł|PLN|EUR|USD|GBP|k\b)(?:\s*(?:netto|brutto|net|gross|\(\+?\s*VAT\)|\bB2B\b|\bUoP\b|\/\s*(?:h|godz(?:in[aę])?|m(?:ies(?:iąc|ięcznie)?)?|day|dzień|m-c|rok|yr|mo|month)))*)/i
      );
      safeSalary = match && match[1] && match[1].length <= 70 ? match[1].trim() : '';
    }

    if (roleInput) roleInput.value = parsedData.role || extracted.title || '';
    if (companyInput) companyInput.value = finalCompany;
    if (locationInput) locationInput.value = parsedData.location || '';
    if (salaryInput) salaryInput.value = safeSalary;
    if (portalInput) portalInput.value = portalVal;
    if (statusSelect) statusSelect.value = parsedData.status || 'Do zaaplikowania';
    if (notesTextarea) notesTextarea.value = parsedData.notes || '';

    // Skills
    state.skills = Array.isArray(parsedData.skills) ? [...parsedData.skills] : [];
    renderSkillChips();

    // Work type
    if (parsedData.workType) {
      setActiveWorkType(parsedData.workType);
    } else {
      detectAndSetWorkType(parsedData.location, parsedData.notes);
    }

    // Duplicate detection
    const duplicate = findDuplicate(existingApps, {
      url: extracted.url,
      company: finalCompany,
      role: parsedData.role,
    });

    state.matchedDuplicate = duplicate;
    const dupBanner = document.getElementById('duplicate-banner');
    const dupText = document.getElementById('duplicate-text');

    if (duplicate && dupBanner && dupText) {
      dupBanner.classList.remove('hidden');
      dupText.textContent = `⚠️ Oferta już w bazie: ${duplicate.status || 'Wysłana'} z dnia ${
        duplicate.appliedDate || 'nieznana'
      }`;
    } else if (dupBanner) {
      dupBanner.classList.add('hidden');
    }

    switchView('form');
  } catch (err) {
    console.error('Błąd połączenia z serwerem podczas parsowania:', err);
    switchView('error');
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.textContent = `Nie udało się połączyć z serwerem Resume Tracker (${
        err.message || 'Błąd sieci'
      }). Sprawdź, czy serwer działa i ma prawidłowy adres w Ustawieniach.`;
    }
  }
}

// Auto-initialize when loaded into a browser document
if (
  typeof document !== 'undefined' &&
  typeof window !== 'undefined' &&
  !(window).__POPUP_TEST_MANUAL_INIT__
) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initPopup().catch(console.error);
    });
  } else {
    initPopup().catch(console.error);
  }
}
