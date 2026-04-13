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
export interface Sheet {
  id: string;
  team_id: string;
  title: string;
  artist?: string;
  genre?: string;
  description?: string;
  active_version_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SheetVersion {
  id: string;
  sheet_id: string;
  file_url: string;
  file_type: 'pdf' | 'jpg' | 'png';
  page_count: number;
  tempo?: number;
  key?: string;
  form_labels?: string[];
  version_number: number;
  created_by: string;
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
