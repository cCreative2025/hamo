import { create } from 'zustand';
import { Session, SessionItem, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { prefetchSignedUrls, clearSignedUrlCache } from '@/lib/signedUrlCache';

export interface SessionLayer {
  id: string;
  session_id: string;
  song_form_id: string;
  created_by: string;
  version_number: number;
  drawing_data: unknown[];
  created_at: string;
}

export type UserRole = 'creator' | 'member' | 'guest';

interface SessionPlayerStore {
  // Session info
  sessionId: string | null;
  session: Session | null;
  items: SessionItem[];
  currentIndex: number;

  // User role & permissions
  userRole: UserRole;
  currentUser: User | null;

  // Layer management
  layers: SessionLayer[];
  visibleLayers: Record<string, boolean>; // layerId -> visible

  // Realtime
  realtimeChannel: any;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  isFullscreen: boolean;

  // Setters
  setSessionId: (id: string | null) => void;
  setSession: (session: Session | null) => void;
  setItems: (items: SessionItem[]) => void;
  setCurrentIndex: (index: number) => void;
  setUserRole: (role: UserRole) => void;
  setCurrentUser: (user: User | null) => void;
  setLayers: (layers: SessionLayer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setRealtimeChannel: (channel: any) => void;
  setIsSubscribed: (subscribed: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsFullscreen: (v: boolean) => void;

  // Actions
  initSession: (sessionId: string, currentUser: User | null, isGuest: boolean) => Promise<void>;
  navigateToSong: (index: number) => Promise<void>;
  navigateLocal: (index: number) => void;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
  cleanup: () => void;
  updateSessionTempo: (sessionSongId: string, tempo: number | null) => Promise<void>;
  updateBaseLayer: (songFormId: string, paths: unknown[]) => Promise<void>;
  upsertMyLayer: (sessionId: string, songFormId: string, paths: unknown[]) => Promise<void>;
}

/**
 * Determine user role based on session, user, and guest status
 */
function determineUserRole(
  session: Session | null,
  currentUser: User | null,
  isGuest: boolean
): UserRole {
  if (isGuest) return 'guest';
  if (!session || !currentUser) return 'guest';
  if (session.created_by === currentUser.id) return 'creator';
  // Note: team_members check would happen at API level
  return 'member';
}

/**
 * Session Player Store
 * Manages UI state, realtime sync, and layer visibility for the session player
 */
export const useSessionPlayerStore = create<SessionPlayerStore>((set, get) => ({
  sessionId: null,
  session: null,
  items: [],
  currentIndex: 0,

  userRole: 'guest',
  currentUser: null,

  layers: [],
  visibleLayers: {},

  realtimeChannel: null,
  isSubscribed: false,
  isLoading: false,
  error: null,
  isFullscreen: false,

  setSessionId: (id) => set({ sessionId: id }),
  setSession: (session) => set({ session }),
  setItems: (items) => set({ items }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setUserRole: (role) => set({ userRole: role }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setLayers: (layers) => {
    const visibleLayers = layers.reduce((acc, layer) => {
      acc[layer.id] = true; // default visible
      return acc;
    }, {} as Record<string, boolean>);
    set({ layers, visibleLayers });
  },
  toggleLayerVisibility: (layerId) => {
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layerId]: !state.visibleLayers[layerId],
      },
    }));
  },
  setRealtimeChannel: (channel) => set({ realtimeChannel: channel }),
  setIsSubscribed: (subscribed) => set({ isSubscribed: subscribed }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setIsFullscreen: (v) => set({ isFullscreen: v }),

  /**
   * Initialize session player
   * Loads session, items, layers, and determines user role
   */
  initSession: async (sessionId: string, currentUser: User | null, isGuest: boolean) => {
    set({ isLoading: true, error: null });
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw new Error(`Failed to load session: ${sessionError.message}`);

      // Load session items
      const { data: itemsData, error: itemsError } = await supabase
        .from('session_songs')
        .select('id, session_id, type, sequence_order, ment_text, sheet_id, song_form_id, tempo_override, created_at, sheet:sheets(id, title, artist, tempo, sheet_versions(id, file_path, file_type, page_count, version_number)), song_form:song_forms!song_form_id(id, name, key, tempo, sections, flow, drawing_data)')
        .eq('session_id', sessionId)
        .order('sequence_order', { ascending: true });

      if (itemsError) throw new Error(`Failed to load items: ${itemsError.message}`);

      // Load layers
      const { data: layersData, error: layersError } = await supabase
        .from('session_layers')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (layersError) throw new Error(`Failed to load layers: ${layersError.message}`);

      // Determine user role
      const userRole = determineUserRole(sessionData as Session, currentUser, isGuest);

      const items = (itemsData || []) as unknown as SessionItem[];

      set({
        sessionId,
        session: sessionData as Session,
        items,
        currentIndex: sessionData.current_song_index || 0,
        userRole,
        currentUser,
        layers: (layersData || []) as SessionLayer[],
        isLoading: false,
      });

      // Initialize layer visibility
      const visibleLayers = (layersData || []).reduce((acc, layer) => {
        acc[layer.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      set({ visibleLayers });

      // Prefetch signed URLs for all song sheets in background
      const filePaths = items
        .flatMap((item) => {
          const versions = (item.sheet?.sheet_versions ?? []);
          if (versions.length === 0) return [];
          const latest = versions.slice().sort((a, b) => b.version_number - a.version_number)[0];
          return latest?.file_path ? [latest.file_path] : [];
        });
      if (filePaths.length > 0) prefetchSignedUrls(filePaths);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize session';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  /**
   * Local navigation — all roles, no DB write
   */
  navigateLocal: (index: number) => {
    const { items } = get();
    if (index >= 0 && index < items.length) {
      set({ currentIndex: index });
    }
  },

  /**
   * Navigate to a specific song index
   * Only creators can navigate; syncs to DB for broadcast
   */
  navigateToSong: async (index: number) => {
    const state = get();
    const { userRole, sessionId, session } = state;

    // Only creators can navigate
    if (userRole !== 'creator') {
      set({ error: 'Only the session creator can navigate' });
      return;
    }

    if (!sessionId || !session) {
      set({ error: 'Session not loaded' });
      return;
    }

    // Validate index
    if (index < 0 || index >= state.items.length) {
      set({ error: 'Invalid song index' });
      return;
    }

    // Optimistic update
    set({ currentIndex: index });

    try {
      // Update in database
      const { error } = await supabase
        .from('sessions')
        .update({ current_song_index: index })
        .eq('id', sessionId);

      if (error) throw error;
      // Realtime will sync other clients automatically
    } catch (error) {
      // Rollback on error
      set({ currentIndex: session.current_song_index });
      const message = error instanceof Error ? error.message : 'Failed to update song index';
      set({ error: message });
    }
  },

  /**
   * Subscribe to session updates via Realtime
   * Listens for current_song_index changes and syncs the UI
   */
  subscribeToSession: (sessionId: string) => {
    const state = get();

    // Avoid duplicate subscriptions
    if (state.realtimeChannel) {
      return;
    }

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          if (payload.new.current_song_index !== undefined) {
            set({ currentIndex: payload.new.current_song_index });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ isSubscribed: true });
        } else if (status === 'CLOSED') {
          set({ isSubscribed: false });
        }
      });

    set({ realtimeChannel: channel });
  },

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromSession: () => {
    const state = get();
    if (state.realtimeChannel) {
      supabase.removeChannel(state.realtimeChannel);
      set({ realtimeChannel: null, isSubscribed: false });
    }
  },

  /** Update tempo override for a session song (leader only) */
  updateSessionTempo: async (sessionSongId: string, tempo: number | null) => {
    await supabase.from('session_songs').update({ tempo_override: tempo }).eq('id', sessionSongId);
    set((state) => ({
      items: state.items.map((item) =>
        item.id === sessionSongId ? { ...item, tempo_override: tempo } : item
      ),
    }));
  },

  /** Save paths to song_form.drawing_data (base layer) */
  updateBaseLayer: async (songFormId: string, paths: unknown[]) => {
    await supabase.from('song_forms').update({ drawing_data: paths }).eq('id', songFormId);
    set((state) => ({
      items: state.items.map((item) =>
        item.song_form_id === songFormId && item.song_form
          ? { ...item, song_form: { ...item.song_form, drawing_data: paths } }
          : item
      ),
    }));
  },

  /** Upsert user's session layer */
  upsertMyLayer: async (sessionId: string, songFormId: string, paths: unknown[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { layers } = get();
    const existing = layers.find(
      (l) => l.song_form_id === songFormId && l.created_by === user.id
    );
    const nextVersion = (existing?.version_number ?? 0) + 1;
    const row = {
      session_id: sessionId,
      song_form_id: songFormId,
      drawing_data: paths,
      version_number: nextVersion,
      created_by: user.id,
    };
    await supabase.from('session_layers').insert(row);
    const newLayer: SessionLayer = {
      id: `${user.id}-${songFormId}-${nextVersion}`,
      session_id: sessionId,
      song_form_id: songFormId,
      created_by: user.id,
      version_number: nextVersion,
      drawing_data: paths,
      created_at: new Date().toISOString(),
    };
    set((state) => {
      const filtered = state.layers.filter(
        (l) => !(l.song_form_id === songFormId && l.created_by === user.id)
      );
      return { layers: [newLayer, ...filtered] };
    });
  },

  /**
   * Cleanup: called when component unmounts
   */
  cleanup: () => {
    const state = get();
    if (state.realtimeChannel) {
      supabase.removeChannel(state.realtimeChannel);
    }
    clearSignedUrlCache();
    set({
      sessionId: null,
      session: null,
      items: [],
      currentIndex: 0,
      userRole: 'guest',
      currentUser: null,
      layers: [],
      visibleLayers: {},
      realtimeChannel: null,
      isSubscribed: false,
      error: null,
      isFullscreen: false,
    });
  },
}));
