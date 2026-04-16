import { create } from 'zustand';
import { Team, TeamMember } from '@/types';
import { supabase } from '@/lib/supabase';

interface TeamStore {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setTeams: (teams: Team[]) => void;
  setCurrentTeam: (team: Team | null) => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Team methods
  loadTeams: () => Promise<void>;
  selectTeam: (teamId: string) => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team>;
  updateTeam: (teamId: string, name: string, description?: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  loadTeamMembers: (teamId: string) => Promise<void>;
  joinTeamByCode: (code: string) => Promise<Team>;
  regenerateInviteCode: (teamId: string) => Promise<string>;
}

export const useTeamStore = create<TeamStore>((set) => ({
  teams: [],
  currentTeam: null,
  teamMembers: [],
  isLoading: false,
  error: null,

  setTeams: (teams) => set({ teams }),
  setCurrentTeam: (team) => set({ currentTeam: team }),
  setTeamMembers: (members) => set({ teamMembers: members }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('team_members')
        .select('team:teams(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const teams = data?.map((item: any) => item.team).filter(Boolean) || [];
      set({ teams, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load teams',
        isLoading: false,
      });
    }
  },

  selectTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error) throw error;

      set({ currentTeam: data, isLoading: false });

      // Also load team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*, user:users(*)')
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      set({ teamMembers: members || [] });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to select team',
        isLoading: false,
      });
    }
  },

  createTeam: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Try inserting with invite_code first; fall back without it if column doesn't exist yet
      let insertResult = await supabase
        .from('teams')
        .insert([{ name, description, owner_id: user.id, invite_code: inviteCode }])
        .select()
        .single();

      if (insertResult.error?.message?.includes('invite_code')) {
        insertResult = await supabase
          .from('teams')
          .insert([{ name, description, owner_id: user.id }])
          .select()
          .single();
      }

      const { data, error } = insertResult;

      if (error) throw error;

      // Add current user as owner
      const { error: memberError } = await supabase.from('team_members').insert([
        {
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
        },
      ]);

      if (memberError) throw memberError;

      set((state) => ({
        teams: [...state.teams, data],
        isLoading: false,
      }));

      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create team',
        isLoading: false,
      });
      throw error;
    }
  },

  updateTeam: async (teamId: string, name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      if (error) throw error;

      set((state) => ({
        teams: state.teams.map((t) =>
          t.id === teamId ? { ...t, name, description } : t
        ),
        currentTeam:
          state.currentTeam?.id === teamId
            ? { ...state.currentTeam, name, description }
            : state.currentTeam,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update team',
        isLoading: false,
      });
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);

      if (error) throw error;

      set((state) => ({
        teams: state.teams.filter((t) => t.id !== teamId),
        currentTeam:
          state.currentTeam?.id === teamId ? null : state.currentTeam,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete team',
        isLoading: false,
      });
    }
  },

  loadTeamMembers: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, user:users(*)')
        .eq('team_id', teamId);

      if (error) throw error;

      set({ teamMembers: data || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load team members',
        isLoading: false,
      });
    }
  },

  joinTeamByCode: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', code.toUpperCase().trim())
        .single();

      if (teamError || !team) throw new Error('유효하지 않은 초대 코드입니다.');

      // Check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        set({ isLoading: false });
        return team;
      }

      const { error: joinError } = await supabase.from('team_members').insert([
        { team_id: team.id, user_id: user.id, role: 'member' },
      ]);

      if (joinError) throw joinError;

      set((state) => ({
        teams: [...state.teams, team],
        isLoading: false,
      }));

      return team;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to join team',
        isLoading: false,
      });
      throw error;
    }
  },

  regenerateInviteCode: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error } = await supabase
        .from('teams')
        .update({ invite_code: newCode, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      if (error) throw error;

      set((state) => ({
        teams: state.teams.map((t) =>
          t.id === teamId ? { ...t, invite_code: newCode } : t
        ),
        currentTeam:
          state.currentTeam?.id === teamId
            ? { ...state.currentTeam, invite_code: newCode }
            : state.currentTeam,
        isLoading: false,
      }));

      return newCode;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to regenerate invite code',
        isLoading: false,
      });
      throw error;
    }
  },
}));
