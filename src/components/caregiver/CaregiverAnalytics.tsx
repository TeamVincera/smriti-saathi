import type { SessionRecord } from '../../lib/types'
import { LineTrendChart, DomainBarChart } from '../Charts'
import { PerformanceTracker } from '../../lib/adaptive/PerformanceTracker'
import { ExplainabilityLogger } from '../../lib/adaptive/ExplainabilityLogger'
import {
  computeDomainBars,
  computeSessionTrends,
  generatePersonalizedInsights,
  buildLatestSessionSummary,
} from '../../lib/reports'

type Translate = (key: string, vars?: Record<string, string | number>) => string

interface CaregiverAnalyticsProps {
  domainBars: ReturnType<typeof computeDomainBars>
  trends: ReturnType<typeof computeSessionTrends>
  insights: ReturnType<typeof generatePersonalizedInsights>
  latestSummary: ReturnType<typeof buildLatestSessionSummary>
  profile: ReturnType<typeof PerformanceTracker.getProfile>
  recentLogs: ReturnType<typeof ExplainabilityLogger.getRecentLogs>
  sessions: SessionRecord[]
  adherencePct: number | null
  showMlDetails: boolean
  onToggleMlDetails: () => void
  t: Translate
}

/** The non-mutating analytics/report portion of the caregiver dashboard. */
export function CaregiverAnalytics({
  domainBars,
  trends,
  insights,
  latestSummary,
  profile,
  recentLogs,
  sessions,
  adherencePct,
  showMlDetails,
  onToggleMlDetails,
  t,
}: CaregiverAnalyticsProps) {
  const hasSessions = sessions.length > 0

  return (
    <>
      <DomainBarChart items={domainBars} />

      <LineTrendChart
        title={t('hub_trend_perf')}
        unit="%"
        color="var(--success)"
        minVal={0}
        maxVal={100}
        data={trends.map((trend) => ({ label: trend.sessionLabel, value: trend.accuracyPct, subLabel: trend.dateLabel }))}
        emptyMessage="Complete a few more sessions to see your performance trend."
      />

      <LineTrendChart
        title={t('hub_trend_latency')}
        unit="s"
        color="var(--warn)"
        minVal={0}
        maxVal={Math.max(15, Math.ceil(Math.max(...trends.map((trend) => trend.avgLatencySec), 10)))}
        data={trends.map((trend) => ({ label: trend.sessionLabel, value: trend.avgLatencySec, subLabel: trend.dateLabel }))}
        emptyMessage="Average response latency across sessions will appear here."
      />

      <LineTrendChart
        title={t('hub_trend_difficulty')}
        unit=" lvl"
        color="var(--ink)"
        minVal={1}
        maxVal={5}
        data={trends.map((trend) => ({ label: trend.sessionLabel, value: trend.difficulty, subLabel: trend.dateLabel }))}
        emptyMessage="Adaptive question difficulty progression across sessions will appear here."
      />

      <section className="card caregiver-report-card" aria-labelledby="caregiver-activity-insights">
        <div className="caregiver-report-card-heading">
          <h3 id="caregiver-activity-insights">{t('hub_activity_insights')}</h3>
          <span>{t('hub_data_driven')}</span>
        </div>
        <div className="caregiver-insight-list">
          {insights.map((insight) => (
            <div key={insight.id} className="caregiver-insight-item">
              <span aria-hidden="true">{insight.icon}</span>
              <div>
                <strong>{insight.title}</strong>
                <p>{insight.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {latestSummary && (
        <section className="card caregiver-report-card" aria-labelledby="caregiver-latest-session">
          <div className="caregiver-report-card-heading">
            <h3 id="caregiver-latest-session">{t('hub_latest_session')}</h3>
            <span className="caregiver-latest-game">{latestSummary.gameName}</span>
          </div>

          <div className="caregiver-latest-metrics">
            <div><span>Accuracy</span><strong>{latestSummary.accuracyPct}%</strong></div>
            <div><span>Avg Latency</span><strong>{latestSummary.avgLatencySec}s</strong></div>
            <div><span>Duration</span><strong>{latestSummary.durationMin}m</strong></div>
          </div>

          {latestSummary.difficultyChange && (
            <div className="caregiver-difficulty-note">
              <strong>Adaptive Difficulty Adjustment: Level {latestSummary.difficultyChange.from} → Level {latestSummary.difficultyChange.to}</strong>
              <p>{latestSummary.difficultyChange.reason}</p>
            </div>
          )}
        </section>
      )}

      <section className="card caregiver-report-card" aria-labelledby="caregiver-personalization">
        <h3 id="caregiver-personalization">{t('hub_how_personalized')}</h3>
        <p className="caregiver-report-description">{t('hub_how_personalized_sub')}</p>
        <button type="button" className="caregiver-details-toggle" onClick={onToggleMlDetails} aria-expanded={showMlDetails}>
          {showMlDetails ? t('hub_hide_details') : t('hub_view_details')}
        </button>

        {showMlDetails && (
          <div className="caregiver-details" id="caregiver-model-details">
            <div className="caregiver-detail-box">
              <strong>{t('hub_model_factors')}</strong>
              <p>
                • Overall accuracy: {Math.round(profile.overallAccuracy * 100)}%<br />
                • Recent accuracy (last 5): {Math.round(profile.recentAccuracy5 * 100)}%<br />
                • Average response latency: {Math.round(profile.avgResponseTimeMs)}ms<br />
                • Consecutive correct answers: {profile.consecutiveCorrect}<br />
                • Total questions evaluated: {profile.totalAttempts}
              </p>
            </div>

            {recentLogs.length > 0 && (
              <div className="caregiver-decision-list">
                <span>{t('hub_recent_decisions')}</span>
                {recentLogs.map((log, index) => (
                  <div key={index} className="caregiver-decision-item">
                    <strong>{log.domain.toUpperCase()} (Difficulty {log.difficulty})</strong>
                    <p>{log.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card caregiver-report-card" aria-labelledby="caregiver-adherence">
        <div className="caregiver-report-card-heading">
          <h3 id="caregiver-adherence">{t('hub_7day_adherence')}</h3>
          <strong className={adherencePct !== null && adherencePct < 75 ? 'caregiver-adherence-low' : 'caregiver-adherence-good'}>
            {adherencePct !== null ? `${adherencePct}%` : '—'}
          </strong>
        </div>

        <div className="caregiver-progress-row">
          <div><span>{t('hub_adherence_meds')}</span><span>{adherencePct !== null ? `${adherencePct}%` : '—'}</span></div>
          <div className="caregiver-progress-track" role="progressbar" aria-label={t('hub_adherence_meds')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={adherencePct ?? 0}>
            <div style={{ width: `${adherencePct ?? 0}%` }} />
          </div>
        </div>

        <div className="caregiver-progress-row">
          <div><span>{t('hub_adherence_activities')}</span><span>{hasSessions ? `${Math.min(100, Math.round((sessions.length / 7) * 100))}%` : '0%'}</span></div>
          <div className="caregiver-progress-track" role="progressbar" aria-label={t('hub_adherence_activities')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasSessions ? Math.min(100, Math.round((sessions.length / 7) * 100)) : 0}>
            <div className="caregiver-progress-activity" style={{ width: `${hasSessions ? Math.min(100, Math.round((sessions.length / 7) * 100)) : 0}%` }} />
          </div>
        </div>
      </section>

      <aside className="caregiver-disclaimer">
        <p>{t('hub_disclaimer')}</p>
      </aside>
    </>
  )
}
