import React, { useState, useMemo, useEffect } from 'react';
import { JobApplication, JobStatus } from '../types';
import {
  parseRawLinksInput,
  recalculateBatchDuplicates,
  ParsedLinkItem,
} from '../utils/linkParser';
import {
  X,
  Sparkles,
  Loader2,
  ListPlus,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Tag,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchAdd: (newApps: JobApplication[], duplicatesSkipped: number) => void;
  existingApplications?: JobApplication[];
}

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  onBatchAdd,
  existingApplications = [],
}) => {
  const [linksText, setLinksText] = useState('');
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>('Wysłana');
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showPreviewList, setShowPreviewList] = useState(true);
  const [filterPreview, setFilterPreview] = useState<'all' | 'unique' | 'duplicates'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Stored enriched items from AI
  const [enrichedItems, setEnrichedItems] = useState<ParsedLinkItem[] | null>(null);

  // Reset AI enriched state when user changes the raw input text
  const handleTextChange = (text: string) => {
    setLinksText(text);
    if (enrichedItems !== null) {
      setEnrichedItems(null);
      setAiFeedback(null);
    }
  };

  // Base parse from heuristic
  const baseParseResult = useMemo(() => {
    return parseRawLinksInput(linksText, existingApplications);
  }, [linksText, existingApplications]);

  // Active result: either AI-enriched or base heuristic
  const parseResult = useMemo(() => {
    if (enrichedItems && enrichedItems.length > 0) {
      return recalculateBatchDuplicates(enrichedItems, existingApplications);
    }
    return baseParseResult;
  }, [enrichedItems, baseParseResult, existingApplications]);

  if (!isOpen) return null;

  const itemsToImport = skipDuplicates
    ? parseResult.items.filter((it) => !it.isDuplicate)
    : parseResult.items;

  const filteredPreviewItems = parseResult.items.filter((it) => {
    if (filterPreview === 'unique') return !it.isDuplicate;
    if (filterPreview === 'duplicates') return it.isDuplicate;
    return true;
  });

  const isAlreadyEnrichedWithAi =
    enrichedItems !== null && enrichedItems.some((it) => it.isAiEnriched);

  /**
   * "Wyciągnij z AI" - calls server-side Gemini 3.8 Flash to analyze all items in the batch
   */
  const handleExtractWithAi = async () => {
    if (baseParseResult.totalDetected === 0) {
      setAiFeedback({
        type: 'error',
        text: 'Wklej najpierw oferty lub linki, aby wyciągnąć z nich dane przez AI.',
      });
      return;
    }

    setIsAiExtracting(true);
    setAiFeedback(null);

    try {
      const itemsPayload = baseParseResult.items.map((it, idx) => ({
        id: it.id || `item-${idx}`,
        url: it.url,
        title: it.title || it.role,
        rawText: it.originalText,
      }));

      const res = await fetch('/api/batch-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      });

      if (!res.ok) {
        throw new Error('Błąd serwera podczas przetwarzania przez AI');
      }

      const data = await res.json();
      const results: any[] = Array.isArray(data.results) ? data.results : [];

      if (results.length === 0) {
        throw new Error('AI nie zwróciło żadnych wyników');
      }

      // Map enriched fields back onto items
      const resultMap = new Map<string, any>();
      results.forEach((r, idx) => {
        resultMap.set(r.id || String(idx), r);
      });

      const updated = baseParseResult.items.map((item, idx) => {
        const aiItem = resultMap.get(item.id) || results[idx];
        if (aiItem) {
          return {
            ...item,
            role: aiItem.role || item.role,
            company: aiItem.company || item.company,
            location: aiItem.location || item.location,
            portal: aiItem.portal || item.portal,
            skills: Array.isArray(aiItem.skills) && aiItem.skills.length > 0 ? aiItem.skills : item.skills || ['QA', 'Testing'],
            notes: aiItem.notes || item.notes || 'Wyciągnięto przez AI Gemini',
            isAiEnriched: true,
            source: (aiItem.source as any) || 'gemini',
          };
        }
        return {
          ...item,
          isAiEnriched: true,
        };
      });

      setEnrichedItems(updated);
      setAiFeedback({
        type: 'success',
        text: `✨ AI Gemini pomyślnie wyciągnęło dane dla ${results.length} ofert! Zidentyfikowano precyzyjne firmy, role, technologie i lokalizacje.`,
      });
    } catch (err: any) {
      console.error('AI Extraction error:', err);
      setAiFeedback({
        type: 'error',
        text: 'Nie udało się połączyć z modelem AI. Użyto standardowego inteligentnego parsera.',
      });
    } finally {
      setIsAiExtracting(false);
    }
  };

  /**
   * Final batch add to state
   */
  const handleProcessLinks = async (requireAi = false) => {
    if (itemsToImport.length === 0) {
      if (parseResult.totalDetected > 0 && parseResult.duplicateCount === parseResult.totalDetected) {
        alert('Wszystkie wykryte linki to duplikaty, które już znajdują się w Twojej bazie lub na liście!');
      } else {
        alert('Wklej przynajmniej jeden poprawny link lub listę w formacie [Nazwa](https://...)');
      }
      return;
    }

    // If user clicked "Wyciągnij z AI i importuj" and items aren't enriched yet, run AI first!
    if (requireAi && !isAlreadyEnrichedWithAi) {
      setIsLoading(true);
      await handleExtractWithAi();
      setIsLoading(false);
      // Let user review or continue on next click, or proceed if successful:
      return;
    }

    setIsLoading(true);

    const newApplications: JobApplication[] = itemsToImport.map((item, i) => {
      return {
        id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        role: item.role || 'QA Engineer',
        company: item.company || item.portal || 'Firma',
        portal: item.portal || 'Inny portal',
        url: item.url,
        appliedDate: defaultDate,
        status: defaultStatus,
        location: item.location || 'Polska / Remote',
        skills: item.skills && item.skills.length > 0 ? item.skills : ['QA', 'Testing'],
        notes: item.notes || (item.title && item.title !== item.role ? `Zaimportowano: ${item.title}` : 'Dodano masowo.'),
        lastUpdated: new Date().toISOString(),
      };
    });

    setIsLoading(false);
    onBatchAdd(newApplications, parseResult.duplicateCount);
    setLinksText('');
    setEnrichedItems(null);
    onClose();
  };

  const handleInsertSampleMarkdown = () => {
    const sample = `[QA Engineer (BDD & Automation) - Spyrosoft](https://careers.spyro-soft.com/jobs/8118086-qa-engineer-bdd-automation/applications/new)
[Senior QA Engineer Job | Testing | CO3 | Remote | No Fluff Jobs.](https://nofluffjobs.com/job/senior-qa-engineer-co3-remote?utm_source=czyjesteldorado&eclid=1CfB77WQuhDSaxBJg6XoMS)
[Test Automation Engineer - Sportano.com](https://justjoin.it/job-offer/sportano-com-test-automation-engineer-wroclaw-testing)
[Praca Senior QA Engineer | Testing | GFT Poland | Wrocław | No Fluff Jobs.](https://nofluffjobs.com/pl/job/senior-qa-engineer-gft-poland-wroclaw-1)
[QA Engineer - Kadromierz](https://justjoin.it/job-offer/kadromierz-qa-engineer-wroclaw-testing-b5c445cb)
[QA Software Engineering Expert | Comarch | LinkedIn](https://www.linkedin.com/jobs/view/4437190033/)
[Senior Quality Assurance Engineer | Trading 212 | LinkedIn](https://www.linkedin.com/jobs/view/4465687834/)`;
    handleTextChange(sample);
  };

  return (
    <div
      id="batch-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="batch-modal-container"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Masowy import ofert z AI Gemini
                </h2>
                <span className="text-[11px] font-semibold bg-linear-to-r from-violet-600 to-indigo-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Wklej zwykłe linki lub format <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-700">[Tytuł - Firma](link)</code>. Użyj AI, aby wyciągnąć technologie i zweryfikować dane.
              </p>
            </div>
          </div>
          <button
            id="close-batch-modal-btn"
            onClick={onClose}
            disabled={isLoading || isAiExtracting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Wklej oferty / linki:</span>
                <span className="text-slate-400 font-normal">
                  (jeden wpis na wiersz)
                </span>
              </label>
              {!linksText && (
                <button
                  type="button"
                  onClick={handleInsertSampleMarkdown}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Wstaw przykładową listę Markdown
                </button>
              )}
            </div>
            <textarea
              id="batch-links-textarea"
              rows={4}
              disabled={isLoading || isAiExtracting}
              value={linksText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`[QA Engineer (BDD) - Spyrosoft](https://careers.spyro-soft.com/...)\n[Senior QA Engineer | Testing | CO3 | Remote](https://nofluffjobs.com/...)\n[Senior Quality Assurance Engineer | Trading 212 | LinkedIn](https://www.linkedin.com/...)\nlub zwykłe linki URL...`}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* AI Extraction Action Banner */}
          {baseParseResult.totalDetected > 0 && (
            <div
              id="ai-batch-extraction-panel"
              className={`p-3.5 rounded-xl border transition-all ${
                isAlreadyEnrichedWithAi
                  ? 'bg-violet-50/70 border-violet-200'
                  : 'bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-violet-50/60 border-indigo-200/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isAlreadyEnrichedWithAi ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">
                        {isAlreadyEnrichedWithAi
                          ? 'Dane wzbogacone przez AI Gemini'
                          : 'Wyciągnij szczegóły za pomocą AI'}
                      </h4>
                      {isAlreadyEnrichedWithAi && (
                        <span className="text-[10px] bg-violet-200/70 text-violet-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-violet-600" />
                          Przeanalizowano ({enrichedItems?.length})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {isAlreadyEnrichedWithAi
                        ? 'Wyodrębniono dokładne nazwy pracodawców, lokalizacje, technologie i notatki.'
                        : 'Gemini rozpozna faktyczną firmę z linku, technologie (Playwright, Python itp.), miasto oraz rolę.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <button
                    id="trigger-batch-ai-btn"
                    type="button"
                    onClick={handleExtractWithAi}
                    disabled={isAiExtracting || isLoading || baseParseResult.totalDetected === 0}
                    className={`w-full sm:w-auto px-3.5 py-2 text-xs font-medium rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isAlreadyEnrichedWithAi
                        ? 'bg-white hover:bg-slate-50 text-violet-700 border border-violet-200'
                        : 'bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {isAiExtracting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analiza przez AI...</span>
                      </>
                    ) : isAlreadyEnrichedWithAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Odśwież analizę AI</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Wyciągnij z AI ({baseParseResult.uniqueCount})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {aiFeedback && (
                <div
                  className={`mt-2.5 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                    aiFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {aiFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  )}
                  <span>{aiFeedback.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats & duplicate counter */}
          {parseResult.totalDetected > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{parseResult.totalDetected}</span>
                    <span>wykrytych</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{parseResult.uniqueCount} unikalnych</span>
                  </div>
                  {parseResult.duplicateCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{parseResult.duplicateCount} {parseResult.duplicateCount === 1 ? 'duplikat' : 'duplikaty'}</span>
                    </div>
                  )}
                  {isAlreadyEnrichedWithAi && (
                    <span className="text-xs text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Gotowe
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreviewList(!showPreviewList)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {showPreviewList ? (
                    <>
                      <span>Zwiń listę</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Rozwiń podgląd ({parseResult.totalDetected})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Duplicate Filter Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1 border-t border-slate-200/60">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700">
                  Automatycznie pomijaj duplikaty
                </span>
                <span className="text-[11px] text-slate-400">
                  (nie doda ofert o tym samym linku lub stanowisku i firmie)
                </span>
              </label>

              {/* Preview item list */}
              {showPreviewList && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Podgląd ofert do zaimportowania:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterPreview('all')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterPreview === 'all'
                            ? 'bg-slate-200 font-semibold text-slate-900'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        Wszystkie ({parseResult.totalDetected})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreview('unique')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterPreview === 'unique'
                            ? 'bg-emerald-100 font-semibold text-emerald-900'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        Unikalne ({parseResult.uniqueCount})
                      </button>
                      {parseResult.duplicateCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterPreview('duplicates')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            filterPreview === 'duplicates'
                              ? 'bg-amber-100 font-semibold text-amber-900'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          Duplikaty ({parseResult.duplicateCount})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                    {filteredPreviewItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`pt-2 pb-1.5 flex items-start justify-between gap-3 text-xs ${
                          item.isDuplicate && skipDuplicates ? 'opacity-60 bg-amber-50/40 p-2 rounded-lg' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {item.role}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-blue-900 font-medium">
                              {item.company}
                            </span>

                            {item.location && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {item.location}
                              </span>
                            )}

                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                              {item.portal}
                            </span>

                            {item.isAiEnriched && (
                              <span className="text-[10px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                AI
                              </span>
                            )}
                          </div>

                          {/* Extracted skills tags */}
                          {item.skills && item.skills.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {item.skills.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {item.url}
                          </p>

                          {item.isDuplicate && (
                            <p className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{item.duplicateReason}</span>
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 pt-0.5">
                          {item.isDuplicate ? (
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Duplikat {skipDuplicates ? '(pominięty)' : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Gotowy
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Defaults grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Domyślny status dla dodawanych
              </label>
              <select
                value={defaultStatus}
                disabled={isLoading || isAiExtracting}
                onChange={(e) => setDefaultStatus(e.target.value as JobStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              >
                <option value="Wysłana">Wysłana</option>
                <option value="Weryfikacja CV">Weryfikacja CV</option>
                <option value="Rozmowa HR">Rozmowa HR</option>
                <option value="Rozmowa techniczna">Rozmowa techniczna</option>
                <option value="Zadanie rekrutacyjne">Zadanie rekrutacyjne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Data wysłania CV
              </label>
              <input
                type="date"
                disabled={isLoading || isAiExtracting}
                value={defaultDate}
                onChange={(e) => setDefaultDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <div className="text-xs text-slate-500">
            {itemsToImport.length > 0 ? (
              <span>
                Do zaimportowania: <strong className="text-slate-900">{itemsToImport.length}</strong> ofert
                {parseResult.duplicateCount > 0 && skipDuplicates && (
                  <span className="text-amber-700 ml-1.5">
                    ({parseResult.duplicateCount} duplikatów pominiętych)
                  </span>
                )}
              </span>
            ) : (
              <span>Wklej linki, aby rozpocząć</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              id="cancel-batch-btn"
              type="button"
              onClick={onClose}
              disabled={isLoading || isAiExtracting}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Anuluj
            </button>

            {/* If not yet AI enriched, offer both direct import and AI extract & import */}
            {!isAlreadyEnrichedWithAi ? (
              <>
                <button
                  id="start-batch-fast-btn"
                  type="button"
                  onClick={() => handleProcessLinks(false)}
                  disabled={isLoading || isAiExtracting || itemsToImport.length === 0}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  title="Szybki import ze standardowym parserem bez czekania na AI"
                >
                  Szybki import
                </button>
                <button
                  id="start-batch-ai-import-btn"
                  type="button"
                  onClick={() => handleProcessLinks(true)}
                  disabled={isLoading || isAiExtracting || itemsToImport.length === 0}
                  className="px-4 py-2 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isAiExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Wyciągam z AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Wyciągnij z AI i importuj ({itemsToImport.length})</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                id="start-batch-btn"
                type="button"
                onClick={() => handleProcessLinks(false)}
                disabled={isLoading || isAiExtracting || itemsToImport.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Zapisywanie...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importuj {itemsToImport.length > 0 ? `(${itemsToImport.length})` : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
