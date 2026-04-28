'use client';

import { MessageType } from '@korus/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Cake, MessageCircleMore, SendHorizontal } from 'lucide-react';
import { AudioRecorder } from '@/components/chat/audio-recorder';
import { FellowshipMessage, loadFellowshipMessages, saveFellowshipMessage } from '@/lib/community';
import { useAppStore } from '@/store/use-app-store';

export function FellowshipPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const memberDirectory = useAppStore((state) => state.memberDirectory);
  const loadMemberDirectory = useAppStore((state) => state.loadMemberDirectory);
  const [messages, setMessages] = useState<FellowshipMessage[]>([]);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    void loadMemberDirectory();
    void loadFellowshipMessages()
      .then(setMessages)
      .catch((error) => setFeedback(error instanceof Error ? error.message : 'Não consegui carregar a comunhão.'));
  }, [loadMemberDirectory]);

  const birthdays = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return memberDirectory.filter((member) => {
      if (!member.birthday) {
        return false;
      }

      return Number(member.birthday.slice(5, 7)) === month;
    });
  }, [memberDirectory]);

  const refreshMessages = async () => {
    const next = await loadFellowshipMessages();
    setMessages(next);
  };

  const handleTextSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !message.trim()) {
      return;
    }

    try {
      const next = await saveFellowshipMessage(currentUser, {
        type: MessageType.TEXT,
        content: message.trim(),
      });
      setMessages(next);
      setMessage('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não consegui enviar essa mensagem.');
    }
  };

  const handleAudioReady = async (audioUrl: string) => {
    if (!currentUser) {
      return;
    }

    try {
      const next = await saveFellowshipMessage(currentUser, {
        type: MessageType.AUDIO,
        audioUrl,
      });
      setMessages(next);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não consegui enviar esse áudio.');
    }
  };

  return (
    <section className="grid gap-3 xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center gap-2">
            <Cake size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Celebração</p>
              <h3 className="text-xl">Aniversariantes do mês</h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {birthdays.length ? (
              birthdays.map((member) => (
                <div key={member.userId} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                  <p className="font-semibold">{member.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {member.birthday?.slice(8, 10)}/{member.birthday?.slice(5, 7)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
                Ainda não temos aniversários cadastrados neste mês.
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="glass flex min-h-[720px] flex-col rounded-3xl p-4">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Conexão</p>
          <h2 className="mt-2 text-3xl leading-none">Comunhão</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Um chat geral para toda a equipe, com mensagens, áudio e recados rápidos do dia a dia.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          {messages.length ? (
            messages.map((chatMessage) => {
              const mine = chatMessage.user.id === currentUser?.id;
              return (
                <article
                  key={chatMessage.id}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 ${mine ? 'ml-auto bg-[var(--accent)] text-white' : 'bg-white'}`}
                >
                  <p className={`mb-1 text-xs ${mine ? 'text-white/75' : 'text-[var(--muted)]'}`}>
                    {chatMessage.user.name}
                  </p>
                  {chatMessage.type === MessageType.AUDIO ? (
                    <audio controls preload="metadata" src={chatMessage.audioUrl ?? ''} className="max-w-full">
                      Seu navegador não conseguiu reproduzir este áudio.
                    </audio>
                  ) : (
                    <p className="text-sm">{chatMessage.content}</p>
                  )}
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
              Ainda não existe nenhuma conversa por aqui.
            </div>
          )}
        </div>

        {feedback ? (
          <div className="mt-3 rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--accent-strong)]">
            {feedback}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <MessageCircleMore size={14} /> Chat geral da equipe
          </span>
          <button
            type="button"
            onClick={() => void refreshMessages()}
            className="rounded-full border border-[var(--line)] px-3 py-1"
          >
            Atualizar
          </button>
        </div>

        <form onSubmit={handleTextSubmit} className="mt-3 flex items-center gap-2">
          <AudioRecorder onAudioReady={handleAudioReady} />
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escreva para todo o ministério..."
            className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
          />
          <button type="submit" className="rounded-full bg-[var(--foreground)] p-3 text-white">
            <SendHorizontal size={16} />
          </button>
        </form>
      </section>
    </section>
  );
}
