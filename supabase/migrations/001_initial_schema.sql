-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Supabase Auth와 연결)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id)
);

-- 4. Team Invites Table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- 5. Sheets (악보) Table
CREATE TABLE IF NOT EXISTS sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist TEXT,
  key TEXT,
  tempo INT,
  time_signature TEXT,
  genre TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sheet Versions Table (PDF, 이미지 등 여러 버전 관리)
CREATE TABLE IF NOT EXISTS sheet_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_path TEXT NOT NULL, -- Storage 경로
  file_type TEXT, -- 'pdf', 'image'
  file_size INT,
  page_count INT DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sheet_id, version_number)
);

-- 7. Sessions (세션) Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'ended'
  current_song_index INT DEFAULT 0,
  current_tempo INT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Session Songs (세트리스트) Table
CREATE TABLE IF NOT EXISTS session_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  song_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, song_order)
);

-- 9. Session Participants Table
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_code TEXT, -- Guest 모드일 때 guest_code로 식별
  guest_name TEXT, -- Guest 모드일 때 이름 저장
  role TEXT DEFAULT 'participant', -- 'leader', 'participant'
  status TEXT DEFAULT 'active', -- 'active', 'inactive'
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, user_id)
);

-- 10. Sheet Locks (Pessimistic Lock) Table
CREATE TABLE IF NOT EXISTS sheet_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes'),
  UNIQUE(sheet_id, session_id)
);

-- 11. Drawing Layers Table
CREATE TABLE IF NOT EXISTS drawing_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_version_id UUID NOT NULL REFERENCES sheet_versions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  layer_order INT NOT NULL,
  layer_type TEXT, -- 'annotation', 'highlight', 'drawing'
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sheet_version_id, session_id, layer_order)
);

-- 12. Drawing Shapes Table (Konva.js 드로잉 데이터)
CREATE TABLE IF NOT EXISTS drawing_shapes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layer_id UUID NOT NULL REFERENCES drawing_layers(id) ON DELETE CASCADE,
  shape_data JSONB NOT NULL, -- Konva.js 드로잉 데이터 (x, y, stroke, fill 등)
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Guest Sessions Table
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_count INT DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sheets_owner_id ON sheets(owner_id);
CREATE INDEX idx_sheets_team_id ON sheets(team_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_sessions_team_id ON sessions(team_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_session_songs_session_id ON session_songs(session_id);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_sheet_locks_sheet_id ON sheet_locks(sheet_id);
CREATE INDEX idx_sheet_locks_session_id ON sheet_locks(session_id);
CREATE INDEX idx_drawing_layers_sheet_version_id ON drawing_layers(sheet_version_id);
CREATE INDEX idx_drawing_shapes_layer_id ON drawing_shapes(layer_id);
CREATE INDEX idx_guest_sessions_session_id ON guest_sessions(session_id);
