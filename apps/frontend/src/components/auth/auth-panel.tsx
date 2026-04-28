'use client';

import { LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { KorusWordmark } from '@/components/brand/korus-brand';
import { useAppStore } from '@/store/use-app-store';

export function AuthPanel() {
  const authMode = useAppStore((state) => state.authMode);
  const setAuthMode = useAppStore((state) => state.setAuthMode);
  const signIn = useAppStore((state) => state.signIn);
  const signUp = useAppStore((state) => state.signUp);
  const authMessage = useAppStore((state) => state.authMessage);
  const isLoading = useAppStore((state) => state.isLoading);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (authMode === 'login') {
      await signIn(email, password);
      return;
    }

    await signUp(name, email, password);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="glass w-full max-w-[500px] rounded-[30px] p-7">
        <KorusWordmark tone="dark" className="h-auto w-[224px]" />
        <h1 className="mt-6 text-3xl" data-display="true">
          {authMode === 'login' ? 'Entrar na plataforma' : 'Criar acesso'}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {authMode === 'login'
            ? 'Use email e senha para abrir escalas, repertório, equipe e mensagens.'
            : 'O primeiro cadastro pode ser promovido para liderança direto no painel do Supabase.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {authMode === 'register' ? (
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            />
          </label>

          {authMessage ? (
            <p className="rounded-2xl bg-[rgba(200,169,106,0.14)] px-4 py-3 text-sm text-[var(--foreground)]">
              {authMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--secondary)] px-4 py-3 text-white shadow-[var(--shadow-card)] disabled:opacity-50"
          >
            {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {authMode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {authMode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-sm text-[var(--secondary)]"
        >
          {authMode === 'login'
            ? 'Ainda não tem acesso? Criar conta'
            : 'Já tem conta? Voltar para login'}
        </button>
      </section>
    </main>
  );
}
