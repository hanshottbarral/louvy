'use client';

import { AppRole, MessageType, ScheduleEventType } from '@louvy/shared';
import { create } from 'zustand';
import {
  loadAvailabilityBlocks,
  loadMemberDirectory,
  removeAvailabilityBlock,
  saveAvailabilityBlock,
  saveMemberDirectoryProfile,
} from '@/lib/member-calendar';
import { supabase } from '@/lib/supabase';
import { mapMessages, mapNotifications, mapRepertoire, mapSchedules } from '@/lib/supabase-mappers';
import {
  AppSection,
  AvailabilityBlock,
  AvailabilityBlockInput,
  AuthMode,
  MemberDirectoryInput,
  MemberDirectoryProfile,
  MinistrySongView,
  NotificationView,
  RepertoireSongInput,
  ScheduleEditorInput,
  ScheduleView,
  SessionUser,
} from '@/types';

interface AppState {
  activeSection: AppSection;
  authMode: AuthMode;
  authMessage?: string;
  currentUser: SessionUser | null;
  initialized: boolean;
  isLoading: boolean;
  isHydratingApp: boolean;
  schedules: ScheduleView[];
  selectedScheduleId: string;
  notifications: NotificationView[];
  repertoire: MinistrySongView[];
  memberDirectory: MemberDirectoryProfile[];
  availabilityBlocks: AvailabilityBlock[];
  isLoadingMembers: boolean;
  isLoadingCalendar: boolean;
  membersLoaded: boolean;
  calendarLoaded: boolean;
  isCreatingRepertoireSong: boolean;
  typingUser?: string;
  loadingScheduleMessages: boolean;
  loadedMessageScheduleIds: string[];
  bootstrap: () => Promise<void>;
  refreshData: () => Promise<void>;
  loadScheduleMessages: (scheduleId: string, options?: { force?: boolean }) => Promise<void>;
  setAuthMode: (mode: AuthMode) => void;
  setActiveSection: (section: AppSection) => void;
  loadMemberDirectory: (options?: { force?: boolean }) => Promise<void>;
  saveMemberDirectoryProfile: (payload: MemberDirectoryInput) => Promise<void>;
  loadAvailabilityBlocks: (options?: { force?: boolean }) => Promise<void>;
  saveAvailabilityBlock: (payload: AvailabilityBlockInput) => Promise<void>;
  removeAvailabilityBlock: (blockId: string) => Promise<void>;
  openRepertoireComposer: () => void;
  closeRepertoireComposer: () => void;
  selectSchedule: (scheduleId: string) => void;
  markTyping: (name?: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveSchedule: (payload: ScheduleEditorInput) => Promise<string | undefined>;
  saveRepertoireSong: (payload: RepertoireSongInput) => Promise<string | undefined>;
  reorderSongs: (scheduleId: string, songIds: string[]) => Promise<void>;
  addSongToSchedule: (scheduleId: string, songId: string) => Promise<void>;
  sendTextMessage: (scheduleId: string, content: string) => Promise<void>;
  sendAudioMessage: (scheduleId: string, audioUrl: string) => Promise<void>;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchDataForUser(currentUser: SessionUser) {
  let scheduleIds: string[] = [];

  if (currentUser.role === AppRole.ADMIN) {
    const { data, error } = await supabase
      .from('schedules')
      .select('id')
      .order('event_date', { ascending: true });
    if (error) {
      throw error;
    }
    scheduleIds = (data ?? []).map((item) => item.id);
  } else {
    const { data, error } = await supabase
      .from('schedule_members')
      .select('schedule_id')
      .eq('user_id', currentUser.id);
    if (error) {
      throw error;
    }
    scheduleIds = Array.from(new Set((data ?? []).map((item) => item.schedule_id)));
  }

  const schedulesPromise =
    scheduleIds.length > 0
      ? supabase
          .from('schedules')
          .select('id, title, event_date, event_time, event_type, event_label, notes')
          .in('id', scheduleIds)
          .order('event_date', { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const membersPromise =
    scheduleIds.length > 0
      ? supabase
          .from('schedule_members')
          .select('id, schedule_id, user_id, role, status')
          .in('schedule_id', scheduleIds)
      : Promise.resolve({ data: [], error: null });

  const songsPromise =
    scheduleIds.length > 0
      ? supabase
          .from('schedule_songs')
          .select('id, schedule_id, name, musical_key, bpm, youtube_url, position')
          .in('schedule_id', scheduleIds)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const repertoirePromise = supabase
    .from('repertoire_songs')
    .select('id, name, musical_key, bpm, youtube_url, category, tags, created_at')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const notificationsPromise = supabase
    .from('notifications')
    .select('id, title, body, read_at, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const [schedulesResult, membersResult, songsResult, repertoireResult, notificationsResult] =
    await Promise.all([
      schedulesPromise,
      membersPromise,
      songsPromise,
      repertoirePromise,
      notificationsPromise,
    ]);

  for (const result of [schedulesResult, membersResult, songsResult, repertoireResult, notificationsResult]) {
    if (result.error) {
      throw result.error;
    }
  }

  const profileIds = new Set<string>([currentUser.id]);
  for (const member of membersResult.data ?? []) {
    profileIds.add(member.user_id);
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .in('id', Array.from(profileIds));

  if (profilesError) {
    throw profilesError;
  }

  const schedules = mapSchedules({
    schedules: schedulesResult.data ?? [],
    members: membersResult.data ?? [],
    songs: songsResult.data ?? [],
    profiles: profilesData ?? [],
  });

  return {
    schedules,
    repertoire: mapRepertoire(repertoireResult.data ?? []),
    notifications: mapNotifications(notificationsResult.data ?? []),
  };
}

async function fetchScheduleMessages(scheduleId: string) {
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('id, schedule_id, user_id, content, type, audio_url, created_at')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: true })
    .limit(150);

  if (messagesError) {
    throw messagesError;
  }

  const profileIds = Array.from(new Set((messagesData ?? []).map((message) => message.user_id)));
  const { data: profilesData, error: profilesError } =
    profileIds.length > 0
      ? await supabase.from('profiles').select('id, name, email, role').in('id', profileIds)
      : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  return mapMessages(messagesData ?? [], profilesData ?? []);
}

let bootstrapRequestId = 0;
let bootstrapInFlight: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  activeSection: 'schedules',
  authMode: 'login',
  authMessage: undefined,
  currentUser: null,
  initialized: false,
  isLoading: true,
  isHydratingApp: false,
  schedules: [],
  selectedScheduleId: '',
  notifications: [],
  repertoire: [],
  memberDirectory: [],
  availabilityBlocks: [],
  isLoadingMembers: false,
  isLoadingCalendar: false,
  membersLoaded: false,
  calendarLoaded: false,
  isCreatingRepertoireSong: false,
  typingUser: undefined,
  loadingScheduleMessages: false,
  loadedMessageScheduleIds: [],
  bootstrap: async () => {
    if (bootstrapInFlight) {
      return bootstrapInFlight;
    }

    const run = async () => {
      const requestId = ++bootstrapRequestId;
      set((state) => ({
        isLoading: state.currentUser ? state.isLoading : true,
      }));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (requestId !== bootstrapRequestId) {
          return;
        }

        set({
          currentUser: null,
          initialized: true,
          isLoading: false,
          isHydratingApp: false,
          schedules: [],
          repertoire: [],
          memberDirectory: [],
          availabilityBlocks: [],
          isLoadingMembers: false,
          isLoadingCalendar: false,
          membersLoaded: false,
          calendarLoaded: false,
          isCreatingRepertoireSong: false,
          notifications: [],
          loadedMessageScheduleIds: [],
          loadingScheduleMessages: false,
        });
        return;
      }

      const profile = await fetchProfile(session.user.id);
      const currentUser: SessionUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email ?? session.user.email ?? '',
        role: profile.role as AppRole,
      };

      set({
        currentUser,
        initialized: true,
        isLoading: false,
        isHydratingApp: true,
        authMessage: undefined,
      });

      const payload = await fetchDataForUser(currentUser);
      if (requestId !== bootstrapRequestId) {
        return;
      }

      const firstScheduleId = payload.schedules[0]?.id ?? '';
      set({
        schedules: payload.schedules,
        selectedScheduleId: firstScheduleId,
        repertoire: payload.repertoire,
        notifications: payload.notifications,
        isCreatingRepertoireSong: false,
        isHydratingApp: false,
        loadedMessageScheduleIds: [],
        loadingScheduleMessages: false,
      });

      if (firstScheduleId) {
        void get().loadScheduleMessages(firstScheduleId);
      }
    };

    bootstrapInFlight = run().finally(() => {
      bootstrapInFlight = null;
    });

    return bootstrapInFlight;
  },
  refreshData: async () => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const payload = await fetchDataForUser(currentUser);
    const previousSelected = get().selectedScheduleId;
    const selectedScheduleId =
      payload.schedules.find((schedule) => schedule.id === previousSelected)?.id ??
      payload.schedules[0]?.id ??
      '';

    set({
      schedules: payload.schedules,
      selectedScheduleId,
      repertoire: payload.repertoire,
      notifications: payload.notifications,
      isHydratingApp: false,
    });

    if (selectedScheduleId) {
      void get().loadScheduleMessages(selectedScheduleId, { force: true });
    }
  },
  loadScheduleMessages: async (scheduleId, options) => {
    const { loadedMessageScheduleIds, loadingScheduleMessages, schedules } = get();
    if (!scheduleId) {
      return;
    }

    if (!options?.force && (loadingScheduleMessages || loadedMessageScheduleIds.includes(scheduleId))) {
      return;
    }

    const targetSchedule = schedules.find((schedule) => schedule.id === scheduleId);
    if (!targetSchedule) {
      return;
    }

    set({ loadingScheduleMessages: true });

    try {
      const messages = await fetchScheduleMessages(scheduleId);
      set((state) => ({
        schedules: state.schedules.map((schedule) =>
          schedule.id === scheduleId ? { ...schedule, messages } : schedule,
        ),
        loadedMessageScheduleIds: Array.from(new Set([...state.loadedMessageScheduleIds, scheduleId])),
        loadingScheduleMessages: false,
      }));
    } catch (error) {
      set({
        loadingScheduleMessages: false,
        authMessage: error instanceof Error ? error.message : 'Nao consegui carregar o chat da escala.',
      });
    }
  },
  setAuthMode: (mode) => set({ authMode: mode, authMessage: undefined }),
  setActiveSection: (section) => {
    set({ activeSection: section });

    if (section === 'members') {
      void get().loadMemberDirectory();
      return;
    }

    if (section === 'calendar') {
      void get().loadAvailabilityBlocks();
    }
  },
  loadMemberDirectory: async (options) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    if (get().isLoadingMembers || (!options?.force && get().membersLoaded)) {
      return;
    }

    set({ isLoadingMembers: true, authMessage: undefined });

    try {
      const memberDirectory = await loadMemberDirectory();
      set({
        memberDirectory,
        isLoadingMembers: false,
        membersLoaded: true,
      });
    } catch (error) {
      set({
        isLoadingMembers: false,
        authMessage:
          error instanceof Error ? error.message : 'Nao consegui carregar a aba de membros agora.',
      });
    }
  },
  saveMemberDirectoryProfile: async (payload) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    set({ isLoadingMembers: true, authMessage: undefined });

    try {
      const result = await saveMemberDirectoryProfile(currentUser, payload);
      set({
        memberDirectory: result.directory,
        currentUser: result.currentUser,
        isLoadingMembers: false,
        membersLoaded: true,
        authMessage: result.remoteErrors.length
          ? 'Cadastro salvo. Se quiser refletir isso para todos os dispositivos, aplique o patch SQL novo no Supabase.'
          : 'Membro atualizado com sucesso.',
      });
    } catch (error) {
      set({
        isLoadingMembers: false,
        authMessage: error instanceof Error ? error.message : 'Nao consegui salvar este membro agora.',
      });
    }
  },
  loadAvailabilityBlocks: async (options) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    if (get().isLoadingCalendar || (!options?.force && get().calendarLoaded)) {
      return;
    }

    set({ isLoadingCalendar: true, authMessage: undefined });

    try {
      const availabilityBlocks = await loadAvailabilityBlocks();
      set({
        availabilityBlocks,
        isLoadingCalendar: false,
        calendarLoaded: true,
      });
    } catch (error) {
      set({
        isLoadingCalendar: false,
        authMessage:
          error instanceof Error ? error.message : 'Nao consegui carregar o calendario agora.',
      });
    }
  },
  saveAvailabilityBlock: async (payload) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    set({ isLoadingCalendar: true, authMessage: undefined });

    try {
      const availabilityBlocks = await saveAvailabilityBlock(currentUser, payload);
      set({
        availabilityBlocks,
        isLoadingCalendar: false,
        calendarLoaded: true,
        authMessage: 'Indisponibilidade salva.',
      });
    } catch (error) {
      set({
        isLoadingCalendar: false,
        authMessage:
          error instanceof Error ? error.message : 'Nao consegui salvar sua indisponibilidade agora.',
      });
    }
  },
  removeAvailabilityBlock: async (blockId) => {
    set({ isLoadingCalendar: true, authMessage: undefined });

    try {
      const availabilityBlocks = await removeAvailabilityBlock(blockId);
      set({
        availabilityBlocks,
        isLoadingCalendar: false,
        calendarLoaded: true,
      });
    } catch (error) {
      set({
        isLoadingCalendar: false,
        authMessage:
          error instanceof Error ? error.message : 'Nao consegui remover esta indisponibilidade agora.',
      });
    }
  },
  openRepertoireComposer: () => set({ activeSection: 'repertoire', isCreatingRepertoireSong: true }),
  closeRepertoireComposer: () => set({ isCreatingRepertoireSong: false }),
  selectSchedule: (scheduleId) => {
    set({ selectedScheduleId: scheduleId });
    void get().loadScheduleMessages(scheduleId);
  },
  markTyping: (name) => set({ typingUser: name }),
  signIn: async (email, password) => {
    set({ isLoading: true, authMessage: undefined });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, authMessage: error.message });
      return;
    }

    await get().bootstrap();
  },
  signUp: async (name, email, password) => {
    set({ isLoading: true, authMessage: undefined });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error) {
      set({ isLoading: false, authMessage: error.message });
      return;
    }

    if (data.session?.user) {
      await get().bootstrap();
      return;
    }

    set({
      isLoading: false,
      authMode: 'login',
      authMessage: 'Conta criada. Se o projeto exigir confirmacao por email, confirme antes de entrar.',
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({
      currentUser: null,
      schedules: [],
      selectedScheduleId: '',
      repertoire: [],
      memberDirectory: [],
      availabilityBlocks: [],
      isLoadingMembers: false,
      isLoadingCalendar: false,
      membersLoaded: false,
      calendarLoaded: false,
      isCreatingRepertoireSong: false,
      notifications: [],
      initialized: true,
      isLoading: false,
    });
  },
  saveSchedule: async (payload) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return undefined;
    }

    const body = {
      title: payload.title,
      event_date: payload.date,
      event_time: `${payload.time}:00`,
      event_type: payload.eventType,
      event_label: payload.eventLabel,
      notes: payload.notes ?? null,
      created_by: currentUser.id,
    };

    if (payload.id) {
      const { error } = await supabase.from('schedules').update(body).eq('id', payload.id);
      if (error) {
        set({ authMessage: error.message });
        return undefined;
      }
      await get().refreshData();
      return payload.id;
    }

    const { data, error } = await supabase.from('schedules').insert(body).select('id').single();
    if (error) {
      set({ authMessage: error.message });
      return undefined;
    }

    await get().refreshData();
    set({ selectedScheduleId: data.id });
    return data.id;
  },
  saveRepertoireSong: async (payload) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return undefined;
    }

    const body = {
      name: payload.name.trim(),
      musical_key: payload.key.trim(),
      bpm: payload.bpm ?? null,
      youtube_url: payload.youtubeUrl?.trim() ? payload.youtubeUrl.trim() : null,
      category: payload.category.trim(),
      tags: payload.tags,
      created_by: currentUser.id,
      is_active: true,
    };

    if (!body.name || !body.musical_key || !body.category) {
      set({ authMessage: 'Preencha nome, tom e categoria da musica.' });
      return undefined;
    }

    const { data, error } = await supabase.from('repertoire_songs').insert(body).select('id').single();
    if (error) {
      set({ authMessage: error.message });
      return undefined;
    }

    await get().refreshData();
    set({ activeSection: 'repertoire', isCreatingRepertoireSong: false, authMessage: undefined });
    return data.id;
  },
  reorderSongs: async (scheduleId, songIds) => {
    const updates = songIds.map((songId, index) =>
      supabase.from('schedule_songs').update({ position: index }).eq('id', songId),
    );
    await Promise.all(updates);
    await get().refreshData();
    set({ selectedScheduleId: scheduleId });
  },
  addSongToSchedule: async (scheduleId, songId) => {
    const librarySong = get().repertoire.find((song) => song.id === songId);
    const schedule = get().schedules.find((item) => item.id === scheduleId);
    if (!librarySong || !schedule) {
      return;
    }

    const { error } = await supabase.from('schedule_songs').insert({
      schedule_id: scheduleId,
      repertoire_song_id: songId,
      name: librarySong.name,
      musical_key: librarySong.key,
      bpm: librarySong.bpm,
      youtube_url: librarySong.youtubeUrl,
      position: schedule.songs.length,
    });

    if (!error) {
      await get().refreshData();
      set({ activeSection: 'schedules', selectedScheduleId: scheduleId });
    }
  },
  sendTextMessage: async (scheduleId, content) => {
    const currentUser = get().currentUser;
    if (!currentUser || !content.trim()) {
      return;
    }

    const { error } = await supabase.from('messages').insert({
      schedule_id: scheduleId,
      user_id: currentUser.id,
      content: content.trim(),
      type: MessageType.TEXT,
    });

    if (!error) {
      await get().loadScheduleMessages(scheduleId, { force: true });
    }
  },
  sendAudioMessage: async (scheduleId, audioUrl) => {
    const currentUser = get().currentUser;
    if (!currentUser || !audioUrl) {
      return;
    }

    const { error } = await supabase.from('messages').insert({
      schedule_id: scheduleId,
      user_id: currentUser.id,
      audio_url: audioUrl,
      type: MessageType.AUDIO,
    });

    if (!error) {
      await get().loadScheduleMessages(scheduleId, { force: true });
    }
  },
}));
