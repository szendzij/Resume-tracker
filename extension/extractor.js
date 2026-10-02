/**
 * Resume Tracker - DOM Content Extractor (extractor.js)
 * Injected into active browser tab to extract job offer details.
 */
(function (global) {
  'use strict';

  /**
   * Extracts job offer content and metadata from the document and window.
   * @param {Document} [doc] - Target document
   * @param {Window} [win] - Target window
   * @returns {{ url: string, title: string, rawText: string, selectedText: string, metaDescription: string }}
   */
  function extractJobOfferData(doc, win) {
    const documentObj = doc || (typeof document !== 'undefined' ? document : null);
    const windowObj = win || (typeof window !== 'undefined' ? window : null);

    if (!documentObj) {
      return {
        url: '',
        title: '',
        rawText: '',
        selectedText: '',
        metaDescription: '',
      };
    }

    // 1. Check user text selection (minimum 10 non-whitespace chars)
    let selectedText = '';
    try {
      const selection = windowObj?.getSelection?.()?.toString()?.trim();
      if (selection && selection.length >= 10) {
        selectedText = selection;
      }
    } catch {
      // Ignore selection errors
    }

    let rawText = '';

    if (selectedText) {
      rawText = selectedText;
    } else {
      // 2. Identify priority content container
      const prioritySelectors = [
        '.job-description',
        '#job-details',
        '.offer-details',
        'main',
        'article',
        '[role="main"]',
        'body',
      ];

      let targetRoot = null;
      for (const sel of prioritySelectors) {
        const el = documentObj.querySelector(sel);
        if (el) {
          targetRoot = el;
          break;
        }
      }

      if (!targetRoot) {
        targetRoot = documentObj.body || documentObj.documentElement;
      }

      if (targetRoot) {
        // Clone root to remove noise elements without mutating actual DOM
        const clone = targetRoot.cloneNode(true);

        const noiseSelector = 'script, style, noscript, nav, header, footer, aside, svg, iframe, form, button';
        const noiseElements = clone.querySelectorAll(noiseSelector);
        noiseElements.forEach((node) => node.remove());

        // Extract text and collapse multiple whitespace / empty lines
        const text = clone.textContent || '';
        rawText = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join('\n')
          .replace(/[ \t]+/g, ' ')
          .trim();
      }

      // Truncate to maximum 7,000 characters
      if (rawText.length > 7000) {
        rawText = rawText.slice(0, 7000);
      }
    }

    // 3. Extract URL
    let url = '';
    try {
      url = windowObj?.location?.href || '';
    } catch {
      url = '';
    }

    // 4. Extract Title
    const ogTitle = documentObj.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const title = (ogTitle || documentObj.title || '').trim();

    // 5. Extract Meta Description
    const ogDesc = documentObj.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const nameDesc = documentObj.querySelector('meta[name="description"]')?.getAttribute('content');
    const metaDescription = (ogDesc || nameDesc || '').trim();

    return {
      url,
      title,
      rawText,
      selectedText: selectedText || '',
      metaDescription,
    };
  }

  // Execute extraction in active tab context
  const extracted = typeof document !== 'undefined' ? extractJobOfferData() : null;

  if (typeof window !== 'undefined') {
    window.__resumeTrackerExtractedData = extracted;
    window.__extractJobOfferData = extractJobOfferData;
    window.extractJobOfferData = extractJobOfferData;
  }

  if (typeof global !== 'undefined') {
    global.__resumeTrackerExtractedData = extracted;
    global.__extractJobOfferData = extractJobOfferData;
    global.extractJobOfferData = extractJobOfferData;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractJobOfferData };
  }

  return extracted;
})(typeof globalThis !== 'undefined' ? globalThis : this);
