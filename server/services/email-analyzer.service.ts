import { GoogleGenAI, Type } from '@google/genai';
import { getGemini } from './gemini.service';

export interface EmailAnalysisInput {
  id: string;
  provider: 'outlook' | 'gmail' | 'manual';
  sender: string;
  senderName?: string;
  subject: string;
  date: string;
  snippet?: string;
  body?: string;
}

export interface ApplicationContext {
  id: string;
  company: string;
  role: string;
  status: string;
}

export interface AnalyzedEmailResult {
  emailId: string;
  provider: 'outlook' | 'gmail' | 'manual';
  subject: string;
  sender: string;
  senderName?: string;
  date: string;
  matchedCompany?: string;
  matchedRole?: string;
  currentStatus?: string;
  suggestedStatus: string;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  reasoning: string;
  meetingDate?: string;
  meetingLink?: string;
  actionRequired?: string;
  matchedApplicationId?: string;
  isStatusChange: boolean;
  isNewApplication: boolean;
  newApplicationData?: {
    company: string;
    role: string;
    portal: string;
    location?: string;
  };
  rawExcerpt?: string;
}

export function heuristicEmailAnalysis(
  email: EmailAnalysisInput,
  appList: ApplicationContext[]
): AnalyzedEmailResult {
  const text = `${email.subject} ${email.snippet || ''} ${email.body || ''}`.toLowerCase();
  let suggestedStatus: string = 'Weryfikacja CV';
  let summary = 'Wykryto korespondencję rekrutacyjną';
  let reasoning = 'Wiadomość z procesu rekrutacyjnego';
  let meetingDate: string | undefined;
  let meetingLink: string | undefined;
  let actionRequired: string | undefined;

  if (text.includes('oferta') || text.includes('ofertę') || text.includes('offer')) {
    suggestedStatus = 'Oferta';
    summary = 'Złożono oficjalną ofertę pracy!';
    reasoning = 'E-mail zawiera propozycję zatrudnienia / ofertę współpracy.';
    actionRequired = 'Przeanalizuj warunki i odeślij decyzję';
  } else if (
    text.includes('odrzuc') ||
    text.includes('nie zdecydowaliśmy') ||
    text.includes('z innym kandydatem') ||
    text.includes('innym kandydat') ||
    text.includes('podziękowanie za udział') ||
    text.includes('unfortunately')
  ) {
    suggestedStatus = 'Odrzucona';
    summary = 'Zakończenie procesu rekrutacyjnego (brak dopasowania)';
    reasoning = 'Podziękowanie za udział i decyzja o kontynuacji z innym kandydatem.';
  } else if (
    text.includes('zadanie') ||
    text.includes('techniczne zadanie') ||
    text.includes('task') ||
    text.includes('challenge') ||
    text.includes('codility') ||
    text.includes('hackerrank')
  ) {
    suggestedStatus = 'Zadanie rekrutacyjne';
    summary = 'Przesłano zadanie rekrutacyjne do wykonania';
    reasoning = 'Wiadomość zawiera link do repozytorium lub zadania domowego.';
    actionRequired = 'Wykonaj zadanie techniczne przed wskazanym deadlinem';
  } else if (
    text.includes('rozmow') ||
    text.includes('spotkanie') ||
    text.includes('interview') ||
    text.includes('teams') ||
    text.includes('meet') ||
    text.includes('zaproszenie na')
  ) {
    if (text.includes('techniczn') || text.includes('tech lead') || text.includes('architekt')) {
      suggestedStatus = 'Rozmowa techniczna';
      summary = 'Zaproszenie na rozmowę techniczną';
      reasoning = 'Zaproszenie na wywiad techniczny z zespołem inżynierskim.';
    } else {
      suggestedStatus = 'Rozmowa HR';
      summary = 'Zaproszenie na rozmowę rekrutacyjną / HR';
      reasoning = 'Propozycja spotkania zapoznawczego z rekruterem.';
    }

    if (text.includes('teams.microsoft.com')) meetingLink = 'https://teams.microsoft.com';
    if (text.includes('meet.google.com')) meetingLink = 'https://meet.google.com';
    actionRequired = 'Potwierdź proponowany termin spotkania';
  } else if (text.includes('potwierdzenie') || text.includes('otrzymaliśmy') || text.includes('received your')) {
    suggestedStatus = 'Weryfikacja CV';
    summary = 'Potwierdzenie wpływu aplikacji do systemu pracodawcy';
    reasoning = 'Potwierdzenie rejestracji zgłoszenia przez firmę.';
  }

  // Match with existing application
  const matchedApp = appList.find((app) => {
    const compName = app.company.toLowerCase();
    return (
      text.includes(compName) ||
      email.sender.toLowerCase().includes(compName.replace(/\s+/g, '')) ||
      (email.senderName && email.senderName.toLowerCase().includes(compName))
    );
  });

  const isNew = !matchedApp;
  const isChange = matchedApp ? matchedApp.status !== suggestedStatus : false;

  return {
    emailId: email.id,
    provider: email.provider,
    subject: email.subject,
    sender: email.sender,
    senderName: email.senderName,
    date: email.date,
    matchedCompany: matchedApp?.company || email.senderName || 'Pracodawca',
    matchedRole: matchedApp?.role || 'Inżynier QA',
    currentStatus: matchedApp?.status,
    suggestedStatus,
    confidence: 'medium',
    summary,
    reasoning,
    meetingDate,
    meetingLink,
    actionRequired,
    matchedApplicationId: matchedApp?.id,
    isStatusChange: isChange,
    isNewApplication: isNew,
    newApplicationData: isNew
      ? {
          company: email.senderName || 'Nowa firma',
          role: email.subject.includes('QA') ? 'QA Specialist' : 'Software Engineer',
          portal: email.provider === 'outlook' ? 'Outlook / Email' : 'Gmail / Email',
          location: 'Polska / Remote',
        }
      : undefined,
    rawExcerpt: email.snippet,
  };
}

export async function analyzeEmailsWithAI(
  emails: EmailAnalysisInput[],
  appList: ApplicationContext[]
): Promise<{
  results: AnalyzedEmailResult[];
  analyzedCount: number;
  changesCount: number;
  source: 'gemini' | 'fallback' | 'heuristic';
  warning?: string;
}> {
  const ai = getGemini();

  if (!ai) {
    const results = emails.map((e) => heuristicEmailAnalysis(e, appList));
    return {
      results,
      analyzedCount: results.length,
      changesCount: results.filter((r) => r.isStatusChange).length,
      source: 'heuristic',
    };
  }

  try {
    const appsSummary = appList.map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
    }));

    const emailsSummary = emails.slice(0, 15).map((e, index) => ({
      index,
      id: e.id,
      provider: e.provider,
      sender: e.sender,
      senderName: e.senderName,
      subject: e.subject,
      date: e.date,
      body: (e.body || e.snippet || '').slice(0, 1500),
    }));

    const prompt = `Jesteś ekspertem ds. rekrutacji i analizy korespondencji zawodowej.
Otrzymujesz aktualną listę złożonych przez kandydata aplikacji o pracę oraz listę odebranych wiadomości e-mail (ze skrzynek Outlook i Gmail).

DOZWOLONE STATUSY W TRACKERZE (JobStatus):
- "Wysłana"
- "Weryfikacja CV"
- "Rozmowa HR"
- "Rozmowa techniczna"
- "Zadanie rekrutacyjne"
- "Oferta"
- "Odrzucona"
- "Zrezygnowano"

AKTUALNE APLIKACJE KANDYDATA W SYSTEMIE:
${JSON.stringify(appsSummary, null, 2)}

WIADOMOŚCI E-MAIL DO PRZEANALIZOWANIA:
${JSON.stringify(emailsSummary, null, 2)}

Dla KAŻDEJ wiadomości e-mail (wg indeksu):
1. Zidentyfikuj firmę nadawcy i stanowisko.
2. Dopasuj e-mail do ID istniejącej aplikacji ("matchedApplicationId") z listy kandydata, jeśli e-mail dotyczy tej samej firmy (uwzględnij warianty nazwy, np. "Spyrosoft", "Kuehne+Nagel", "Sportano", "Kadromierz", "co3" itp.). Jeśli nie pasuje do żadnej, ustaw matchedApplicationId na null i oznacz isNewApplication: true.
3. Określ najświeższy i najbardziej adekwatny status rekrutacji ("suggestedStatus") wynikający z treści e-maila:
   - Jeśli to zaproszenie na rozmowę z Tech Leadem / programistami -> "Rozmowa techniczna"
   - Jeśli to rozmowa zapoznawcza / HR -> "Rozmowa HR"
   - Jeśli to zadanie domowe / codility / test -> "Zadanie rekrutacyjne"
   - Jeśli to oficjalna oferta współpracy / list intencyjny -> "Oferta"
   - Jeśli to podziękowanie za udział / odmowa -> "Odrzucona"
   - Jeśli to potwierdzenie wpływu CV -> "Weryfikacja CV"
4. Sprawdź, czy suggestedStatus różni się od currentStatus ("isStatusChange").
5. Wyciągnij kluczowe szczegóły:
   - "summary": zwięzłe podsumowanie w języku polskim (1 zdanie)
   - "reasoning": uzasadnienie statusu (np. "Rekruter zaproponował termin rozmowy technicznej w czwartek")
   - "meetingDate": proponowana data i godzina spotkania (jeśli występuje w treści)
   - "meetingLink": link do spotkania online (np. Teams, Zoom, Google Meet) jeśli występuje
   - "actionRequired": wymagane działanie kandydata (np. "Potwierdź termin rozmowy", "Wyślij rozwiązanie zadania do 26.09")
   - "confidence": "high", "medium" lub "low"`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    });

    const parsedResults: any[] = JSON.parse(aiRes.text || '[]');
    const resultsMap = new Map<number, any>();
    parsedResults.forEach((item) => {
      if (typeof item.index === 'number') resultsMap.set(item.index, item);
    });

    const finalResults: AnalyzedEmailResult[] = emails.map((email, idx) => {
      const aiItem = resultsMap.get(idx);
      if (!aiItem) return heuristicEmailAnalysis(email, appList);

      const matchedApp = appList.find((a) => a.id === aiItem.matchedApplicationId);
      const isStatusChange = matchedApp ? matchedApp.status !== aiItem.suggestedStatus : false;

      return {
        emailId: email.id,
        provider: email.provider,
        subject: email.subject,
        sender: email.sender,
        senderName: email.senderName,
        date: email.date,
        matchedCompany: aiItem.matchedCompany || matchedApp?.company || email.senderName,
        matchedRole: aiItem.matchedRole || matchedApp?.role || 'QA Specialist',
        currentStatus: matchedApp?.status,
        suggestedStatus: aiItem.suggestedStatus,
        confidence: (aiItem.confidence as 'high' | 'medium' | 'low') || 'high',
        summary: aiItem.summary,
        reasoning: aiItem.reasoning,
        meetingDate: aiItem.meetingDate,
        meetingLink: aiItem.meetingLink,
        actionRequired: aiItem.actionRequired,
        matchedApplicationId: aiItem.matchedApplicationId || matchedApp?.id,
        isStatusChange,
        isNewApplication: Boolean(aiItem.isNewApplication && !matchedApp),
        newApplicationData:
          aiItem.isNewApplication && !matchedApp
            ? {
                company: aiItem.matchedCompany || email.senderName || 'Nowa firma',
                role: aiItem.matchedRole || 'Specjalista QA',
                portal: email.provider === 'outlook' ? 'Outlook / Email' : 'Gmail / Email',
                location: 'Polska / Remote',
              }
            : undefined,
        rawExcerpt: (email.body || email.snippet || '').slice(0, 300),
      };
    });

    return {
      results: finalResults,
      analyzedCount: finalResults.length,
      changesCount: finalResults.filter((r) => r.isStatusChange).length,
      source: 'gemini',
    };
  } catch (error: any) {
    console.error('Email analysis error with Gemini:', error);
    const results = emails.map((e) => heuristicEmailAnalysis(e, appList));
    return {
      results,
      analyzedCount: results.length,
      changesCount: results.filter((r) => r.isStatusChange).length,
      source: 'fallback',
      warning: error.message,
    };
  }
}
