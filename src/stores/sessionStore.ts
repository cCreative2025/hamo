import { create } from 'zustand';
import { Session, SessionSong, Participant } from '@/types';
import { supabase } from '@/lib/supabase';

interface SessionStore {
  currentSession: Session | null;
  setlist: SessionSong[];
  currentSongIndex: number;
  tempo: number;
  participants: Participant[];
  lockStatus: { lockedBy: string | null; lockedAt: string | null } | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentSession: (session: Session | null) => void;
  setSetlist: (songs: SessionSong[]) => void;
  setCurrentSongIndex: (index: number) => void;
  setTempo: (tempo: number) => void;
  setParticipants: (participants: Participant[]) => void;
  setLockStatus: (status: { lockedBy: string | null; lockedAt: string | null } | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Session methods
  createSession: (teamId: string, name: string, setlistSheetIds: string[]) => Promise<Session>;
  loadSession: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  addToSetlist: (sheetVersionId: string) => Promise<void>;
  removeFromSetlist: (index: number) => Promise<void>;
  goToNextSong: () => void;
  goToPreviousSong: () => void;
  updateTempo: (tempo: number) => Promise<void>;
  acquireLock: (sheetVersionId: string) => Promise<boolean>;
  releaseLock: (sheetVersionId: string) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  currentSession: null,
  setlist: [],
  currentSongIndex: 0,
  tempo: 100,
  participants: [],
  lockStatus: null,
  isLoading: false,
  error: null,

  setCurrentSession: (session) => set({ currentSession: session }),
  setSetlist: (songs) => set({ setlist: songs }),
  setCurrentSongIndex: (index) => set({ currentSongIndex: index }),
  setTempo: (tempo) => set({ tempo }),
  setParticipants: (participants) => set({ participants }),
  setLockStatus: (status) => set({ lockStatus: status }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  createSession: async (teamId: string, name: string, setlistSheetIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert([
          {
            team_id: teamId,
            name,
            created_by: user.id,
            status: 'active',
            current_song_index: 0,
            tempo: 100,
            started_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add songs to setlist
      const setlistInserts = setlistSheetIds.map((sheetVersionId, index) => ({
        session_id: sessionData.id,
        sheet_version_id: sheetVersionId,
        sequence_order: index,
      }));

      const { error: setlistError } = await supabase
        .from('session_songs')
        .insert(setlistInserts);

      if (setlistError) throw setlistError;

      set({
        currentSession: sessionData,
        currentSongIndex: 0,
        tempo: 100,
        isLoading: false,
      });

      return sessionData;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create session',
        isLoading: false,
      });
      throw error;
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: setlistData, error: setlistError } = await supabase
        .from('session_songs')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_order', { ascending: true });

      if (setlistError) throw setlistError;

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);

      if (participantError) throw participantError;

      set({
        currentSession: sessionData,
        setlist: setlistData || [],
        participants: participantData || [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },

  endSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      set({
        currentSession: null,
        setlist: [],
        currentSongIndex: 0,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to end session',
        isLoading: false,
      });
    }
  },

  addToSetlist: async (sheetVersionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { currentSession, setlist } = get();
      if (!currentSession) throw new Error('No active session');

      const nextOrder = setlist.length;

      const { data, error } = await supabase
        .from('session_songs')
        .insert([
          {
            session_id: currentSession.id,
            sheet_version_id: sheetVersionId,
            sequence_order: nextOrder,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      set({
        setlist: [...setlist, data],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add to setlist',
        isLoading: false,
      });
    }
  },

  removeFromSetlist: async (index: number) => {
    set({ isLoading: true, error: null });
    try {
      const { setlist } = get();
      const song = setlist[index];

      const { error } = await supabase
        .from('session_songs')
        .delete()
        .eq('id', song.id);

      if (error) throw error;

      set({
        setlist: setlist.filter((_, i) => i !== index),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove from setlist',
        isLoading: false,
      });
    }
  },

  goToNextSong: () => {
    set((state) => ({
      currentSongIndex: Math.min(
        state.currentSongIndex + 1,
        state.setlist.length - 1
      ),
    }));
  },

  goToPreviousSong: () => {
    set((state) => ({
      currentSongIndex: Math.max(state.currentSongIndex - 1, 0),
    }));
  },

  updateTempo: async (tempo: number) => {
    set({ isLoading: true, error: null });
    try {
      const { currentSession } = get();
      if (!currentSession) throw new Error('No active session');

      const { error } = await supabase
        .from('sessions')
        .update({ tempo })
        .eq('id', currentSession.id);

      if (error) throw error;

      set({
        tempo,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update tempo',
        isLoading: false,
      });
    }
  },

  acquireLock: async (sheetVersionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to insert a lock record
      const { data, error } = await supabase
        .from('sheet_locks')
        .insert([
          {
            sheet_version_id: sheetVersionId,
            locked_by: user.id,
            locked_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiry
          },
        ])
        .select()
        .single();

      if (error) {
        // Lock already exists
        set({
          lockStatus: { lockedBy: null, lockedAt: null },
          isLoading: false,
        });
        return false;
      }

      set({
        lockStatus: { lockedBy: user.id, lockedAt: data.locked_at },
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to acquire lock',
        isLoading: false,
      });
      return false;
    }
  },

  releaseLock: async (sheetVersionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('sheet_locks')
        .delete()
        .eq('sheet_version_id', sheetVersionId)
        .eq('locked_by', user.id);

      if (error) throw error;

      set({
        lockStatus: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to release lock',
        isLoading: false,
      });
    }
  },
}));
