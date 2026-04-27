'use client';

import { Search, PlusCircle, Music4, WandSparkles, ArrowDown, ArrowUp, Save, Trash2 } from 'lucide-react';
import { FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AppRole } from '@louvy/shared';
import { formatDuration, formatScheduleDate, parseDurationInput, prettifyChurchText } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { YoutubeMetadata } from '@/lib/youtube-metadata';

export function RepertoirePanel() {
  const repertoire = useAppStore((state) => state.repertoire);
  const schedules = useAppStore((state) => state.schedules);
  const selectedScheduleId = useAppStore((state) => state.selectedScheduleId);
  const addSongToSchedule = useAppStore((state) => state.addSongToSchedule);
  const removeSongFromSchedule = useAppStore((state) => state.removeSongFromSchedule);
  const reorderSongs = useAppStore((state) => state.reorderSongs);
  const updateScheduleSongArrangement = useAppStore((state) => state.updateScheduleSongArrangement);
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const isCreatingRepertoireSong = useAppStore((state) => state.isCreatingRepertoireSong);
  const openRepertoireComposer = useAppStore((state) => state.openRepertoireComposer);
  const closeRepertoireComposer = useAppStore((state) => state.closeRepertoireComposer);
  const saveRepertoireSong = useAppStore((state) => state.saveRepertoireSong);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [duration, setDuration] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [category, setCategory] = useState('Geral');
  const [tags, setTags] = useState('');
  const [targetScheduleId, setTargetScheduleId] = useState('');
  const [autofillMessage, setAutofillMessage] = useState('');
  const [isAutofilling, setIsAutofilling] = useState(false);
  const lastAutofilledUrl = useRef('');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (selectedScheduleId && !targetScheduleId) {
      setTargetScheduleId(selectedScheduleId);
      return;
    }

    if (targetScheduleId && schedules.some((schedule) => schedule.id === targetScheduleId)) {
      return;
    }

    setTargetScheduleId(schedules[0]?.id ?? '');
  }, [selectedScheduleId, schedules, targetScheduleId]);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return repertoire;
    }

    return repertoire.filter((song) =>
      [song.name, song.artist, song.category, song.key, song.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [deferredQuery, repertoire]);

  const targetSchedule = schedules.find((schedule) => schedule.id === targetScheduleId);
  const targetMemberCanManageSetlist = targetSchedule?.members.find((member) => member.userId === currentUser?.id)?.canManageSetlist;
  const canManageTargetSetlist =
    currentUser?.role === AppRole.ADMIN || Boolean(targetMemberCanManageSetlist);

  const moveSong = async (songId: string, direction: 'up' | 'down') => {
    if (!targetSchedule) {
      return;
    }

    const songs = targetSchedule.songs;
    const index = songs.findIndex((song) => song.id === songId);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= songs.length) {
      return;
    }

    const reordered = [...songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);
    await reorderSongs(targetSchedule.id, reordered.map((song) => song.id));
  };

  const handleAutofillFromYoutube = async (options?: { silentIfMissing?: boolean }) => {
    const normalizedUrl = youtubeUrl.trim();

    if (!normalizedUrl) {
      if (!options?.silentIfMissing) {
        setAutofillMessage('Cole primeiro um link do YouTube.');
      }
      return;
    }

    if (normalizedUrl === lastAutofilledUrl.current && name.trim()) {
      return;
    }

    setIsAutofilling(true);
    setAutofillMessage('');

    try {
      const response = await fetch(`/api/youtube-metadata?url=${encodeURIComponent(normalizedUrl)}`);
      const payload = (await response.json()) as YoutubeMetadata & { error?: string };

      if (!response.ok) {
        setAutofillMessage(payload.error ?? 'Não consegui ler esse vídeo agora.');
        return;
      }

      setName(payload.title || '');
      setArtist(payload.artist || '');
      setKey(payload.key || '');
      setBpm(payload.bpm ? String(payload.bpm) : '');
      setDuration(payload.durationSeconds ? formatDuration(payload.durationSeconds) : '');
      lastAutofilledUrl.current = normalizedUrl;
      setAutofillMessage('Dados puxados do link. Ajuste o que precisar antes de salvar.');
    } catch {
      setAutofillMessage('Não consegui consultar o link agora. Tente de novo em instantes.');
    } finally {
      setIsAutofilling(false);
    }
  };

  const handleCreateSong = async (event: FormEvent) => {
    event.preventDefault();

    const created = await saveRepertoireSong({
      name,
      artist,
      key,
      bpm: bpm ? Number(bpm) : null,
      durationSeconds: parseDurationInput(duration),
      youtubeUrl,
      category,
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });

    if (!created) {
      return;
    }

    setName('');
    setArtist('');
    setKey('');
    setBpm('');
    setDuration('');
    setYoutubeUrl('');
    setCategory('Geral');
    setTags('');
    setAutofillMessage('');
    lastAutofilledUrl.current = '';
  };

  return (
    <section className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Ministério</p>
            <h2 className="mt-2 text-3xl leading-none">Repertório completo</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Aqui fica o fluxo principal para montar a parte musical da escala: escolher a escala alvo, adicionar músicas, definir tom, solista e ordem.
            </p>
          </div>
          <div className="glass flex min-w-[280px] items-center gap-2 rounded-full px-4 py-3">
            <Search size={16} className="text-[var(--muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, tom, categoria ou tag"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="glass rounded-3xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Biblioteca</p>
              <h3 className="text-xl">{filteredSongs.length} músicas cadastradas</h3>
            </div>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
              Repertório vivo
            </span>
          </div>

          {currentUser?.role === AppRole.ADMIN ? (
            <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Cadastrar música</p>
                  <p className="text-sm text-[var(--muted)]">
                    Use o botão + desta aba para abrir este formulário quando quiser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={isCreatingRepertoireSong ? closeRepertoireComposer : openRepertoireComposer}
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-white"
                >
                  {isCreatingRepertoireSong ? 'Fechar' : 'Nova música'}
                </button>
              </div>

              {isCreatingRepertoireSong ? (
                <form onSubmit={handleCreateSong} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da música" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none" />
                  <input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Artista / ministério" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none" />
                  <input value={key} onChange={(event) => setKey(event.target.value)} placeholder="Tom" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none" />
                  <input value={bpm} onChange={(event) => setBpm(event.target.value)} placeholder="BPM" inputMode="numeric" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none" />
                  <input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Duração (mm:ss)" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none" />
                  <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoria" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none" />
                  <input
                    value={youtubeUrl}
                    onChange={(event) => {
                      setYoutubeUrl(event.target.value);
                      if (lastAutofilledUrl.current !== event.target.value.trim()) {
                        lastAutofilledUrl.current = '';
                      }
                    }}
                    onBlur={() => {
                      if (!name.trim()) {
                        void handleAutofillFromYoutube({ silentIfMissing: true });
                      }
                    }}
                    placeholder="Link do YouTube"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none md:col-span-2"
                  />
                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                    <div className="text-sm text-[var(--muted)]">
                      Cole o link e puxe título, artista, duração, tom e BPM para revisar antes de salvar.
                    </div>
                    <button type="button" onClick={() => void handleAutofillFromYoutube()} disabled={isAutofilling} className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-white disabled:opacity-60">
                      <span className="inline-flex items-center gap-2">
                        <WandSparkles size={16} />
                        {isAutofilling ? 'Lendo link...' : 'Preencher pelo link'}
                      </span>
                    </button>
                  </div>
                  <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags separadas por vírgula" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none md:col-span-2" />
                  {autofillMessage ? (
                    <p className="md:col-span-2 rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                      {autofillMessage}
                    </p>
                  ) : null}
                  {authMessage ? (
                    <p className="md:col-span-2 rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                      {authMessage}
                    </p>
                  ) : null}
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" className="rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white">
                      Salvar música
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {filteredSongs.map((song) => (
              <article key={song.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                {(() => {
                  const alreadyInTarget = Boolean(
                    targetSchedule?.songs.some((targetSong) => targetSong.id === song.id),
                  );
                  return (
                    <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{song.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {prettifyChurchText([song.artist, song.category].filter(Boolean).join(' • ') || song.category)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Tom {song.key}
                      {song.bpm ? ` • ${song.bpm} BPM` : ''}
                      {song.durationSeconds ? ` • ${formatDuration(song.durationSeconds)}` : ''}
                    </p>
                  </div>
                  <Music4 size={18} className="text-[var(--muted)]" />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {song.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[rgba(122,31,62,0.1)] px-3 py-1 text-xs text-[var(--accent-strong)]">
                      {prettifyChurchText(tag)}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                  <span>Última vez: {song.lastPlayed ? formatScheduleDate(song.lastPlayed) : 'nunca'}</span>
                  <button
                    type="button"
                    onClick={() =>
                      targetSchedule ? void addSongToSchedule(targetSchedule.id, song.id) : undefined
                    }
                    disabled={!targetSchedule || !canManageTargetSetlist || alreadyInTarget}
                    className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-3 py-2 text-white disabled:opacity-40"
                  >
                    <PlusCircle size={16} /> {alreadyInTarget ? 'Já adicionada' : 'Adicionar'}
                  </button>
                </div>
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        </section>

        <aside className="glass rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Escala alvo</p>
          <select
            value={targetScheduleId}
            onChange={(event) => setTargetScheduleId(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
          >
            <option value="">Selecione uma escala</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.title} • {formatScheduleDate(schedule.date)}
              </option>
            ))}
          </select>

          <p className="mt-3 text-sm text-[var(--muted)]">
            {targetSchedule
              ? `Você está montando a parte musical de ${targetSchedule.title}. As alterações são salvas sem tirar você desta tela.`
              : 'Selecione uma escala para começar a montar a setlist por aqui.'}
          </p>

          {targetSchedule ? (
            <div className="mt-4 space-y-3">
              {targetSchedule.songs.map((song, index) => (
                <div key={song.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{index + 1}. {song.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Tom desta escala: {song.key}
                        {song.leadSingerName ? ` • Solista: ${song.leadSingerName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {canManageTargetSetlist ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void moveSong(song.id, 'up')}
                            className="rounded-full border border-[var(--line)] p-2"
                            title="Subir música"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveSong(song.id, 'down')}
                            className="rounded-full border border-[var(--line)] p-2"
                            title="Descer música"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 lg:grid-cols-[76px_minmax(0,1fr)_auto_auto]">
                    <TargetSongArrangementEditor
                      initialKey={song.key}
                      initialLeadSingerUserId={song.leadSingerUserId}
                      singerOptions={targetSchedule.members}
                      disabled={!canManageTargetSetlist}
                      onSave={(nextKey, leadSingerUserId) =>
                        void updateScheduleSongArrangement({
                          scheduleId: targetSchedule.id,
                          scheduleSongId: song.id,
                          key: nextKey,
                          leadSingerUserId,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => void removeSongFromSchedule(targetSchedule.id, song.id)}
                      disabled={!canManageTargetSetlist}
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[var(--danger)]"
                      title="Remover música da escala"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function TargetSongArrangementEditor({
  initialKey,
  initialLeadSingerUserId,
  singerOptions,
  disabled,
  onSave,
}: {
  initialKey: string;
  initialLeadSingerUserId?: string | null;
  singerOptions: Array<{ id: string; userId: string; userName: string; role: string }>;
  disabled: boolean;
  onSave: (key: string, leadSingerUserId?: string | null) => void;
}) {
  const [keyValue, setKeyValue] = useState(initialKey);
  const [leadSinger, setLeadSinger] = useState(initialLeadSingerUserId ?? '');

  useEffect(() => {
    setKeyValue(initialKey);
  }, [initialKey]);

  useEffect(() => {
    setLeadSinger(initialLeadSingerUserId ?? '');
  }, [initialLeadSingerUserId]);

  return (
    <>
      <input
        value={keyValue}
        onChange={(event) => setKeyValue(event.target.value.slice(0, 4))}
        maxLength={4}
        disabled={disabled}
        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
        placeholder="Am"
      />
      <select
        value={leadSinger}
        onChange={(event) => setLeadSinger(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
      >
        <option value="">Definir solista</option>
        {singerOptions
          .filter((member) => member.role === 'VOCAL')
          .map((member) => (
            <option key={`${member.id}-${member.userId}`} value={member.userId}>
              {member.userName}
            </option>
          ))}
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSave(keyValue, leadSinger || null)}
        className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[var(--foreground)]"
        title="Salvar ajustes da música"
      >
        <Save size={16} />
      </button>
    </>
  );
}
