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

export type EmailProvider = 'outlook' | 'gmail' | 'manual';

export interface EmailMessage {
  id: string;
  provider: EmailProvider;
  sender: string;
  senderName?: string;
  subject: string;
  date: string;
  snippet: string;
  body?: string;
}

export interface EmailAnalysisResult {
  emailId: string;
  provider: EmailProvider;
  subject: string;
  sender: string;
  senderName?: string;
  date: string;
  matchedCompany?: string;
  matchedRole?: string;
  currentStatus?: JobStatus;
  suggestedStatus?: JobStatus;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  reasoning: string;
  meetingDate?: string;
  meetingLink?: string;
  actionRequired?: string;
  matchedApplicationId?: string; // ID of matched existing application
  isStatusChange: boolean;
  isNewApplication: boolean;
  newApplicationData?: {
    role: string;
    company: string;
    portal: string;
    location?: string;
  };
  rawExcerpt?: string;
}
