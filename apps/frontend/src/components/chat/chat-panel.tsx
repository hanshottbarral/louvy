'use client';

import { MessageType } from '@louvy/shared';
import { SendHorizontal } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { broadcastTyping } from '@/lib/realtime';
import { useAppStore } from '@/store/use-app-store';
import { ScheduleView } from '@/types';
import { AudioRecorder } from './audio-recorder';

export function ChatPanel({ schedule }: { schedule: ScheduleView }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const sendTextMessage = useAppStore((state) => state.sendTextMessage);
  const sendAudioMessage = useAppStore((state) => state.sendAudioMessage);
  const typingUser = useAppStore((state) => state.typingUser);
  const [message, setMessage] = useState('');

  const sendText = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    await sendTextMessage(schedule.id, message);
    setMessage('');
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!currentUser) {
      return;
    }

    void broadcastTyping({
      scheduleId: schedule.id,
      userName: currentUser.name,
    });
  };

  const sendAudio = async (audioUrl: string) => {
    await sendAudioMessage(schedule.id, audioUrl);
  };

  return (
    <section className="glass flex min-h-[620px] flex-col rounded-3xl p-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Chat</p>
        <h3 className="text-xl">Conversa da escala</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {typingUser ? `${typingUser} esta digitando...` : 'Mensagens e audios em tempo real'}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Se o backend de upload nao estiver ativo, o audio ainda toca localmente nesta sessao.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
        {schedule.messages.map((chatMessage) => {
          const mine = chatMessage.user.id === currentUser?.id;
          return (
            <article
              key={chatMessage.id}
              className={`max-w-[90%] rounded-2xl px-3 py-2 ${mine ? 'ml-auto bg-[var(--accent)] text-white' : 'bg-white'}`}
            >
              <p className={`mb-1 text-xs ${mine ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                {chatMessage.user.name}
              </p>
              {chatMessage.type === MessageType.AUDIO ? (
                <audio controls preload="metadata" className="max-w-full">
                  <source src={chatMessage.audioUrl ?? ''} />
                </audio>
              ) : (
                <p className="text-sm">{chatMessage.content}</p>
              )}
            </article>
          );
        })}
      </div>

      <form onSubmit={sendText} className="mt-3 flex items-center gap-2">
        <AudioRecorder onAudioReady={sendAudio} />
        <input
          value={message}
          onChange={(event) => handleTyping(event.target.value)}
          placeholder="Escreva para a equipe..."
          className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
        />
        <button type="submit" className="rounded-full bg-[var(--foreground)] p-3 text-white">
          <SendHorizontal size={16} />
        </button>
      </form>
    </section>
  );
}
