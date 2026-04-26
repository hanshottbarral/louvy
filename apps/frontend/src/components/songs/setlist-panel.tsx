'use client';

import { AppRole } from '@louvy/shared';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, PlayCircle, PlusCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';
import { youtubeEmbedUrl } from '@/lib/utils';

export function SetlistPanel({ schedule }: { schedule: ScheduleView }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const authMessage = useAppStore((state) => state.authMessage);
  const repertoire = useAppStore((state) => state.repertoire);
  const reorderSongs = useAppStore((state) => state.reorderSongs);
  const addSongToSchedule = useAppStore((state) => state.addSongToSchedule);
  const removeSongFromSchedule = useAppStore((state) => state.removeSongFromSchedule);
  const [selectedSongId, setSelectedSongId] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const embedUrl = youtubeEmbedUrl(schedule.songs[0]?.youtubeUrl);
  const canManageSongs = currentUser?.role === AppRole.ADMIN;
  const availableSongs = useMemo(
    () => repertoire.filter((song) => !schedule.songs.some((entry) => entry.id === song.id)),
    [repertoire, schedule.songs],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = schedule.songs.findIndex((song) => song.id === active.id);
    const newIndex = schedule.songs.findIndex((song) => song.id === over.id);
    const newOrder = arrayMove(schedule.songs, oldIndex, newIndex).map((song) => song.id);
    reorderSongs(schedule.id, newOrder);
  };

  return (
    <section className="glass rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Setlist</p>
          <h3 className="text-xl">Musicas</h3>
        </div>
        <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-sm">
          Arraste para ordenar
        </span>
      </div>

      {canManageSongs ? (
        <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          <p className="text-sm font-semibold">Adicionar musica dentro da escala</p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <select
              value={selectedSongId}
              onChange={(event) => setSelectedSongId(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            >
              <option value="">Selecione uma musica do repertorio</option>
              {availableSongs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedSongId}
              onClick={() => void addSongToSchedule(schedule.id, selectedSongId)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm text-white disabled:opacity-60"
            >
              <PlusCircle size={16} /> Adicionar
            </button>
          </div>
          {authMessage ? (
            <p className="mt-3 rounded-2xl bg-[rgba(31,122,92,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
              {authMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {embedUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--line)]">
          <iframe
            title="Youtube preview"
            src={embedUrl}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={schedule.songs.map((song) => song.id)} strategy={rectSortingStrategy}>
          <div className="space-y-3">
            {schedule.songs.map((song) => (
              <SortableSongCard
                key={song.id}
                id={song.id}
                name={song.name}
                tone={song.key}
                bpm={song.bpm}
                canManageSongs={canManageSongs}
                onRemove={(songId) => void removeSongFromSchedule(schedule.id, songId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableSongCard({
  id,
  name,
  tone,
  bpm,
  canManageSongs,
  onRemove,
}: {
  id: string;
  name: string;
  tone: string;
  bpm?: number | null;
  canManageSongs: boolean;
  onRemove: (songId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3"
    >
      <button className="rounded-xl border border-[var(--line)] p-2" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <div className="flex-1">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-[var(--muted)]">
          Tom {tone}
          {bpm ? ` • ${bpm} BPM` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-full bg-[var(--accent)] p-2 text-white">
          <PlayCircle size={18} />
        </button>
        {canManageSongs ? (
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="rounded-full border border-[var(--line)] p-2 text-[var(--danger)]"
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
