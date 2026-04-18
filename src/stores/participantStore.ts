import { create } from 'zustand';
import { Participant } from '@/types';
import { supabase } from '@/lib/supabase';

interface ParticipantStore {
  participants: Participant[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Methods
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  updateConnectionStatus: (
    participantId: string,
    status: 'connected' | 'disconnected' | 'offline'
  ) => Promise<void>;
  subscribeToParticipants: (sessionId: string) => () => void;
}

export const useParticipantStore = create<ParticipantStore>((set) => ({
  participants: [],
  isLoading: false,
  error: null,

  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),
  removeParticipant: (participantId: string) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    })),
  updateParticipant: (participantId: string, updates: Partial<Participant>) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  joinSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('session_participants')
        .insert([
          {
            session_id: sessionId,
            user_id: user.id,
            connection_status: 'connected',
            is_editing: false,
            last_activity: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        participants: [...state.participants, data],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to join session',
        isLoading: false,
      });
    }
  },

  leaveSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.filter(
          (p) => !(p.session_id === sessionId && p.user_id === user.id)
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to leave session',
        isLoading: false,
      });
    }
  },

  updateConnectionStatus: async (
    participantId: string,
    status: 'connected' | 'disconnected' | 'offline'
  ) => {
    try {
      const { error } = await supabase
        .from('session_participants')
        .update({
          connection_status: status,
          last_activity: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (error) throw error;

      set((state) => ({
        participants: state.participants.map((p) =>
          p.id === participantId
            ? {
                ...p,
                connection_status: status,
                last_activity: new Date().toISOString(),
              }
            : p
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update status',
      });
    }
  },

  subscribeToParticipants: (sessionId: string) => {
    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            set((state) => ({
              participants: [...state.participants, payload.new as Participant],
            }));
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              participants: state.participants.map((p) =>
                p.id === (payload.new as Participant).id
                  ? (payload.new as Participant)
                  : p
              ),
            }));
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              participants: state.participants.filter(
                (p) => p.id !== (payload.old as Participant).id
              ),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
