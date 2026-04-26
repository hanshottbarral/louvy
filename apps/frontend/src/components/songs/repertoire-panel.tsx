'use client';

import { Search, PlusCircle, Music4, WandSparkles } from 'lucide-react';
import { FormEvent, useDeferredValue, useMemo, useRef, useState } from 'react';
import { AppRole } from '@louvy/shared';
import { formatDuration, formatScheduleDate, parseDurationInput } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import { YoutubeMetadata } from '@/lib/youtube-metadata';

export function RepertoirePanel() {
  const repertoire = useAppStore((state) => state.repertoire);
  const schedules = useAppStore((state) => state.schedules);
  const selectedScheduleId = useAppStore((state) => state.selectedScheduleId);
  const addSongToSchedule = useAppStore((state) => state.addSongToSchedule);
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
  const [autofillMessage, setAutofillMessage] = useState('');
  const [isAutofilling, setIsAutofilling] = useState(false);
  const lastAutofilledUrl = useRef('');
  const deferredQuery = useDeferredValue(query);

  const filteredSongs = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return repertoire;
    }

    return repertoire.filter((song) =>
      [song.name, song.category, song.key, song.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [deferredQuery, repertoire]);

  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);

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
        setAutofillMessage(payload.error ?? 'Nao consegui ler esse video agora.');
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
      setAutofillMessage('Nao consegui consultar o link agora. Tente de novo em instantes.');
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
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Ministerio</p>
            <h2 className="mt-2 text-3xl leading-none">Repertorio completo</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Consulte todas as musicas da equipe, filtre por categoria e injete uma faixa direto na escala atual.
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

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="glass rounded-3xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Biblioteca</p>
              <h3 className="text-xl">{filteredSongs.length} musicas cadastradas</h3>
            </div>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
              Repertorio vivo
            </span>
          </div>

          {currentUser?.role === AppRole.ADMIN ? (
            <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Cadastrar musica</p>
                  <p className="text-sm text-[var(--muted)]">
                    Use o botao + desta aba para abrir este formulario quando quiser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={isCreatingRepertoireSong ? closeRepertoireComposer : openRepertoireComposer}
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-white"
                >
                  {isCreatingRepertoireSong ? 'Fechar' : 'Nova musica'}
                </button>
              </div>

              {isCreatingRepertoireSong ? (
                <form onSubmit={handleCreateSong} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nome da musica"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    placeholder="Artista / ministerio"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    value={key}
                    onChange={(event) => setKey(event.target.value)}
                    placeholder="Tom"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    value={bpm}
                    onChange={(event) => setBpm(event.target.value)}
                    placeholder="BPM"
                    inputMode="numeric"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    placeholder="Duracao (mm:ss)"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Categoria"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
                  />
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
                      Cole o link e puxe titulo, artista, duracao, tom e bpm para revisar antes de salvar.
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAutofillFromYoutube()}
                      disabled={isAutofilling}
                      className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-white disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <WandSparkles size={16} />
                        {isAutofilling ? 'Lendo link...' : 'Preencher pelo link'}
                      </span>
                    </button>
                  </div>
                  <input
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="Tags separadas por virgula"
                    className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none md:col-span-2"
                  />
                  {autofillMessage ? (
                    <p className="md:col-span-2 rounded-2xl bg-[rgba(31,122,92,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                      {autofillMessage}
                    </p>
                  ) : null}
                  {authMessage ? (
                    <p className="md:col-span-2 rounded-2xl bg-[rgba(31,122,92,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                      {authMessage}
                    </p>
                  ) : null}
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm text-white"
                    >
                      Salvar musica
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {filteredSongs.map((song) => (
              <article
                key={song.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{song.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {[song.artist, song.category].filter(Boolean).join(' • ') || song.category}
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
                    <span
                      key={tag}
                      className="rounded-full bg-[rgba(31,122,92,0.1)] px-3 py-1 text-xs text-[var(--accent-strong)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                  <span>Ultima vez: {song.lastPlayed ? formatScheduleDate(song.lastPlayed) : 'nunca'}</span>
                  <button
                    type="button"
                    onClick={() =>
                      selectedSchedule ? void addSongToSchedule(selectedSchedule.id, song.id) : undefined
                    }
                    disabled={!selectedSchedule}
                    className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-3 py-2 text-white disabled:opacity-40"
                  >
                    <PlusCircle size={16} /> Adicionar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="glass rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Escala alvo</p>
          <h3 className="mt-2 text-xl">{selectedSchedule?.title ?? 'Nenhuma escala'}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {selectedSchedule
              ? `Selecionada para receber musicas em ${formatScheduleDate(selectedSchedule.date)}.`
              : 'Volte para a aba de escalas e selecione uma escala para receber musicas deste repertorio.'}
          </p>

          {selectedSchedule ? (
            <div className="mt-4 space-y-3">
              {selectedSchedule.songs.map((song) => (
                <div
                  key={song.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3"
                >
                  <p className="font-semibold">{song.name}</p>
                  <p className="text-sm text-[var(--muted)]">Tom {song.key}</p>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
