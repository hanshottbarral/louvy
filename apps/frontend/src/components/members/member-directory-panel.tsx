'use client';

import { AppRole } from '@louvy/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MinistryBadge } from '@/components/shared/ministry-badge';
import { Search, ShieldCheck, UserCog2, Users2 } from 'lucide-react';
import {
  ministryAssignmentLabel,
  vocalRangeLabel,
} from '@/lib/labels';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { MinistryAssignment, VocalRange } from '@/types';

const assignmentOptions: MinistryAssignment[] = [
  'VOCAL',
  'BATERIA',
  'BAIXO',
  'GUITARRA',
  'TECLADO',
  'VIOLAO',
  'DIRETOR_MUSICAL',
  'MINISTRO_RESPONSAVEL',
  'VS',
];

const vocalRangeOptions: VocalRange[] = ['BARITONO', 'TENOR', 'CONTRALTO', 'SOPRANO', 'MEZZO'];

export function MemberDirectoryPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const memberDirectory = useAppStore((state) => state.memberDirectory);
  const isLoadingMembers = useAppStore((state) => state.isLoadingMembers);
  const loadMemberDirectory = useAppStore((state) => state.loadMemberDirectory);
  const saveMemberProfile = useAppStore((state) => state.saveMemberDirectoryProfile);
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [appRole, setAppRole] = useState<AppRole>(AppRole.MUSICIAN);
  const [assignments, setAssignments] = useState<MinistryAssignment[]>([]);
  const [vocalRanges, setVocalRanges] = useState<VocalRange[]>([]);
  const [notes, setNotes] = useState('');
  const [birthday, setBirthday] = useState('');

  useEffect(() => {
    void loadMemberDirectory();
  }, [loadMemberDirectory]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return memberDirectory;
    }

    return memberDirectory.filter((member) =>
      [member.name, member.email, member.assignments.map((entry) => ministryAssignmentLabel[entry]).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [memberDirectory, query]);

  useEffect(() => {
    if (!filteredMembers.length) {
      setSelectedUserId('');
      return;
    }

    const selectedStillExists = filteredMembers.some((member) => member.userId === selectedUserId);
    if (!selectedUserId || !selectedStillExists) {
      setSelectedUserId(filteredMembers[0].userId);
    }
  }, [filteredMembers, selectedUserId]);

  const selectedMember = memberDirectory.find((member) => member.userId === selectedUserId) ?? filteredMembers[0];

  useEffect(() => {
    if (!selectedMember) {
      return;
    }

    setAppRole(selectedMember.appRole);
    setAssignments(selectedMember.assignments);
    setVocalRanges(selectedMember.vocalRanges);
    setNotes(selectedMember.notes ?? '');
    setBirthday(selectedMember.birthday ?? '');
  }, [selectedMember]);

  const canEdit = currentUser?.role === AppRole.ADMIN;

  const toggleAssignment = (assignment: MinistryAssignment) => {
    setAssignments((currentAssignments) => {
      const next = currentAssignments.includes(assignment)
        ? currentAssignments.filter((entry) => entry !== assignment)
        : [...currentAssignments, assignment];

      if (!next.includes('VOCAL')) {
        setVocalRanges([]);
      }

      return next;
    });
  };

  const toggleVocalRange = (range: VocalRange) => {
    setVocalRanges((currentRanges) =>
      currentRanges.includes(range)
        ? currentRanges.filter((entry) => entry !== range)
        : [...currentRanges, range],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedMember) {
      return;
    }

    await saveMemberProfile({
      userId: selectedMember.userId,
      appRole,
      assignments,
      vocalRanges,
      notes,
      birthday: birthday || null,
    });
  };

  return (
    <section className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="glass rounded-3xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Equipe</p>
            <h2 className="mt-2 text-2xl">Membros</h2>
          </div>
          <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
            {memberDirectory.length} pessoas
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-3">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou função"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </div>

        <div className="mt-4 space-y-2">
          {filteredMembers.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => setSelectedUserId(member.userId)}
              className={cn(
                'w-full rounded-2xl border px-4 py-3 text-left transition',
                selectedUserId === member.userId
                  ? 'border-[var(--foreground)] bg-[var(--surface-strong)]'
                  : 'border-[var(--line)] bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{member.name}</p>
                  <p className="truncate text-sm text-[var(--muted)]">{member.email}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-xs',
                    member.appRole === AppRole.ADMIN
                      ? 'bg-[rgba(122,31,62,0.12)] text-[var(--accent-strong)]'
                      : 'bg-[var(--surface-strong)] text-[var(--muted)]',
                  )}
                >
                  {member.appRole === AppRole.ADMIN ? 'Admin' : 'Usuário'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {member.assignments.length ? (
                  member.assignments.map((assignment) => (
                    <MinistryBadge
                      key={`${member.userId}-${assignment}`}
                      role={assignment}
                      vocalRange={assignment === 'VOCAL' ? member.vocalRanges[0] ?? null : null}
                    />
                  ))
                ) : (
                  <span className="text-xs text-[var(--muted)]">Sem funções definidas ainda.</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="glass rounded-3xl p-5">
        {!selectedMember ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-6 text-center text-[var(--muted)]">
            {isLoadingMembers ? 'Carregando membros...' : 'Nenhum membro encontrado.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cadastro</p>
                <h3 className="mt-2 text-3xl leading-none">{selectedMember.name}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{selectedMember.email}</p>
              </div>
              <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Resumo</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Users2 size={16} />
                  <span>{selectedMember.assignments.length || assignments.length} frentes ativas</span>
                </div>
              </div>
            </div>

            {!canEdit ? (
              <div className="rounded-2xl bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
                Você consegue consultar as funções de todo mundo aqui, mas apenas administradores editam cargos e funções.
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[1.1fr_1.4fr]">
              <div className="rounded-3xl border border-[var(--line)] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <h4 className="text-lg">Permissão no app</h4>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[AppRole.ADMIN, AppRole.MUSICIAN].map((roleOption) => (
                    <button
                      key={roleOption}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setAppRole(roleOption)}
                      className={cn(
                        'rounded-2xl border px-3 py-2.5 text-sm transition',
                        appRole === roleOption
                          ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                          : 'border-[var(--line)] bg-[var(--surface-strong)]',
                        !canEdit && 'opacity-70',
                      )}
                    >
                      {roleOption === AppRole.ADMIN ? 'Admin' : 'Usuário normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--line)] p-4">
                <div className="flex items-center gap-2">
                  <UserCog2 size={18} />
                  <h4 className="text-lg">Anotações</h4>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)]">
                  <label className="block">
                    <span className="mb-2 block text-sm text-[var(--muted)]">Aniversário</span>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(event) => setBirthday(event.target.value)}
                      disabled={!canEdit}
                      className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 outline-none disabled:opacity-70"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-[var(--muted)]">Observações</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={!canEdit}
                      placeholder="Timbre, arranjo, liderança, repertório..."
                      className="min-h-[96px] w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none disabled:opacity-70"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--line)] p-4">
              <h4 className="text-lg">Frentes do ministério</h4>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Marque tudo o que essa pessoa pode cobrir quando uma nova escala for montada.
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {assignmentOptions.map((assignment) => (
                  <button
                    key={assignment}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleAssignment(assignment)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-left text-sm transition',
                      assignments.includes(assignment)
                        ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                        : 'border-[var(--line)] bg-[var(--surface-strong)]',
                      !canEdit && 'opacity-70',
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MinistryBadge
                        role={assignment}
                        vocalRange={assignment === 'VOCAL' ? vocalRanges[0] ?? null : null}
                        showLabel={false}
                      />
                      <span>{ministryAssignmentLabel[assignment]}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {assignments.includes('VOCAL') ? (
              <div className="rounded-3xl border border-[var(--line)] p-4">
                <h4 className="text-lg">Classificação vocal</h4>
                <div className="mt-4 flex flex-wrap gap-2">
                  {vocalRangeOptions.map((range) => (
                    <button
                      key={range}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleVocalRange(range)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm transition',
                        vocalRanges.includes(range)
                          ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                          : 'border-[var(--line)] bg-[var(--surface-strong)]',
                        !canEdit && 'opacity-70',
                      )}
                    >
                      {vocalRangeLabel[range]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {authMessage ? (
              <div className="rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                {authMessage}
              </div>
            ) : null}

            {canEdit ? (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoadingMembers}
                  className="rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white disabled:opacity-60"
                >
                  {isLoadingMembers ? 'Salvando...' : 'Salvar membro'}
                </button>
              </div>
            ) : null}
          </form>
        )}
      </section>
    </section>
  );
}
