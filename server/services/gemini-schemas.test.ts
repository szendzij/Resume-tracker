import { describe, it, expect } from 'vitest';
import { Type } from '@google/genai';
import {
  singleJobResponseSchema,
  singleJobResponseConfig,
  batchParseResponseSchema,
  batchParseResponseConfig,
  emailAnalysisResponseSchema,
  emailAnalysisResponseConfig,
} from './gemini-schemas';

describe('gemini-schemas', () => {
  it('exposes the single-job schema with the exact previous shape', () => {
    const s: any = singleJobResponseSchema;
    expect(s.type).toBe(Type.OBJECT);
    expect(s.properties.role.type).toBe(Type.STRING);
    expect(s.properties.company.type).toBe(Type.STRING);
    expect(s.properties.location.type).toBe(Type.STRING);
    expect(s.properties.salary.type).toBe(Type.STRING);
    expect(s.properties.workType.type).toBe(Type.STRING);
    expect(s.properties.portal.type).toBe(Type.STRING);
    expect(s.properties.skills.type).toBe(Type.ARRAY);
    expect(s.properties.skills.items.type).toBe(Type.STRING);
    expect(s.properties.notes.type).toBe(Type.STRING);
    expect(s.required).toEqual(['role', 'company', 'portal']);
    expect(singleJobResponseConfig.responseSchema).toBe(singleJobResponseSchema);
  });

  it('exposes the batch-parse schema with the exact previous shape', () => {
    const s: any = batchParseResponseSchema;
    expect(s.type).toBe(Type.ARRAY);
    expect(s.items.type).toBe(Type.OBJECT);
    expect(s.items.properties.index.type).toBe(Type.INTEGER);
    expect(s.items.properties.role.type).toBe(Type.STRING);
    expect(s.items.properties.company.type).toBe(Type.STRING);
    expect(s.items.properties.location.type).toBe(Type.STRING);
    expect(s.items.properties.portal.type).toBe(Type.STRING);
    expect(s.items.properties.skills.type).toBe(Type.ARRAY);
    expect(s.items.properties.skills.items.type).toBe(Type.STRING);
    expect(s.items.properties.notes.type).toBe(Type.STRING);
    expect(s.items.required).toEqual(['index', 'role', 'company']);
  });

  it('exposes the email-analysis schema with the exact previous shape', () => {
    const s: any = emailAnalysisResponseSchema;
    expect(s.type).toBe(Type.ARRAY);
    expect(s.items.type).toBe(Type.OBJECT);
    expect(s.items.properties.index.type).toBe(Type.INTEGER);
    expect(s.items.properties.matchedApplicationId.type).toBe(Type.STRING);
    expect(s.items.properties.matchedCompany.type).toBe(Type.STRING);
    expect(s.items.properties.matchedRole.type).toBe(Type.STRING);
    expect(s.items.properties.suggestedStatus.type).toBe(Type.STRING);
    expect(s.items.properties.confidence.type).toBe(Type.STRING);
    expect(s.items.properties.summary.type).toBe(Type.STRING);
    expect(s.items.properties.reasoning.type).toBe(Type.STRING);
    expect(s.items.properties.meetingDate.type).toBe(Type.STRING);
    expect(s.items.properties.meetingLink.type).toBe(Type.STRING);
    expect(s.items.properties.actionRequired.type).toBe(Type.STRING);
    expect(s.items.properties.isNewApplication.type).toBe(Type.BOOLEAN);
    expect(s.items.required).toEqual(['index', 'suggestedStatus', 'summary', 'reasoning']);
  });

  it('exposes ready-to-use JSON config objects referencing the schemas', () => {
    expect(batchParseResponseConfig.responseMimeType).toBe('application/json');
    expect(batchParseResponseConfig.responseSchema).toBe(batchParseResponseSchema);
    expect(emailAnalysisResponseConfig.responseMimeType).toBe('application/json');
    expect(emailAnalysisResponseConfig.responseSchema).toBe(emailAnalysisResponseSchema);
  });
});
