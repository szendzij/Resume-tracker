export type JobStatus =
  | 'Wysłana'
  | 'Weryfikacja CV'
  | 'Rozmowa HR'
  | 'Rozmowa techniczna'
  | 'Zadanie rekrutacyjne'
  | 'Oferta'
  | 'Odrzucona'
  | 'Zrezygnowano';

export interface JobApplication {
  id: string;
  role: string;
  company: string;
  portal: string;
  url: string;
  appliedDate: string; // YYYY-MM-DD
  status: JobStatus;
  location?: string;
  salary?: string;
  skills?: string[];
  notes?: string;
  lastUpdated?: string;
}

export type SortOption =
  | 'appliedDateDesc'
  | 'appliedDateAsc'
  | 'roleAsc'
  | 'roleDesc'
  | 'companyAsc'
  | 'companyDesc'
  | 'portalAsc'
  | 'portalDesc'
  | 'statusAsc'
  | 'statusDesc'
  | 'locationAsc'
  | 'locationDesc';

export interface FilterState {
  search: string;
  status: string; // 'ALL' or specific status
  portal: string; // 'ALL' or specific portal
  dateRange: 'ALL' | '7D' | '14D' | '30D' | 'CUSTOM';
  customStartDate?: string;
  customEndDate?: string;
  sortBy: SortOption;
}
