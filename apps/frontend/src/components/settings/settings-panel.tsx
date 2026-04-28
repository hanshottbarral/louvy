'use client';

import { AppRole } from '@korus/shared';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2, UserRoundCog } from 'lucide-react';
import { MinistryBadge } from '@/components/shared/ministry-badge';
import { ministryAssignmentLabel, vocalRangeLabel } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import {
  applyTheme,
  loadUserPreferences,
  saveUserPreferences,
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

async function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Não consegui carregar essa imagem.'));
    reader.readAsDataURL(file);
  });
}

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
  const [message, setMessage] = useState<string>();
  const [avatarMessage, setAvatarMessage] = useState<string>();
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    applyTheme();
    setName(nextPreferences.displayName ?? currentUser.name);
    setAvatarUrl(nextPreferences.avatarUrl ?? '');
    setBirthday(selfProfile?.birthday ?? '');
    setAssignments(selfProfile?.assignments ?? []);
    setVocalRanges(selfProfile?.vocalRanges ?? []);
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

  const applyAvatarFile = async (file?: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarMessage('Escolha um arquivo de imagem.');
      return;
    }

    const dataUrl = await readImageAsDataUrl(file);
    if (!dataUrl) {
      setAvatarMessage('Não consegui carregar essa imagem.');
      return;
    }

    setAvatarUrl(dataUrl);
    setAvatarMessage('Foto pronta para salvar.');
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      await applyAvatarFile(event.target.files?.[0]);
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Não consegui carregar essa imagem.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingPhoto(false);

    try {
      await applyAvatarFile(event.dataTransfer.files?.[0]);
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Não consegui carregar essa imagem.');
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !preferences) {
      return;
    }

    const nextPreferences: UserPreferences = {
      ...preferences,
      displayName: name.trim() || currentUser.name,
      avatarUrl: avatarUrl.trim() || undefined,
    };

    saveUserPreferences(currentUser.id, nextPreferences);
    setPreferences(nextPreferences);
    setMessage('Configurações salvas.');
    setAvatarMessage(undefined);

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
  };

  if (!currentUser || !preferences) {
    return null;
  }

  return (
    <section>
      <form onSubmit={handleSave} className="space-y-3">
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <UserRoundCog size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Meu perfil</p>
              <h3 className="text-xl">Dados pessoais</h3>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingPhoto(true);
                }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-5 py-6 text-center transition',
                  isDraggingPhoto
                    ? 'border-[var(--accent-strong)] bg-[rgba(200,169,106,0.10)]'
                    : 'border-[var(--line)] bg-[var(--surface-strong)]',
                )}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name || currentUser.name} className="h-24 w-24 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-[var(--muted)] shadow-sm">
                    <ImagePlus size={28} />
                  </div>
                )}
                <div>
                  <p className="font-semibold">Arraste sua foto aqui</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    ou clique para escolher uma imagem
                  </p>
                </div>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                >
                  Trocar foto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl('');
                    setAvatarMessage('Foto removida. Salve para confirmar.');
                  }}
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-[var(--danger)]"
                  title="Remover foto"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {avatarMessage ? (
                <p className="text-sm text-[var(--muted)]">{avatarMessage}</p>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">Nome</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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

              <div className="md:col-span-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
                Seu tema e sua foto ficam com a sua cara; as funções ajudam o time a escalar melhor você.
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Atuação</p>
              <h3 className="text-xl">Funções e classificação vocal</h3>
            </div>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
              {assignments.length} função{assignments.length === 1 ? '' : 'ões'}
            </span>
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

          {assignments.includes('VOCAL') ? (
            <div className="mt-4 rounded-3xl border border-[var(--line)] p-4">
              <h4 className="text-lg">Classificação vocal</h4>
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
            </div>
          ) : null}
        </section>

        {message ? (
          <div className="rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
