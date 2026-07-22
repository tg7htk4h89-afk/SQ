import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Download, Home } from 'lucide-react';
import { api, get } from '../lib/api';
import { ScoreRing } from '../components/Shell';

export default function Done() {
  const { id = '' } = useParams();
  const { data } = useQuery({ queryKey: ['inspection', id], queryFn: () => get<any>(`/inspections/${id}`) });

  useEffect(() => {
    navigator.vibrate?.([12, 60, 12]);
  }, []);

  async function download() {
    const res = await api<Response>(`/inspections/${id}/pdf`, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data?.reference ?? 'report'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const pass = data?.result === 'PASS';

  return (
    <div className="min-h-dvh grid place-items-center pad text-center">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="mx-auto"><ScoreRing pct={data?.scorePct ?? null} size={132} /></div>
        <p className={`label mt-5 ${pass ? 'text-rate-e' : 'text-rate-b'}`}>{data?.result}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight mt-1">{data?.branch?.name}</h1>
        <p className="text-sm text-ink/50 dark:text-porcelain/50 mt-1">
          {data?.reference} · submitted
        </p>

        <div className="flex gap-2 mt-8">
          <button onClick={() => void download()}
            className="tap flex-1 rounded-2xl bg-kib text-white py-3.5 font-display font-semibold
                       flex items-center justify-center gap-2">
            <Download size={17} /> Report
          </button>
          <Link to="/" className="tap flex-1 rounded-2xl bg-black/[.06] dark:bg-white/[.08] py-3.5
                                  font-display font-semibold flex items-center justify-center gap-2">
            <Home size={17} /> Done
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
