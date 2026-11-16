import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LiveQuestion } from '../../../shared/game'

/** A question's picture or sound clip, framed on the paper (kit.md section 7). */
export function QuestionMedia({ question, disabled = false }: { question: LiveQuestion; disabled?: boolean; /** Kept for the big screen's older call. */ muted?: string }) {
  const { t } = useTranslation()
  if (question.media_kind === 'none' || !question.media_url) return null

  if (question.media_kind === 'image') {
    return (
      <figure className="media">
        <span className="media__frame">
          <img src={question.media_url} alt={t('question.image')} />
        </span>
        {question.caption ? <figcaption>{question.caption}</figcaption> : null}
      </figure>
    )
  }
  return <SoundClip src={question.media_url} caption={question.caption} disabled={disabled} />
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

/**
 * The sound clip player: play, the played-so-far track, the time, and the CC toggle. Captions show by
 * default and sound questions always have one (SPEC section 7), so the toggle only tucks it away.
 */
function SoundClip({ src, caption, disabled }: { src: string; caption: string | null; disabled: boolean }) {
  const { t } = useTranslation()
  const captionId = useId()
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState({ at: 0, total: 0 })
  const [captions, setCaptions] = useState(true)

  const toggle = () => {
    const el = audio.current
    if (!el) return
    if (el.paused) void el.play().catch(() => setPlaying(false))
    else el.pause()
  }

  return (
    <div className="clip" role="group" aria-label={t('question.audio')}>
      <audio
        ref={audio}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime({ at: e.currentTarget.currentTime, total: e.currentTarget.duration || 0 })}
      />
      <div className="clip__bar">
        <button type="button" className="clip__play" aria-label={playing ? t('question.pause') : t('question.play')} disabled={disabled} onClick={toggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /> : <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />}
          </svg>
        </button>
        <span className="clip__track" aria-hidden="true">
          <span className="clip__fill" style={{ '--played': time.total > 0 ? Math.min(1, time.at / time.total) : 0 } as React.CSSProperties} />
        </span>
        <span className="clip__time">{clock(time.at)}</span>
        {caption ? (
          <button type="button" className="clip__cc" aria-pressed={captions} aria-controls={captionId} onClick={() => setCaptions(!captions)}>
            {t('question.cc')}<span className="sr-only"> {t('question.captions')}</span>
          </button>
        ) : null}
      </div>
      {caption && captions ? (
        <p className="clip__caption" id={captionId}>
          <span className="clip__caption-label">{t('question.caption')}</span>
          <span>{caption}</span>
        </p>
      ) : null}
    </div>
  )
}
