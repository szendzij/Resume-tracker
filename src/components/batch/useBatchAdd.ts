import { useState, useMemo, useCallback } from 'react';
import { JobApplication, JobStatus } from '../../types';
import {
  parseBatchInput,
  ParsedLinkItem,
  recalculateBatchDuplicates,
} from '../../utils/linkParser';
import { api } from '../../services/api';

export function useBatchAdd(existingApplications: JobApplication[]) {
  const [linksText, setLinksText] = useState('');
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>('Wysłana');
  const [defaultDate, setDefaultDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showPreviewList, setShowPreviewList] = useState(true);
  const [filterPreview, setFilterPreview] = useState<'all' | 'unique' | 'duplicates'>('all');

  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [enrichedItems, setEnrichedItems] = useState<ParsedLinkItem[] | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Parse links using heuristic linkParser
  const baseParseResult = useMemo(() => {
    return parseBatchInput(linksText, existingApplications);
  }, [linksText, existingApplications]);

  const handleTextChange = useCallback(
    (val: string) => {
      setLinksText(val);
      if (enrichedItems) {
        setEnrichedItems(null);
        setAiFeedback(null);
      }
    },
    [enrichedItems]
  );

  // Final parsed result: enriched items or baseParseResult
  const parseResult = useMemo(() => {
    if (enrichedItems && enrichedItems.length > 0) {
      return recalculateBatchDuplicates(enrichedItems, existingApplications);
    }
    return baseParseResult;
  }, [enrichedItems, baseParseResult, existingApplications]);

  // Items to import
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

  // Trigger AI enrichment
  const enrichWithAi = async () => {
    if (baseParseResult.items.length === 0) return;

    setIsAiExtracting(true);
    setAiFeedback(null);

    try {
      const itemsPayload = baseParseResult.items.map((item) => ({
        id: item.id,
        url: item.url,
        title: item.title,
        rawText: item.originalText,
      }));

      const data = await api.batchParse({ items: itemsPayload });

      if (data.results && Array.isArray(data.results)) {
        const aiMap = new Map(data.results.map((r) => [r.id || r.url, r]));

        const updated = baseParseResult.items.map((base) => {
          const aiItem = aiMap.get(base.id) || aiMap.get(base.url);
          if (aiItem) {
            return {
              ...base,
              role: aiItem.role || base.role,
              company: aiItem.company || base.company,
              location: aiItem.location || base.location,
              portal: aiItem.portal || base.portal,
              skills: aiItem.skills || base.skills,
              notes: aiItem.notes || base.notes,
              isAiEnriched: true,
              source: (aiItem.source as any) || 'gemini',
            };
          }
          return base;
        });

        setEnrichedItems(updated);
        setAiFeedback({
          type: 'success',
          text: `Pomyślnie wzbogacono ${data.results.length} ofert za pomocą modelu Gemini AI!`,
        });
      }
    } catch (e: any) {
      console.error(e);
      setAiFeedback({
        type: 'error',
        text: 'Wystąpił błąd podczas analizy przez AI. Zachowano dane wyciągnięte ze struktury linków.',
      });
    } finally {
      setIsAiExtracting(false);
    }
  };

  const updateItemDetails = (id: string, updates: Partial<ParsedLinkItem>) => {
    const list = enrichedItems || baseParseResult.items;
    const updated = list.map((item) => (item.id === id ? { ...item, ...updates } : item));
    setEnrichedItems(updated);
  };

  return {
    linksText,
    setLinksText: handleTextChange,
    defaultStatus,
    setDefaultStatus,
    defaultDate,
    setDefaultDate,
    skipDuplicates,
    setSkipDuplicates,
    showPreviewList,
    setShowPreviewList,
    filterPreview,
    setFilterPreview,
    isAiExtracting,
    enrichedItems,
    aiFeedback,
    parseResult,
    itemsToImport,
    filteredPreviewItems,
    enrichWithAi,
    updateItemDetails,
  };
}
