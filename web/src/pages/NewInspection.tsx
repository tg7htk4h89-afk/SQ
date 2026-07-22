import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, MapPin } from 'lucide-react';
import { get, post } from '../lib/api';
import { Screen, TopBar, Empty } from '../components/Shell';

interface Branch { id: string; code: string; name: string; area?: string | null }

export default function NewInspection() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => get<Branch[]>('/branches'),
  });

  const filtered = (branches ?? []).filter((b) =>
    `${b.name} ${b.code} ${b.area ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function start(branchId: string) {
    setStarting(branchId);
    try {
      const inspection = await post<{ id: string }>('/inspections', { branchId });
      navigate(`/inspections/${inspection.id}`);
    } finally {
      setStarting(null);
    }
  }

  return (
    <>
      <TopBar title="Pick a branch" subtitle="New visit" />
      <Screen>
        <div className="relative mt-2">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 dark:text-porcelain/35" />
          <input
            className="w-full rounded-2xl bg-black/[.05] dark:bg-white/[.07] pl-10 pr-4 py-3.5 outline-none"
            placeholder="Branch name, code or area"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <Empty title="No branch matches that. Check the spelling, or ask an admin to add it." />
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((branch) => (
              <li key={branch.id}>
                <button
                  onClick={() => void start(branch.id)}
                  disabled={Boolean(starting)}
                  className="tap card w-full flex items-center gap-3 p-4 text-left disabled:opacity-50"
                >
                  <span className="num text-[11px] font-semibold rounded-lg bg-kib/10 text-kib px-2 py-1">
                    {branch.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{branch.name}</span>
                    {branch.area && (
                      <span className="flex items-center gap-1 text-[12px] text-ink/45 dark:text-porcelain/45">
                        <MapPin size={11} /> {branch.area}
                      </span>
                    )}
                  </span>
                  {starting === branch.id && <Loader2 size={17} className="animate-spin" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Screen>
    </>
  );
}
