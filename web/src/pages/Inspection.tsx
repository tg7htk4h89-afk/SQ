import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

import { get, post } from '../lib/api';
import { queueAnswer, queuePhoto, saveDraft, readDraft, flush } from '../lib/offline';
import { QuestionCard, type AnswerState, type Question, type RatingOption } from '../components/Question';
import { ScoreRing, SyncPill } from '../components/Shell';

interface Section {
  id: string;
  title: string;
  groupTitle?: string | null;
  order: number;
  questions: Question[];
}

interface InspectionDto {
  id: string;
  reference: string;
  status: string;
  branch: { id: string; name: string; code: string };
  template: {
    id: string;
    name: string;
    passMark: number;
    sections: Section[];
    scales: { options: RatingOption[] }[];
  };
  answers: {
    id: string;
    questionId: string;
    ratingOption?: { code: string } | null;
    isNA: boolean;
    subValues?: Record<string, string> | null;
    comment?: string | null;
    notes?: string | null;
    textValue?: string | null;
    photos: { id: string; url: string; thumbUrl?: string | null }[];
  }[];
}

export default function InspectionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [activeZone, setActiveZone] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [gaps, setGaps] = useState<string[]>([]);
  const coords = useGeolocation();
  const zoneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: async () => {
      const fresh = await get<InspectionDto>(`/inspections/${id}`);
      void saveDraft(id, fresh);
      return fresh;
    },
    retry: false,
  });

  const [offlineCopy, setOfflineCopy] = useState<InspectionDto | null>(null);
  useEffect(() => {
    if (!data) void readDraft<InspectionDto>(id).then(setOfflineCopy);
  }, [data, id]);

  const inspection = data ?? offlineCopy;

  useEffect(() => {
    if (!inspection) return;
    setAnswers(
      Object.fromEntries(
        inspection.answers.map((a) => [
          a.questionId,
          {
            ratingCode: a.ratingOption?.code ?? null,
            isNA: a.isNA,
            subValues: a.subValues ?? undefined,
            comment: a.comment,
            notes: a.notes,
            textValue: a.textValue,
            photos: a.photos,
          } satisfies AnswerState,
        ]),
      ),
    );
  }, [inspection]);

  const options = inspection?.template.scales[0]?.options ?? [];
  const sections = inspection?.template.sections ?? [];

  // Live score, computed on-device so it keeps moving with no connection.
  const progress = useMemo(() => {
    const perZone = sections.map((section) => {
      const scored = section.questions.filter((q) => {
        const a = answers[q.id];
        return a && !a.isNA && (a.ratingCode || a.subValues || a.textValue);
      });
      const applicable = section.questions.filter((q) => !answers[q.id]?.isNA);
      const earned = scored.reduce((sum, q) => {
        const a = answers[q.id]!;
        if (a.subValues) {
          const values = Object.values(a.subValues).map((c) => options.find((o) => o.code === c)?.value ?? 0);
          return sum + (values.length ? values.reduce((x, y) => x + y, 0) / values.length : 0);
        }
        return sum + (options.find((o) => o.code === a.ratingCode)?.value ?? 100);
      }, 0);
      return {
        id: section.id,
        title: section.title,
        done: scored.length,
        total: applicable.length,
        pct: scored.length ? earned / scored.length : null,
      };
    });

    const done = perZone.reduce((n, z) => n + z.done, 0);
    const total = perZone.reduce((n, z) => n + z.total, 0);
    const scoredZones = perZone.filter((z) => z.pct !== null);
    return {
      perZone,
      done,
      total,
      overall: scoredZones.length
        ? scoredZones.reduce((n, z) => n + z.pct!, 0) / scoredZones.length
        : null,
    };
  }, [answers, sections, options]);

  // Every keystroke and tap is persisted locally, then pushed.
  function change(questionId: string, patch: Partial<AnswerState>) {
    setAnswers((prev) => {
      const next = { ...prev[questionId], ...patch, photos: prev[questionId]?.photos ?? [] };
      void queueAnswer({
        inspectionId: id,
        questionId,
        ratingCode: next.ratingCode ?? null,
        isNA: next.isNA ?? false,
        subValues: next.subValues ?? null,
        comment: next.comment ?? null,
        notes: next.notes ?? null,
        textValue: next.textValue ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      return { ...prev, [questionId]: next };
    });
  }

  async function addPhotos(questionId: string, files: FileList) {
    const answerId = inspection?.answers.find((a) => a.questionId === questionId)?.id;
    for (const file of Array.from(files)) {
      const localUrl = URL.createObjectURL(file);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          photos: [...(prev[questionId]?.photos ?? []), { id: localUrl, url: localUrl, pending: true }],
        },
      }));
      if (answerId) {
        await queuePhoto({
          inspectionId: id,
          answerId,
          blob: file,
          fileName: file.name || `${questionId}.jpg`,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
      }
    }
  }

  async function submit() {
    setSubmitting(true);
    setGaps([]);
    try {
      await flush();
      await post(`/inspections/${id}/submit`, {});
      navigate(`/inspections/${id}/done`, { replace: true });
    } catch (err) {
      const payload = (err as { payload?: { gaps?: string[] } }).payload;
      setGaps(payload?.gaps ?? ['Could not submit. Check your connection and try again.']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading && !inspection) {
    return <div className="grid h-dvh place-items-center"><Loader2 className="animate-spin" /></div>;
  }
  if (!inspection) {
    return <div className="grid h-dvh place-items-center pad text-center text-sm">This inspection is not on this device and there is no connection to fetch it.</div>;
  }

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-30 pad bg-porcelain/90 dark:bg-ink/90 backdrop-blur-xl
                   border-b border-black/[.06] dark:border-white/[.08]"
        style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}
      >
        <div className="flex items-center gap-3 pb-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-1 p-1">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="label truncate">{inspection.reference}</div>
            <div className="font-display font-semibold leading-tight truncate">{inspection.branch.name}</div>
          </div>
          <SyncPill />
          <ScoreRing pct={progress.overall} size={52} />
        </div>

        {/* The zone rail: one segment per zone, filling as it is scored.
            Tapping a segment jumps to that zone. */}
        <div className="flex gap-1 pb-2.5" role="tablist" aria-label="Zones">
          {progress.perZone.map((zone, i) => (
            <button
              key={zone.id}
              role="tab"
              aria-selected={activeZone === i}
              aria-label={`${zone.title}, ${zone.done} of ${zone.total} done`}
              onClick={() => {
                setActiveZone(i);
                zoneRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="group flex-1"
            >
              <span className="block h-1.5 rounded-full bg-black/[.08] dark:bg-white/[.12] overflow-hidden">
                <motion.span
                  className="block h-full rounded-full"
                  style={{
                    backgroundColor:
                      zone.pct === null ? '#9CA3AF' : zone.pct >= 80 ? '#1C7A58' : zone.pct >= 60 ? '#C98A1B' : '#B8323A',
                  }}
                  animate={{ width: `${zone.total ? (zone.done / zone.total) * 100 : 0}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                />
              </span>
            </button>
          ))}
        </div>
        <p className="pb-2 text-[11px] text-ink/45 dark:text-porcelain/45">
          {progress.done} of {progress.total} answered
          {progress.total - progress.done > 0 && ` · ${progress.total - progress.done} left`}
        </p>
      </header>

      <main className="pad max-w-2xl mx-auto pb-40">
        {gaps.length > 0 && (
          <div className="card mt-4 border-rate-b/30 p-4">
            <p className="font-display font-semibold text-rate-b">Finish these before submitting</p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink/70 dark:text-porcelain/70">
              {gaps.slice(0, 10).map((gap) => <li key={gap}>· {gap}</li>)}
            </ul>
            {gaps.length > 10 && <p className="mt-2 text-[12px] opacity-60">and {gaps.length - 10} more</p>}
          </div>
        )}

        {sections.map((section, i) => {
          const zone = progress.perZone[i];
          return (
            <div key={section.id} ref={(el) => { zoneRefs.current[i] = el; }} className="scroll-mt-40">
              <div className="flex items-baseline justify-between pt-7 pb-3">
                <div>
                  {section.groupTitle && <div className="label">{section.groupTitle}</div>}
                  <h2 className="font-display text-lg font-semibold tracking-tight">{section.title}</h2>
                </div>
                <span className={clsx('num text-sm font-semibold', zone.pct === null && 'opacity-35')}>
                  {zone.pct === null ? '—' : `${Math.round(zone.pct)}%`}
                </span>
              </div>
              <div className="space-y-3">
                {section.questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    options={options}
                    answer={answers[question.id] ?? { photos: [] }}
                    onChange={(patch) => change(question.id, patch)}
                    onAddPhotos={(files) => void addPhotos(question.id, files)}
                    onRemovePhoto={(photoId) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id],
                          photos: prev[question.id].photos.filter((p) => p.id !== photoId),
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-40 pad pt-3 bg-gradient-to-t from-porcelain via-porcelain/95 to-transparent
                   dark:from-ink dark:via-ink/95"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
      >
        <button
          onClick={() => void submit()}
          disabled={submitting || progress.done < progress.total}
          className="tap w-full rounded-2xl bg-kib py-4 font-display font-semibold text-white shadow-lift
                     disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2 max-w-2xl mx-auto"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {progress.done < progress.total
            ? `${progress.total - progress.done} items left`
            : `Submit — ${Math.round(progress.overall ?? 0)}%`}
        </button>
      </div>
    </div>
  );
}

function useGeolocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return coords;
}
