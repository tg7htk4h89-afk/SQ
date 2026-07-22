import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Download } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { api, get } from '../lib/api';
import { Screen, ScoreRing } from '../components/Shell';

export default function Detail() {
  const { id = '' } = useParams();
  const { data } = useQuery({ queryKey: ['inspection', id], queryFn: () => get<any>(`/inspections/${id}`) });

  async function download() {
    const res = await api<Response>(`/inspections/${id}/pdf`, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data?.reference}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return null;
  const answers = new Map<string, any>(data.answers.map((a: any) => [a.questionId, a]));

  return (
    <>
      <header className="sticky top-0 z-30 pad bg-porcelain/90 dark:bg-ink/90 backdrop-blur-xl"
        style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        <div className="flex items-center gap-3 pb-3">
          <Link to="/history" className="tap -ml-1 p-1"><ChevronLeft size={24} /></Link>
          <div className="min-w-0 flex-1">
            <div className="label truncate">{data.reference}</div>
            <div className="font-display font-semibold truncate">{data.branch.name}</div>
          </div>
          <button onClick={() => void download()} className="tap p-2" aria-label="Download report">
            <Download size={19} />
          </button>
        </div>
      </header>

      <Screen>
        <div className="card p-5 flex items-center gap-5 mt-2">
          <ScoreRing pct={data.scorePct} size={82} />
          <div>
            <p className={clsx('label', data.result === 'PASS' ? 'text-rate-e' : 'text-rate-b')}>{data.result}</p>
            <p className="text-sm mt-1">{dayjs(data.visitDate).format('DD MMM YYYY')}</p>
            <p className="text-[12px] text-ink/45 dark:text-porcelain/45">
              {data.inspector.fullName} · {data.timeIn}–{data.timeOut ?? '—'}
            </p>
          </div>
        </div>

        {data.template.sections.map((section: any) => (
          <div key={section.id}>
            <h2 className="label mt-7 mb-2">{section.title}</h2>
            <div className="card divide-y divide-black/[.05] dark:divide-white/[.07]">
              {section.questions.map((q: any) => {
                const a = answers.get(q.id);
                return (
                  <div key={q.id} className="p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="min-w-0 flex-1 text-sm font-medium">{q.title}</span>
                      <span
                        className="num text-[11px] font-bold text-white rounded-md px-2 py-1"
                        style={{ backgroundColor: a?.ratingOption?.color ?? '#9CA3AF' }}
                      >
                        {a?.isNA ? 'N/A' : (a?.ratingOption?.code ?? '—')}
                      </span>
                    </div>
                    {a?.comment && (
                      <p className="text-[13px] text-ink/55 dark:text-porcelain/55 mt-1.5">{a.comment}</p>
                    )}
                    {a?.photos?.length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {a.photos.map((p: any) => (
                          <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                            <img src={p.thumbUrl ?? p.url} alt="" loading="lazy"
                              className="h-20 w-24 rounded-lg object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Screen>
    </>
  );
}
