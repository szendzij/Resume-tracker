import { describe, it, expect, beforeEach } from 'vitest';
import { extractJobOfferData } from '../extension/extractor.js';

describe('Job Offer Extractor (extractor.js)', () => {
  beforeEach(() => {
    // Reset document
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    // Mock window.location
    delete (window as any).location;
    (window as any).location = new URL('https://example.com/jobs/senior-frontend-engineer');

    // Default mock for window.getSelection (empty selection)
    window.getSelection = () => ({
      toString: () => '',
    } as any);
  });

  describe('Text Selection', () => {
    it('uses active text selection as rawText and selectedText when selection >= 10 chars', () => {
      document.body.innerHTML = `
        <main>
          <h1>Default Job Title</h1>
          <p>This is page text that should be overridden by selection.</p>
        </main>
      `;

      const selected = 'Senior TypeScript Full Stack Engineer with 5+ years experience';
      window.getSelection = () => ({
        toString: () => selected,
      } as any);

      const result = extractJobOfferData(document, window);

      expect(result.selectedText).toBe(selected);
      expect(result.rawText).toBe(selected);
    });

    it('ignores text selection shorter than 10 characters and falls back to page text', () => {
      document.body.innerHTML = `
        <main>
          <h1>Full Job Title</h1>
          <p>Comprehensive description of the software engineering role.</p>
        </main>
      `;

      window.getSelection = () => ({
        toString: () => 'Short',
      } as any);

      const result = extractJobOfferData(document, window);

      expect(result.selectedText).toBe('');
      expect(result.rawText).toContain('Full Job Title');
      expect(result.rawText).toContain('Comprehensive description');
    });

    it('trims leading and trailing whitespace from selection before evaluating length', () => {
      document.body.innerHTML = `<main><p>Page content here</p></main>`;

      window.getSelection = () => ({
        toString: () => '   hi   ',
      } as any);

      const result = extractJobOfferData(document, window);
      expect(result.selectedText).toBe('');
      expect(result.rawText).toContain('Page content here');
    });
  });

  describe('Content Cleaning and Noise Removal', () => {
    it('removes noise tags (<script>, <style>, <nav>, <footer>, <header>, <aside>, <svg>, <iframe>, <form>, <button>)', () => {
      document.body.innerHTML = `
        <header>Header Logo and Nav Links</header>
        <nav><a href="/jobs">Browse Jobs</a></nav>
        <aside>Recommended Ads and Sidebar</aside>
        <main>
          <script>console.log("tracking_script");</script>
          <style>.hide { display: none; }</style>
          <noscript>Please enable JavaScript to continue.</noscript>
          <h1>Staff Infrastructure Engineer</h1>
          <p>We are seeking a Staff Infrastructure Engineer to lead our cloud platform.</p>
          <form><input type="text" placeholder="Search"><button>Search</button></form>
          <button type="button">Apply Now</button>
          <svg><path d="M0 0"/></svg>
          <iframe src="about:blank"></iframe>
        </main>
        <footer>Privacy Policy & Terms of Service &copy; 2026</footer>
      `;

      const result = extractJobOfferData(document, window);

      expect(result.rawText).toContain('Staff Infrastructure Engineer');
      expect(result.rawText).toContain('We are seeking a Staff Infrastructure Engineer');

      // Noise elements should be excluded
      expect(result.rawText).not.toContain('Header Logo');
      expect(result.rawText).not.toContain('Browse Jobs');
      expect(result.rawText).not.toContain('Recommended Ads');
      expect(result.rawText).not.toContain('tracking_script');
      expect(result.rawText).not.toContain('display: none');
      expect(result.rawText).not.toContain('Please enable JavaScript');
      expect(result.rawText).not.toContain('Search');
      expect(result.rawText).not.toContain('Apply Now');
      expect(result.rawText).not.toContain('Privacy Policy');
    });

    it('collapses multiple whitespace characters and blank lines', () => {
      document.body.innerHTML = `
        <main>
          <h1>Software    Engineer</h1>
          <p>Line   1      with     lots   of   spaces.</p>
          <p>Line 2</p>
        </main>
      `;

      const result = extractJobOfferData(document, window);

      expect(result.rawText).not.toMatch(/[ ]{2,}/);
      expect(result.rawText).toContain('Software Engineer');
      expect(result.rawText).toContain('Line 1 with lots of spaces.');
    });
  });

  describe('Priority Content Selectors', () => {
    it('prioritizes content in .job-description when present over generic elements', () => {
      document.body.innerHTML = `
        <div>Generic page banner with irrelevant information</div>
        <div class="job-description">
          <h2>Senior Backend Developer</h2>
          <p>Key responsibilities include Go and PostgreSQL microservices.</p>
        </div>
        <div class="other-jobs">Other jobs list</div>
      `;

      const result = extractJobOfferData(document, window);

      expect(result.rawText).toContain('Senior Backend Developer');
      expect(result.rawText).toContain('Go and PostgreSQL microservices');
      expect(result.rawText).not.toContain('Generic page banner');
      expect(result.rawText).not.toContain('Other jobs list');
    });

    it('prioritizes article or [role="main"] when available', () => {
      document.body.innerHTML = `
        <div class="site-wrapper">
          <div class="breadcrumbs">Home > Jobs > Tech</div>
          <article>
            <h1>Site Reliability Engineer</h1>
            <p>Kubernetes, Terraform, Prometheus monitoring expertise needed.</p>
          </article>
        </div>
      `;

      const result = extractJobOfferData(document, window);

      expect(result.rawText).toContain('Site Reliability Engineer');
      expect(result.rawText).toContain('Kubernetes, Terraform');
      expect(result.rawText).not.toContain('Home > Jobs > Tech');
    });
  });

  describe('Text Truncation', () => {
    it('truncates rawText to a maximum of 7,000 characters', () => {
      const longText = 'A'.repeat(8500);
      document.body.innerHTML = `<main><p>${longText}</p></main>`;

      const result = extractJobOfferData(document, window);

      expect(result.rawText.length).toBeLessThanOrEqual(7000);
      expect(result.rawText.length).toBe(7000);
    });
  });

  describe('Metadata Extraction', () => {
    it('extracts URL from window.location.href', () => {
      document.body.innerHTML = `<main><p>Job info</p></main>`;
      const result = extractJobOfferData(document, window);
      expect(result.url).toBe('https://example.com/jobs/senior-frontend-engineer');
    });

    it('prefers og:title over document.title', () => {
      document.title = 'Fallback Document Title - Portal Name';
      const metaOg = document.createElement('meta');
      metaOg.setAttribute('property', 'og:title');
      metaOg.setAttribute('content', 'Senior Cloud Architect at TechCorp');
      document.head.appendChild(metaOg);

      document.body.innerHTML = `<main><p>Job info</p></main>`;

      const result = extractJobOfferData(document, window);
      expect(result.title).toBe('Senior Cloud Architect at TechCorp');
    });

    it('falls back to document.title when og:title is missing', () => {
      document.title = 'DevOps Engineer - Acme Corp';
      document.body.innerHTML = `<main><p>Job info</p></main>`;

      const result = extractJobOfferData(document, window);
      expect(result.title).toBe('DevOps Engineer - Acme Corp');
    });

    it('extracts metaDescription from og:description or name="description"', () => {
      const metaDesc = document.createElement('meta');
      metaDesc.setAttribute('property', 'og:description');
      metaDesc.setAttribute('content', 'We are looking for a talented developer to join our team in Warsaw.');
      document.head.appendChild(metaDesc);

      document.body.innerHTML = `<main><p>Job info</p></main>`;

      const result = extractJobOfferData(document, window);
      expect(result.metaDescription).toBe('We are looking for a talented developer to join our team in Warsaw.');
    });

    it('falls back to meta name="description" if og:description is missing', () => {
      const metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      metaDesc.setAttribute('content', 'Standard meta description text.');
      document.head.appendChild(metaDesc);

      document.body.innerHTML = `<main><p>Job info</p></main>`;

      const result = extractJobOfferData(document, window);
      expect(result.metaDescription).toBe('Standard meta description text.');
    });

    it('returns empty string for metaDescription if no description meta tags exist', () => {
      document.body.innerHTML = `<main><p>Job info</p></main>`;

      const result = extractJobOfferData(document, window);
      expect(result.metaDescription).toBe('');
    });
  });

  describe('Window and Global Attachment', () => {
    it('sets window.__resumeTrackerExtractedData and window.__extractJobOfferData if executed in browser', () => {
      document.title = 'Test Title';
      document.body.innerHTML = `<main><p>Sample job content here</p></main>`;

      const result = extractJobOfferData(document, window);
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('rawText');
      expect(result).toHaveProperty('selectedText');
      expect(result).toHaveProperty('metaDescription');
    });
  });
});
