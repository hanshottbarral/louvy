import { MemberStatus } from '@louvy/shared';
import { instrumentRoleLabel, memberStatusLabel } from '@/lib/labels';
import { ScheduleView } from '@/types';

const statusClassName: Record<MemberStatus, string> = {
  CONFIRMED: 'bg-[rgba(31,122,92,0.12)] text-[var(--accent-strong)]',
  PENDING: 'bg-[rgba(197,107,79,0.12)] text-[var(--danger)]',
  DECLINED: 'bg-[rgba(35,24,17,0.08)] text-[var(--muted)]',
};

export function MembersPanel({ schedule }: { schedule: ScheduleView }) {
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
              <span className={`rounded-full px-3 py-1 text-xs ${statusClassName[member.status]}`}>
                {memberStatusLabel[member.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
