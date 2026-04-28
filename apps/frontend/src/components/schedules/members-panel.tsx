import { AppRole, InstrumentRole, MemberStatus } from '@korus/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MinistryBadge } from '@/components/shared/ministry-badge';
import { findAvailabilityConflict } from '@/lib/availability';
import { instrumentRoleLabel, memberStatusLabel, vocalRangeLabel } from '@/lib/labels';
import { getAllowedScheduleRoles } from '@/lib/schedule-roles';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView, VocalRange } from '@/types';

const statusClassName: Record<MemberStatus, string> = {
  CONFIRMED: 'bg-[rgba(200,169,106,0.18)] text-[var(--accent-strong)]',
  PENDING: 'bg-[rgba(197,107,79,0.12)] text-[var(--danger)]',
  DECLINED: 'bg-[rgba(35,24,17,0.08)] text-[var(--muted)]',
};

export function MembersPanel({ schedule }: { schedule: ScheduleView }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const memberDirectory = useAppStore((state) => state.memberDirectory);
  const availabilityBlocks = useAppStore((state) => state.availabilityBlocks);
  const loadAvailabilityBlocks = useAppStore((state) => state.loadAvailabilityBlocks);
  const loadMemberDirectory = useAppStore((state) => state.loadMemberDirectory);
  const addMemberToSchedule = useAppStore((state) => state.addMemberToSchedule);
  const removeMemberFromSchedule = useAppStore((state) => state.removeMemberFromSchedule);
  const respondToScheduleMember = useAppStore((state) => state.respondToScheduleMember);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<InstrumentRole>(InstrumentRole.VOCAL);
  const [status, setStatus] = useState<MemberStatus>(MemberStatus.PENDING);
  const [selectedVocalRange, setSelectedVocalRange] = useState<VocalRange | ''>('');
  const [canManageSetlist, setCanManageSetlist] = useState(false);
  const [declineReasonByMemberId, setDeclineReasonByMemberId] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadMemberDirectory();
    void loadAvailabilityBlocks();
  }, [loadAvailabilityBlocks, loadMemberDirectory]);

  const canManageMembers = currentUser?.role === AppRole.ADMIN;
  const availableMembers = useMemo(
    () => memberDirectory.filter((member) => !schedule.members.some((entry) => entry.userId === member.userId)),
    [memberDirectory, schedule.members],
  );
  const selectedMemberProfile = availableMembers.find((member) => member.userId === selectedUserId);
  const allowedRoles = useMemo(
    () => getAllowedScheduleRoles(selectedMemberProfile),
    [selectedMemberProfile],
  );
  const selectedConflict = useMemo(
    () =>
      selectedUserId
        ? findAvailabilityConflict(availabilityBlocks, selectedUserId, schedule.date, schedule.time)
        : undefined,
    [availabilityBlocks, schedule.date, schedule.time, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUserId && availableMembers.length > 0) {
      setSelectedUserId(availableMembers[0].userId);
    }
  }, [availableMembers, selectedUserId]);

  useEffect(() => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      setRole(allowedRoles[0]);
    }
  }, [allowedRoles, role]);

  useEffect(() => {
    if (role !== InstrumentRole.VOCAL) {
      setSelectedVocalRange('');
      return;
    }

    if (
      selectedMemberProfile?.vocalRanges.length &&
      !selectedMemberProfile.vocalRanges.includes(selectedVocalRange as (typeof selectedMemberProfile.vocalRanges)[number])
    ) {
      setSelectedVocalRange(selectedMemberProfile.vocalRanges[0]);
    }
  }, [role, selectedMemberProfile, selectedVocalRange]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }

    if (!allowedRoles.includes(role)) {
      return;
    }

    await addMemberToSchedule({
      scheduleId: schedule.id,
      userId: selectedUserId,
      role,
      status,
      vocalRange: role === InstrumentRole.VOCAL ? (selectedVocalRange || null) : null,
      canManageSetlist,
    });
  };

  return (
    <section className="glass rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Time</p>
          <h3 className="text-xl">Membros</h3>
        </div>
        <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
          {schedule.members.length}
        </span>
      </div>

      <div className="space-y-3">
        {canManageMembers ? (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
            <p className="text-sm font-semibold">Adicionar membro</p>
            <div className="mt-3 grid gap-2">
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              >
                {availableMembers.length ? (
                  availableMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))
                ) : (
                  <option value="">Todos os membros já estão nesta escala</option>
                )}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as InstrumentRole)}
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                >
                  {allowedRoles.map((option) => (
                    <option key={option} value={option}>
                      {instrumentRoleLabel[option]}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as MemberStatus)}
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                >
                  {Object.values(MemberStatus).map((option) => (
                    <option key={option} value={option}>
                      {memberStatusLabel[option]}
                    </option>
                  ))}
                </select>
              </div>
              {role === InstrumentRole.VOCAL && (selectedMemberProfile?.vocalRanges.length ?? 0) > 1 ? (
                <select
                  value={selectedVocalRange}
                  onChange={(event) => setSelectedVocalRange(event.target.value as VocalRange)}
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                >
                  {(selectedMemberProfile?.vocalRanges ?? []).map((range) => (
                    <option key={range} value={range}>
                      {vocalRangeLabel[range]}
                    </option>
                  ))}
                </select>
              ) : null}
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={canManageSetlist}
                  onChange={(event) => setCanManageSetlist(event.target.checked)}
                  className="h-4 w-4"
                />
                Permitir que essa pessoa adicione músicas e altere a ordem do setlist
              </label>
              <button
                type="submit"
                disabled={!selectedUserId || allowedRoles.length === 0 || !!selectedConflict}
                className="rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm text-white disabled:opacity-60"
              >
                Adicionar na escala
              </button>
              {selectedConflict ? (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--danger)]">
                  Essa pessoa está indisponível nesta data. Motivo: {selectedConflict.reason}
                </p>
              ) : null}
              {selectedMemberProfile && allowedRoles.length === 0 ? (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                  Esse membro ainda não tem uma função de escala compatível cadastrada na aba Membros.
                </p>
              ) : null}
              {authMessage ? (
                <p className="rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                  {authMessage}
                </p>
              ) : null}
            </div>
          </form>
        ) : null}

        {schedule.members.map((member) => (
          <div
            key={member.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{member.userName}</p>
                <div className="mt-1">
                  <MinistryBadge role={member.role} vocalRange={member.vocalRange ?? null} />
                </div>
                {member.canManageSetlist ? (
                  <p className="mt-1 text-xs text-[var(--accent-strong)]">Pode organizar o setlist</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs ${statusClassName[member.status]}`}>
                  {memberStatusLabel[member.status]}
                </span>
                {canManageMembers ? (
                  <button
                    type="button"
                    onClick={() => void removeMemberFromSchedule(member.id)}
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-xs"
                  >
                    Remover
                  </button>
                ) : null}
              </div>
            </div>
            {member.declineReason ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Motivo da recusa: {member.declineReason}</p>
            ) : null}
            {currentUser?.id === member.userId ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void respondToScheduleMember({
                        scheduleMemberId: member.id,
                        status: MemberStatus.CONFIRMED,
                      })
                    }
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-[var(--foreground)]"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void respondToScheduleMember({
                        scheduleMemberId: member.id,
                        status: MemberStatus.DECLINED,
                        declineReason: declineReasonByMemberId[member.id],
                      })
                    }
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--danger)]"
                  >
                    Recusar
                  </button>
                </div>
                <textarea
                  value={declineReasonByMemberId[member.id] ?? ''}
                  onChange={(event) =>
                    setDeclineReasonByMemberId((current) => ({
                      ...current,
                      [member.id]: event.target.value,
                    }))
                  }
                  placeholder="Se precisar recusar, explique o motivo."
                  rows={2}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
