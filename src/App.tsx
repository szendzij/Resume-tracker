import React, { useState } from 'react';
import { JobApplication, JobStatus } from './types';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { useApplications } from './hooks/useApplications';
import { useApplicationFilters } from './hooks/useApplicationFilters';
import { useBulkSelection } from './hooks/useBulkSelection';
import { exportApplicationsToCSV } from './services/export.service';

import { AppHeader } from './components/AppHeader';
import { JobStats } from './components/JobStats';
import { FilterBar } from './components/FilterBar';
import { BulkActionsBar } from './components/BulkActionsBar';
import { JobTable } from './components/JobTable';
import { JobKanban } from './components/JobKanban';
import { JobGrid } from './components/JobGrid';

import { JobModal } from './components/JobModal';
import { BatchAddModal } from './components/BatchAddModal';
import { CsvImportModal } from './components/CsvImportModal';
import { InboxSyncModal } from './components/InboxSyncModal';
import { SettingsModal, SettingsTab } from './components/SettingsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BulkDeleteConfirmModal } from './components/BulkDeleteConfirmModal';
import { BulkDateModal } from './components/BulkDateModal';

export const App: React.FC = () => {
  // Theme & Toast hooks
  const { isDark, toggleTheme, setTheme } = useTheme();
  const { toastMessage, showToast } = useToast();

  // Applications data hook
  const {
    applications,
    updateStatus,
    saveApplication,
    deleteApplication,
    addBatchApplications,
    importApplicationsFromJson,
    applyInboxStatusUpdates,
    addNewDiscoveredApp,
    bulkUpdateStatus,
    bulkUpdateDate,
    bulkDelete,
    reAnalyzeWithAi,
  } = useApplications(showToast);

  // Filter, sort & view mode hook
  const {
    filter,
    setFilter,
    updateSort,
    viewMode,
    setViewMode,
    availablePortals,
    filteredApplications,
  } = useApplicationFilters(applications);

  // Bulk selection hook
  const {
    selectedIds,
    selectedApplications,
    allVisibleSelected,
    handleToggleSelect,
    handleSelectAllVisible,
    handleDeselectAll,
    clearDeletedSelections,
  } = useBulkSelection(applications, filteredApplications);

  // Modal states
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isInboxSyncOpen, setIsInboxSyncOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('theme');

  const [deleteConfirmApp, setDeleteConfirmApp] = useState<JobApplication | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDateOpen, setIsBulkDateOpen] = useState(false);

  const handleOpenSettingsModal = (tab: SettingsTab = 'theme') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  // Single job modal triggers
  const handleOpenAddModal = (defaultStatus?: JobStatus) => {
    setEditingJob(defaultStatus ? ({ status: defaultStatus } as JobApplication) : null);
    setIsJobModalOpen(true);
  };

  const handleOpenEditModal = (app: JobApplication) => {
    setEditingJob(app);
    setIsJobModalOpen(true);
  };

  const handleSaveModal = (data: Partial<JobApplication>) => {
    saveApplication(data, editingJob ? editingJob.id : undefined);
    setIsJobModalOpen(false);
    setEditingJob(null);
  };

  // Delete modal triggers
  const handleDeleteRequest = (app: JobApplication) => {
    setDeleteConfirmApp(app);
  };

  const handleConfirmSingleDelete = () => {
    if (!deleteConfirmApp) return;
    deleteApplication(deleteConfirmApp.id, deleteConfirmApp.company);
    clearDeletedSelections([deleteConfirmApp.id]);
    setDeleteConfirmApp(null);
  };

  const handleConfirmBulkDelete = () => {
    bulkDelete(selectedIds);
    handleDeselectAll();
    setIsBulkDeleteOpen(false);
  };

  const handleConfirmBulkDate = (date: string) => {
    bulkUpdateDate(selectedIds, date);
    setIsBulkDateOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      {/* Top Header */}
      <AppHeader
        applicationsCount={applications.length}
        filteredCount={filteredApplications.length}
        onOpenSettings={handleOpenSettingsModal}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenBatchAdd={() => setIsBatchModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* KPI Stats Summary */}
        <JobStats applications={applications} />

        {/* Filter, Search & View Mode Switcher */}
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          applications={applications}
          availablePortals={availablePortals}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Bulk Actions Floating Bar */}
        {selectedIds.length > 0 && (
          <BulkActionsBar
            selectedIds={selectedIds}
            totalVisible={filteredApplications.length}
            allVisibleSelected={allVisibleSelected}
            onSelectAllVisible={handleSelectAllVisible}
            onDeselectAll={handleDeselectAll}
            onBulkStatusChange={(status) => bulkUpdateStatus(selectedIds, status)}
            onOpenBulkDateModal={() => setIsBulkDateOpen(true)}
            onOpenBulkDeleteModal={() => setIsBulkDeleteOpen(true)}
            onBulkExportCSV={() => exportApplicationsToCSV(selectedApplications)}
          />
        )}

        {/* Applications Views */}
        {viewMode === 'table' && (
          <JobTable
            applications={filteredApplications}
            selectedIds={selectedIds}
            sortBy={filter.sortBy}
            onSortChange={updateSort}
            onToggleSelect={handleToggleSelect}
            onSelectAllVisible={handleSelectAllVisible}
            onDeselectAll={handleDeselectAll}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteRequest}
            onStatusChange={updateStatus}
            onReAnalyze={reAnalyzeWithAi}
          />
        )}

        {viewMode === 'kanban' && (
          <JobKanban
            applications={filteredApplications}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onEdit={handleOpenEditModal}
            onDelete={(id, company) => {
              const matched = applications.find((a) => a.id === id);
              if (matched) handleDeleteRequest(matched);
            }}
            onStatusChange={updateStatus}
            onReAnalyzeWithAi={reAnalyzeWithAi}
            onAddNewToStage={(st) => handleOpenAddModal(st)}
          />
        )}

        {viewMode === 'grid' && (
          <JobGrid
            applications={filteredApplications}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteRequest}
            onStatusChange={updateStatus}
            onReAnalyze={reAnalyzeWithAi}
          />
        )}
      </main>

      {/* Modals */}
      <JobModal
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSaveModal}
        initialData={editingJob}
        existingApplications={applications}
      />

      <BatchAddModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        existingApplications={applications}
        onBatchAdd={addBatchApplications}
        onSwitchToCsvImport={() => setIsCsvImportOpen(true)}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        existingApplications={applications}
        onImportApplications={addBatchApplications}
      />

      <InboxSyncModal
        isOpen={isInboxSyncOpen}
        onClose={() => setIsInboxSyncOpen(false)}
        applications={applications}
        onApplyStatusUpdates={applyInboxStatusUpdates}
        onAddNewApplication={addNewDiscoveredApp}
        showToast={showToast}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        isDark={isDark}
        onSetTheme={setTheme}
        applications={applications}
        onOpenCsvImport={() => {
          setIsSettingsOpen(false);
          setIsCsvImportOpen(true);
        }}
        onOpenInboxSync={() => {
          setIsSettingsOpen(false);
          setIsInboxSyncOpen(true);
        }}
        onImportJson={(apps, mode) => {
          importApplicationsFromJson(apps, mode);
        }}
        showToast={showToast}
      />

      {/* Single Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirmApp)}
        application={deleteConfirmApp}
        onClose={() => setDeleteConfirmApp(null)}
        onConfirm={handleConfirmSingleDelete}
      />

      {/* Bulk Delete Confirmation */}
      <BulkDeleteConfirmModal
        isOpen={isBulkDeleteOpen}
        selectedCount={selectedIds.length}
        selectedApps={selectedApplications}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* Bulk Date Modal */}
      <BulkDateModal
        isOpen={isBulkDateOpen}
        selectedCount={selectedIds.length}
        selectedApps={selectedApplications}
        onClose={() => setIsBulkDateOpen(false)}
        onConfirm={handleConfirmBulkDate}
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
