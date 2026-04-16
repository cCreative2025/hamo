import { create } from 'zustand';
import { Session, SessionSong, SessionItem, Participant } from '@/types';
import { supabase } from '@/lib/supabase';

// Draft item type used in session editor (client-side only)
export type DraftItem =
  | { localId: string; type: 'song'; sheetId: string; songFormId?: string; sheetTitle: string; songFormName?: string; artist?: string }
  | { localId: string; type: 'ment'; text: string };

interface SessionStore {
  // Session list
  sessions: Session[];
  isLoading: boolean;
  error: string | null;

  // Session detail (player / editor)
  currentSession: Session | null;
  items: SessionItem[];
  setlist: SessionSong[];
  currentSongIndex: number;
  tempo: number;
  participants: Participant[];
  lockStatus: { lockedBy: string | null; lockedAt: string | null } | null;

  // Setters
  setCurrentSession: (session: Session | null) => void;
  setCurrentSongIndex: (index: number) => void;
  setTempo: (tempo: number) => void;
  setParticipants: (participants: Participant[]) => void;
  setLockStatus: (status: { lockedBy: string | null; lockedAt: string | null } | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Session list actions
  loadSessions: () => Promise<void>;
  loadSessionsByTeam: (teamId: string) => Promise<Session[]>;
  createSession: (name: string, teamId?: string) => Promise<Session>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Session detail actions
  loadSessionWithItems: (sessionId: string) => Promise<void>;
  saveItems: (sessionId: string, teamId: string, items: DraftItem[]) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;

  // Player actions (legacy)
  goToNextSong: () => void;
  goToPreviousSong: () => void;
  updateTempo: (tempo: number) => Promise<void>;
  acquireLock: (sheetVersionId: string) => Promise<boolean>;
  releaseLock: (sheetVersionId: string) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  isLoading: false,
  error: null,
  currentSession: null,
  items: [],
  setlist: [],
  currentSongIndex: 0,
  tempo: 100,
  participants: [],
  lockStatus: null,

  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentSongIndex: (index) => set({ currentSongIndex: index }),
  setTempo: (tempo) => set({ tempo }),
  setParticipants: (participants) => set({ participants }),
  setLockStatus: (status) => set({ lockStatus: status }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load sessions the user created OR sessions belonging to their teams
      const { data: memberRows } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      const teamIds = (memberRows || []).map((r: any) => r.team_id);

      let query = supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (teamIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},team_id.in.(${teamIds.join(',')})`);
      } else {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ sessions: data || [], isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load sessions', isLoading: false });
    }
  },

  loadSessionsByTeam: async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('team_id', teamId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  createSession: async (name: string, teamId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload: Record<string, unknown> = {
        name,
        title: name,
        created_by: user.id,
        status: 'active',
        current_song_index: 0,
        started_at: new Date().toISOString(),
      };
      if (teamId) payload.team_id = teamId;

      const { data, error } = await supabase
        .from('sessions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        sessions: [data, ...state.sessions],
        isLoading: false,
      }));

      return data;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create session', isLoading: false });
      throw error;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await supabase.from('session_songs').delete().eq('session_id', sessionId);
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      set((state) => ({ sessions: state.sessions.filter(s => s.id !== sessionId) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete session' });
      throw error;
    }
  },

  loadSessionWithItems: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('session_songs')
        .select('*, sheet:sheets(id, title, artist, key, tempo, song_forms(id, name, key, tempo))')
        .eq('session_id', sessionId)
        .order('sequence_order', { ascending: true });

      if (itemsError) throw itemsError;

      // Map DB rows to SessionItem shape
      const items: SessionItem[] = (itemsData || []).map((row: any) => ({
        id: row.id,
        session_id: row.session_id,
        type: row.type || 'song',
        sequence_order: row.sequence_order,
        sheet_id: row.sheet_id,
        song_form_id: row.song_form_id,
        sheet: row.sheet || undefined,
        song_form: row.sheet?.song_forms?.find((f: any) => f.id === row.song_form_id),
        ment_text: row.ment_text,
        created_at: row.created_at,
      }));

      set({ currentSession: sessionData, items, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load session', isLoading: false });
    }
  },

  saveItems: async (sessionId: string, teamId: string, draftItems: DraftItem[]) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Update session metadata
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ team_id: teamId || null })
        .eq('id', sessionId);
      if (sessionError) throw sessionError;

      // 2. Delete existing items
      const { error: deleteError } = await supabase
        .from('session_songs')
        .delete()
        .eq('session_id', sessionId);
      if (deleteError) throw deleteError;

      // 3. Insert new items
      if (draftItems.length > 0) {
        const rows = draftItems.map((item, i) =>
          item.type === 'song'
            ? {
                session_id: sessionId,
                type: 'song',
                sheet_id: item.sheetId,
                song_form_id: item.songFormId || null,
                sequence_order: i,
              }
            : {
                session_id: sessionId,
                type: 'ment',
                ment_text: item.text,
                sequence_order: i,
              }
        );

        const { error: insertError } = await supabase.from('session_songs').insert(rows);
        if (insertError) throw insertError;
      }

      // Refresh
      await get().loadSessionWithItems(sessionId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save session', isLoading: false });
      throw error;
    }
  },

  endSession: async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      set({ currentSession: null, items: [], currentSongIndex: 0 });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to end session' });
    }
  },

  goToNextSong: () => {
    set((state) => ({
      currentSongIndex: Math.min(state.currentSongIndex + 1, state.setlist.length - 1),
    }));
  },

  goToPreviousSong: () => {
    set((state) => ({
      currentSongIndex: Math.max(state.currentSongIndex - 1, 0),
    }));
  },

  updateTempo: async (tempo: number) => {
    try {
      const { currentSession } = get();
      if (!currentSession) throw new Error('No active session');
      const { error } = await supabase.from('sessions').update({ tempo }).eq('id', currentSession.id);
      if (error) throw error;
      set({ tempo });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update tempo' });
    }
  },

  acquireLock: async (sheetVersionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sheet_locks')
        .insert([{
          sheet_version_id: sheetVersionId,
          locked_by: user.id,
          locked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) {
        set({ lockStatus: { lockedBy: null, lockedAt: null } });
        return false;
      }

      set({ lockStatus: { lockedBy: user.id, lockedAt: data.locked_at } });
      return true;
    } catch {
      return false;
    }
  },

  releaseLock: async (sheetVersionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('sheet_locks').delete()
        .eq('sheet_version_id', sheetVersionId)
        .eq('locked_by', user.id);
      set({ lockStatus: null });
    } catch {
      // ignore
    }
  },
}));
