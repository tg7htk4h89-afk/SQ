import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Check, Loader2, Webhook, Users, ListChecks } from 'lucide-react';
import clsx from 'clsx';
import { api, get, post } from '../lib/api';
import { Screen, TopBar } from '../components/Shell';

type Tab = 'checklist' | 'users' | 'automation';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('checklist');
  return (
    <>
      <TopBar title="Admin" subtitle="System" />
      <Screen>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {([
            ['checklist', 'Checklist', ListChecks],
            ['users', 'People', Users],
            ['automation', 'Automation', Webhook],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'tap shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium',
                tab === key ? 'bg-ink text-porcelain dark:bg-porcelain dark:text-ink' : 'bg-black/[.06] dark:bg-white/[.08]',
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {tab === 'checklist' && <ChecklistTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'automation' && <AutomationTab />}
      </Screen>
    </>
  );
}

function ChecklistTab() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const templates = useQuery({ queryKey: ['templates'], queryFn: () => get<any[]>('/templates') });

  const importFile = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('name', 'Branch Visit Report');
      form.append('activate', 'true');
      return api<any>('/templates/import', { method: 'POST', body: form });
    },
    onSuccess: (template) => {
      const questions = template.sections.reduce((n: number, s: any) => n + s.questions.length, 0);
      setMessage(`Imported ${template.sections.length} zones and ${questions} items as version ${template.version}.`);
      void qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const activate = useMutation({
    mutationFn: (id: string) => post(`/templates/${id}/activate`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <>
      <div className="card mt-3 p-5 text-center">
        <Upload size={22} className="mx-auto text-ink/30 dark:text-porcelain/30" />
        <p className="font-display font-semibold mt-3">Upload the Excel checklist</p>
        <p className="text-[13px] text-ink/50 dark:text-porcelain/50 mt-1.5 max-w-sm mx-auto">
          Zones, items, clarifications and the E / N / B columns are read straight off the sheet.
          Each upload becomes a new version — visits already filed keep the version they were answered against.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xlsm"
          hidden
          onChange={(e) => e.target.files?.[0] && importFile.mutate(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importFile.isPending}
          className="tap mt-4 rounded-2xl bg-kib text-white px-5 py-3 font-display font-semibold
                     inline-flex items-center gap-2 disabled:opacity-50"
        >
          {importFile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Choose file
        </button>
        {message && <p className="text-[13px] mt-3 text-ink/60 dark:text-porcelain/60">{message}</p>}
      </div>

      <h2 className="label mt-8 mb-2.5">Versions</h2>
      <div className="card divide-y divide-black/[.05] dark:divide-white/[.07]">
        {(templates.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{t.name} <span className="num opacity-50">v{t.version}</span></p>
              <p className="text-[12px] text-ink/45 dark:text-porcelain/45">
                {t._count.sections} zones · {t._count.inspections} visits · pass mark {t.passMark}%
              </p>
            </div>
            {t.isActive ? (
              <span className="flex items-center gap-1 text-[12px] font-medium text-kib">
                <Check size={13} /> Live
              </span>
            ) : (
              <button
                onClick={() => activate.mutate(t.id)}
                className="tap text-[12px] font-medium rounded-full bg-black/[.06] dark:bg-white/[.08] px-3 py-1.5"
              >
                Make live
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function UsersTab() {
  const users = useQuery({ queryKey: ['users'], queryFn: () => get<any[]>('/admin/users') });
  return (
    <div className="card mt-3 divide-y divide-black/[.05] dark:divide-white/[.07]">
      {(users.data ?? []).map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{u.fullName}</p>
            <p className="text-[12px] text-ink/45 dark:text-porcelain/45">
              {u.username} · {u._count.inspections} visits
            </p>
          </div>
          <span className="text-[11px] font-medium rounded-full bg-black/[.06] dark:bg-white/[.08] px-2.5 py-1">
            {u.role.toLowerCase()}
          </span>
          {!u.isActive && <span className="text-[11px] text-rate-b">disabled</span>}
        </div>
      ))}
    </div>
  );
}

const EVENTS = [
  'inspection.completed',
  'inspection.failed',
  'inspection.low_score',
  'photo.uploaded',
  'pdf.generated',
  'summary.daily',
  'summary.weekly',
];

function AutomationTab() {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [events, setEvents] = useState<string[]>(['inspection.completed']);

  const hooks = useQuery({ queryKey: ['webhooks'], queryFn: () => get<any[]>('/admin/webhooks') });
  const create = useMutation({
    mutationFn: () => post('/admin/webhooks', { name, url, events }),
    onSuccess: () => {
      setName('');
      setUrl('');
      void qc.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  return (
    <>
      <div className="card mt-3 p-4 space-y-3">
        <p className="font-display font-semibold">Send events to n8n</p>
        <input
          className="w-full rounded-xl bg-black/[.05] dark:bg-white/[.07] px-3 py-2.5 outline-none"
          placeholder="What is this for?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-xl bg-black/[.05] dark:bg-white/[.07] px-3 py-2.5 outline-none"
          placeholder="https://n8n.example.com/webhook/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {EVENTS.map((event) => (
            <button
              key={event}
              onClick={() =>
                setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]))
              }
              className={clsx(
                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                events.includes(event) ? 'bg-kib text-white' : 'bg-black/[.06] dark:bg-white/[.08]',
              )}
            >
              {event}
            </button>
          ))}
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={!url || !name || create.isPending}
          className="tap w-full rounded-xl bg-ink text-porcelain dark:bg-porcelain dark:text-ink py-3
                     font-display font-semibold disabled:opacity-40"
        >
          Add endpoint
        </button>
      </div>

      <div className="card mt-3 divide-y divide-black/[.05] dark:divide-white/[.07]">
        {(hooks.data ?? []).map((h) => (
          <div key={h.id} className="p-3.5">
            <p className="font-medium text-sm">{h.name}</p>
            <p className="text-[12px] text-ink/45 dark:text-porcelain/45 truncate">{h.url}</p>
            <p className="text-[11px] text-ink/35 dark:text-porcelain/35 mt-1">
              {h.events.join(' · ')} — {h._count.deliveries} deliveries
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
