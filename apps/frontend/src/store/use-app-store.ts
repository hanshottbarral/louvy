'use client';

import { AppRole, InstrumentRole, MemberStatus, MessageType, ScheduleEventType } from '@louvy/shared';
import { create } from 'zustand';
import {
  loadAvailabilityBlocks,
  loadMemberDirectory,
  removeAvailabilityBlock,
  saveAvailabilityBlock,
  saveMemberDirectoryProfile,
} from '@/lib/member-calendar';
import { findAvailabilityConflict } from '@/lib/availability';
import { sendNotificationEmail } from '@/lib/api';
import { fetchRepertoireLibrary, insertRepertoireSong } from '@/lib/repertoire';
import { supabase } from '@/lib/supabase';
import { mapMessages, mapNotifications, mapSchedules } from '@/lib/supabase-mappers';
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
  deleteSchedule: (scheduleId: string) => Promise<void>;
  addMemberToSchedule: (payload: {
    scheduleId: string;
    userId: string;
    role: InstrumentRole;
    status: MemberStatus;
    canManageSetlist?: boolean;
  }) => Promise<void>;
  removeMemberFromSchedule: (scheduleMemberId: string) => Promise<void>;
  respondToScheduleMember: (payload: {
    scheduleMemberId: string;
    status: MemberStatus;
    declineReason?: string;
  }) => Promise<void>;
  saveRepertoireSong: (payload: RepertoireSongInput) => Promise<string | undefined>;
  reorderSongs: (scheduleId: string, songIds: string[]) => Promise<void>;
  addSongToSchedule: (scheduleId: string, songId: string) => Promise<void>;
  removeSongFromSchedule: (scheduleId: string, scheduleSongId: string) => Promise<void>;
  updateScheduleSongArrangement: (payload: {
    scheduleId: string;
    scheduleSongId: string;
    key: string;
    leadSingerUserId?: string | null;
  }) => Promise<void>;
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

async function syncCurrentUserProfile(stateUser: SessionUser) {
  const profile = await fetchProfile(stateUser.id);
  return {
    ...stateUser,
    name: profile.name,
    email: profile.email ?? stateUser.email,
    role: profile.role as AppRole,
  } satisfies SessionUser;
}

async function fetchAdminProfiles(excludingUserId?: string) {
  const query = supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('role', AppRole.ADMIN);

  const { data, error } = excludingUserId ? await query.neq('id', excludingUserId) : await query;
  if (error) {
    throw error;
  }

  return data ?? [];
}

async function createInAppNotification(payload: {
  userId: string;
  title: string;
  body: string;
  type: 'NEW_MESSAGE' | 'SCHEDULE_ASSIGNED' | 'STATUS_CHANGED' | 'SCHEDULE_UPDATED';
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
  });

  if (error) {
    throw error;
  }
}

function isSchemaMismatch(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';

  return code === '42703' || code === 'PGRST204' || message.toLowerCase().includes('column');
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

  const scheduleMembersSelect =
    'id, schedule_id, user_id, role, status, decline_reason, can_manage_setlist';

  const fetchScheduleMembers = async () => {
    if (scheduleIds.length === 0) {
      return { data: [], error: null };
    }

    const extendedResult = await supabase
      .from('schedule_members')
      .select(scheduleMembersSelect)
      .in('schedule_id', scheduleIds);

    if (
      extendedResult.error &&
      (extendedResult.error.code === '42703' ||
        extendedResult.error.code === 'PGRST204' ||
        extendedResult.error.message.toLowerCase().includes('column'))
    ) {
      return supabase
        .from('schedule_members')
        .select('id, schedule_id, user_id, role, status')
        .in('schedule_id', scheduleIds);
    }

    return extendedResult;
  };

  const schedulesPromise =
    scheduleIds.length > 0
      ? supabase
          .from('schedules')
          .select('id, title, event_date, event_time, event_type, event_label, notes')
          .in('id', scheduleIds)
          .order('event_date', { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const membersPromise = fetchScheduleMembers();

  const fetchScheduleSongs = async () => {
    if (scheduleIds.length === 0) {
      return { data: [], error: null };
    }

    const extendedResult = await supabase
      .from('schedule_songs')
      .select('id, schedule_id, name, musical_key, bpm, youtube_url, position, lead_vocalist_user_id')
      .in('schedule_id', scheduleIds)
      .order('position', { ascending: true });

    if (
      extendedResult.error &&
      (extendedResult.error.code === '42703' ||
        extendedResult.error.code === 'PGRST204' ||
        extendedResult.error.message.toLowerCase().includes('column'))
    ) {
      return supabase
        .from('schedule_songs')
        .select('id, schedule_id, name, musical_key, bpm, youtube_url, position')
        .in('schedule_id', scheduleIds)
        .order('position', { ascending: true });
    }

    return extendedResult;
  };

  const songsPromise = fetchScheduleSongs();

  const notificationsPromise = supabase
    .from('notifications')
    .select('id, title, body, read_at, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const [schedulesResult, membersResult, songsResult, repertoire, notificationsResult] =
    await Promise.all([
      schedulesPromise,
      membersPromise,
      songsPromise,
      fetchRepertoireLibrary(),
      notificationsPromise,
    ]);

  for (const result of [schedulesResult, membersResult, songsResult, notificationsResult]) {
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
    repertoire,
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
  activeSection: 'notices',
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

      try {
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
          authMessage:
            payload.schedules.length === 0
              ? 'Nenhuma escala encontrada ainda. Se sua conta ja for admin no banco, voce pode criar a primeira agora.'
              : undefined,
        });

        if (firstScheduleId) {
          void get().loadScheduleMessages(firstScheduleId);
        }
      } catch (error) {
        if (requestId !== bootstrapRequestId) {
          return;
        }

        set({
          initialized: true,
          isLoading: false,
          isHydratingApp: false,
          schedules: [],
          selectedScheduleId: '',
          loadedMessageScheduleIds: [],
          loadingScheduleMessages: false,
          authMessage:
            error instanceof Error
              ? error.message
              : 'Nao consegui carregar suas escalas agora. Tente novamente em instantes.',
        });
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

    try {
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
        authMessage:
          payload.schedules.length === 0
            ? 'Nenhuma escala encontrada ainda. Se sua conta ja for admin no banco, voce pode criar a primeira agora.'
            : undefined,
      });

      if (selectedScheduleId) {
        void get().loadScheduleMessages(selectedScheduleId, { force: true });
      }
    } catch (error) {
      set({
        isHydratingApp: false,
        authMessage:
          error instanceof Error
            ? error.message
            : 'Nao consegui atualizar as escalas agora.',
      });
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

    const syncedUser = await syncCurrentUserProfile(currentUser);
    if (
      syncedUser.name !== currentUser.name ||
      syncedUser.email !== currentUser.email ||
      syncedUser.role !== currentUser.role
    ) {
      set({ currentUser: syncedUser });
    }

    if (syncedUser.role !== AppRole.ADMIN) {
      set({
        authMessage:
          'Sua conta ainda nao esta com permissao de admin no Supabase. Aplique o patch member_calendar_patch.sql e confirme seu perfil como admin na aba Membros.',
      });
      return undefined;
    }

    const body = {
      title: payload.title,
      event_date: payload.date,
      event_time: `${payload.time}:00`,
      event_type: payload.eventType,
      event_label: payload.eventLabel,
      notes: payload.notes ?? null,
      created_by: syncedUser.id,
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
  deleteSchedule: async (scheduleId) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const syncedUser = await syncCurrentUserProfile(currentUser);
    if (syncedUser.role !== AppRole.ADMIN) {
      set({ authMessage: 'Apenas administradores podem excluir escalas.' });
      return;
    }

    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
    if (error) {
      set({ authMessage: error.message });
      return;
    }

    await get().refreshData();
    set({ authMessage: 'Escala removida.' });
  },
  addMemberToSchedule: async ({ scheduleId, userId, role, status, canManageSetlist }) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const syncedUser = await syncCurrentUserProfile(currentUser);
    if (syncedUser.role !== AppRole.ADMIN) {
      set({ authMessage: 'Apenas administradores podem editar membros da escala.' });
      return;
    }

    const schedule = get().schedules.find((entry) => entry.id === scheduleId);
    if (schedule) {
      const conflict = findAvailabilityConflict(
        get().availabilityBlocks,
        userId,
        schedule.date,
        schedule.time,
      );

      if (conflict) {
        const memberName =
          get().memberDirectory.find((entry) => entry.userId === userId)?.name ?? 'Esse membro';
        set({
          authMessage: `${memberName} está indisponível neste dia. Motivo: ${conflict.reason}`,
        });
        return;
      }
    }

    const insertPayload = {
      schedule_id: scheduleId,
      user_id: userId,
      role,
      status,
      decline_reason: null,
      can_manage_setlist: canManageSetlist ?? false,
    };
    let { error } = await supabase.from('schedule_members').insert(insertPayload);

    if (error && isSchemaMismatch(error)) {
      const legacyResult = await supabase.from('schedule_members').insert({
        schedule_id: scheduleId,
        user_id: userId,
        role,
        status,
        decline_reason: null,
      });
      error = legacyResult.error;
    }

    if (error) {
      set({ authMessage: error.message });
      return;
    }

    const profile = get().memberDirectory.find((entry) => entry.userId === userId);

    if (profile) {
      try {
        await createInAppNotification({
          userId,
          title: 'Nova escala',
          body: `Voce foi escalado em ${schedule?.title ?? 'uma nova escala'}. Confirme ou recuse no app.`,
          type: 'SCHEDULE_ASSIGNED',
        });

        if (profile.email) {
          await sendNotificationEmail({
            to: profile.email,
            subject: 'Voce foi escalado no Louvy',
            html: `<p>Ola, ${profile.name}.</p><p>Voce foi escalado em <strong>${schedule?.title ?? 'uma nova escala'}</strong>. Entre no app para confirmar ou recusar.</p>`,
          });
        }
      } catch {
        // Mantem fluxo da escala mesmo se email/popup falhar.
      }
    }

    await get().refreshData();
    set({ selectedScheduleId: scheduleId, authMessage: 'Membro adicionado na escala.' });
  },
  removeMemberFromSchedule: async (scheduleMemberId) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const syncedUser = await syncCurrentUserProfile(currentUser);
    if (syncedUser.role !== AppRole.ADMIN) {
      set({ authMessage: 'Apenas administradores podem remover membros da escala.' });
      return;
    }

    const { error } = await supabase.from('schedule_members').delete().eq('id', scheduleMemberId);
    if (error) {
      set({ authMessage: error.message });
      return;
    }

    await get().refreshData();
    set({ authMessage: 'Membro removido da escala.' });
  },
  respondToScheduleMember: async ({ scheduleMemberId, status, declineReason }) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    if (status === MemberStatus.DECLINED && !declineReason?.trim()) {
      set({ authMessage: 'Ao recusar, informe o motivo.' });
      return;
    }

    const { error } = await supabase
      .from('schedule_members')
      .update({
        status,
        decline_reason: status === MemberStatus.DECLINED ? declineReason?.trim() ?? null : null,
      })
      .eq('id', scheduleMemberId)
      .eq('user_id', currentUser.id);

    if (error) {
      set({ authMessage: error.message });
      return;
    }

    const targetSchedule = get().schedules.find((schedule) =>
      schedule.members.some((member) => member.id === scheduleMemberId),
    );

    if (targetSchedule && status === MemberStatus.DECLINED) {
      try {
        const admins = await fetchAdminProfiles(currentUser.id);
        await Promise.all(
          admins.map(async (admin) => {
            await createInAppNotification({
              userId: admin.id,
              title: 'Membro recusou escala',
              body: `${currentUser.name} recusou ${targetSchedule.title}. Motivo: ${declineReason?.trim()}`,
              type: 'STATUS_CHANGED',
            });

            if (admin.email) {
              await sendNotificationEmail({
                to: admin.email,
                subject: 'Recusa de escala no Louvy',
                html: `<p>${currentUser.name} recusou a escala <strong>${targetSchedule.title}</strong>.</p><p>Motivo: ${declineReason?.trim()}</p>`,
              });
            }
          }),
        );
      } catch {
        // Sem bloquear a resposta do membro por email/popup falho.
      }
    }

    await get().refreshData();
    set({
      authMessage:
        status === MemberStatus.CONFIRMED ? 'Presenca confirmada.' : 'Recusa registrada e lideranca notificada.',
    });
  },
  saveRepertoireSong: async (payload) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return undefined;
    }

    if (!payload.name.trim() || !payload.key.trim() || !payload.category.trim()) {
      set({ authMessage: 'Preencha nome, tom e categoria da musica.' });
      return undefined;
    }

    try {
      const result = await insertRepertoireSong(payload, currentUser.id);
      await get().refreshData();
      set({
        activeSection: 'repertoire',
        isCreatingRepertoireSong: false,
        authMessage: result.usedLegacyFallback
          ? 'Musica salva. Para persistir artista e duracao no banco, aplique o patch SQL novo do repertorio.'
          : undefined,
      });
      return result.id;
    } catch (error) {
      set({ authMessage: error instanceof Error ? error.message : 'Nao consegui salvar esta musica.' });
      return undefined;
    }
  },
  reorderSongs: async (scheduleId, songIds) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const schedule = get().schedules.find((item) => item.id === scheduleId);
    const memberPermission = schedule?.members.find((member) => member.userId === currentUser.id);
    if (currentUser.role !== AppRole.ADMIN && !memberPermission?.canManageSetlist) {
      set({ authMessage: 'Você não tem permissão para reorganizar o repertório desta escala.' });
      return;
    }

    const updates = songIds.map((songId, index) =>
      supabase.from('schedule_songs').update({ position: index }).eq('id', songId),
    );
    await Promise.all(updates);
    await get().refreshData();
    set({ selectedScheduleId: scheduleId });
  },
  addSongToSchedule: async (scheduleId, songId) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const librarySong = get().repertoire.find((song) => song.id === songId);
    const schedule = get().schedules.find((item) => item.id === scheduleId);
    if (!librarySong || !schedule) {
      return;
    }

    const memberPermission = schedule.members.find((member) => member.userId === currentUser.id);
    if (currentUser.role !== AppRole.ADMIN && !memberPermission?.canManageSetlist) {
      set({ authMessage: 'Você não tem permissão para adicionar músicas nesta escala.' });
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
      return;
    }

    set({ authMessage: error.message });
  },
  removeSongFromSchedule: async (scheduleId, scheduleSongId) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const schedule = get().schedules.find((item) => item.id === scheduleId);
    const memberPermission = schedule?.members.find((member) => member.userId === currentUser.id);
    const syncedUser = await syncCurrentUserProfile(currentUser);
    if (syncedUser.role !== AppRole.ADMIN && !memberPermission?.canManageSetlist) {
      set({ authMessage: 'Você não tem permissão para remover músicas desta escala.' });
      return;
    }

    const { error } = await supabase.from('schedule_songs').delete().eq('id', scheduleSongId);
    if (error) {
      set({ authMessage: error.message });
      return;
    }

    await get().refreshData();
    set({ selectedScheduleId: scheduleId, authMessage: 'Música removida da escala.' });
  },
  updateScheduleSongArrangement: async ({ scheduleId, scheduleSongId, key, leadSingerUserId }) => {
    const currentUser = get().currentUser;
    if (!currentUser) {
      return;
    }

    const schedule = get().schedules.find((item) => item.id === scheduleId);
    const memberPermission = schedule?.members.find((member) => member.userId === currentUser.id);
    const syncedUser = await syncCurrentUserProfile(currentUser);
    if (syncedUser.role !== AppRole.ADMIN && !memberPermission?.canManageSetlist) {
      set({ authMessage: 'Você não tem permissão para editar a ordem musical desta escala.' });
      return;
    }

    let { error } = await supabase
      .from('schedule_songs')
      .update({
        musical_key: key.trim(),
        lead_vocalist_user_id: leadSingerUserId || null,
      })
      .eq('id', scheduleSongId);

    if (error && isSchemaMismatch(error)) {
      const legacyResult = await supabase
        .from('schedule_songs')
        .update({
          musical_key: key.trim(),
        })
        .eq('id', scheduleSongId);
      error = legacyResult.error;
    }

    if (error) {
      set({ authMessage: error.message });
      return;
    }

    await get().refreshData();
    set({ selectedScheduleId: scheduleId, authMessage: 'Música da escala atualizada.' });
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
