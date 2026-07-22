import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Images, Trash2, MessageSquarePlus, MapPin, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export interface RatingOption {
  id: string;
  code: string;
  label: string;
  value: number;
  color: string;
}

export interface Question {
  id: string;
  refNo?: string | null;
  title: string;
  clarification?: string | null;
  answerType: 'RATING' | 'RATING_MULTI' | 'TEXT' | 'NUMBER' | 'TIME' | 'BOOLEAN';
  allowedOptions: string[];
  subItems?: string[] | null;
  requiresPhoto: boolean;
  minPhotos: number;
  maxPhotos: number;
  allowNA: boolean;
  isCritical: boolean;
}

export interface AnswerState {
  ratingCode?: string | null;
  isNA?: boolean;
  subValues?: Record<string, string>;
  comment?: string | null;
  notes?: string | null;
  textValue?: string | null;
  photos: { id: string; thumbUrl?: string | null; url: string; pending?: boolean }[];
}

interface Props {
  question: Question;
  options: RatingOption[];
  answer: AnswerState;
  onChange: (patch: Partial<AnswerState>) => void;
  onAddPhotos: (files: FileList) => void;
  onRemovePhoto: (photoId: string) => void;
}

export function QuestionCard({ question, options, answer, onChange, onAddPhotos, onRemovePhoto }: Props) {
  const [showNotes, setShowNotes] = useState(Boolean(answer.comment || answer.notes));
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const available = options.filter((o) => question.allowedOptions.includes(o.code));
  const photoShort = question.requiresPhoto && answer.photos.length < Math.max(1, question.minPhotos);
  const answered = Boolean(answer.ratingCode || answer.isNA || answer.subValues || answer.textValue);

  return (
    <motion.section
      layout
      className={clsx(
        'card p-4 scroll-mt-32',
        answered && !photoShort && 'border-kib/20',
        question.isCritical && 'ring-1 ring-brass/30',
      )}
    >
      <div className="flex items-start gap-3">
        {question.refNo && (
          <span className="num text-[11px] font-semibold text-ink/30 dark:text-porcelain/30 mt-0.5 w-5">
            {question.refNo}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold leading-snug">{question.title}</h3>
          {question.clarification && (
            <p className="text-[13px] text-ink/50 dark:text-porcelain/50 mt-0.5">{question.clarification}</p>
          )}
          {question.isCritical && (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-brass">
              <AlertTriangle size={12} /> Critical — a fail here fails the visit
            </span>
          )}
        </div>
      </div>

      {question.answerType === 'RATING' && (
        <RatingRow
          options={available}
          value={answer.isNA ? 'NA' : (answer.ratingCode ?? null)}
          allowNA={question.allowNA}
          onPick={(code) =>
            onChange(code === 'NA' ? { isNA: true, ratingCode: null } : { isNA: false, ratingCode: code })
          }
        />
      )}

      {question.answerType === 'RATING_MULTI' && (
        <div className="mt-3 space-y-2">
          {(question.subItems ?? []).map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="text-[13px] font-medium w-24 shrink-0 truncate">{item}</span>
              <RatingRow
                compact
                options={available}
                value={answer.subValues?.[item] ?? null}
                onPick={(code) =>
                  onChange({ subValues: { ...(answer.subValues ?? {}), [item]: code } })
                }
              />
            </div>
          ))}
        </div>
      )}

      {question.answerType === 'TEXT' && (
        <input
          className="mt-3 w-full rounded-xl bg-black/[.04] dark:bg-white/[.06] px-3 py-2.5 outline-none"
          placeholder="Type your answer"
          value={answer.textValue ?? ''}
          onChange={(e) => onChange({ textValue: e.target.value })}
        />
      )}

      {/* photos */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="tap flex items-center gap-1.5 rounded-full bg-ink text-porcelain dark:bg-porcelain dark:text-ink
                       px-3.5 py-2 text-[13px] font-medium"
          >
            <Camera size={15} /> Camera
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="tap flex items-center gap-1.5 rounded-full bg-black/[.06] dark:bg-white/[.08]
                       px-3.5 py-2 text-[13px] font-medium"
          >
            <Images size={15} /> Gallery
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            className="tap ml-auto flex items-center gap-1.5 rounded-full bg-black/[.06] dark:bg-white/[.08]
                       px-3.5 py-2 text-[13px] font-medium"
          >
            <MessageSquarePlus size={15} /> Note
          </button>
        </div>

        {photoShort && (
          <p className="mt-2 text-[12px] text-rate-b font-medium">
            This item needs a photo before the visit can be submitted.
          </p>
        )}

        {/* capture=environment opens the rear camera straight away on iPhone */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && onAddPhotos(e.target.files)}
        />

        {answer.photos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
            <AnimatePresence initial={false}>
              {answer.photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative shrink-0 snap-start"
                >
                  <img
                    src={photo.thumbUrl ?? photo.url}
                    alt=""
                    loading="lazy"
                    className={clsx(
                      'h-24 w-[120px] rounded-xl object-cover border border-black/[.06]',
                      photo.pending && 'opacity-55',
                    )}
                  />
                  {photo.pending && (
                    <span className="absolute inset-x-1 bottom-1 rounded-md bg-ink/70 text-porcelain text-[10px] text-center py-0.5">
                      waiting for signal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 grid place-items-center h-6 w-6 rounded-full
                               bg-ink text-porcelain shadow-lift"
                  >
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <textarea
              className="mt-3 w-full rounded-xl bg-black/[.04] dark:bg-white/[.06] px-3 py-2.5 outline-none resize-none"
              rows={2}
              placeholder="What did you see?"
              value={answer.comment ?? ''}
              onChange={(e) => onChange({ comment: e.target.value })}
            />
            <textarea
              className="mt-2 w-full rounded-xl bg-black/[.04] dark:bg-white/[.06] px-3 py-2.5 outline-none resize-none"
              rows={2}
              placeholder="Follow-up for the branch manager"
              value={answer.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function RatingRow({
  options,
  value,
  allowNA,
  compact,
  onPick,
}: {
  options: RatingOption[];
  value: string | null;
  allowNA?: boolean;
  compact?: boolean;
  onPick: (code: string) => void;
}) {
  const choices = allowNA ? [...options, { id: 'na', code: 'NA', label: 'N/A', value: 0, color: '#6B7280' }] : options;

  return (
    <div className={clsx('flex gap-2', compact ? 'flex-1' : 'mt-3')}>
      {choices.map((option) => {
        const active = value === option.code;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => {
              onPick(option.code);
              navigator.vibrate?.(8);
            }}
            aria-pressed={active}
            className={clsx(
              'tap flex-1 rounded-xl font-display font-semibold transition-colors',
              compact ? 'py-2 text-[13px]' : 'py-3.5 text-[15px]',
              active ? 'text-white shadow-card' : 'bg-black/[.05] dark:bg-white/[.07]',
            )}
            style={active ? { backgroundColor: option.color } : undefined}
          >
            {compact ? option.code : `${option.code} · ${option.label}`}
          </button>
        );
      })}
    </div>
  );
}

export function GpsChip({ coords }: { coords: { latitude: number; longitude: number } | null }) {
  if (!coords) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink/40 dark:text-porcelain/40">
      <MapPin size={11} />
      {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
    </span>
  );
}
