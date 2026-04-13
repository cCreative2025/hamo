import { create } from 'zustand';
import { Sheet, SheetVersion, SessionFilter } from '@/types';
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
  loadSheets: (teamId: string) => Promise<void>;
  selectSheet: (sheetId: string) => Promise<void>;
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
  deleteSheet: (sheetId: string) => Promise<void>;
  uploadNewVersion: (sheetId: string, file: File) => Promise<SheetVersion>;
  applyFilters: () => void;
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

  loadSheets: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('sheets')
        .select('*, sheet_versions(id, file_url, file_type, page_count, tempo, key, version_number, created_by, created_at)')
        .eq('team_id', teamId)
        .order('updated_at', { ascending: false });

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

  selectSheet: async (sheetId: string) => {
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
}));
