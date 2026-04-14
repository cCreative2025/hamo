import { create } from 'zustand';
import { Sheet, SheetVersion, SongForm, SessionFilter } from '@/types';
import { supabase } from '@/lib/supabase';

interface SheetStore {
  sheets: Sheet[];
  selectedSheet: Sheet | null;
  selectedVersion: SheetVersion | null;
  filters: SessionFilter;
  filteredSheets: Sheet[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setSheets: (sheets: Sheet[]) => void;
  setSelectedSheet: (sheet: Sheet | null) => void;
  setSelectedVersion: (version: SheetVersion | null) => void;
  setFilters: (filters: SessionFilter) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Sheet methods
  loadSheets: (teamId?: string, userId?: string) => Promise<void>;
  selectSheet: (sheetOrId: string | Sheet) => Promise<void>;
  uploadSheet: (
    teamId: string,
    file: File,
    metadata: {
      title: string;
      artist?: string;
      genre?: string;
      tempo?: number;
      key?: string;
    }
  ) => Promise<Sheet>;
  updateSheet: (sheetId: string, updates: Partial<Pick<Sheet, 'title' | 'artist' | 'genre' | 'key' | 'tempo' | 'time_signature' | 'youtube_urls'>>) => Promise<void>;
  deleteSheet: (sheetId: string) => Promise<void>;
  replaceSheetFile: (sheetId: string, file: File) => Promise<SheetVersion>;
  uploadNewVersion: (sheetId: string, file: File) => Promise<SheetVersion>;
  applyFilters: () => void;

  // Song form methods
  addSongForm: (sheetId: string, form: { name: string; key?: string; sections?: SongForm['sections']; flow?: SongForm['flow']; memo?: string }) => Promise<SongForm>;
  updateSongForm: (formId: string, updates: Partial<Pick<SongForm, 'name' | 'key' | 'tempo' | 'chord_progression' | 'sections' | 'flow' | 'memo'>>) => Promise<void>;
  deleteSongForm: (formId: string) => Promise<void>;
}

export const useSheetStore = create<SheetStore>((set, get) => ({
  sheets: [],
  selectedSheet: null,
  selectedVersion: null,
  filters: {
    searchText: '',
    sortBy: 'recent',
  },
  filteredSheets: [],
  isLoading: false,
  error: null,

  setSheets: (sheets) => {
    set({ sheets });
    get().applyFilters();
  },
  setSelectedSheet: (sheet) => set({ selectedSheet: sheet }),
  setSelectedVersion: (version) => set({ selectedVersion: version }),
  setFilters: (filters) => {
    set({ filters });
    get().applyFilters();
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadSheets: async (teamId?: string, userId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('sheets')
        .select('*, sheet_versions(id, file_path, file_type, file_size, page_count, version_number, uploaded_by, created_at), song_forms(id, name, key, chord_progression, sections, flow, drawing_data, memo, created_by, created_at, updated_at)')
        .order('updated_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
        if (uid) query = query.eq('owner_id', uid);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ sheets: data || [], isLoading: false });
      get().applyFilters();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sheets',
        isLoading: false,
      });
    }
  },

  selectSheet: async (sheetOrId: string | Sheet) => {
    const sheetId = typeof sheetOrId === 'string' ? sheetOrId : sheetOrId.id;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('id', sheetId)
        .single();

      if (error) throw error;

      set({ selectedSheet: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sheet',
        isLoading: false,
      });
    }
  },

  uploadSheet: async (
    teamId: string,
    file: File,
    metadata: {
      title: string;
      artist?: string;
      genre?: string;
      tempo?: number;
      key?: string;
    }
  ) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const filename = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('sheets')
        .upload(`${teamId}/${filename}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sheets')
        .getPublicUrl(`${teamId}/${filename}`);

      // Create sheet record
      const { data: sheetData, error: sheetError } = await supabase
        .from('sheets')
        .insert([
          {
            team_id: teamId,
            title: metadata.title,
            artist: metadata.artist,
            genre: metadata.genre,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (sheetError) throw sheetError;

      // Create sheet version record
      const { data: versionData, error: versionError } = await supabase
        .from('sheet_versions')
        .insert([
          {
            sheet_id: sheetData.id,
            file_url: publicUrl,
            file_type: file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg',
            page_count: 1,
            tempo: metadata.tempo,
            key: metadata.key,
            version_number: 1,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (versionError) throw versionError;

      // Update active version
      await supabase
        .from('sheets')
        .update({ active_version_id: versionData.id })
        .eq('id', sheetData.id);

      set((state) => ({
        sheets: [sheetData, ...state.sheets],
        isLoading: false,
      }));

      return sheetData;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to upload sheet',
        isLoading: false,
      });
      throw error;
    }
  },

  updateSheet: async (sheetId, updates) => {
    const { error } = await supabase.from('sheets').update(updates).eq('id', sheetId);
    if (error) throw error;
    set((state) => ({
      sheets: state.sheets.map((s) => s.id === sheetId ? { ...s, ...updates } : s),
    }));
    get().applyFilters();
  },

  deleteSheet: async (sheetId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('sheets').delete().eq('id', sheetId);

      if (error) throw error;

      set((state) => ({
        sheets: state.sheets.filter((s) => s.id !== sheetId),
        selectedSheet:
          state.selectedSheet?.id === sheetId ? null : state.selectedSheet,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete sheet',
        isLoading: false,
      });
    }
  },

  replaceSheetFile: async (sheetId, file) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const sheet = get().sheets.find((s) => s.id === sheetId);
    if (!sheet) throw new Error('Sheet not found');

    const filename = `${Date.now()}-${file.name}`;
    const storagePath = `${sheet.team_id ?? user.id}/${filename}`;
    const { error: uploadError } = await supabase.storage.from('sheets').upload(storagePath, file);
    if (uploadError) throw uploadError;

    const fileType = file.type.includes('pdf') ? 'pdf' : 'image';
    const { data, error } = await supabase
      .from('sheet_versions')
      .insert({
        sheet_id: sheetId,
        file_path: storagePath,
        file_type: fileType,
        version_number: (sheet.sheet_versions?.length ?? 0) + 1,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('sheets').update({ active_version_id: data.id }).eq('id', sheetId);

    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId
          ? { ...s, sheet_versions: [data, ...(s.sheet_versions ?? [])], active_version_id: data.id }
          : s
      ),
    }));
    get().applyFilters();
    return data;
  },

  uploadNewVersion: async (sheetId: string, file: File) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sheet = get().sheets.find((s) => s.id === sheetId);
      if (!sheet) throw new Error('Sheet not found');

      const filename = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('sheets')
        .upload(`${sheet.team_id}/${filename}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sheets')
        .getPublicUrl(`${sheet.team_id}/${filename}`);

      const { data, error } = await supabase
        .from('sheet_versions')
        .insert([
          {
            sheet_id: sheetId,
            file_url: publicUrl,
            file_type: file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg',
            page_count: 1,
            version_number: (sheet.sheet_versions?.length || 0) + 1,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update active version
      await supabase
        .from('sheets')
        .update({ active_version_id: data.id })
        .eq('id', sheetId);

      set({ isLoading: false });
      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to upload version',
        isLoading: false,
      });
      throw error;
    }
  },

  applyFilters: () => {
    const { sheets, filters } = get();

    let filtered = sheets;

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(searchLower) ||
          s.artist?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.genre) {
      filtered = filtered.filter((s) => s.genre === filters.genre);
    }

    if (filters.artist) {
      filtered = filtered.filter((s) => s.artist === filters.artist);
    }

    if (filters.sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sortBy === 'artist') {
      filtered.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    set({ filteredSheets: filtered });
  },

  addSongForm: async (sheetId, form) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('song_forms')
      .insert({ ...form, sheet_id: sheetId, created_by: user.id })
      .select()
      .single();
    if (error) throw error;

    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId
          ? { ...s, song_forms: [...(s.song_forms || []), data] }
          : s
      ),
    }));
    get().applyFilters();
    return data;
  },

  updateSongForm: async (formId, updates) => {
    const { error } = await supabase
      .from('song_forms')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', formId);
    if (error) throw error;

    set((state) => ({
      sheets: state.sheets.map((s) => ({
        ...s,
        song_forms: s.song_forms?.map((f) =>
          f.id === formId ? { ...f, ...updates } : f
        ),
      })),
    }));
    get().applyFilters();
  },

  deleteSongForm: async (formId) => {
    const { error } = await supabase
      .from('song_forms')
      .delete()
      .eq('id', formId);
    if (error) throw error;

    set((state) => ({
      sheets: state.sheets.map((s) => ({
        ...s,
        song_forms: s.song_forms?.filter((f) => f.id !== formId),
      })),
    }));
    get().applyFilters();
  },
}));
