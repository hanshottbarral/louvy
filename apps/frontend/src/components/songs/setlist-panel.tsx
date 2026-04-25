'use client';

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
import { GripVertical, PlayCircle } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';
import { youtubeEmbedUrl } from '@/lib/utils';

export function SetlistPanel({ schedule }: { schedule: ScheduleView }) {
  const reorderSongs = useAppStore((state) => state.reorderSongs);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const embedUrl = youtubeEmbedUrl(schedule.songs[0]?.youtubeUrl);

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
}: {
  id: string;
  name: string;
  tone: string;
  bpm?: number | null;
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
      <button className="rounded-full bg-[var(--accent)] p-2 text-white">
        <PlayCircle size={18} />
      </button>
    </div>
  );
}

