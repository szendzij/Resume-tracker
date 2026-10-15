import React, { useState, useMemo, useEffect, useRef } from 'react';
import { JobApplication, JobStatus } from '../types';
import {
  parseCsvApplications,
  Delimiter,
  ColumnMapping,
  TargetField,
} from '../services/csvImport.service';
import { Upload } from 'lucide-react';
import { CsvImportHeader } from './csv-import/CsvImportHeader';
import { CsvImportSourcePicker } from './csv-import/CsvImportSourcePicker';
import { CsvImportSettings } from './csv-import/CsvImportSettings';
import { CsvColumnMapping } from './csv-import/CsvColumnMapping';
import { CsvImportPreview } from './csv-import/CsvImportPreview';
import { CsvImportHints } from './csv-import/CsvImportHints';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingApplications: JobApplication[];
  onImportApplications: (newApps: JobApplication[], duplicatesSkipped: number) => void;
}

type TabMode = 'file' | 'paste';

const SAMPLE_PASTE_DATA = `Stanowisko;Firma;Portal;Data wyslania CV;Status;Lokalizacja;Widelki;Technologie;Link;Notatki
Senior Software Engineer;Allegro;Pracuj.pl;2026-03-10;Rozmowa HR;Warszawa / Hybrydowo;20 000 - 26 000 PLN;TypeScript, React, Node.js, Docker;https://allegro.pl/praca/software-engineer;Rozmowa techniczna planowana na kolejny tydzień
Product Manager;Spyrosoft;NoFluffJobs;2026-03-12;Wysłana;Wrocław / Remote;14 000 - 19 000 PLN;Jira, Agile, Roadmap, Product Discovery;https://spyro-soft.com/career/product-manager;Wysłano CV przez formularz aplikacyjny
Marketing Specialist;GFT Poland;LinkedIn;2026-03-14;Weryfikacja CV;Kraków;8 000 - 12 000 PLN;SEO, Google Ads, Copywriting, Social Media;https://www.linkedin.com/jobs/view/123456;Kontakt od rekruterki z polecenia`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingApplications,
  onImportApplications,
}) => {
  // Tabs & input state
  const [activeTab, setActiveTab] = useState<TabMode>('file');
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Settings
  const [delimiter, setDelimiter] = useState<Delimiter>('auto');
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>('Wysłana');
  const [defaultDate, setDefaultDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Advanced mappings toggle
  const [showMappingConfig, setShowMappingConfig] = useState<boolean>(false);
  const [customMappings, setCustomMappings] = useState<ColumnMapping[]>([]);

  // Selected row IDs for import
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [previewFilter, setPreviewFilter] = useState<'all' | 'ready' | 'duplicates'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV when text, delimiter, defaultStatus, defaultDate, or mappings change
  const parseResult = useMemo(() => {
    if (!rawCsvText.trim()) return null;

    return parseCsvApplications(rawCsvText, existingApplications, {
      delimiter,
      customMappings: customMappings.length > 0 ? customMappings : undefined,
      defaultStatus,
      defaultDate,
    });
  }, [rawCsvText, existingApplications, delimiter, customMappings, defaultStatus, defaultDate]);

  // Sync default selection whenever parseResult items change
  useEffect(() => {
    if (!parseResult) {
      setSelectedRowIds(new Set());
      setCustomMappings([]);
      return;
    }

    // Set initial custom mappings from detected headers
    if (customMappings.length === 0 && parseResult.columnMappings.length > 0) {
      setCustomMappings(parseResult.columnMappings);
    }

    // Auto-select valid items (excluding duplicates if skipDuplicates is checked)
    const initialSelected = new Set<string>();
    parseResult.items.forEach((item) => {
      if (item.isValid) {
        if (!skipDuplicates || !item.isDuplicate) {
          initialSelected.add(item.id);
        }
      }
    });
    setSelectedRowIds(initialSelected);
  }, [parseResult?.totalRows, skipDuplicates]);

  if (!isOpen) return null;

  // Handle file reading
  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setRawCsvText(content);
      setCustomMappings([]);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setRawCsvText('');
    setFileName('');
    setFileSize('');
    setCustomMappings([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = () => {
    setActiveTab('paste');
    setRawCsvText(SAMPLE_PASTE_DATA);
    setFileName('dane-przykladowe.csv');
    setFileSize('1.2 KB');
    setCustomMappings([]);
  };

  // Mapping updates
  const handleUpdateMapping = (header: string, target: TargetField) => {
    setCustomMappings((prev) => {
      const current = prev.length > 0 ? prev : parseResult?.columnMappings || [];
      return current.map((m) => (m.csvHeader === header ? { ...m, targetField: target } : m));
    });
  };

  // Row selection
  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (!parseResult) return;
    const next = new Set(selectedRowIds);
    filteredItems.forEach((it) => {
      if (it.isValid) next.add(it.id);
    });
    setSelectedRowIds(next);
  };

  const handleDeselectAllVisible = () => {
    const next = new Set(selectedRowIds);
    filteredItems.forEach((it) => next.delete(it.id));
    setSelectedRowIds(next);
  };

  // Filtered rows for preview
  const items = parseResult?.items || [];
  const validItems = items.filter((it) => it.isValid);
  const duplicateItems = items.filter((it) => it.isDuplicate);

  const filteredItems = items.filter((item) => {
    if (previewFilter === 'ready') return item.isValid && (!skipDuplicates || !item.isDuplicate);
    if (previewFilter === 'duplicates') return item.isDuplicate;
    return true;
  });

  const selectedCount = selectedRowIds.size;

  // Final submission
  const handleConfirmImport = () => {
    if (!parseResult || selectedCount === 0) return;

    const toImport: JobApplication[] = parseResult.items
      .filter((it) => selectedRowIds.has(it.id) && it.isValid)
      .map((it) => ({
        id: `job-csv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: it.role,
        company: it.company,
        portal: it.portal,
        appliedDate: it.appliedDate,
        status: it.status,
        location: it.location,
        salary: it.salary,
        skills: it.skills,
        url: it.url || '',
        notes: it.notes || '',
        lastUpdated: new Date().toISOString(),
      }));

    const skippedDuplicatesCount = duplicateItems.filter(
      (dup) => !selectedRowIds.has(dup.id)
    ).length;

    onImportApplications(toImport, skippedDuplicatesCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <CsvImportHeader onClose={onClose} />

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <CsvImportSourcePicker
            activeTab={activeTab}
            onTabChange={setActiveTab}
            rawCsvText={rawCsvText}
            fileName={fileName}
            fileSize={fileSize}
            totalRows={parseResult?.totalRows || 0}
            isDragging={isDragging}
            onSetDragging={setIsDragging}
            onDrop={handleDrop}
            onFileInputChange={handleFileInputChange}
            onClearFile={handleClearFile}
            onLoadSample={handleLoadSample}
            onPasteChange={(value) => {
              setRawCsvText(value);
              setFileName('wklejony-tekst.csv');
            }}
            onClearPaste={() => setRawCsvText('')}
            fileInputRef={fileInputRef}
          />

          {/* Configuration Options */}
          {rawCsvText && (
            <CsvImportSettings
              delimiter={delimiter}
              onDelimiterChange={setDelimiter}
              delimiterUsed={parseResult?.delimiterUsed}
              defaultStatus={defaultStatus}
              onDefaultStatusChange={setDefaultStatus}
              defaultDate={defaultDate}
              onDefaultDateChange={setDefaultDate}
              skipDuplicates={skipDuplicates}
              onSkipDuplicatesChange={setSkipDuplicates}
              showMappingConfig={showMappingConfig}
              onToggleMappingConfig={() => setShowMappingConfig(!showMappingConfig)}
              headerCount={parseResult?.headers.length || 0}
              duplicateCount={duplicateItems.length}
            />
          )}

          {/* Collapsible Column Mapping Config */}
          {rawCsvText && showMappingConfig && parseResult && (
            <CsvColumnMapping
              headers={parseResult.headers}
              customMappings={customMappings}
              columnMappings={parseResult.columnMappings}
              onUpdateMapping={handleUpdateMapping}
            />
          )}

          {/* Parsed Preview Table */}
          {parseResult && (
            <CsvImportPreview
              items={items}
              duplicateItems={duplicateItems}
              filteredItems={filteredItems}
              previewFilter={previewFilter}
              onPreviewFilterChange={setPreviewFilter}
              skipDuplicates={skipDuplicates}
              selectedRowIds={selectedRowIds}
              onToggleRow={handleToggleRow}
              onSelectAllVisible={handleSelectAllVisible}
              onDeselectAllVisible={handleDeselectAllVisible}
            />
          )}

          {/* Help Info Box */}
          <CsvImportHints />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {parseResult ? (
              <span>
                Zaznaczono do importu: <strong className="text-blue-600 dark:text-blue-400 font-bold">{selectedCount}</strong> z{' '}
                <strong>{validItems.length}</strong> poprawnych wierszy
              </span>
            ) : (
              <span>Wgraj plik lub wklej treść CSV, aby zobaczyć podgląd.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parseResult || selectedCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Zaimportuj {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
