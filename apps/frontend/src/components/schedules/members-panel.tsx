import { AppRole, InstrumentRole, MemberStatus } from '@louvy/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { instrumentRoleLabel, memberStatusLabel } from '@/lib/labels';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';

const statusClassName: Record<MemberStatus, string> = {
  CONFIRMED: 'bg-[rgba(31,122,92,0.12)] text-[var(--accent-strong)]',
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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<InstrumentRole>(InstrumentRole.VOCAL);
  const [status, setStatus] = useState<MemberStatus>(MemberStatus.PENDING);

  useEffect(() => {
    void loadMemberDirectory();
  }, [loadMemberDirectory]);

  const canManageMembers = currentUser?.role === AppRole.ADMIN;
  const availableMembers = useMemo(
    () => memberDirectory.filter((member) => !schedule.members.some((entry) => entry.userId === member.userId)),
    [memberDirectory, schedule.members],
  );

  useEffect(() => {
    if (!selectedUserId && availableMembers.length > 0) {
      setSelectedUserId(availableMembers[0].userId);
    }
  }, [availableMembers, selectedUserId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
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
                  {Object.values(InstrumentRole).map((option) => (
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
                disabled={!selectedUserId}
                className="rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm text-white disabled:opacity-60"
              >
                Adicionar na escala
              </button>
              {authMessage ? (
                <p className="rounded-2xl bg-[rgba(31,122,92,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
          </div>
        ))}
      </div>
    </section>
  );
}
