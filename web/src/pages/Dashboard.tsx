import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { get } from '../lib/api';
import { Screen, TopBar, ScoreRing } from '../components/Shell';

export default function Dashboard() {
  const [grain, setGrain] = useState<'week' | 'month'>('month');

  const overview = useQuery({ queryKey: ['overview'], queryFn: () => get<any>('/analytics/overview') });
  const ranking = useQuery({ queryKey: ['ranking'], queryFn: () => get<any>('/analytics/branch-ranking') });
  const trends = useQuery({ queryKey: ['trends', grain], queryFn: () => get<any[]>(`/analytics/trends?grain=${grain}`) });
  const questions = useQuery({ queryKey: ['qa'], queryFn: () => get<any[]>('/analytics/question-analysis') });

  const o = overview.data;

  return (
    <>
      <TopBar
        title="Insights"
        subtitle="Service quality"
        right={
          <a href="/api/analytics/export.csv" className="tap p-2" aria-label="Export CSV">
            <Download size={19} />
          </a>
        }
      />
      <Screen>
        <div className="card mt-2 p-5 flex items-center gap-5">
          <ScoreRing pct={o?.averageScore ?? null} size={86} />
          <div className="min-w-0">
            <div className="label">Network average</div>
            <p className="text-sm mt-1.5 text-ink/60 dark:text-porcelain/60">
              {o?.completed ?? 0} visits completed · {o?.pending ?? 0} still open
            </p>
            <div className="flex gap-4 mt-3">
              <span className="text-[13px]"><b className="num text-rate-e">{o?.passed ?? 0}</b> pass</span>
              <span className="text-[13px]"><b className="num text-rate-b">{o?.failed ?? 0}</b> fail</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <Extreme kind="high" branch={ranking.data?.highest} />
          <Extreme kind="low" branch={ranking.data?.lowest} />
        </div>

        <div className="flex items-center justify-between mt-8 mb-2.5">
          <h2 className="label">Trend</h2>
          <div className="flex gap-1 rounded-full bg-black/[.06] dark:bg-white/[.08] p-0.5">
            {(['week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGrain(g)}
                className={clsx(
                  'rounded-full px-3 py-1 text-[12px] font-medium capitalize',
                  grain === g && 'bg-white dark:bg-white/15 shadow-sm',
                )}
              >
                {g}ly
              </button>
            ))}
          </div>
        </div>
        <div className="card p-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.data ?? []} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.07} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Line type="monotone" dataKey="averageScore" stroke="#0F6B4F" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <h2 className="label mt-8 mb-2.5">Branch ranking</h2>
        <div className="card divide-y divide-black/[.05] dark:divide-white/[.07]">
          {(ranking.data?.ranking ?? []).map((b: any) => (
            <div key={b.branchId} className="flex items-center gap-3 p-3.5">
              <span className="num text-[11px] font-semibold text-ink/30 dark:text-porcelain/30 w-5">{b.rank}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.name}</span>
              <span className="text-[11px] text-ink/40 dark:text-porcelain/40">{b.visits} visits</span>
              <span className={clsx('num text-sm font-semibold w-12 text-right',
                b.averageScore >= 80 ? 'text-rate-e' : b.averageScore >= 60 ? 'text-rate-n' : 'text-rate-b')}>
                {b.averageScore}%
              </span>
            </div>
          ))}
        </div>

        <h2 className="label mt-8 mb-2.5">Most common findings</h2>
        <div className="card p-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(questions.data ?? []).slice(0, 8)}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="question" width={130} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="belowStandard" radius={[0, 6, 6, 0]}>
                {(questions.data ?? []).slice(0, 8).map((_, i) => <Cell key={i} fill="#B8323A" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Screen>
    </>
  );
}

function Extreme({ kind, branch }: { kind: 'high' | 'low'; branch?: { name: string; averageScore: number } }) {
  const Icon = kind === 'high' ? TrendingUp : TrendingDown;
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={kind === 'high' ? 'text-rate-e' : 'text-rate-b'} />
        <span className="label">{kind === 'high' ? 'Highest' : 'Lowest'}</span>
      </div>
      <p className="font-medium text-sm mt-1.5 truncate">{branch?.name ?? '—'}</p>
      <p className="num text-xl font-semibold">{branch ? `${branch.averageScore}%` : '—'}</p>
    </div>
  );
}
