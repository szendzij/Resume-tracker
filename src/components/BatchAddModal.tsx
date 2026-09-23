import React, { useState, useMemo } from 'react';
import { JobApplication, JobStatus } from '../types';
import {
  parseBatchInput,
  ParsedLinkItem,
  recalculateBatchDuplicates,
} from '../utils/linkParser';
import {
  X,
  ListPlus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Loader2,
  RefreshCw,
  BrainCircuit,
} from 'lucide-react';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingApplications: JobApplication[];
  onBatchAdd: (newApps: JobApplication[], duplicateCount: number) => void;
}

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  existingApplications,
  onBatchAdd,
}) => {
  const [linksText, setLinksText] = useState('');
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>('Wysłana');
  const [defaultDate, setDefaultDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showPreviewList, setShowPreviewList] = useState(true);
  const [filterPreview, setFilterPreview] = useState<
    'all' | 'unique' | 'duplicates'
  >('all');
  const [isLoading, setIsLoading] = useState(false);

  // AI Extraction state
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [enrichedItems, setEnrichedItems] = useState<ParsedLinkItem[] | null>(
    null
  );
  const [aiFeedback, setAiFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Parse links using heuristic linkParser
  const baseParseResult = useMemo(() => {
    return parseBatchInput(linksText, existingApplications);
  }, [linksText, existingApplications]);

  // When links change, reset AI enriched cache unless it's already empty
  const handleTextChange = (val: string) => {
    setLinksText(val);
    if (enrichedItems) {
      setEnrichedItems(null);
      setAiFeedback(null);
    }
  };

  // Final parsed result: enriched items (with duplicates recalculated) or baseParseResult
  const parseResult = useMemo(() => {
    if (enrichedItems && enrichedItems.length > 0) {
      return recalculateBatchDuplicates(enrichedItems, existingApplications);
    }
    return baseParseResult;
  }, [enrichedItems, baseParseResult, existingApplications]);

  // Determine items to import depending on skipDuplicates
  const itemsToImport = useMemo(() => {
    if (skipDuplicates) {
      return parseResult.items.filter((item) => !item.isDuplicate);
    }
    return parseResult.items;
  }, [parseResult, skipDuplicates]);

  // Filter preview items
  const filteredPreviewItems = useMemo(() => {
    if (filterPreview === 'unique') {
      return parseResult.items.filter((item) => !item.isDuplicate);
    }
    if (filterPreview === 'duplicates') {
      return parseResult.items.filter((item) => item.isDuplicate);
    }
    return parseResult.items;
  }, [parseResult, filterPreview]);

  if (!isOpen) return null;

  const isAlreadyEnrichedWithAi = Boolean(
    enrichedItems &&
      enrichedItems.length > 0 &&
      enrichedItems.some((i) => i.isAiEnriched)
  );

  /**
   * AI Extraction: Call `/api/batch-parse`
   */
  const handleExtractWithAi = async () => {
    const rawItems = baseParseResult.items;
    if (rawItems.length === 0) return;

    setIsAiExtracting(true);
    setAiFeedback(null);

    try {
      const itemsPayload = rawItems.map((item, idx) => ({
        id: item.id || `item-${idx}`,
        url: item.url,
        title: item.title,
        portal: item.portal,
        role: item.role,
        company: item.company,
      }));

      const response = await fetch('/api/batch-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error (${response.status})`);
      }

      const data = await response.json();
      const results: Array<any> = data.results || [];

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
            skills:
              Array.isArray(aiItem.skills) && aiItem.skills.length > 0
                ? aiItem.skills
                : item.skills || ['QA', 'Testing'],
            notes:
              aiItem.notes || item.notes || 'Wyciągnięto przez AI Gemini',
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
      if (
        parseResult.totalDetected > 0 &&
        parseResult.duplicateCount === parseResult.totalDetected
      ) {
        alert(
          'Wszystkie wykryte linki to duplikaty, które już znajdują się w Twojej bazie lub na liście!'
        );
      } else {
        alert(
          'Wklej przynajmniej jeden poprawny link lub listę w formacie [Nazwa](https://...)'
        );
      }
      return;
    }

    if (requireAi && !isAlreadyEnrichedWithAi) {
      setIsLoading(true);
      await handleExtractWithAi();
      setIsLoading(false);
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
        skills:
          item.skills && item.skills.length > 0
            ? item.skills
            : ['QA', 'Testing'],
        notes:
          item.notes ||
          (item.title && item.title !== item.role
            ? `Zaimportowano: ${item.title}`
            : 'Dodano masowo.'),
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
[Senior QA Engineer Job | Testing | CO3 | Remote | No Fluff Jobs.](https://nofluffjobs.com/job/senior-qa-engineer-co3-remote)
[Test Automation Engineer - Sportano.com](https://justjoin.it/job-offer/sportano-com-test-automation-engineer-wroclaw-testing)
[Senior Quality Assurance Engineer - Trading 212 | LinkedIn](https://www.linkedin.com/jobs/view/4384501234/)
[Automation Testing Manager in Wrocław | PPG Careers](https://careers.ppg.com/job/wroclaw/automation-testing-manager/12345)`;
    setLinksText(sample);
    if (enrichedItems) setEnrichedItems(null);
  };

  return (
    <div
      id="batch-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="batch-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Masowy import ofert z AI Gemini
                </h2>
                <span className="text-[11px] font-semibold bg-linear-to-r from-violet-600 to-indigo-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wklej zwykłe linki lub format{' '}
                <code className="bg-slate-200/70 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  [Tytuł - Firma](link)
                </code>
                . Użyj AI, aby wyciągnąć technologie i zweryfikować dane.
              </p>
            </div>
          </div>
          <button
            id="close-batch-modal-btn"
            onClick={onClose}
            disabled={isLoading || isAiExtracting}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Wklej oferty / linki:</span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  (jeden wpis na wiersz)
                </span>
              </label>
              {!linksText && (
                <button
                  type="button"
                  onClick={handleInsertSampleMarkdown}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium cursor-pointer"
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
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* AI Extraction Action Banner */}
          {baseParseResult.totalDetected > 0 && (
            <div
              id="ai-batch-extraction-panel"
              className={`p-3.5 rounded-xl border transition-all ${
                isAlreadyEnrichedWithAi
                  ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/60'
                  : 'bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-violet-50/60 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-violet-950/30 border-indigo-200/80 dark:border-indigo-900/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      isAlreadyEnrichedWithAi
                        ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300'
                        : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {isAlreadyEnrichedWithAi
                          ? 'Dane wzbogacone przez AI Gemini'
                          : 'Wyciągnij szczegóły za pomocą AI'}
                      </h4>
                      {isAlreadyEnrichedWithAi && (
                        <span className="text-[10px] bg-violet-200/70 dark:bg-violet-900/80 text-violet-800 dark:text-violet-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                          Przeanalizowano ({enrichedItems?.length})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
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
                    disabled={
                      isAiExtracting ||
                      isLoading ||
                      baseParseResult.totalDetected === 0
                    }
                    className={`w-full sm:w-auto px-3.5 py-2 text-xs font-medium rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isAlreadyEnrichedWithAi
                        ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700'
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {aiFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <span>{aiFeedback.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats & duplicate counter */}
          {parseResult.totalDetected > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {parseResult.totalDetected}
                    </span>
                    <span>wykrytych</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/70 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{parseResult.uniqueCount} unikalnych</span>
                  </div>
                  {parseResult.duplicateCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/70 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        {parseResult.duplicateCount}{' '}
                        {parseResult.duplicateCount === 1
                          ? 'duplikat'
                          : 'duplikaty'}
                      </span>
                    </div>
                  )}
                  {isAlreadyEnrichedWithAi && (
                    <span className="text-xs text-violet-700 dark:text-violet-300 bg-violet-100/80 dark:bg-violet-900/60 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Gotowe
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreviewList(!showPreviewList)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
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
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1 border-t border-slate-200/60 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Automatycznie pomijaj duplikaty
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  (nie doda ofert o tym samym linku lub stanowisku i firmie)
                </span>
              </label>

              {/* Preview item list */}
              {showPreviewList && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Podgląd ofert do zaimportowania:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterPreview('all')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterPreview === 'all'
                            ? 'bg-slate-200 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Wszystkie ({parseResult.totalDetected})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreview('unique')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterPreview === 'unique'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                              ? 'bg-amber-100 dark:bg-amber-950/60 font-semibold text-amber-900 dark:text-amber-200'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Duplikaty ({parseResult.duplicateCount})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredPreviewItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`pt-2 pb-1.5 flex items-start justify-between gap-3 text-xs ${
                          item.isDuplicate && skipDuplicates
                            ? 'opacity-60 bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg'
                            : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.role}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-blue-900 dark:text-blue-300 font-medium">
                              {item.company}
                            </span>

                            {item.location && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {item.location}
                              </span>
                            )}

                            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800/60">
                              {item.portal}
                            </span>

                            {item.isAiEnriched && (
                              <span className="text-[10px] bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-200 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 border border-violet-200 dark:border-violet-800">
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
                                  className="text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-600"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-mono">
                            {item.url}
                          </p>

                          {item.isDuplicate && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{item.duplicateReason}</span>
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 pt-0.5">
                          {item.isDuplicate ? (
                            <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                              Duplikat {skipDuplicates ? '(pominięty)' : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Domyślny status dla dodawanych
              </label>
              <select
                value={defaultStatus}
                disabled={isLoading || isAiExtracting}
                onChange={(e) => setDefaultStatus(e.target.value as JobStatus)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="Wysłana">Wysłana</option>
                <option value="Weryfikacja CV">Weryfikacja CV</option>
                <option value="Rozmowa HR">Rozmowa HR</option>
                <option value="Rozmowa techniczna">Rozmowa techniczna</option>
                <option value="Zadanie rekrutacyjne">Zadanie rekrutacyjne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data wysłania CV
              </label>
              <input
                type="date"
                disabled={isLoading || isAiExtracting}
                value={defaultDate}
                onChange={(e) => setDefaultDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {itemsToImport.length > 0 ? (
              <span>
                Do zaimportowania:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {itemsToImport.length}
                </strong>{' '}
                ofert
                {parseResult.duplicateCount > 0 && skipDuplicates && (
                  <span className="text-amber-700 dark:text-amber-400 ml-1.5">
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
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
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
                  disabled={
                    isLoading || isAiExtracting || itemsToImport.length === 0
                  }
                  className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  title="Szybki import ze standardowym parserem bez czekania na AI"
                >
                  Szybki import
                </button>
                <button
                  id="start-batch-ai-import-btn"
                  type="button"
                  onClick={() => handleProcessLinks(true)}
                  disabled={
                    isLoading || isAiExtracting || itemsToImport.length === 0
                  }
                  className="px-4 py-2 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isAiExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Wyciągam z AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        Wyciągnij z AI i importuj ({itemsToImport.length})
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                id="start-batch-btn"
                type="button"
                onClick={() => handleProcessLinks(false)}
                disabled={
                  isLoading || isAiExtracting || itemsToImport.length === 0
                }
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
                    <span>
                      Importuj{' '}
                      {itemsToImport.length > 0
                        ? `(${itemsToImport.length})`
                        : ''}
                    </span>
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
