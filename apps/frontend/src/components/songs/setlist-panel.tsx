'use client';

import { AppRole } from '@louvy/shared';
import { PlayCircle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';
import { youtubeEmbedUrl } from '@/lib/utils';

export function SetlistPanel({ schedule }: { schedule: ScheduleView }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const updateScheduleSongArrangement = useAppStore((state) => state.updateScheduleSongArrangement);
  const embedUrl = youtubeEmbedUrl(schedule.songs[0]?.youtubeUrl);
  const currentScheduleMember = schedule.members.find((member) => member.userId === currentUser?.id);
  const canManageSongs =
    currentUser?.role === AppRole.ADMIN || Boolean(currentScheduleMember?.canManageSetlist);

  return (
    <section className="glass rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Setlist</p>
          <h3 className="text-xl">Músicas da escala</h3>
        </div>
        <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
          {schedule.songs.length} música{schedule.songs.length === 1 ? '' : 's'}
        </span>
      </div>

      {embedUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--line)]">
          <iframe
            title="Prévia do YouTube"
            src={embedUrl}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {authMessage ? (
        <p className="mb-4 rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
          {authMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {schedule.songs.map((song, index) => (
          <SetlistSongCard
            key={song.id}
            index={index}
            song={song}
            singerOptions={schedule.members}
            canManageSongs={canManageSongs}
            onSave={(key, leadSingerUserId) =>
              void updateScheduleSongArrangement({
                scheduleId: schedule.id,
                scheduleSongId: song.id,
                key,
                leadSingerUserId,
              })
            }
          />
        ))}
      </div>
    </section>
  );
}

function SetlistSongCard({
  index,
  song,
  singerOptions,
  canManageSongs,
  onSave,
}: {
  index: number;
  song: ScheduleView['songs'][number];
  singerOptions: ScheduleView['members'];
  canManageSongs: boolean;
  onSave: (key: string, leadSingerUserId?: string | null) => void;
}) {
  const [keyValue, setKeyValue] = useState(song.key);
  const [leadSinger, setLeadSinger] = useState(song.leadSingerUserId ?? '');

  useEffect(() => {
    setKeyValue(song.key);
  }, [song.key]);

  useEffect(() => {
    setLeadSinger(song.leadSingerUserId ?? '');
  }, [song.leadSingerUserId]);

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(122,31,62,0.12)] text-sm font-semibold text-[var(--accent-strong)]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{song.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tom desta escala: {song.key}
                {song.leadSingerName ? ` • Solista: ${song.leadSingerName}` : ''}
                {song.bpm ? ` • ${song.bpm} BPM` : ''}
              </p>
            </div>
            <button className="rounded-full bg-[var(--accent)] p-2 text-white" title="Abrir prévia">
              <PlayCircle size={18} />
            </button>
          </div>

          {canManageSongs ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-[76px_minmax(0,1fr)_auto]">
              <input
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value.slice(0, 4))}
                maxLength={4}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                placeholder="Am"
              />
              <select
                value={leadSinger}
                onChange={(event) => setLeadSinger(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">Definir solista</option>
                {singerOptions
                  .filter((member) => member.role === 'VOCAL')
                  .map((member) => (
                    <option key={`${song.id}-${member.id}`} value={member.userId}>
                      {member.userName}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => onSave(keyValue, leadSinger || null)}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[var(--foreground)]"
                title="Salvar ajustes desta música"
              >
                <Save size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
