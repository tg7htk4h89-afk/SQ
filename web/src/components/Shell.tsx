import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Home, BarChart3, History, Settings2, CloudOff, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useAuth } from '../lib/auth';
import type { SyncStatus } from '../lib/offline';

/** Sits under the notch; the title shrinks as you scroll, the way iOS does it. */
export function TopBar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 28);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={clsx(
        'sticky top-0 z-30 pad backdrop-blur-xl transition-colors',
        'bg-porcelain/85 dark:bg-ink/85',
        compact && 'border-b border-black/[.06] dark:border-white/[.08]',
      )}
      style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}
    >
      <div className="flex items-end justify-between pb-2.5">
        <div className="min-w-0">
          {subtitle && <div className="label truncate">{subtitle}</div>}
          <motion.h1
            animate={{ fontSize: compact ? '19px' : '27px' }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="font-display font-semibold tracking-tight truncate leading-tight"
          >
            {title}
          </motion.h1>
        </div>
        {right}
      </div>
    </header>
  );
}

export function SyncPill() {
  const [status, setStatus] = useState<SyncStatus>({ online: navigator.onLine, pending: 0 });

  useEffect(() => {
    const onSync = (e: Event) => setStatus((e as CustomEvent<SyncStatus>).detail);
    window.addEventListener('bsq:sync', onSync);
    return () => window.removeEventListener('bsq:sync', onSync);
  }, []);

  if (status.online && status.pending === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
        status.online ? 'bg-brass/15 text-brass' : 'bg-ink/10 text-ink/70 dark:bg-white/10 dark:text-porcelain/70',
      )}
    >
      {status.online ? <RefreshCw size={13} className="animate-spin" /> : <CloudOff size={13} />}
      {status.online ? `Saving ${status.pending}` : `Offline · ${status.pending} waiting`}
    </motion.div>
  );
}

const TABS = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/inspect', label: 'Inspect', icon: ClipboardCheck },
  { to: '/history', label: 'History', icon: History },
  { to: '/dashboard', label: 'Insights', icon: BarChart3, roles: ['SUPERVISOR', 'ADMIN'] },
  { to: '/admin', label: 'Admin', icon: Settings2, roles: ['ADMIN'] },
];

export function TabBar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // The checklist takes the whole screen — no tab bar competing for the thumb.
  if (pathname.startsWith('/inspections/')) return null;

  const tabs = TABS.filter((t) => !t.roles || (user && t.roles.includes(user.role)));

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-black/[.06] dark:border-white/[.08]
                 bg-porcelain/90 dark:bg-ink/90 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="flex">
        {tabs.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 py-2 text-[10px] font-medium tap',
                  isActive ? 'text-kib dark:text-kib-light' : 'text-ink/40 dark:text-porcelain/40',
                )
              }
            >
              <Icon size={21} strokeWidth={2} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ScoreRing({ pct, size = 74 }: { pct: number | null; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const value = pct ?? 0;
  const colour = value >= 80 ? '#1C7A58' : value >= 60 ? '#C98A1B' : '#B8323A';

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} fill="none" className="stroke-black/[.07] dark:stroke-white/[.1]" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          fill="none"
          stroke={colour}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (value / 100) * c }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </svg>
      <span className="absolute num font-semibold" style={{ fontSize: size / 4.2 }}>
        {pct === null ? '—' : Math.round(pct)}
        {pct !== null && <span className="text-[.6em] opacity-50">%</span>}
      </span>
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <main className="pad pb-28 max-w-2xl mx-auto">{children}</main>;
}

export function Empty({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center mt-6">
      <p className="text-sm text-ink/55 dark:text-porcelain/55">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
