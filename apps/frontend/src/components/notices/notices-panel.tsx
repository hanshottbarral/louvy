'use client';

import { AppRole } from '@louvy/shared';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ImagePlus, Link2, Megaphone, PlusCircle, Trash2 } from 'lucide-react';
import { loadNotices, saveNotice, NoticeItem } from '@/lib/community';
import { formatScheduleDate } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';

export function NoticesPanel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Ministério</p>
          <h2 className="mt-2 text-3xl leading-none">Avisos</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Esse é o mural principal do app. A liderança publica recados, links, imagens e combinados importantes.
          </p>
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
                  ? 'border-[var(--accent-strong)] bg-[rgba(122,31,62,0.08)]'
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
              <div className="rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
