import { JobApplication } from '../types';

/**
 * Generates and downloads a CSV file containing job application records.
 */
export function exportApplicationsToCSV(applications: JobApplication[], filename?: string): void {
  const defaultFilename = `aplikacje-praca-${new Date().toISOString().split('T')[0]}.csv`;
  const finalFilename = filename || defaultFilename;

  const headers = [
    'Stanowisko',
    'Firma',
    'Portal',
    'Data wyslania CV',
    'Status',
    'Lokalizacja',
    'Widelki',
    'Technologie',
    'Link',
    'Notatki',
  ];

  const rows = applications.map((item) => [
    `"${(item.role || '').replace(/"/g, '""')}"`,
    `"${(item.company || '').replace(/"/g, '""')}"`,
    `"${(item.portal || '').replace(/"/g, '""')}"`,
    `"${item.appliedDate || ''}"`,
    `"${item.status || ''}"`,
    `"${(item.location || '').replace(/"/g, '""')}"`,
    `"${(item.salary || '').replace(/"/g, '""')}"`,
    `"${(item.skills || []).join(', ').replace(/"/g, '""')}"`,
    `"${(item.url || '').replace(/"/g, '""')}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a complete JSON backup of all job application records.
 */
export function exportApplicationsToJSON(applications: JobApplication[], filename?: string): void {
  const defaultFilename = `job-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
  const finalFilename = filename || defaultFilename;

  const jsonContent = JSON.stringify(applications, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
