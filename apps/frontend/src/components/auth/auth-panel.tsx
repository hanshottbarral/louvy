'use client';

import { LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
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
      <section className="glass w-full max-w-[460px] rounded-[28px] p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Louvy</p>
        <h1 className="mt-3 text-3xl">
          {authMode === 'login' ? 'Entrar no ministerio' : 'Criar acesso'}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {authMode === 'login'
            ? 'Use email e senha para abrir escalas, repertorio e chat.'
            : 'O primeiro cadastro pode ser promovido para lideranca direto no painel do Supabase.'}
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
            <p className="rounded-2xl bg-[rgba(122,31,62,0.1)] px-4 py-3 text-sm text-[var(--accent-strong)]">
              {authMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-white disabled:opacity-50"
          >
            {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
            {authMode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {authMode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-sm text-[var(--accent-strong)]"
        >
          {authMode === 'login'
            ? 'Ainda nao tem acesso? Criar conta'
            : 'Ja tem conta? Voltar para login'}
        </button>
      </section>
    </main>
  );
}
