'use client';

import { AppRole } from '@louvy/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Palette, Settings2, UserRoundCog } from 'lucide-react';
import { ministryAssignmentLabel, vocalRangeLabel } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import {
  applyTheme,
  loadUserPreferences,
  saveUserPreferences,
  themeOptions,
  UserPreferences,
} from '@/lib/user-preferences';
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

export function SettingsPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const memberDirectory = useAppStore((state) => state.memberDirectory);
  const loadMemberDirectory = useAppStore((state) => state.loadMemberDirectory);
  const saveMemberDirectoryProfile = useAppStore((state) => state.saveMemberDirectoryProfile);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthday, setBirthday] = useState('');
  const [assignments, setAssignments] = useState<MinistryAssignment[]>([]);
  const [vocalRanges, setVocalRanges] = useState<VocalRange[]>([]);
  const [ministriesText, setMinistriesText] = useState('');
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void loadMemberDirectory();
  }, [loadMemberDirectory]);

  const selfProfile = useMemo(
    () => memberDirectory.find((member) => member.userId === currentUser?.id),
    [currentUser?.id, memberDirectory],
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const nextPreferences = loadUserPreferences(currentUser.id);
    setPreferences(nextPreferences);
    applyTheme(nextPreferences.theme);
    setName(nextPreferences.displayName ?? currentUser.name);
    setAvatarUrl(nextPreferences.avatarUrl ?? '');
    setBirthday(selfProfile?.birthday ?? '');
    setAssignments(selfProfile?.assignments ?? []);
    setVocalRanges(selfProfile?.vocalRanges ?? []);
    setMinistriesText(nextPreferences.ministries.join('\n'));
  }, [currentUser, selfProfile]);

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

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !preferences) {
      return;
    }

    const ministries = ministriesText
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const nextPreferences: UserPreferences = {
      ...preferences,
      ministries: ministries.length ? ministries : ['Ministério principal'],
      currentMinistry:
        ministries.includes(preferences.currentMinistry)
          ? preferences.currentMinistry
          : ministries[0] ?? 'Ministério principal',
      displayName: name.trim() || currentUser.name,
      avatarUrl: avatarUrl.trim() || undefined,
    };

    saveUserPreferences(currentUser.id, nextPreferences);
    setPreferences(nextPreferences);

    try {
      const rpcResult = await supabase.rpc('update_my_profile', {
        display_name: name.trim() || currentUser.name,
        avatar: avatarUrl.trim() || null,
      });

      if (rpcResult.error) {
        await supabase
          .from('profiles')
          .update({
            name: name.trim() || currentUser.name,
            avatar_url: avatarUrl.trim() || null,
          })
          .eq('id', currentUser.id);
      }
    } catch {
      // local-first
    }

    if (selfProfile) {
      await saveMemberDirectoryProfile({
        userId: selfProfile.userId,
        appRole: selfProfile.appRole ?? AppRole.MUSICIAN,
        assignments,
        vocalRanges,
        notes: selfProfile.notes ?? '',
        birthday: birthday || null,
      });
    }

    setMessage('Configurações salvas.');
  };

  if (!currentUser || !preferences) {
    return null;
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <Palette size={18} />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Aparência</p>
            <h2 className="text-2xl">Configurações</h2>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {themeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                const nextPreferences = { ...preferences, theme: option.id };
                setPreferences(nextPreferences);
                applyTheme(option.id);
              }}
              className={cn(
                'w-full rounded-2xl border px-4 py-3 text-left text-sm transition',
                preferences.theme === option.id
                  ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                  : 'border-[var(--line)] bg-[var(--surface-strong)]',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </aside>

      <form onSubmit={handleSave} className="space-y-3">
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <UserRoundCog size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Meu perfil</p>
              <h3 className="text-xl">Dados pessoais</h3>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">Foto (URL)</span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">Data de nascimento</span>
              <input
                type="date"
                value={birthday}
                onChange={(event) => setBirthday(event.target.value)}
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">Ministérios</span>
              <textarea
                value={ministriesText}
                onChange={(event) => setMinistriesText(event.target.value)}
                rows={4}
                placeholder="Um ministério por linha"
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Ministério ativo</span>
            <select
              value={preferences.currentMinistry}
              onChange={(event) =>
                setPreferences((current) =>
                  current
                    ? {
                        ...current,
                        currentMinistry: event.target.value,
                      }
                    : current,
                )
              }
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            >
              {ministriesText
                .split('\n')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
            </select>
          </label>
        </section>

        <section className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Settings2 size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Atuação</p>
              <h3 className="text-xl">Funções do ministério</h3>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {assignmentOptions.map((assignment) => (
              <button
                key={assignment}
                type="button"
                onClick={() => toggleAssignment(assignment)}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left text-sm transition',
                  assignments.includes(assignment)
                    ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                    : 'border-[var(--line)] bg-[var(--surface-strong)]',
                )}
              >
                {ministryAssignmentLabel[assignment]}
              </button>
            ))}
          </div>

          {assignments.includes('VOCAL') ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {vocalRangeOptions.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => toggleVocalRange(range)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition',
                    vocalRanges.includes(range)
                      ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                      : 'border-[var(--line)] bg-[var(--surface-strong)]',
                  )}
                >
                  {vocalRangeLabel[range]}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {message ? (
          <div className="rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
            {message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" className="rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white">
            Salvar configurações
          </button>
        </div>
      </form>
    </section>
  );
}
