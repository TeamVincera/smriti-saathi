import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useApp } from '../state'
import { getMedLog, loadConfig, saveConfig, dbAll } from '../lib/db'
import type { MedLogEntry, MedForm, Med, Profile, DailyReminder, AppointmentReminder } from '../lib/types'
import { buildDigest } from '../lib/sathi'
import { formEmoji, sanitizePersonName, calculateAgeFromDob } from '../lib/formatters'
import { Icon } from '../components/Icons'
import { playTap } from '../lib/audio'
import { navigate } from '../router'
import { FESTIVALS, HOBBIES } from './Onboarding'
import { LANGUAGES, type Language } from '../lib/types'
import { PerformanceTracker } from '../lib/adaptive/PerformanceTracker'
import { ExplainabilityLogger } from '../lib/adaptive/ExplainabilityLogger'
import { COGNITIVE_DOMAINS, DOMAIN_DISPLAY_LABELS, DIFFICULTY_LABELS } from '../lib/adaptive/types'
import { LineTrendChart, DomainBarChart } from '../components/Charts'
import {
  type ReportPeriod,
  computePeriodMetrics,
  computeDomainBars,
  computeSessionTrends,
  generatePersonalizedInsights,
  buildLatestSessionSummary,
} from '../lib/reports'
import { AIService, PatientContextBuilder, type CaretakerSummaryResponse } from '../lib/ai'
import { downloadReportImage } from '../lib/reportExport'

export function CaregiverHub() {
  const { profile } = useApp()
  const [unlocked, setUnlocked] = useState(false)

  if (!profile?.pin || unlocked) return <HubInner />
  return <PinGate pin={profile.pin} onUnlock={() => setUnlocked(true)} />
}

// ─────────────────────────────────────────────
// 1. PIN GATE (Matches Screenshot 7)
// ─────────────────────────────────────────────
function PinGate({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [entry, setEntry] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (entry.length === 4) {
      if (entry === pin || (!pin && entry === '1234')) {
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setEntry('')
        }, 500)
      }
    }
  }, [entry, pin, onUnlock])

  const handleDigit = (digit: string) => {
    playTap()
    setEntry((e) => (e.length < 4 ? e + digit : e))
  }

  const handleBackspace = () => {
    playTap()
    setEntry((e) => e.slice(0, -1))
  }

  return (
    <div className="page enter-anim">
      {/* Header bar (Matches Screenshot 7) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={24} color="#162436" />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436' }}>
          Caregiver Controls
        </h2>
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={22} color="#162436" />
        </div>
      </div>

      {/* Main Verification Card (Matches Screenshot 7) */}
      <div
        className="card"
        style={{
          borderRadius: 24,
          padding: '36px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#162436',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Icon name="shield" size={32} color="#fff" />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#162436', marginBottom: 8 }}>
          Enter caregiver PIN
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
          Security Verification • Enter PIN to access caregiver controls
        </p>

        {/* 4 PIN circles */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '2px solid #162436',
                background: i < entry.length ? '#162436' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {shake && (
          <p style={{ color: '#E53E3E', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Wrong PIN — try again
          </p>
        )}

        {/* Numpad 3x4 (Matches Screenshot 7) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 280, marginBottom: 28 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(String(n))}
              style={{
                background: '#F0F0F4',
                borderRadius: 16,
                minHeight: 56,
                fontSize: 22,
                fontWeight: 700,
                color: '#162436',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEntry('')}
            style={{
              background: '#F0F0F4',
              borderRadius: 16,
              minHeight: 56,
              fontSize: 18,
              fontWeight: 700,
              color: '#162436',
              cursor: 'pointer',
            }}
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              background: '#F0F0F4',
              borderRadius: 16,
              minHeight: 56,
              fontSize: 22,
              fontWeight: 700,
              color: '#162436',
              cursor: 'pointer',
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              background: '#F0F0F4',
              borderRadius: 16,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="backspace" size={22} color="#162436" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onUnlock()}
          style={{ fontSize: 13, color: '#162436', textDecoration: 'underline', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Forgot PIN?
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 2. MAIN HUB TABS (Overview, Family, Meds, Reminders, Settings)
// ─────────────────────────────────────────────
function HubInner() {
  const {
    profile,
    updateProfile,
    meds,
    upsertMed,
    removeMed,
    dailyReminders,
    upsertDailyReminder,
    removeDailyReminder,
    appointments,
    upsertAppointment,
    removeAppointment,
    dailyGameLimit,
    updateDailyGameLimit,
    resetAllData,
    sessions,
  } = useApp()
  const [tab, setTab] = useState<'overview' | 'family' | 'meds' | 'reminders' | 'settings'>('overview')
  const [medlog, setMedlog] = useState<MedLogEntry[]>([])

  useEffect(() => {
    void getMedLog().then(setMedlog)
  }, [])

  return (
    <div className="page enter-anim">
      {/* Title & Subtitle */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
        Caregiver Overview
      </h1>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>
        Monitoring well-being, routines, and clinical settings.
      </p>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'family', label: '👨‍👩‍👧 Family' },
          { key: 'meds', label: '💊 Medicines' },
          { key: 'reminders', label: '🔔 Reminders' },
          { key: 'settings', label: '⚙️ Settings' },
        ].map((t) => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as typeof tab)}
              style={{
                background: isActive ? '#162436' : '#E8E1D5',
                color: isActive ? '#fff' : '#162436',
                border: isActive ? 'none' : '1px solid #D8CFBF',
                borderRadius: 20,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <OverviewSection medlog={medlog} sessions={sessions} />}
      {tab === 'family' && (
        <FamilyAdmin
          profile={profile}
          onSave={async (members) => {
            await updateProfile({
              cultural: {
                ...(profile?.cultural ?? {}),
                familyMembers: members,
              },
            })
          }}
        />
      )}
      {tab === 'meds' && <MedsAdmin meds={meds} onSave={(m) => void upsertMed(m)} onDelete={(id) => void removeMed(id)} />}
      {tab === 'reminders' && (
        <RemindersAdmin
          dailyReminders={dailyReminders}
          appointments={appointments}
          onSaveReminder={(r) => void upsertDailyReminder(r)}
          onDeleteReminder={(id) => void removeDailyReminder(id)}
          onSaveAppointment={(a) => void upsertAppointment(a)}
          onDeleteAppointment={(id) => void removeAppointment(id)}
        />
      )}
      {tab === 'settings' && (
        <SettingsSection
          profile={profile}
          updateProfile={updateProfile}
          dailyGameLimit={dailyGameLimit}
          updateDailyGameLimit={updateDailyGameLimit}
          resetAllData={resetAllData}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 3. OVERVIEW / REPORTS SECTION
// ─────────────────────────────────────────────
function OverviewSection({ medlog, sessions }: { medlog: MedLogEntry[]; sessions: any[] }) {
  const { profile: appProfile, meds } = useApp()
  const [period, setPeriod] = useState<ReportPeriod>('week')
  const [showMlDetails, setShowMlDetails] = useState(false)
  const [aiSummary, setAiSummary] = useState<CaretakerSummaryResponse | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)

  const profile = PerformanceTracker.getProfile()
  const observations = PerformanceTracker.getObservations()

  const metrics = useMemo(
    () => computePeriodMetrics(sessions, observations, period),
    [sessions, observations, period]
  )
  const domainBars = useMemo(() => computeDomainBars(profile), [profile])
  const trends = useMemo(() => computeSessionTrends(sessions), [sessions])
  const insights = useMemo(() => generatePersonalizedInsights(sessions, profile), [sessions, profile])
  const latestSummary = useMemo(() => buildLatestSessionSummary(sessions, profile), [sessions, profile])
  const recentLogs = ExplainabilityLogger.getRecentLogs(5)

  const hasSessions = sessions.length > 0
  const stabilityScore = hasSessions
    ? Math.round(
        (sessions.slice(-14).reduce((acc, s) => acc + (s.accuracy ?? 0.8), 0) /
          Math.max(sessions.slice(-14).length, 1)) *
          100
      )
    : null

  const takenLogs = medlog.filter((m) => m.status === 'taken').length
  const totalMedLogs = medlog.length
  const adherencePct = totalMedLogs > 0 ? Math.round((takenLogs / totalMedLogs) * 100) : null

  // Fetch Groq AI Summary for Caregiver
  useEffect(() => {
    let active = true
    setIsLoadingSummary(true)
    const context = PatientContextBuilder.build({ profile: appProfile, meds, sessions })

    void AIService.generateCaretakerSummary({
      sessions,
      adherencePct: adherencePct ?? 80,
      medCount: meds.length,
      context,
    }).then((res) => {
      if (active) {
        setAiSummary(res)
        setIsLoadingSummary(false)
      }
    })

    return () => {
      active = false
    }
  }, [sessions, adherencePct, meds.length, appProfile, period])

  const handleExportReport = () => {
    playTap()
    downloadReportImage({
      patientName: appProfile?.patient.name || 'Patient',
      age: appProfile?.patient.age,
      stage: appProfile?.clinical.stage || 'Mild',
      caregiverName: appProfile?.caregiver.name || 'Caregiver',
      dateStr: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      period,
      metrics,
      domainBars,
      adherencePct,
      aiHeadline: aiSummary?.headline,
      aiObservations: aiSummary?.observations,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period Filter & Export Report Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'all', label: 'All Time' },
          ].map((p) => {
            const isActive = period === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key as ReportPeriod)}
                style={{
                  background: isActive ? '#162436' : '#E8E1D5',
                  color: isActive ? '#FFFFFF' : '#162436',
                  border: isActive ? 'none' : '1px solid #D8CFBF',
                  borderRadius: 16,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Save Report Image Button */}
        <button
          type="button"
          data-testid="save-report-btn"
          onClick={handleExportReport}
          style={{
            background: '#162436',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(22, 36, 54, 0.2)',
          }}
        >
          <span>📥</span>
          <span>SAVE REPORT</span>
        </button>
      </div>

      {/* AI Caregiver Summary Card */}
      <div
        className="card"
        style={{
          borderRadius: 22,
          padding: '20px 22px',
          background: 'linear-gradient(135deg, #162436 0%, #253950 100%)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(22, 36, 54, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muga-gold-light)' }}>
              AI CAREGIVER SUMMARY
            </span>
          </div>
          {aiSummary?.isOnlineAI && (
            <span className="chip" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 600 }}>
              ⚡ Groq AI Active
            </span>
          )}
        </div>

        {isLoadingSummary && !aiSummary ? (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Analyzing recent cognitive activity and adherence patterns...
          </p>
        ) : (
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>
              {aiSummary?.headline || 'Steady Cognitive Engagement'}
            </h3>

            {/* Strengths & Observations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {aiSummary?.observations.map((obs, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--muga-gold-light)', fontSize: 14 }}>•</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>{obs}</span>
                </div>
              ))}
            </div>

            {/* Suggested Focus */}
            {aiSummary?.suggestedFocus && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>💡</span>
                <span><strong>Recommended Focus:</strong> {aiSummary.suggestedFocus}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
            Non-diagnostic observation summary intended solely for caregiver reassurance and routine tracking.
          </span>
        </div>
      </div>

      {/* Top 4-Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {/* Metric 1: Questions */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              QUESTIONS
            </span>
            <span style={{ fontSize: 16 }}>📝</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#162436', lineHeight: 1.1 }}>
            {metrics.questionsAttempted > 0 ? metrics.questionsAttempted : '0'}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0 0' }}>
            {metrics.questionsCorrect} correct
          </p>
        </div>

        {/* Metric 2: Accuracy */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ACCURACY
            </span>
            <span style={{ fontSize: 16 }}>🎯</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: metrics.accuracyPct !== null ? '#15803D' : '#162436', lineHeight: 1.1 }}>
            {metrics.accuracyPct !== null ? `${metrics.accuracyPct}%` : '—'}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0 0' }}>
            {hasSessions ? 'Task accuracy' : 'No activity yet'}
          </p>
        </div>

        {/* Metric 3: Avg. Response Time */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              AVG. RESPONSE
            </span>
            <span style={{ fontSize: 16 }}>⏱️</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#162436', lineHeight: 1.1 }}>
            {metrics.avgLatencySec !== null ? `${metrics.avgLatencySec}s` : '—'}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0 0' }}>
            {metrics.avgLatencySec !== null ? 'Per question' : 'Awaiting sessions'}
          </p>
        </div>

        {/* Metric 4: Session Time */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              SESSION TIME
            </span>
            <span style={{ fontSize: 16 }}>⌛</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#162436', lineHeight: 1.1 }}>
            {metrics.totalDurationMinutes > 0 ? `${metrics.totalDurationMinutes}m` : '0m'}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0 0' }}>
            {metrics.sessionCount} {metrics.sessionCount === 1 ? 'session' : 'sessions'}
          </p>
        </div>
      </div>

      {/* Cognitive Domain Performance Bars */}
      <DomainBarChart items={domainBars} />

      {/* Performance Over Time Line Chart */}
      <LineTrendChart
        title="Performance Over Time"
        unit="%"
        color="#15803D"
        minVal={0}
        maxVal={100}
        data={trends.map((t) => ({ label: t.sessionLabel, value: t.accuracyPct, subLabel: t.dateLabel }))}
        emptyMessage="Complete a few more sessions to see your performance trend."
      />

      {/* Response-Time Trend Line Chart */}
      <LineTrendChart
        title="Average Response Time"
        unit="s"
        color="#D97706"
        minVal={0}
        maxVal={Math.max(15, Math.ceil(Math.max(...trends.map((t) => t.avgLatencySec), 10)))}
        data={trends.map((t) => ({ label: t.sessionLabel, value: t.avgLatencySec, subLabel: t.dateLabel }))}
        emptyMessage="Average response latency across sessions will appear here."
      />

      {/* Question Difficulty Progression Line Chart */}
      <LineTrendChart
        title="Adaptive Difficulty Progression"
        unit=" lvl"
        color="#162436"
        minVal={1}
        maxVal={5}
        data={trends.map((t) => ({ label: t.sessionLabel, value: t.difficulty, subLabel: t.dateLabel }))}
        emptyMessage="Adaptive question difficulty progression across sessions will appear here."
      />

      {/* Personalized Activity Insights */}
      <div className="card" style={{ padding: '24px 20px', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#162436', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ACTIVITY INSIGHTS
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Data-Driven</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map((ins) => (
            <div
              key={ins.id}
              style={{
                background: '#F9FAFB',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                border: '1px solid #F3F4F6',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{ins.icon}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 13, color: '#162436', marginBottom: 2 }}>
                  {ins.title}
                </strong>
                <p style={{ fontSize: 12, color: '#4B5563', margin: 0, lineHeight: 1.4 }}>
                  {ins.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Session Summary (if available) */}
      {latestSummary && (
        <div className="card" style={{ padding: '24px 20px', borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#162436', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              LATEST SESSION SUMMARY
            </span>
            <span style={{ fontSize: 12, color: '#15803D', fontWeight: 700 }}>
              {latestSummary.gameName}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Accuracy</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#162436', marginTop: 2 }}>{latestSummary.accuracyPct}%</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Avg Latency</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#162436', marginTop: 2 }}>{latestSummary.avgLatencySec}s</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Duration</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#162436', marginTop: 2 }}>{latestSummary.durationMin}m</div>
            </div>
          </div>

          {latestSummary.difficultyChange && (
            <div style={{ background: '#EAF6EF', borderRadius: 12, padding: '10px 14px', borderLeft: '3px solid #15803D', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D', marginBottom: 2 }}>
                Adaptive Difficulty Adjustment: Level {latestSummary.difficultyChange.from} → Level {latestSummary.difficultyChange.to}
              </div>
              <p style={{ fontSize: 12, color: '#1E40AF', margin: 0 }}>
                {latestSummary.difficultyChange.reason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* How Activities Are Personalized (ML Explainability) */}
      <div className="card" style={{ padding: '24px 20px', borderRadius: 20 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#162436', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          HOW ACTIVITIES ARE PERSONALIZED
        </span>
        <p style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.4, margin: '0 0 14px 0' }}>
          The app looks at recent answers, response time, difficulty, and activity performance to choose an appropriate next activity.
        </p>

        <button
          type="button"
          onClick={() => setShowMlDetails((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#162436',
            textDecoration: 'underline',
            cursor: 'pointer',
            marginBottom: showMlDetails ? 14 : 0,
          }}
        >
          {showMlDetails ? 'Hide details' : 'View details'}
        </button>

        {showMlDetails && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 6 }}>Model Factors</div>
              <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                • Overall accuracy: {Math.round(profile.overallAccuracy * 100)}%<br />
                • Recent accuracy (last 5): {Math.round(profile.recentAccuracy5 * 100)}%<br />
                • Average response latency: {Math.round(profile.avgResponseTimeMs)}ms<br />
                • Consecutive correct answers: {profile.consecutiveCorrect}<br />
                • Total questions evaluated: {profile.totalAttempts}
              </div>
            </div>

            {recentLogs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                  Recent Adaptive Decisions
                </span>
                {recentLogs.map((log, idx) => (
                  <div key={idx} style={{ background: '#F9FAFB', borderRadius: 10, padding: '8px 12px', borderLeft: '3px solid #162436' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#162436' }}>
                      {log.domain.toUpperCase()} (Difficulty {log.difficulty})
                    </div>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0 0' }}>{log.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7-Day Adherence Card */}
      <div className="card" style={{ borderRadius: 24, padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#162436', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            7-DAY ADHERENCE
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: adherencePct !== null && adherencePct < 75 ? '#EF4444' : '#15803D' }}>
            {adherencePct !== null ? `${adherencePct}%` : '—'}
          </span>
        </div>

        {/* Medication Progress */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#162436', marginBottom: 6 }}>
            <span>Medication</span>
            <span>{adherencePct !== null ? `${adherencePct}%` : 'No logs yet'}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: '#E5E7EB', overflow: 'hidden' }}>
            <div style={{ width: `${adherencePct ?? 0}%`, height: '100%', background: '#162436', borderRadius: 5, transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Memory Activities Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#162436', marginBottom: 6 }}>
            <span>Memory Activities</span>
            <span>{hasSessions ? `${Math.min(100, Math.round((sessions.length / 7) * 100))}%` : '0%'}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: '#E5E7EB', overflow: 'hidden' }}>
            <div style={{ width: `${hasSessions ? Math.min(100, Math.round((sessions.length / 7) * 100)) : 0}%`, height: '100%', background: '#D97706', borderRadius: 5, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Non-Diagnostic Disclaimer */}
      <div style={{ padding: '12px 16px', background: '#F3F4F6', borderRadius: 14, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
          ℹ️ These activity metrics describe task performance within the app and are not a medical diagnosis.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 4. FAMILY ADMIN
// ─────────────────────────────────────────────
function FamilyAdmin({
  profile,
  onSave,
}: {
  profile: Profile | null
  onSave: (members: { name: string; relation: string; emoji?: string; photo?: string }[]) => Promise<void>
}) {
  const [list, setList] = useState(profile?.cultural.familyMembers ?? [])
  const [draft, setDraft] = useState<{ idx: number | null; name: string; relation: string; photo?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setList(profile?.cultural.familyMembers ?? [])
  }, [profile?.cultural.familyMembers])

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !draft) return
    try {
      const m = await import('../lib/image')
      const small = await m.resizeImageFile(f)
      setDraft((d) => ({ ...(d ?? { idx: null, name: '', relation: '' }), photo: small }))
    } catch {}
  }

  function saveMember() {
    if (!draft || !draft.name.trim()) return
    let updated: typeof list
    if (draft.idx !== null && draft.idx >= 0 && draft.idx < list.length) {
      updated = list.map((item, i) =>
        i === draft.idx
          ? { name: draft.name.trim(), relation: draft.relation || 'Family', emoji: '👩', photo: draft.photo }
          : item
      )
    } else {
      updated = [...list, { name: draft.name.trim(), relation: draft.relation || 'Family', emoji: '👩', photo: draft.photo }]
    }
    setList(updated)
    void onSave(updated)
    setDraft(null)
  }

  function deleteMember(i: number) {
    if (window.confirm(`Remove ${list[i].name}?`)) {
      const updated = list.filter((_, idx) => idx !== i)
      setList(updated)
      void onSave(updated)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {draft ? (
        /* Form Card */
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#162436', textAlign: 'center', marginBottom: 6 }}>
            {draft.idx !== null ? 'Edit Family Member' : 'Add Family Member'}
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
            Help build a familiar support network.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '2px dashed #162436',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                marginBottom: 12,
                background: '#F9F8F6',
              }}
            >
              {draft.photo ? (
                <img src={draft.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Icon name="cameraPlus" size={36} color="#162436" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e)} />

            <strong style={{ fontSize: 16, color: '#162436', marginBottom: 4 }}>Member Photo</strong>
            <span style={{ fontSize: 13, color: '#6B7280', maxWidth: 260, marginBottom: 12 }}>
              A clear, recognizable face helps with memory recall.
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileRef.current?.click()}
              style={{
                background: '#ECECF0',
                border: 'none',
                borderRadius: 12,
                padding: '6px 20px',
                fontSize: 14,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="upload" size={16} /> Select Photo
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '16px 0 20px' }} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#162436', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              FULL NAME
            </label>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: sanitizePersonName(e.target.value) })}
              placeholder="e.g. Aisha"
              style={{ borderRadius: 10, border: '1.5px solid #162436' }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#162436', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              RELATIONSHIP
            </label>
            <select
              className="input"
              value={draft.relation}
              onChange={(e) => setDraft({ ...draft, relation: e.target.value })}
              style={{ borderRadius: 10, border: '1.5px solid #162436' }}
            >
              <option value="">Select relationship...</option>
              <option value="Daughter">Daughter</option>
              <option value="Son">Son</option>
              <option value="Spouse">Spouse</option>
              <option value="Sister">Sister</option>
              <option value="Brother">Brother</option>
              <option value="Grandchild">Grandchild</option>
              <option value="Niece">Niece</option>
              <option value="Nephew">Nephew</option>
              <option value="Friend">Friend</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setDraft(null)} style={{ borderRadius: 14 }}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-cta btn-block"
              disabled={!draft.name.trim()}
              onClick={saveMember}
              style={{ borderRadius: 14 }}
            >
              Save Member
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-cta btn-block"
            onClick={() => setDraft({ idx: null, name: '', relation: 'Daughter', photo: undefined })}
            style={{ borderRadius: 14, minHeight: 48 }}
          >
            + Add Family Member
          </button>

          {list.length === 0 ? (
            <div
              className="card"
              style={{
                borderRadius: 20,
                padding: '32px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1.5px dashed #D1D5DB',
                background: '#FFFFFF',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0F0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>
                👨‍👩‍👧
              </div>
              <strong style={{ fontSize: 16, color: '#162436', marginBottom: 4 }}>No family members added yet.</strong>
              <span style={{ fontSize: 13, color: '#6B7280', maxWidth: 280 }}>
                Add family members with real photos so their faces appear in personalized reminiscence games.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.map((m, i) => (
                <div
                  key={i}
                  className="card"
                  style={{
                    borderRadius: 20,
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#ECECF0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                      }}
                    >
                      {m.photo ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👩'}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 16, color: '#162436' }}>{m.name}</strong>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{m.relation}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-pearl"
                      onClick={() => setDraft({ idx: i, name: m.name, relation: m.relation, photo: m.photo })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-pearl"
                      style={{ color: '#E53E3E' }}
                      onClick={() => deleteMember(i)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}



// ─────────────────────────────────────────────
// 5. MEDS ADMIN (3-Step Wizard: Details -> Timing -> Confirm)
// ─────────────────────────────────────────────
function MedsAdmin({ meds, onSave, onDelete }: { meds: Med[]; onSave: (m: Med) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Partial<Med> | null>(null)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [customTime, setCustomTime] = useState('')

  const startNewMed = () => {
    setDraft({
      id: `m-${Date.now()}`,
      name: '',
      dosage: '1 tablet (5mg)',
      form: 'tablet',
      food: 'after',
      instructions: 'Take with warm water',
      times: ['08:30'],
      active: true,
    })
    setWizardStep(1)
  }

  const startEditMed = (m: Med) => {
    setDraft({ ...m })
    setWizardStep(1)
  }

  const toggleTime = (t: string) => {
    if (!draft) return
    const cur = draft.times || []
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort()
    setDraft({ ...draft, times: next })
  }

  const addCustomTime = () => {
    if (!draft || !customTime.trim()) return
    const cur = draft.times || []
    if (!cur.includes(customTime.trim())) {
      setDraft({ ...draft, times: [...cur, customTime.trim()].sort() })
    }
    setCustomTime('')
  }

  const removeTime = (t: string) => {
    if (!draft) return
    setDraft({ ...draft, times: (draft.times || []).filter((x) => x !== t) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {draft ? (
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          {/* Step Indicator Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span className="chip" style={{ background: 'rgba(22,36,54,0.08)', color: 'var(--ink)', fontWeight: 700, fontSize: 11 }}>
                STEP {wizardStep} OF 3
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436', marginTop: 4, margin: 0 }}>
                {wizardStep === 1 ? 'Medicine Details' : wizardStep === 2 ? 'Schedule & Timings' : 'Confirm & Save'}
              </h3>
            </div>
            <button
              type="button"
              className="btn btn-pearl"
              onClick={() => {
                setDraft(null)
                setWizardStep(1)
              }}
              style={{ fontSize: 13 }}
            >
              Cancel
            </button>
          </div>

          {/* STEP 1: Details */}
          {wizardStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                  Medicine Name *
                </label>
                <input
                  className="input"
                  placeholder="e.g. Donepezil / Memantine"
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Dosage
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. 5mg or 1 tab"
                    value={draft.dosage ?? ''}
                    onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Form
                  </label>
                  <select
                    className="input"
                    value={draft.form ?? 'tablet'}
                    onChange={(e) => setDraft({ ...draft, form: e.target.value as MedForm })}
                  >
                    <option value="tablet">💊 Tablet</option>
                    <option value="capsule">💊 Capsule</option>
                    <option value="syrup">🧴 Syrup</option>
                    <option value="drops">💧 Drops</option>
                    <option value="injection">💉 Injection</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                  Food Relationship
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'after', label: '💊 → 🍽️ After food' },
                    { key: 'before', label: '🍽️ → 💊 Before food' },
                    { key: 'none', label: '🕒 Anytime' },
                  ].map((f) => {
                    const isSel = draft.food === f.key
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, food: f.key as any })}
                        style={{
                          flex: 1,
                          background: isSel ? '#162436' : '#F0F0F4',
                          color: isSel ? '#fff' : '#162436',
                          borderRadius: 12,
                          padding: '10px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                  Special Instructions (Optional)
                </label>
                <input
                  className="input"
                  placeholder="e.g. Take with a glass of warm water"
                  value={draft.instructions ?? ''}
                  onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                />
              </div>

              <button
                type="button"
                className="btn btn-cta btn-block"
                disabled={!draft.name?.trim()}
                onClick={() => setWizardStep(2)}
                style={{ borderRadius: 14, minHeight: 46, marginTop: 8 }}
              >
                Next: Set Timings →
              </button>
            </div>
          )}

          {/* STEP 2: Timing Selection */}
          {wizardStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 8 }}>
                  Quick Timing Presets
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { time: '08:00', label: '🌅 Morning (08:00)' },
                    { time: '13:00', label: '☀️ Afternoon (13:00)' },
                    { time: '17:00', label: '☕ Evening (17:00)' },
                    { time: '21:00', label: '🌙 Night (21:00)' },
                  ].map((p) => {
                    const isSel = (draft.times || []).includes(p.time)
                    return (
                      <button
                        key={p.time}
                        type="button"
                        onClick={() => toggleTime(p.time)}
                        style={{
                          background: isSel ? '#162436' : '#F0F0F4',
                          color: isSel ? '#fff' : '#162436',
                          borderRadius: 14,
                          padding: '12px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          border: isSel ? '2px solid #162436' : '1px solid #E5E7EB',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {isSel ? '✓ ' : '+ '} {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 6 }}>
                  Custom Dose Time (HH:MM)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="time"
                    className="input"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addCustomTime}
                    disabled={!customTime}
                    style={{ borderRadius: 12, padding: '0 16px', fontWeight: 600 }}
                  >
                    + Add Time
                  </button>
                </div>
              </div>

              {/* Active Scheduled Times */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 6 }}>
                  Scheduled Dose Alarms ({(draft.times || []).length})
                </label>
                {(draft.times || []).length === 0 ? (
                  <p className="caption" style={{ color: 'var(--error)', margin: 0 }}>
                    Please select or add at least one dose time.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(draft.times || []).map((t) => (
                      <span
                        key={t}
                        className="chip"
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 13,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        ⏰ {t}
                        <button
                          type="button"
                          onClick={() => removeTime(t)}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => setWizardStep(1)}
                  style={{ borderRadius: 14 }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn-cta btn-block"
                  disabled={(draft.times || []).length === 0}
                  onClick={() => setWizardStep(3)}
                  style={{ borderRadius: 14 }}
                >
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm & Save */}
          {wizardStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: '#F7F8FA',
                  borderRadius: 16,
                  padding: '18px 20px',
                  border: '1.5px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{formEmoji(draft.form || 'tablet')}</span>
                  <div>
                    <strong style={{ fontSize: 18, color: '#162436', display: 'block' }}>{draft.name}</strong>
                    <span className="caption" style={{ color: '#6B7280' }}>
                      {draft.dosage} · {draft.food === 'before' ? 'Before food' : draft.food === 'after' ? 'After food' : 'Anytime'}
                    </span>
                  </div>
                </div>

                {draft.instructions && (
                  <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 10px 0' }}>
                    📝 {draft.instructions}
                  </p>
                )}

                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#162436', display: 'block', marginBottom: 6 }}>
                    Daily Alarm Times:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(draft.times || []).map((t) => (
                      <span key={t} className="chip" style={{ background: '#162436', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                        🔔 {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => setWizardStep(2)}
                  style={{ borderRadius: 14 }}
                >
                  ← Edit Timings
                </button>
                <button
                  type="button"
                  className="btn btn-cta btn-block"
                  onClick={() => {
                    onSave({
                      id: draft.id || `m-${Date.now()}`,
                      name: draft.name || '',
                      dosage: draft.dosage || '1 tablet',
                      form: (draft.form as MedForm) || 'tablet',
                      food: draft.food || 'after',
                      instructions: draft.instructions,
                      times: draft.times || ['08:30'],
                      active: true,
                    })
                    setDraft(null)
                    setWizardStep(1)
                  }}
                  style={{ borderRadius: 14 }}
                >
                  ✓ Save & Activate
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-cta btn-block"
            onClick={startNewMed}
            style={{ borderRadius: 14, minHeight: 48 }}
          >
            + Add Medicine (Wizard)
          </button>

          {meds.length === 0 ? (
            <div
              className="card"
              style={{
                borderRadius: 20,
                padding: '32px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1.5px dashed #D1D5DB',
                background: '#FFFFFF',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0F0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>
                💊
              </div>
              <strong style={{ fontSize: 16, color: '#162436', marginBottom: 4 }}>No medications added yet.</strong>
              <span style={{ fontSize: 13, color: '#6B7280', maxWidth: 280 }}>
                Add medication schedules and dosages to activate offline daily alarms.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meds.map((m) => (
                <div key={m.id} className="card" style={{ borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{formEmoji(m.form)}</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 16, color: '#162436' }}>{m.name}</strong>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>
                        {m.dosage} · {m.times.join(', ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-pearl" onClick={() => startEditMed(m)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-pearl" style={{ color: '#E53E3E' }} onClick={() => onDelete(m.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 6. REMINDERS & APPOINTMENTS ADMIN
// ─────────────────────────────────────────────
function RemindersAdmin({
  dailyReminders,
  appointments,
  onSaveReminder,
  onDeleteReminder,
  onSaveAppointment,
  onDeleteAppointment,
}: {
  dailyReminders: DailyReminder[]
  appointments: AppointmentReminder[]
  onSaveReminder: (r: DailyReminder) => void
  onDeleteReminder: (id: string) => void
  onSaveAppointment: (a: AppointmentReminder) => void
  onDeleteAppointment: (id: string) => void
}) {
  const [subSection, setSubSection] = useState<'daily' | 'appointments'>('daily')
  const [editingReminder, setEditingReminder] = useState<Partial<DailyReminder> | null>(null)
  const [editingAppt, setEditingAppt] = useState<Partial<AppointmentReminder> | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setSubSection('daily')}
          style={{
            flex: 1,
            background: subSection === 'daily' ? '#162436' : '#F0F0F4',
            color: subSection === 'daily' ? '#fff' : '#162436',
            borderRadius: 14,
            minHeight: 42,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          💧 Daily Reminders ({dailyReminders.length})
        </button>
        <button
          type="button"
          onClick={() => setSubSection('appointments')}
          style={{
            flex: 1,
            background: subSection === 'appointments' ? '#162436' : '#F0F0F4',
            color: subSection === 'appointments' ? '#fff' : '#162436',
            borderRadius: 14,
            minHeight: 42,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          🩺 Appointments ({appointments.length})
        </button>
      </div>

      {/* DAILY REMINDERS SUBSECTION */}
      {subSection === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editingReminder ? (
            <div className="card" style={{ borderRadius: 20, padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#162436', marginBottom: 14 }}>
                {editingReminder.title ? `Edit ${editingReminder.title}` : 'Add Daily Reminder'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Title (English) *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Drink Warm Water / Afternoon Rest"
                    value={editingReminder.title ?? ''}
                    onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Title (Hindi)
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. गुनगुना पानी पिएं"
                    value={editingReminder.titleHi ?? ''}
                    onChange={(e) => setEditingReminder({ ...editingReminder, titleHi: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                      Time (HH:MM) *
                    </label>
                    <input
                      type="time"
                      className="input"
                      value={editingReminder.time ?? '09:00'}
                      onChange={(e) => setEditingReminder({ ...editingReminder, time: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                      Category
                    </label>
                    <select
                      className="input"
                      value={editingReminder.category ?? 'Hydration'}
                      onChange={(e) => setEditingReminder({ ...editingReminder, category: e.target.value })}
                    >
                      <option value="Hydration">Hydration 💧</option>
                      <option value="Meals">Meals 🥣</option>
                      <option value="Activity">Activity / Walk 🚶</option>
                      <option value="Rest">Rest / Sleep 😴</option>
                      <option value="Social">Call Family 📞</option>
                      <option value="Other">Other 🔔</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 6 }}>
                    Emoji Icon
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['💧', '🥣', '🚶', '😴', '📞', '🪴', '🍎', '🍵', '🔔'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEditingReminder({ ...editingReminder, emoji: em })}
                        style={{
                          fontSize: 20,
                          padding: '6px 10px',
                          borderRadius: 10,
                          background: editingReminder.emoji === em ? '#162436' : '#F0F0F4',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setEditingReminder(null)}
                    style={{ borderRadius: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-cta btn-block"
                    disabled={!editingReminder.title?.trim() || !editingReminder.time}
                    onClick={() => {
                      onSaveReminder({
                        id: editingReminder.id || `dr-${Date.now()}`,
                        title: editingReminder.title || '',
                        titleHi: editingReminder.titleHi,
                        category: editingReminder.category || 'Hydration',
                        time: editingReminder.time || '09:00',
                        emoji: editingReminder.emoji || '💧',
                        active: editingReminder.active ?? true,
                      })
                      setEditingReminder(null)
                    }}
                    style={{ borderRadius: 12 }}
                  >
                    Save Reminder
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-cta btn-block"
                onClick={() =>
                  setEditingReminder({
                    id: `dr-${Date.now()}`,
                    title: '',
                    category: 'Hydration',
                    time: '10:00',
                    emoji: '💧',
                    active: true,
                  })
                }
                style={{ borderRadius: 14, minHeight: 44 }}
              >
                + Add Daily Reminder
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dailyReminders.map((r) => (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      borderRadius: 16,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: r.active ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{r.emoji || '💧'}</span>
                      <div>
                        <strong style={{ fontSize: 15, color: '#162436', display: 'block' }}>{r.title}</strong>
                        <span className="caption" style={{ color: '#6B7280' }}>
                          ⏰ {r.time} · {r.category}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-pearl"
                        onClick={() => onSaveReminder({ ...r, active: !r.active })}
                        style={{ fontSize: 12, fontWeight: 700, color: r.active ? 'var(--success)' : '#6B7280' }}
                      >
                        {r.active ? 'Active' : 'Off'}
                      </button>
                      <button type="button" className="btn btn-pearl" onClick={() => setEditingReminder(r)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-pearl"
                        style={{ color: '#E53E3E' }}
                        onClick={() => onDeleteReminder(r.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* DOCTOR APPOINTMENTS SUBSECTION */}
      {subSection === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editingAppt ? (
            <div className="card" style={{ borderRadius: 20, padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#162436', marginBottom: 14 }}>
                {editingAppt.title ? `Edit ${editingAppt.title}` : 'Schedule Doctor Appointment'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Appointment Reason / Title *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Memory & Cognitive Checkup"
                    value={editingAppt.title ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, title: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Doctor Name *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Dr. H. Sarma (Neurologist)"
                    value={editingAppt.doctorName ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, doctorName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={editingAppt.date ?? new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditingAppt({ ...editingAppt, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                      Time *
                    </label>
                    <input
                      type="time"
                      className="input"
                      value={editingAppt.time ?? '10:30'}
                      onChange={(e) => setEditingAppt({ ...editingAppt, time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Clinic / Hospital Location
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Guwahati Neurological Center, Room 204"
                    value={editingAppt.location ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, location: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
                    Notes / Preparation
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Bring blood test reports and prescription list"
                    value={editingAppt.notes ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setEditingAppt(null)}
                    style={{ borderRadius: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-cta btn-block"
                    disabled={!editingAppt.title?.trim() || !editingAppt.doctorName?.trim() || !editingAppt.date || !editingAppt.time}
                    onClick={() => {
                      onSaveAppointment({
                        id: editingAppt.id || `appt-${Date.now()}`,
                        title: editingAppt.title || '',
                        doctorName: editingAppt.doctorName || '',
                        date: editingAppt.date || new Date().toISOString().split('T')[0],
                        time: editingAppt.time || '10:30',
                        location: editingAppt.location,
                        notes: editingAppt.notes,
                        active: editingAppt.active ?? true,
                      })
                      setEditingAppt(null)
                    }}
                    style={{ borderRadius: 12 }}
                  >
                    Save Appointment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-cta btn-block"
                onClick={() =>
                  setEditingAppt({
                    id: `appt-${Date.now()}`,
                    title: '',
                    doctorName: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '10:30',
                    active: true,
                  })
                }
                style={{ borderRadius: 14, minHeight: 44 }}
              >
                + Schedule Appointment
              </button>

              {appointments.length === 0 ? (
                <div
                  className="card"
                  style={{
                    borderRadius: 20,
                    padding: '32px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    border: '1.5px dashed #D1D5DB',
                    background: '#FFFFFF',
                  }}
                >
                  <span style={{ fontSize: 36, marginBottom: 8 }}>🩺</span>
                  <strong style={{ fontSize: 16, color: '#162436', marginBottom: 4 }}>No appointments scheduled.</strong>
                  <span style={{ fontSize: 13, color: '#6B7280', maxWidth: 280 }}>
                    Schedule doctor visits and health checkups for audible and visual alerts.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      className="card"
                      style={{
                        borderRadius: 16,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 15, color: '#162436', display: 'block' }}>{a.title}</strong>
                        <span className="caption" style={{ color: '#6B7280' }}>
                          📅 {a.date} at {a.time} · 👨‍⚕️ {a.doctorName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-pearl" onClick={() => setEditingAppt(a)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-pearl"
                          style={{ color: '#E53E3E' }}
                          onClick={() => onDeleteAppointment(a.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 7. SETTINGS SECTION (Daily Game Limit & Dual PIN Confirmation)
// ─────────────────────────────────────────────
function SettingsSection({
  profile,
  updateProfile,
  dailyGameLimit,
  updateDailyGameLimit,
  resetAllData,
}: {
  profile: Profile | null
  updateProfile: (p: Partial<Profile>) => Promise<void>
  dailyGameLimit: number
  updateDailyGameLimit: (n: number) => Promise<void>
  resetAllData: () => Promise<void>
}) {
  const [newPin, setNewPin] = useState(profile?.pin || '')
  const [confirmPin, setConfirmPin] = useState(profile?.pin || '')
  const [pinSavedMsg, setPinSavedMsg] = useState(false)
  const [festivals, setFestivals] = useState<string[]>(profile?.cultural.festivals || [])
  const [customFestival, setCustomFestival] = useState('')
  const [showOtherFestival, setShowOtherFestival] = useState(false)
  const [hobbies, setHobbies] = useState<string[]>(profile?.cultural.hobbies || [])
  const [customHobby, setCustomHobby] = useState('')
  const [showOtherHobby, setShowOtherHobby] = useState(false)
  const [savedCulturalMsg, setSavedCulturalMsg] = useState(false)

  const toggleFestival = (item: string) => {
    const next = festivals.includes(item) ? festivals.filter((f) => f !== item) : [...festivals, item]
    setFestivals(next)
  }

  const addCustomFestival = () => {
    const f = customFestival.trim()
    if (!f) return
    if (!festivals.includes(f)) {
      setFestivals((prev) => [...prev, f])
    }
    setCustomFestival('')
  }

  const toggleHobby = (item: string) => {
    const next = hobbies.includes(item) ? hobbies.filter((h) => h !== item) : [...hobbies, item]
    setHobbies(next)
  }

  const addCustomHobby = () => {
    const h = customHobby.trim()
    if (!h) return
    if (!hobbies.includes(h)) {
      setHobbies((prev) => [...prev, h])
    }
    setCustomHobby('')
  }

  const handleSaveCultural = async () => {
    if (!profile) return
    await updateProfile({
      cultural: {
        ...profile.cultural,
        festivals,
        hobbies,
      },
    })
    setSavedCulturalMsg(true)
    setTimeout(() => setSavedCulturalMsg(false), 3000)
  }

  const handleSavePin = async () => {
    if (newPin.length !== 4 || newPin !== confirmPin) return
    await updateProfile({ pin: newPin })
    setPinSavedMsg(true)
    setTimeout(() => setPinSavedMsg(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Daily Game Limit Stepper Card */}
      <div className="card" style={{ borderRadius: 24, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
          Daily Game Session Limit
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          Controls the maximum number of cognitive game sessions the patient can play each day to prevent fatigue. Resets automatically at 00:00 local time.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F0F4', borderRadius: 18, padding: '12px 18px' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#162436' }}>
            Daily Limit
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-pearl"
              disabled={dailyGameLimit <= 1}
              onClick={() => void updateDailyGameLimit(Math.max(1, dailyGameLimit - 1))}
              style={{ width: 42, height: 42, borderRadius: 12, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              −
            </button>

            <span style={{ fontSize: 20, fontWeight: 800, color: '#162436', minWidth: 32, textAlign: 'center' }}>
              {dailyGameLimit}
            </span>

            <button
              type="button"
              className="btn btn-pearl"
              disabled={dailyGameLimit >= 10}
              onClick={() => void updateDailyGameLimit(Math.min(10, dailyGameLimit + 1))}
              style={{ width: 42, height: 42, borderRadius: 12, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 2. Cultural Interests & Reminiscence Card */}
      <div className="card" style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436' }}>
          Cultural & Reminiscence Preferences
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
          Manage favorite festivals and hobbies used in memory games and personalized stories.
        </p>

        {/* Familiar Festivals */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#162436', marginBottom: 8 }}>
            Familiar Festivals
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {festivals.concat(FESTIVALS.filter((f) => !festivals.includes(f))).map((f) => {
              const isSel = festivals.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  className={`chip ${isSel ? 'chip-blue' : ''}`}
                  onClick={() => toggleFestival(f)}
                  style={{ cursor: 'pointer' }}
                >
                  {isSel ? '✓ ' : '+ '} {f}
                </button>
              )
            })}
            <button
              type="button"
              className={`chip ${showOtherFestival ? 'chip-blue' : ''}`}
              onClick={() => setShowOtherFestival((v) => !v)}
              style={{ cursor: 'pointer', borderStyle: showOtherFestival ? 'solid' : 'dashed' }}
            >
              {showOtherFestival ? '✓ Others' : '+ Others'}
            </button>
          </div>

          {showOtherFestival && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1, minHeight: 40, fontSize: 14 }}
                placeholder="Type favorite festival..."
                value={customFestival}
                onChange={(e) => setCustomFestival(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customFestival.trim()) {
                    e.preventDefault()
                    addCustomFestival()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 40, padding: '0 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                disabled={!customFestival.trim()}
                onClick={addCustomFestival}
              >
                + Add
              </button>
            </div>
          )}
        </div>

        {/* Hobbies & Pastimes */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#162436', marginBottom: 8 }}>
            Hobbies & Pastimes
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hobbies.concat(HOBBIES.filter((h) => !hobbies.includes(h))).map((h) => {
              const isSel = hobbies.includes(h)
              return (
                <button
                  key={h}
                  type="button"
                  className={`chip ${isSel ? 'chip-blue' : ''}`}
                  onClick={() => toggleHobby(h)}
                  style={{ cursor: 'pointer' }}
                >
                  {isSel ? '✓ ' : '+ '} {h}
                </button>
              )
            })}
            <button
              type="button"
              className={`chip ${showOtherHobby ? 'chip-blue' : ''}`}
              onClick={() => setShowOtherHobby((v) => !v)}
              style={{ cursor: 'pointer', borderStyle: showOtherHobby ? 'solid' : 'dashed' }}
            >
              {showOtherHobby ? '✓ Others' : '+ Others'}
            </button>
          </div>

          {showOtherHobby && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1, minHeight: 40, fontSize: 14 }}
                placeholder="Type favorite hobby..."
                value={customHobby}
                onChange={(e) => setCustomHobby(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customHobby.trim()) {
                    e.preventDefault()
                    addCustomHobby()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 40, padding: '0 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                disabled={!customHobby.trim()}
                onClick={addCustomHobby}
              >
                + Add
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSaveCultural()}
          style={{ borderRadius: 12, minHeight: 44 }}
        >
          Save Cultural Preferences
        </button>
        {savedCulturalMsg && (
          <p style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: 0 }}>
            ✓ Preferences saved successfully!
          </p>
        )}
      </div>

      {/* 3. Security & PIN Settings (Dual PIN with confirmation) */}
      <div className="card" style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436' }}>
          Security & PIN Settings
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 6 }}>
              New 4-digit PIN
            </label>
            <input
              type="password"
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#162436', marginBottom: 6 }}>
              Confirm PIN
            </label>
            <input
              type="password"
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
        </div>

        {newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin && (
          <p className="caption" style={{ color: 'var(--error)', fontWeight: 600, margin: 0 }}>
            Passwords do not match.
          </p>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          disabled={newPin.length !== 4 || newPin !== confirmPin}
          onClick={() => void handleSavePin()}
          style={{ borderRadius: 12, minHeight: 42 }}
        >
          Update PIN
        </button>

        {pinSavedMsg && (
          <p style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: 0 }}>
            ✓ Caregiver PIN updated!
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '4px 0' }} />

        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#E53E3E', marginBottom: 8 }}>Danger Zone</h4>
          <button
            type="button"
            className="btn btn-block"
            onClick={async () => {
              if (window.confirm('Reset all app data and start onboarding again?')) {
                await resetAllData()
              }
            }}
            style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 14, minHeight: 44 }}
          >
            Reset All App Data
          </button>
        </div>
      </div>
    </div>
  )
}
