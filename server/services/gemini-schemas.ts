import { Type } from '@google/genai';

/**
 * Response schema for the single-offer parsing path
 * (parseSingleJobWithGemini). Moved verbatim from gemini.service.ts.
 */
export const singleJobResponseSchema = {
  type: Type.OBJECT,
  properties: {
    role: { type: Type.STRING, description: 'Nazwa stanowiska' },
    company: { type: Type.STRING, description: 'Nazwa firmy (nie portalu!)' },
    location: { type: Type.STRING, description: 'Lokalizacja pracy' },
    salary: {
      type: Type.STRING,
      description:
        'Tylko zwięzła kwota/widełki wynagrodzenia (max 50 znaków, np. "18 000 - 24 000 PLN"). NIGDY treść oferty. Puste "" jeśli brak.',
    },
    workType: { type: Type.STRING, description: 'Tryb pracy: "Zdalnie", "Hybrydowo" lub "Stacjonarnie"' },
    portal: { type: Type.STRING, description: 'Portal rekrutacyjny lub źródło' },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Główne wymagane umiejętności lub technologie',
    },
    notes: { type: Type.STRING, description: 'Krótkie podsumowanie lub notatka' },
  },
  required: ['role', 'company', 'portal'],
};

export const singleJobResponseConfig = {
  responseMimeType: 'application/json',
  responseSchema: singleJobResponseSchema,
};

/**
 * Response schema for the batch offer-parsing path
 * (parseBatchChunkWithGemini). Moved verbatim from gemini.service.ts.
 */
export const batchParseResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      role: { type: Type.STRING },
      company: { type: Type.STRING },
      location: { type: Type.STRING },
      portal: { type: Type.STRING },
      skills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      notes: { type: Type.STRING },
    },
    required: ['index', 'role', 'company'],
  },
};

export const batchParseResponseConfig = {
  responseMimeType: 'application/json',
  responseSchema: batchParseResponseSchema,
};

/**
 * Response schema for the email-analysis path
 * (analyzeEmailsWithAI). Moved verbatim from email-analyzer.service.ts.
 */
export const emailAnalysisResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      matchedApplicationId: { type: Type.STRING },
      matchedCompany: { type: Type.STRING },
      matchedRole: { type: Type.STRING },
      suggestedStatus: { type: Type.STRING },
      confidence: { type: Type.STRING },
      summary: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      meetingDate: { type: Type.STRING },
      meetingLink: { type: Type.STRING },
      actionRequired: { type: Type.STRING },
      isNewApplication: { type: Type.BOOLEAN },
    },
    required: ['index', 'suggestedStatus', 'summary', 'reasoning'],
  },
};

export const emailAnalysisResponseConfig = {
  responseMimeType: 'application/json',
  responseSchema: emailAnalysisResponseSchema,
};
