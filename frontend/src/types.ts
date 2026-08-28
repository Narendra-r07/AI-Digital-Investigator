export interface Investigation {
  id: number;
  title: string;
  description?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Evidence {
  id: number;
  investigation_id: number;
  filename: string;
  file_type?: string | null;
  file_size?: number;
  file_hash?: string | null;
  processing_status?: string;
  extracted_text?: string | null;
  uploaded_at?: string;
}

export interface SearchResult {
  id?: number;
  evidence_id?: number;
  filename?: string;
  score?: number;
  distance?: number;
  text?: string;
  content?: string;
  extracted_text?: string;
  metadata?: any;
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  evidence?: SearchResult[];
}

export interface TimelineEvent {
  date: string;
  event: string;
  source: string;
  significance?: string;
}

export interface EntitySummary {
  people: string[];
  organizations: string[];
  ips: string[];
  emails: string[];
  dates: string[];
}

export interface DashboardStats {
  investigations: number;
  evidence: number;
  processed: number;
  pending: number;
  failed: number;
}
