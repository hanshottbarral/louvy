import { AppRole, InstrumentRole, MemberStatus } from '@louvy/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { instrumentRoleLabel, memberStatusLabel } from '@/lib/labels';
import { getAllowedScheduleRoles } from '@/lib/schedule-roles';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';

const statusClassName: Record<MemberStatus, string> = {
  CONFIRMED: 'bg-[rgba(122,31,62,0.12)] text-[var(--accent-strong)]',
  PENDING: 'bg-[rgba(197,107,79,0.12)] text-[var(--danger)]',
  DECLINED: 'bg-[rgba(35,24,17,0.08)] text-[var(--muted)]',
};

export function MembersPanel({ schedule }: { schedule: ScheduleView }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const memberDirectory = useAppStore((state) => state.memberDirectory);
  const loadMemberDirectory = useAppStore((state) => state.loadMemberDirectory);
  const addMemberToSchedule = useAppStore((state) => state.addMemberToSchedule);
  const removeMemberFromSchedule = useAppStore((state) => state.removeMemberFromSchedule);
  const respondToScheduleMember = useAppStore((state) => state.respondToScheduleMember);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<InstrumentRole>(InstrumentRole.VOCAL);
  const [status, setStatus] = useState<MemberStatus>(MemberStatus.PENDING);
  const [declineReasonByMemberId, setDeclineReasonByMemberId] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadMemberDirectory();
  }, [loadMemberDirectory]);

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
                  <option value="">Todos os membros ja estao nesta escala</option>
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
              <button
                type="submit"
                disabled={!selectedUserId || allowedRoles.length === 0}
                className="rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm text-white disabled:opacity-60"
              >
                Adicionar na escala
              </button>
              {selectedMemberProfile && allowedRoles.length === 0 ? (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                  Esse membro ainda nao tem uma funcao de escala compativel cadastrada na aba Membros.
                </p>
              ) : null}
              {authMessage ? (
                <p className="rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
                <p className="text-sm text-[var(--muted)]">{instrumentRoleLabel[member.role]}</p>
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
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
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
