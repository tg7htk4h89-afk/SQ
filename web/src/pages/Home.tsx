import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { get } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Screen, TopBar, SyncPill, Empty } from '../components/Shell';

interface HomeData {
  today: number;
  drafts: number;
  completedThisMonth: number;
  unreadNotifications: number;
  recent: {
    id: string;
    reference: string;
    status: string;
    scorePct: number | null;
    result: string;
    updatedAt: string;
    branch: { name: string; code: string };
  }[];
}

export default function Home() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['home'], queryFn: () => get<HomeData>('/analytics/home') });

  const hour = dayjs().hour();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <TopBar title={user?.fullName.split(' ')[0] ?? 'Welcome'} subtitle={greeting} right={<SyncPill />} />
      <Screen>
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          <Stat label="Today" value={data?.today ?? 0} />
          <Stat label="In progress" value={data?.drafts ?? 0} accent />
          <Stat label="This month" value={data?.completedThisMonth ?? 0} />
        </div>

        <Link
          to="/inspect"
          className="tap card mt-3 flex items-center gap-3 p-4 bg-kib text-white border-kib"
        >
          <Plus size={20} />
          <span className="font-display font-semibold">Start a branch visit</span>
          <ChevronRight size={18} className="ml-auto opacity-60" />
        </Link>

        <h2 className="label mt-8 mb-2.5">Recent activity</h2>
        {data?.recent.length ? (
          <ul className="space-y-2">
            {data.recent.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.status === 'IN_PROGRESS' || item.status === 'DRAFT'
                    ? `/inspections/${item.id}`
                    : `/history/${item.id}`}
                  className="tap card flex items-center gap-3 p-3.5"
                >
                  <ClipboardList size={18} className="text-ink/30 dark:text-porcelain/30 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate leading-tight">{item.branch.name}</p>
                    <p className="text-[12px] text-ink/45 dark:text-porcelain/45">
                      {item.reference} · {dayjs(item.updatedAt).format('DD MMM, HH:mm')}
                    </p>
                  </div>
                  <span className="num text-sm font-semibold">
                    {item.scorePct === null ? (
                      <span className="text-[11px] font-medium text-brass">draft</span>
                    ) : (
                      `${Math.round(item.scorePct)}%`
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nothing yet. Your first branch visit will show up here." />
        )}
      </Screen>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-3.5">
      <div className={`num text-3xl font-semibold leading-none ${accent ? 'text-brass' : ''}`}>{value}</div>
      <div className="label mt-1.5">{label}</div>
    </div>
  );
}
