// User-related types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

// Team-related types
export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer' | 'guest';
  created_at: string;
  user?: User;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: 'editor' | 'viewer' | 'guest';
  status: 'pending' | 'accepted' | 'rejected';
  invite_code: string;
  created_at: string;
}

// Sheet-related types
export interface SongSection {
  id: string;           // nanoid (클라이언트 생성)
  type: string;         // 'I' | 'V' | 'PC' | 'C' | 'B' | 'O' | 'custom'
  chords: string[];     // ['Am', 'F', 'C', 'G']
  customLabel?: string; // 커스텀 표시 레이블 (있으면 type 기반 자동 번호 대신 사용)
}

export interface FlowItem {
  id: string;       // section id
  repeat?: number;  // 반복 횟수 (없거나 1 = 1회)
}

/** 구버전 string[] flow를 FlowItem[] 으로 정규화 */
export function normalizeFlow(flow: (string | FlowItem)[] | undefined): FlowItem[] {
  return (flow ?? []).map(f => typeof f === 'string' ? { id: f } : f);
}

export interface SongForm {
  id: string;
  sheet_id: string;
  name: string;
  key?: string;
  chord_progression?: string;       // 레거시 텍스트 (하위호환)
  sections?: SongSection[];         // 섹션 정의 (V1, V2 등)
  flow?: FlowItem[];                // 재생 순서 (반복 횟수 포함)
  drawing_data?: unknown[];         // 드로잉 레이어 (DrawPath[])
  memo?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Sheet {
  id: string;
  owner_id: string;
  team_id?: string;
  title: string;
  artist?: string;
  genre?: string;
  key?: string;
  tempo?: number;
  time_signature?: string;
  description?: string;
  active_version_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sheet_versions?: SheetVersion[];
  song_forms?: SongForm[];
}

export interface SheetVersion {
  id: string;
  sheet_id: string;
  file_path: string;
  file_type: 'pdf' | 'image';
  file_size?: number;
  page_count: number;
  version_number: number;
  uploaded_by: string;
  created_at: string;
}

export interface DrawingLayer {
  id: string;
  sheet_version_id: string;
  user_id: string;
  layer_index: number;
  visibility: boolean;
  created_at: string;
}

// Session-related types
export interface Session {
  id: string;
  team_id: string;
  name: string;
  title?: string;
  created_by: string;
  status: 'active' | 'paused' | 'completed';
  current_song_index: number;
  tempo: number;
  started_at: string;
  ended_at?: string;
}

export interface SessionSong {
  id: string;
  session_id: string;
  sheet_version_id: string;
  sequence_order: number;
  notes?: string;
  title?: string;
  artist?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  user_id: string;
  connection_status: 'connected' | 'disconnected' | 'offline';
  is_editing: boolean;
  last_activity: string;
  guest_name?: string;
  user?: User;
}

// Lock-related types
export interface SheetLock {
  id: string;
  sheet_version_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
}

// Drawing-related types
export interface DrawingShape {
  id: string;
  layer_id: string;
  shape_data: Record<string, unknown>;
  created_at: string;
}

// UI and Store-related types
export interface UIState {
  theme: 'light' | 'dark';
  activeTab: 'sheets' | 'sessions' | 'teams';
  sidebarOpen: boolean;
  modals: Record<string, boolean>;
}

export interface DrawingState {
  selectedTool: 'pen' | 'eraser' | 'highlighter';
  brushColor: string;
  brushSize: number;
  localShapes: DrawingShape[];
  history: DrawingShape[][];
  historyIndex: number;
}

export interface SessionFilter {
  searchText: string;
  artist?: string;
  genre?: string;
  sortBy: 'recent' | 'title' | 'artist';
}
