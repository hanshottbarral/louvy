'use client';

import { AppRole } from '@korus/shared';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Calendar, ImagePlus, Link2, Megaphone, MessageCircleMore, Music2, PlusCircle, Trash2, Users2 } from 'lucide-react';
import { loadNotices, saveNotice, NoticeItem } from '@/lib/community';
import { AppSection } from '@/types';
import { formatScheduleDate } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';

export function NoticesPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const schedules = useAppStore((state) => state.schedules);
  const setActiveSection = useAppStore((state) => state.setActiveSection);
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextSchedule = [...schedules].sort((a, b) => a.date.localeCompare(b.date))[0];
  const quickActions: Array<{
    id: AppSection;
    label: string;
    icon: typeof Calendar;
  }> = [
    { id: 'schedules', label: 'Escalas', icon: Calendar },
    { id: 'repertoire', label: 'Músicas', icon: Music2 },
    { id: 'members', label: 'Equipe', icon: Users2 },
    { id: 'fellowship', label: 'Mensagens', icon: MessageCircleMore },
  ];

  useEffect(() => {
    void loadNotices()
      .then(setItems)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Não consegui carregar os avisos.'));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || currentUser.role !== AppRole.ADMIN) {
      return;
    }

    if (!title.trim() && !content.trim()) {
      setMessage('Preencha pelo menos o título ou o texto do aviso.');
      return;
    }

    setIsSaving(true);
    setMessage(undefined);

    try {
      const next = await saveNotice(currentUser, { title, content, linkUrl, imageUrl });
      setItems(next);
      setTitle('');
      setContent('');
      setLinkUrl('');
      setImageUrl('');
      setMessage('Aviso publicado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não consegui publicar este aviso.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyImageFile = async (file?: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('Escolha um arquivo de imagem válido.');
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Não consegui carregar essa imagem.'));
      reader.readAsDataURL(file);
    });

    setImageUrl(dataUrl);
  };

  const handleImageInput = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      await applyImageFile(event.target.files?.[0]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não consegui carregar essa imagem.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
    try {
      await applyImageFile(event.dataTransfer.files?.[0]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não consegui carregar essa imagem.');
    }
  };

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-3">
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Home</p>
          <h2 className="mt-2 text-3xl leading-none" data-display="true">
            Olá, {currentUser?.name?.split(' ')[0] || 'time'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Avisos, próximos compromissos e atalhos rápidos da sua plataforma KORUS.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-3xl bg-[linear-gradient(135deg,#121212_0%,#1A2A44_100%)] p-5 text-white shadow-[0_18px_50px_rgba(10,15,24,0.24)]">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">Próxima escala</p>
              <h3 className="mt-3 text-2xl" data-display="true">
                {nextSchedule?.title ?? 'Nenhuma escala definida'}
              </h3>
              <p className="mt-2 text-sm text-white/72">
                {nextSchedule
                  ? `${formatScheduleDate(nextSchedule.date)} às ${nextSchedule.time}`
                  : 'Assim que a próxima escala for criada, ela aparece aqui em destaque.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setActiveSection(action.id)}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-left shadow-[var(--shadow-card)]"
                >
                  <action.icon size={18} className="text-[var(--secondary)]" />
                  <p className="mt-6 font-semibold">{action.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <article key={item.id} className="glass overflow-hidden rounded-3xl">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title || 'Aviso'} className="h-56 w-full object-cover" />
                ) : null}
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Publicado</p>
                      <h3 className="mt-2 text-2xl">{item.title || 'Aviso rápido'}</h3>
                    </div>
                    <div className="text-right text-xs text-[var(--muted)]">
                      <p>{item.createdByName}</p>
                      <p>{formatScheduleDate(item.createdAt.slice(0, 10))}</p>
                    </div>
                  </div>
                  {item.content ? <p className="mt-4 whitespace-pre-wrap text-sm text-[var(--foreground)]">{item.content}</p> : null}
                  {item.linkUrl ? (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm"
                    >
                      <Link2 size={16} /> Abrir link
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="glass rounded-3xl p-6 text-sm text-[var(--muted)]">
              Ainda não existe nenhum aviso publicado.
            </div>
          )}
        </div>
      </div>

      <aside className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <Megaphone size={18} />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Publicação</p>
            <h3 className="text-xl">Novo aviso</h3>
          </div>
        </div>

        {currentUser?.role === AppRole.ADMIN ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageInput}
              className="hidden"
            />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título"
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Texto do aviso"
              rows={6}
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            />
            <input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="Link opcional"
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={handleDrop}
              className={`flex min-h-[170px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-5 text-center ${
                isDraggingImage
                  ? 'border-[var(--accent-strong)] bg-[rgba(200,169,106,0.10)]'
                  : 'border-[var(--line)] bg-white'
              }`}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Prévia do aviso" className="h-24 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--muted)]">
                  <ImagePlus size={22} />
                </div>
              )}
              <div>
                <p className="font-semibold">Arraste uma imagem para o aviso</p>
                <p className="mt-1 text-sm text-[var(--muted)]">ou clique para escolher</p>
              </div>
            </button>
            {imageUrl ? (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--danger)]"
              >
                <Trash2 size={16} /> Remover imagem
              </button>
            ) : null}
            {message ? (
              <div className="rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                {message}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm text-white disabled:opacity-60"
            >
              <PlusCircle size={16} /> {isSaving ? 'Publicando...' : 'Publicar aviso'}
            </button>
          </form>
        ) : (
          <div className="mt-4 rounded-2xl bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
            Aqui você acompanha os avisos da liderança. Apenas administradores podem publicar.
          </div>
        )}
      </aside>
    </section>
  );
}
