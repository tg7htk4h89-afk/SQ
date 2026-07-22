import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-ink text-porcelain grid grid-rows-[1fr_auto]">
      <div className="pad flex flex-col justify-end pb-10 max-w-md w-full mx-auto">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="h-11 w-11 rounded-xl bg-kib mb-6" />
          <p className="label text-porcelain/50">Kuwait International Bank</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight leading-[1.05] mt-1">
            Branch Service<br />Quality
          </h1>
          <p className="text-porcelain/50 mt-3 text-sm">
            Sign in to start a branch visit or pick up where you left off.
          </p>
        </motion.div>

        <form onSubmit={submit} className="mt-9 space-y-3">
          <input
            className="w-full rounded-2xl bg-white/[.07] px-4 py-4 outline-none placeholder:text-porcelain/35
                       focus:bg-white/[.11] transition-colors"
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-2xl bg-white/[.07] px-4 py-4 outline-none placeholder:text-porcelain/35
                       focus:bg-white/[.11] transition-colors"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-rate-b px-1">{error}</p>}
          <button
            disabled={busy}
            className="tap w-full rounded-2xl bg-kib py-4 font-display font-semibold disabled:opacity-50
                       flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
      <p className="pad pb-8 text-center text-[11px] text-porcelain/30">Service Quality Unit</p>
    </div>
  );
}
