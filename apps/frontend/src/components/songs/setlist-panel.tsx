'use client';

import { AppRole } from '@korus/shared';
import { Youtube } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';
import { formatDuration, youtubePlaylistUrl } from '@/lib/utils';

export function SetlistPanel({ schedule }: { schedule: ScheduleView }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const repertoire = useAppStore((state) => state.repertoire);
  const updateScheduleSongArrangement = useAppStore((state) => state.updateScheduleSongArrangement);
  const playlistUrl = youtubePlaylistUrl(schedule.songs.map((song) => song.youtubeUrl));
  const currentScheduleMember = schedule.members.find((member) => member.userId === currentUser?.id);
  const canManageSongs =
    currentUser?.role === AppRole.ADMIN || Boolean(currentScheduleMember?.canManageSetlist);
  const totalDurationSeconds = schedule.songs.reduce((total, song) => {
    const repertoireMatch = repertoire.find(
      (entry) =>
        (song.youtubeUrl && entry.youtubeUrl === song.youtubeUrl) ||
        (!song.youtubeUrl && entry.name === song.name),
    );
    return total + (repertoireMatch?.durationSeconds ?? 0);
  }, 0);

  return (
    <section className="glass rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Setlist</p>
          <h3 className="text-xl">Músicas</h3>
        </div>
        <div className="flex items-center gap-2">
          {playlistUrl ? (
            <button
              type="button"
              onClick={() => window.open(playlistUrl, '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] p-2 text-[var(--foreground)]"
              title="Abrir playlist da escala no YouTube"
            >
              <Youtube size={16} />
            </button>
          ) : null}
          <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
            {formatDuration(totalDurationSeconds)}
          </span>
        </div>
      </div>

      {authMessage ? (
        <p className="mb-4 rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
  const [lastSavedSignature, setLastSavedSignature] = useState('');

  useEffect(() => {
    setKeyValue(song.key);
  }, [song.key]);

  useEffect(() => {
    setLeadSinger(song.leadSingerUserId ?? '');
  }, [song.leadSingerUserId]);

  useEffect(() => {
    setLastSavedSignature(JSON.stringify({ key: song.key, leadSingerUserId: song.leadSingerUserId ?? '' }));
  }, [song.key, song.leadSingerUserId]);

  useEffect(() => {
    if (!canManageSongs) {
      return;
    }

    const nextSignature = JSON.stringify({ key: keyValue, leadSingerUserId: leadSinger });
    if (nextSignature === lastSavedSignature) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onSave(keyValue, leadSinger || null);
      setLastSavedSignature(nextSignature);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [canManageSongs, keyValue, leadSinger, lastSavedSignature, onSave]);

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(200,169,106,0.18)] text-sm font-semibold text-[var(--accent-strong)]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <p className="truncate font-semibold">{song.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tom desta escala: {song.key}
              {song.leadSingerName ? ` • Solista: ${song.leadSingerName}` : ''}
              {song.bpm ? ` • ${song.bpm} BPM` : ''}
            </p>
          </div>

          {canManageSongs ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-[72px_minmax(0,1fr)]">
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
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
