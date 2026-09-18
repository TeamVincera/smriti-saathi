import { useState } from 'react'
import { localeForLanguage } from '../i18n'
import type { Language } from '../lib/types'
import type { DailyPlanItem, DailyPlanKind } from '../lib/dailyPlan'

type Translator = (key: string, vars?: Record<string, string | number>) => string

export interface DailyPlanCardProps {
  items: DailyPlanItem[]
  lang: Language
  t: Translator
  now?: Date
}

const kindKeys: Record<DailyPlanKind, string> = {
  medicine: 'plan_kind_medicine',
  reminder: 'plan_kind_reminder',
  appointment: 'plan_kind_appointment',
}

function formatTime(time: string, lang: Language): string {
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time
  const date = new Date(2000, 0, 1, hours, minutes)
  return new Intl.DateTimeFormat(localeForLanguage(lang), { hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatDate(date: string, today: string, lang: Language, t: Translator): string {
  if (date === today) return t('plan_today')
  const parsed = new Date(`${date}T00:00:00`)
  if (!Number.isFinite(parsed.getTime())) return date
  return new Intl.DateTimeFormat(localeForLanguage(lang), { weekday: 'short', month: 'short', day: 'numeric' }).format(parsed)
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function DailyPlanCard({ items, lang, t, now = new Date() }: DailyPlanCardProps) {
  const [expanded, setExpanded] = useState(false)
  const today = localDateKey(now)
  const visibleItems = expanded ? items : items.slice(0, 3)

  return (
    <section
      className="card daily-plan-card"
      data-testid="daily-plan-card"
      aria-labelledby="daily-plan-title"
      style={{
        borderRadius: 22,
        padding: '18px 18px 16px',
        marginBottom: 20,
        border: '1.5px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 id="daily-plan-title" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            {t('plan_title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.4, margin: '4px 0 0' }}>
            {t('plan_subtitle')}
          </p>
        </div>
        <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1 }}>🌿</span>
      </div>

      {items.length === 0 ? (
        <p role="status" style={{ margin: '10px 0 12px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
          {t('plan_empty')}
        </p>
      ) : (
        <div role="list" aria-label={t('plan_title')} style={{ display: 'grid', gap: 8 }}>
          {visibleItems.map((item) => {
            const kind = t(kindKeys[item.kind])
            const date = formatDate(item.date, today, lang, t)
            const time = formatTime(item.time, lang)
            return (
              <div
                key={item.id}
                role="listitem"
                aria-label={t('plan_item_aria', { kind, title: item.title, date, time })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  padding: '7px 10px',
                  borderRadius: 14,
                  background: 'var(--surface-muted)',
                  opacity: item.completed ? 0.72 : 1,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 24, width: 32, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                <span style={{ display: 'grid', gap: 2, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {kind} · {date}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      color: 'var(--ink)',
                      fontWeight: 650,
                      minWidth: 0,
                      lineHeight: 1.3,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.title}
                  </span>
                </span>
                <span style={{ display: 'grid', gap: 2, justifyItems: 'end', flexShrink: 0 }}>
                  <time dateTime={`${item.date}T${item.time}`} style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 700 }}>{time}</time>
                  {item.completed && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>{t('plan_done')}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {items.length > 3 && (
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          style={{ minHeight: 48, marginTop: 10, borderRadius: 14, width: '100%', fontWeight: 700 }}
        >
          {expanded ? t('plan_show_less') : t('plan_show_more')}
        </button>
      )}

      <p style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4, margin: '12px 0 0' }}>
        {t('plan_privacy')}
      </p>
    </section>
  )
}
