'use client';

import { AppRole } from '@louvy/shared';
import { supabase } from '@/lib/supabase';
import {
  AvailabilityBlock,
  AvailabilityBlockInput,
  MemberDirectoryInput,
  MemberDirectoryProfile,
  MinistryAssignment,
  SessionUser,
  VocalRange,
} from '@/types';

const MEMBER_STORAGE_KEY = 'louvy:member-directory:v1';
const AVAILABILITY_STORAGE_KEY = 'louvy:availability:v1';

type MemberMetadataRecord = MemberDirectoryInput;

interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  role: AppRole;
}

interface MemberProfileRow {
  user_id: string;
  notes: string | null;
}

interface AssignmentRow {
  user_id: string;
  assignment: MinistryAssignment;
  vocal_range: VocalRange | null;
}

interface AssignmentInsertRow {
  user_id: string;
  assignment: MinistryAssignment;
  vocal_range: VocalRange | null;
}

interface AvailabilityRow {
  id: string;
  user_id: string;
  date: string;
  reason: string;
  time_slot: AvailabilityBlock['timeSlot'];
  recurrence: AvailabilityBlock['recurrence'];
  created_at: string;
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.toLowerCase().includes('relation') ||
    message.toLowerCase().includes('does not exist')
  );
}

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasBrowserStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
}

function readLocalMemberMetadata() {
  return readJson<MemberMetadataRecord[]>(MEMBER_STORAGE_KEY, []);
}

function writeLocalMemberMetadata(records: MemberMetadataRecord[]) {
  writeJson(MEMBER_STORAGE_KEY, records);
}

function readLocalAvailabilityBlocks() {
  return readJson<AvailabilityBlock[]>(AVAILABILITY_STORAGE_KEY, []);
}

function writeLocalAvailabilityBlocks(blocks: AvailabilityBlock[]) {
  writeJson(AVAILABILITY_STORAGE_KEY, blocks);
}

function upsertMemberMetadata(record: MemberDirectoryInput) {
  const current = readLocalMemberMetadata();
  const next = [
    record,
    ...current.filter((entry) => entry.userId !== record.userId),
  ];
  writeLocalMemberMetadata(next);
}

function mergeDirectory(
  profiles: ProfileRow[],
  remoteProfiles: MemberProfileRow[],
  remoteAssignments: AssignmentRow[],
) {
  const localMetadata = new Map(readLocalMemberMetadata().map((entry) => [entry.userId, entry]));
  const remoteNotes = new Map(remoteProfiles.map((entry) => [entry.user_id, entry.notes ?? undefined]));
  const remoteAssignmentsMap = new Map<string, MinistryAssignment[]>();
  const remoteVocalMap = new Map<string, VocalRange[]>();

  for (const row of remoteAssignments) {
    const assignments = remoteAssignmentsMap.get(row.user_id) ?? [];
    if (!assignments.includes(row.assignment)) {
      assignments.push(row.assignment);
      remoteAssignmentsMap.set(row.user_id, assignments);
    }

    if (row.vocal_range) {
      const vocalRanges = remoteVocalMap.get(row.user_id) ?? [];
      if (!vocalRanges.includes(row.vocal_range)) {
        vocalRanges.push(row.vocal_range);
        remoteVocalMap.set(row.user_id, vocalRanges);
      }
    }
  }

  return profiles.map<MemberDirectoryProfile>((profile) => {
    const local = localMetadata.get(profile.id);
    return {
      userId: profile.id,
      name: profile.name,
      email: profile.email ?? '',
      appRole: local?.appRole ?? profile.role,
      assignments: local?.assignments ?? remoteAssignmentsMap.get(profile.id) ?? [],
      vocalRanges: local?.vocalRanges ?? remoteVocalMap.get(profile.id) ?? [],
      notes: local?.notes ?? remoteNotes.get(profile.id),
    };
  });
}

export async function loadMemberDirectory() {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .order('name', { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  const baseProfiles = (profiles ?? []) as ProfileRow[];

  const [memberProfilesResult, assignmentsResult] = await Promise.all([
    supabase.from('member_profiles').select('user_id, notes'),
    supabase.from('member_assignments').select('user_id, assignment, vocal_range'),
  ]);

  if (memberProfilesResult.error || assignmentsResult.error) {
    if (
      isMissingRelationError(memberProfilesResult.error) ||
      isMissingRelationError(assignmentsResult.error)
    ) {
      return mergeDirectory(baseProfiles, [], []);
    }

    throw memberProfilesResult.error ?? assignmentsResult.error;
  }

  return mergeDirectory(
    baseProfiles,
    (memberProfilesResult.data ?? []) as MemberProfileRow[],
    (assignmentsResult.data ?? []) as AssignmentRow[],
  );
}

export async function saveMemberDirectoryProfile(currentUser: SessionUser, payload: MemberDirectoryInput) {
  upsertMemberMetadata(payload);

  const remoteErrors: string[] = [];

  const { error: roleError } = await supabase
    .from('profiles')
    .update({ role: payload.appRole })
    .eq('id', payload.userId);

  if (roleError && !isMissingRelationError(roleError)) {
    remoteErrors.push(roleError.message);
  }

  const { error: notesError } = await supabase.from('member_profiles').upsert(
    {
      user_id: payload.userId,
      notes: payload.notes?.trim() || null,
    },
    { onConflict: 'user_id' },
  );

  if (notesError) {
    if (!isMissingRelationError(notesError)) {
      remoteErrors.push(notesError.message);
    }
  } else {
    const { error: deleteError } = await supabase
      .from('member_assignments')
      .delete()
      .eq('user_id', payload.userId);

    if (deleteError && !isMissingRelationError(deleteError)) {
      remoteErrors.push(deleteError.message);
    } else {
      const assignmentRows: AssignmentInsertRow[] = [];

      for (const assignment of payload.assignments) {
        if (assignment === 'VOCAL' && payload.vocalRanges.length > 0) {
          for (const vocalRange of payload.vocalRanges) {
            assignmentRows.push({
              user_id: payload.userId,
              assignment,
              vocal_range: vocalRange,
            });
          }
          continue;
        }

        assignmentRows.push({
          user_id: payload.userId,
          assignment,
          vocal_range: null,
        });
      }

      if (assignmentRows.length > 0) {
        const { error: insertError } = await supabase.from('member_assignments').insert(assignmentRows);
        if (insertError && !isMissingRelationError(insertError)) {
          remoteErrors.push(insertError.message);
        }
      }
    }
  }

  const directory = await loadMemberDirectory();
  const updatedCurrentUser =
    payload.userId === currentUser.id
      ? {
          ...currentUser,
          role: payload.appRole,
        }
      : currentUser;

  return {
    directory,
    currentUser: updatedCurrentUser,
    remoteErrors,
  };
}

function mergeAvailabilityBlocks(remoteBlocks: AvailabilityBlock[]) {
  const map = new Map<string, AvailabilityBlock>();

  for (const block of remoteBlocks) {
    map.set(block.id, block);
  }

  for (const block of readLocalAvailabilityBlocks()) {
    map.set(block.id, block);
  }

  return Array.from(map.values()).sort((left, right) => left.date.localeCompare(right.date));
}

export async function loadAvailabilityBlocks() {
  const { data: availabilityRows, error } = await supabase
    .from('availability_blocks')
    .select('id, user_id, date, reason, time_slot, recurrence, created_at')
    .order('date', { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return readLocalAvailabilityBlocks().sort((left, right) => left.date.localeCompare(right.date));
    }

    throw error;
  }

  const rows = (availabilityRows ?? []) as AvailabilityRow[];
  const profileIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const { data: profiles, error: profilesError } =
    profileIds.length > 0
      ? await supabase.from('profiles').select('id, name').in('id', profileIds)
      : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));

  const remoteBlocks = rows.map<AvailabilityBlock>((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: names.get(row.user_id) ?? 'Integrante',
    date: row.date,
    reason: row.reason,
    timeSlot: row.time_slot,
    recurrence: row.recurrence,
    createdAt: row.created_at,
  }));

  return mergeAvailabilityBlocks(remoteBlocks);
}

export async function saveAvailabilityBlock(currentUser: SessionUser, payload: AvailabilityBlockInput) {
  const id = payload.id ?? crypto.randomUUID();
  const block: AvailabilityBlock = {
    id,
    userId: payload.userId ?? currentUser.id,
    userName: currentUser.name,
    date: payload.date,
    reason: payload.reason.trim(),
    timeSlot: payload.timeSlot,
    recurrence: payload.recurrence,
    createdAt: new Date().toISOString(),
  };

  const localBlocks = [
    block,
    ...readLocalAvailabilityBlocks().filter((entry) => entry.id !== block.id),
  ].sort((left, right) => left.date.localeCompare(right.date));
  writeLocalAvailabilityBlocks(localBlocks);

  const { error } = await supabase.from('availability_blocks').upsert(
    {
      id: block.id,
      user_id: block.userId,
      date: block.date,
      reason: block.reason,
      time_slot: block.timeSlot,
      recurrence: block.recurrence,
    },
    { onConflict: 'id' },
  );

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return loadAvailabilityBlocks();
}

export async function removeAvailabilityBlock(blockId: string) {
  writeLocalAvailabilityBlocks(readLocalAvailabilityBlocks().filter((entry) => entry.id !== blockId));

  const { error } = await supabase.from('availability_blocks').delete().eq('id', blockId);
  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return loadAvailabilityBlocks();
}
