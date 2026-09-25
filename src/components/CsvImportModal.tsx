import React, { useState, useMemo, useRef } from 'react';
import { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, STATUS_CONFIG, formatPolishDate } from '../utils/statusConfig';
import {
  parseCsvApplications,
  downloadSampleCsvTemplate,
  Delimiter,
  ColumnMapping,
  TargetField,
} from '../services/csvImport.service';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Settings2,
  ExternalLink,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingApplications: JobApplication[];
  onImportApplications: (newApps: JobApplication[], duplicatesSkipped: number) => void;
}

type TabMode = 'file' | 'paste';

const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  role: 'Stanowisko / Rola (Wymagane)',
  company: 'Firma / Pracodawca (Wymagane)',
  portal: 'Portal / Serwis rekrutacyjny',
  appliedDate: 'Data wysłania CV',
  status: 'Status aplikacji',
  location: 'Lokalizacja / Miasto',
  salary: 'Widełki wynagrodzenia',
  skills: 'Technologie / Umiejętności',
  url: 'Link do oferty URL',
  notes: 'Notatki / Komentarz',
  ignore: '-- Ignoruj tę kolumnę --',
};

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
  React.useEffect(() => {
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
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Import danych z pliku CSV
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wczytaj plik CSV z historią zgłoszeń lub wklej treść. Automatycznie mapujemy kolumny i wykrywamy duplikaty.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleCsvTemplate}
              title="Pobierz gotowy szablon CSV do wypełnienia w Excelu lub arkuszach"
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Pobierz szablon CSV</span>
              <span className="sm:hidden">Szablon</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Tabs: File Upload vs Text Paste */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'file'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Wgraj plik (.csv)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Wklej treść CSV</span>
              </button>
            </div>

            {!rawCsvText && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Załaduj przykładowe dane CSV</span>
              </button>
            )}
          </div>

          {/* Upload Dropzone */}
          {activeTab === 'file' && (
            <div>
              {fileName ? (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {fileName}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Rozmiar: {fileSize} • Wykryto {parseResult?.totalRows || 0} wierszy
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Zmień plik
                    </button>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Usuń wczytany plik"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Przeciągnij i upuść plik CSV tutaj
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
                    Obsługuje standardowy format CSV z Excela, NoFluffJobs, LinkedIn lub z wyeksportowanych raportów (.csv).
                  </p>
                  <span className="inline-block px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                    Wybierz plik z dysku
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Paste Raw CSV Area */}
          {activeTab === 'paste' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Wklej surowy tekst CSV (pierwszy wiersz powinien zawierać nazwy kolumn)
                </label>
                {rawCsvText && (
                  <button
                    type="button"
                    onClick={() => setRawCsvText('')}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Wyczyść
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={rawCsvText}
                onChange={(e) => {
                  setRawCsvText(e.target.value);
                  setFileName('wklejony-tekst.csv');
                }}
                placeholder="Stanowisko;Firma;Portal;Data wyslania CV;Status;Lokalizacja;Widelki;Technologie;Link;Notatki&#10;Software Engineer;Allegro;Pracuj.pl;2026-03-10;Rozmowa HR;Warszawa;22 000 PLN;React, TypeScript;https://..."
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          )}

          {/* Configuration Options */}
          {rawCsvText && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Delimiter */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Separator kolumn
                  </label>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value as Delimiter)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="auto">
                      Automatyczny ({parseResult ? `wykryto: "${parseResult.delimiterUsed}"` : 'detekcja'})
                    </option>
                    <option value=";">Średnik (;) [Polska / Excel]</option>
                    <option value=",">Przecinek (,) [US / Standard]</option>
                    <option value="&#9;">Tabulacja (\t)</option>
                    <option value="|">Kreska pionowa (|)</option>
                  </select>
                </div>

                {/* Default Status */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Domyślny status (dla pustych)
                  </label>
                  <select
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value as JobStatus)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Domyślna data wysłania
                  </label>
                  <input
                    type="date"
                    value={defaultDate}
                    onChange={(e) => setDefaultDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Toggle Column Mappings */}
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setShowMappingConfig(!showMappingConfig)}
                    className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Dopasuj kolumny ({parseResult?.headers.length || 0})</span>
                    {showMappingConfig ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                    )}
                  </button>
                </div>
              </div>

              {/* Skip duplicates toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Automatycznie odznacz wykryte duplikaty ofert (weryfikacja wg linku URL, firmy, stanowiska, portalu i daty)
                  </span>
                </label>

                {duplicateItems.length > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    Wykryto {duplicateItems.length} duplikatów
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Column Mapping Config */}
          {rawCsvText && showMappingConfig && parseResult && (
            <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/60 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mapowanie kolumn z pliku CSV na pola aplikacji
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500">
                  Dopasowano automatycznie. W razie potrzeby możesz zmienić przypisanie.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {parseResult.headers.map((header) => {
                  const currentMapping =
                    customMappings.find((m) => m.csvHeader === header)?.targetField ||
                    parseResult.columnMappings.find((m) => m.csvHeader === header)?.targetField ||
                    'ignore';

                  return (
                    <div
                      key={header}
                      className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs"
                    >
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mb-1">
                        Kolumna w CSV: <span className="text-blue-600 dark:text-blue-400">"{header}"</span>
                      </div>
                      <select
                        value={currentMapping}
                        onChange={(e) => handleUpdateMapping(header, e.target.value as TargetField)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {Object.entries(TARGET_FIELD_LABELS).map(([field, label]) => (
                          <option key={field} value={field}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parseResult && (
            <div className="space-y-3">
              {/* Preview filters and controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      previewFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Wszystkie ({items.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ready')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      previewFilter === 'ready'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    Gotowe do dodania ({items.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate)).length})
                  </button>

                  {duplicateItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('duplicates')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        previewFilter === 'duplicates'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      Duplikaty ({duplicateItems.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Zaznacz widoczne
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllVisible}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Odznacz widoczne
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Brak wierszy spełniających kryteria wybranego filtra.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedRowIds.has(item.id);
                    const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG['Wysłana'];

                    return (
                      <div
                        key={item.id}
                        onClick={() => item.isValid && handleToggleRow(item.id)}
                        className={`p-3 text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                          !item.isValid
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 opacity-75'
                            : isSelected
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!item.isValid}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleRow(item.id);
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                        />

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                              {item.role}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {item.company}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {item.portal}
                            </span>

                            {item.isDuplicate && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex-wrap">
                                <span>⚠️ {item.duplicateReason || 'Duplikat'}</span>
                                {item.duplicateFields && item.duplicateFields.map((f) => (
                                  <span key={f} className="px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900/90 text-amber-950 dark:text-amber-200 text-[9px] font-semibold">
                                    {f === 'url' && 'Link'}
                                    {f === 'company' && 'Firma'}
                                    {f === 'role' && 'Stanowisko'}
                                    {f === 'portal' && 'Portal'}
                                    {f === 'appliedDate' && 'Data'}
                                    {f === 'location' && 'Lokalizacja'}
                                  </span>
                                ))}
                              </span>
                            )}

                            {!item.isValid && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                                {item.validationError}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Data: {formatPolishDate(item.appliedDate)}</span>
                            {item.location && <span>📍 {item.location}</span>}
                            {item.salary && <span className="font-medium text-emerald-600 dark:text-emerald-400">💰 {item.salary}</span>}
                            {item.skills.length > 0 && (
                              <span className="truncate max-w-[200px]">
                                🛠️ {item.skills.join(', ')}
                              </span>
                            )}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-500 hover:underline flex items-center gap-0.5"
                              >
                                Link <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Help Info Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Wskazówka:</strong> Możesz zaimportować plik CSV wyeksportowany z tej aplikacji lub z dowolnego arkusza Excel/Google Sheets. Rozpoznajemy kolumny w języku polskim oraz angielskim (np. Stanowisko, Firma, Portal, Data, Status, Wynagrodzenie, Technologie, Link).
              </p>
            </div>
          </div>
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
