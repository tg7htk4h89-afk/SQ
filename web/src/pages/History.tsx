import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Search, SlidersHorizontal, Download } from 'lucide-react';
import clsx from 'clsx';
import { api, get } from '../lib/api';
import { Screen, TopBar, Empty } from '../components/Shell';

interface Row {
  id: string;
  reference: string;
  status: string;
  result: string;
  scorePct: number | null;
  visitDate: string;
  branch: { name: string; code: string };
  inspector: { fullName: string };
}

const STATUSES = ['', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED'] as const;
const LABELS: Record<string, string> = {
  '': 'All',
  IN_PROGRESS: 'Drafts',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
};

export default function History() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data } = useQuery({
    queryKey: ['history', search, status, from, to],
    queryFn: () => {
      const params = new URLSearchParams({ perPage: '50' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return get<{ items: Row[]; total: number }>(`/inspections?${params}`);
    },
  });

  async function download(id: string, reference: string) {
    const res = await api<Response>(`/inspections/${id}/pdf`, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reference}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <TopBar
        title="History"
        subtitle={data ? `${data.total} visits` : ' '}
        right={
          <button onClick={() => setShowFilters((s) => !s)} className="tap p-2" aria-label="Filters">
            <SlidersHorizontal size={19} />
          </button>
        }
      />
      <Screen>
        <div className="relative mt-2">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 dark:text-porcelain/35" />
          <input
            className="w-full rounded-2xl bg-black/[.05] dark:bg-white/[.07] pl-10 pr-4 py-3.5 outline-none"
            placeholder="Branch, reference, inspector or a comment"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                'tap shrink-0 rounded-full px-4 py-2 text-[13px] font-medium',
                status === s ? 'bg-ink text-porcelain dark:bg-porcelain dark:text-ink' : 'bg-black/[.06] dark:bg-white/[.08]',
              )}
            >
              {LABELS[s]}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="card mt-3 p-4 grid grid-cols-2 gap-3">
            <label className="text-[12px]">
              <span className="label block mb-1">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl bg-black/[.05] dark:bg-white/[.07] px-3 py-2.5 outline-none" />
            </label>
            <label className="text-[12px]">
              <span className="label block mb-1">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl bg-black/[.05] dark:bg-white/[.07] px-3 py-2.5 outline-none" />
            </label>
          </div>
        )}

        {data?.items.length ? (
          <ul className="mt-3 space-y-2">
            {data.items.map((row) => (
              <li key={row.id} className="card p-3.5 flex items-center gap-3">
                <Link
                  to={row.status === 'IN_PROGRESS' ? `/inspections/${row.id}` : `/history/${row.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="font-medium truncate leading-tight">{row.branch.name}</p>
                  <p className="text-[12px] text-ink/45 dark:text-porcelain/45">
                    {row.reference} · {dayjs(row.visitDate).format('DD MMM YYYY')} · {row.inspector.fullName}
                  </p>
                </Link>
                <span
                  className={clsx(
                    'num text-sm font-semibold',
                    row.result === 'FAIL' && 'text-rate-b',
                    row.result === 'PASS' && 'text-rate-e',
                  )}
                >
                  {row.scorePct === null ? '—' : `${Math.round(row.scorePct)}%`}
                </span>
                {row.status !== 'IN_PROGRESS' && (
                  <button
                    onClick={() => void download(row.id, row.reference)}
                    aria-label={`Download ${row.reference}`}
                    className="tap p-1.5 text-ink/40 dark:text-porcelain/40"
                  >
                    <Download size={17} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No visits match those filters." />
        )}
      </Screen>
    </>
  );
}
