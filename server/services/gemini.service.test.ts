import { describe, it, expect, vi } from 'vitest';
import { parseSingleJobWithGemini, parseBatchChunkWithGemini } from './gemini.service';

describe('server gemini.service', () => {
  it('should parse single job response accurately with Gemini mock', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        role: 'Senior QA Automation',
        company: 'Spyrosoft',
        location: 'Wrocław',
        portal: 'LinkedIn',
        skills: ['Playwright', 'TypeScript', 'BDD'],
        notes: 'Oferta hybrydowa',
      }),
    });

    const mockAi = {
      models: {
        generateContent: mockGenerateContent,
      },
    } as any;

    const result = await parseSingleJobWithGemini(mockAi, {
      portal: 'LinkedIn',
      linkTitle: 'Senior QA Automation | Spyrosoft',
      hints: { company: 'Spyrosoft' },
    });

    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result.role).toBe('Senior QA Automation');
    expect(result.company).toBe('Spyrosoft');
    expect(result.skills).toContain('Playwright');
  });

  it('should parse batch chunk response with index mappings', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify([
        {
          index: 0,
          role: 'Lead QA',
          company: 'Allegro',
          location: 'Warszawa',
          portal: 'NoFluffJobs',
          skills: ['Cypress', 'API'],
          notes: 'Praca zdalna',
        },
      ]),
    });

    const mockAi = {
      models: {
        generateContent: mockGenerateContent,
      },
    } as any;

    const chunk = [
      {
        id: '1',
        url: 'https://nofluffjobs.com/job/lead-qa',
        title: 'Lead QA | Allegro',
      },
    ];

    const result = await parseBatchChunkWithGemini(mockAi, chunk, 0);

    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
    expect(result[0].company).toBe('Allegro');
    expect(result[0].role).toBe('Lead QA');
  });

  it('should initialize GoogleGenAI with custom key if provided', async () => {
    const { getGemini } = await import('./gemini.service');
    const customAi = getGemini('test-custom-api-key-123');
    expect(customAi).not.toBeNull();
  });

  it('should validate API key returning error when key is empty', async () => {
    const { validateGeminiApiKey } = await import('./gemini.service');
    const res = await validateGeminiApiKey('');
    // If ENV.GEMINI_API_KEY is unset or empty, it fails cleanly with validation error
    if (!process.env.GEMINI_API_KEY) {
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    } else {
      expect(res.model).toBe('gemini-3.8-flash');
    }
  });
});
