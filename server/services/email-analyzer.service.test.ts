import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  heuristicEmailAnalysis,
  analyzeEmailsWithAI,
  EmailAnalysisInput,
  ApplicationContext,
} from './email-analyzer.service';
import * as geminiModule from './gemini.service';

vi.mock('./gemini.service', () => ({
  getGemini: vi.fn(),
}));

describe('server email-analyzer.service', () => {
  const existingApps: ApplicationContext[] = [
    {
      id: 'app-spyrosoft',
      company: 'Spyrosoft',
      role: 'QA Automation Engineer',
      status: 'Wysłana',
    },
    {
      id: 'app-allegro',
      company: 'Allegro',
      role: 'Senior QA',
      status: 'Rozmowa HR',
    },
  ];

  describe('heuristicEmailAnalysis', () => {
    it('should detect technical interview and match existing company', () => {
      const email: EmailAnalysisInput = {
        id: 'email-1',
        provider: 'outlook',
        sender: 'rekrutacja@spyro-soft.com',
        senderName: 'Spyrosoft HR Team',
        subject: 'Zaproszenie na rozmowę techniczną - Spyrosoft',
        date: '2026-03-20',
        snippet: 'Zapraszamy na spotkanie z naszym Tech Leadem. Link: https://teams.microsoft.com/meet/123',
      };

      const result = heuristicEmailAnalysis(email, existingApps);

      expect(result.matchedApplicationId).toBe('app-spyrosoft');
      expect(result.suggestedStatus).toBe('Rozmowa techniczna');
      expect(result.isStatusChange).toBe(true);
      expect(result.meetingLink).toBe('https://teams.microsoft.com');
      expect(result.actionRequired).toContain('Potwierdź');
    });

    it('should detect job offer and flag status change', () => {
      const email: EmailAnalysisInput = {
        id: 'email-2',
        provider: 'gmail',
        sender: 'hr@allegro.pl',
        senderName: 'Allegro Careers',
        subject: 'Oficjalna oferta pracy w Allegro',
        date: '2026-03-22',
        snippet: 'Mamy przyjemność przedstawić ofertę współpracy na stanowisku Senior QA.',
      };

      const result = heuristicEmailAnalysis(email, existingApps);

      expect(result.matchedApplicationId).toBe('app-allegro');
      expect(result.suggestedStatus).toBe('Oferta');
      expect(result.isStatusChange).toBe(true);
    });

    it('should detect rejection email', () => {
      const email: EmailAnalysisInput = {
        id: 'email-3',
        provider: 'outlook',
        sender: 'jobs@spyro-soft.com',
        subject: 'Podziękowanie za udział w rekrutacji Spyrosoft',
        date: '2026-03-23',
        snippet: 'Niestety zdecydowaliśmy się kontynuować proces z innym kandydatem.',
      };

      const result = heuristicEmailAnalysis(email, existingApps);

      expect(result.suggestedStatus).toBe('Odrzucona');
      expect(result.matchedApplicationId).toBe('app-spyrosoft');
      expect(result.isStatusChange).toBe(true);
    });

    it('should detect coding challenge / task', () => {
      const email: EmailAnalysisInput = {
        id: 'email-4',
        provider: 'gmail',
        sender: 'careers@allegro.pl',
        subject: 'Zadanie rekrutacyjne Codility - Allegro',
        date: '2026-03-15',
        snippet: 'Przesyłamy link do zadania domowego na platformie Codility.',
      };

      const result = heuristicEmailAnalysis(email, existingApps);

      expect(result.suggestedStatus).toBe('Zadanie rekrutacyjne');
      expect(result.actionRequired).toContain('zadanie techniczne');
    });

    it('should identify a brand new application when company is not in tracker', () => {
      const email: EmailAnalysisInput = {
        id: 'email-new',
        provider: 'outlook',
        sender: 'recruiter@nordea.com',
        senderName: 'Nordea Bank',
        subject: 'Dziękujemy za aplikację QA Engineer w Nordea',
        date: '2026-03-24',
        snippet: 'Potwierdzenie rejestracji Twojej aplikacji.',
      };

      const result = heuristicEmailAnalysis(email, existingApps);

      expect(result.matchedApplicationId).toBeUndefined();
      expect(result.isNewApplication).toBe(true);
      expect(result.newApplicationData).toBeDefined();
      expect(result.newApplicationData?.company).toBe('Nordea Bank');
    });
  });

  describe('analyzeEmailsWithAI', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fallback gracefully to heuristics when Gemini client is null', async () => {
      vi.mocked(geminiModule.getGemini).mockReturnValue(null);

      const email: EmailAnalysisInput = {
        id: 'e1',
        provider: 'outlook',
        sender: 'info@spyro-soft.com',
        subject: 'Zaproszenie na spotkanie HR Spyrosoft',
        date: '2026-03-20',
        snippet: 'Chcielibyśmy porozmawiać o Twoim doświadczeniu.',
      };

      const response = await analyzeEmailsWithAI([email], existingApps);

      expect(response.results.length).toBe(1);
      expect(response.analyzedCount).toBe(1);
      expect(response.source).toBe('heuristic');
      expect(response.results[0].suggestedStatus).toBe('Rozmowa HR');
    });

    it('should process AI response correctly when Gemini client succeeds', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify([
          {
            index: 0,
            matchedApplicationId: 'app-spyrosoft',
            matchedCompany: 'Spyrosoft',
            matchedRole: 'QA Automation Engineer',
            suggestedStatus: 'Rozmowa techniczna',
            confidence: 'high',
            summary: 'Zaproszenie na rozmowę z Tech Leadem',
            reasoning: 'Spotkanie techniczne online',
            meetingDate: '2026-03-25 10:00',
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/123',
            actionRequired: 'Potwierdź termin',
          },
        ]),
      });

      const mockAi = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as any;

      vi.mocked(geminiModule.getGemini).mockReturnValue(mockAi);

      const email: EmailAnalysisInput = {
        id: 'e1',
        provider: 'outlook',
        sender: 'info@spyro-soft.com',
        subject: 'Rozmowa techniczna QA',
        date: '2026-03-20',
        snippet: 'Zaproszenie na rozmowę',
      };

      const response = await analyzeEmailsWithAI([email], existingApps);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(response.source).toBe('gemini');
      expect(response.results[0].suggestedStatus).toBe('Rozmowa techniczna');
      expect(response.results[0].matchedApplicationId).toBe('app-spyrosoft');
      expect(response.results[0].isStatusChange).toBe(true);
      expect(response.results[0].meetingLink).toBe('https://teams.microsoft.com/l/meetup-join/123');
    });

    it('should fallback to heuristics if Gemini call throws an error', async () => {
      const mockAi = {
        models: {
          generateContent: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        },
      } as any;

      vi.mocked(geminiModule.getGemini).mockReturnValue(mockAi);

      const email: EmailAnalysisInput = {
        id: 'e1',
        provider: 'outlook',
        sender: 'info@spyro-soft.com',
        subject: 'Zaproszenie na rozmowę rekrutacyjną Spyrosoft',
        date: '2026-03-20',
        snippet: 'Spotkanie HR',
      };

      const response = await analyzeEmailsWithAI([email], existingApps);

      expect(response.source).toBe('fallback');
      expect(response.warning).toBe('Rate limit exceeded');
      expect(response.results[0].suggestedStatus).toBe('Rozmowa HR');
    });
  });
});
