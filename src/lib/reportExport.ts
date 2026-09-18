/**
 * ReportExport
 * Generates high-quality doctor/caregiver report images using HTML5 Canvas.
 * Keeps all patient health telemetry 100% on-device and allows manual download/sharing.
 */

import type { PeriodMetrics, DomainBarItem } from './reports'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export interface DoctorReportExportData {
  patientName: string
  age?: number
  stage?: string
  caregiverName?: string
  dateStr: string
  period: string
  metrics: PeriodMetrics
  domainBars: DomainBarItem[]
  adherencePct: number | null
  aiHeadline?: string
  aiObservations?: string[]
}

export function generateDoctorReportCanvas(data: DoctorReportExportData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const width = 1000
  const height = 1400
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // 1. Background
  ctx.fillStyle = '#FBF8F2' // Warm cream
  ctx.fillRect(0, 0, width, height)

  // 2. Header Banner
  ctx.fillStyle = '#162436' // Dark navy
  ctx.fillRect(40, 40, width - 80, 140)

  // Header Title
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 32px Outfit, sans-serif'
  ctx.fillText('Smriti Sathi — Cognitive Activity & Care Report', 70, 95)

  ctx.fillStyle = '#D4A017' // Muga Gold
  ctx.font = '18px Inter, sans-serif'
  ctx.fillText(`Assistance & Cognitive Engagement Summary • ${data.dateStr}`, 70, 135)

  // 3. Patient Info Card
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = '#DDD5C7'
  ctx.lineWidth = 2
  roundRect(ctx, 40, 200, width - 80, 120, 16, true, true)

  ctx.fillStyle = '#162436'
  ctx.font = 'bold 22px Outfit, sans-serif'
  ctx.fillText(`Patient: ${data.patientName || 'Anonymous'}`, 65, 245)

  ctx.fillStyle = '#4A4A4A'
  ctx.font = '16px Inter, sans-serif'
  const infoText = `Stage: ${data.stage || 'Mild'}  |  Caregiver: ${data.caregiverName || 'Family'}  |  Period: ${data.period.toUpperCase()}`
  ctx.fillText(infoText, 65, 285)

  // 4. Metric Tiles Row
  const metrics = [
    { label: 'ACTIVITIES', val: `${data.metrics.questionsAttempted}`, sub: `${data.metrics.sessionCount} sessions` },
    { label: 'ACCURACY', val: data.metrics.accuracyPct !== null ? `${data.metrics.accuracyPct}%` : '—', sub: 'overall' },
    { label: 'AVG LATENCY', val: data.metrics.avgLatencySec !== null ? `${data.metrics.avgLatencySec}s` : '—', sub: 'per task' },
    { label: 'MED ADHERENCE', val: data.adherencePct !== null ? `${data.adherencePct}%` : '—', sub: 'taken on time' },
  ]

  const tileW = (width - 80 - 3 * 16) / 4
  metrics.forEach((m, idx) => {
    const x = 40 + idx * (tileW + 16)
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = '#DDD5C7'
    roundRect(ctx, x, 340, tileW, 110, 14, true, true)

    ctx.fillStyle = '#6B7280'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.fillText(m.label, x + 16, 370)

    ctx.fillStyle = '#162436'
    ctx.font = 'bold 28px Outfit, sans-serif'
    ctx.fillText(m.val, x + 16, 410)

    ctx.fillStyle = '#6B7280'
    ctx.font = '12px Inter, sans-serif'
    ctx.fillText(m.sub, x + 16, 432)
  })

  // 5. Cognitive Domain Performance
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, 40, 470, width - 80, 420, 16, true, true)

  ctx.fillStyle = '#162436'
  ctx.font = 'bold 20px Outfit, sans-serif'
  ctx.fillText('Cognitive Task Performance by Domain', 65, 510)

  const barYStart = 550
  const maxBars = Math.min(6, data.domainBars.length)
  data.domainBars.slice(0, maxBars).forEach((item, idx) => {
    const y = barYStart + idx * 52
    ctx.fillStyle = '#162436'
    ctx.font = 'bold 14px Inter, sans-serif'
    ctx.fillText(item.label, 65, y + 14)

    // Progress bar background
    ctx.fillStyle = '#E5E7EB'
    roundRect(ctx, 350, y, 480, 18, 9, true, false)

    // Progress bar fill
    const fillWidth = Math.max(12, (item.score / 100) * 480)
    ctx.fillStyle = item.score >= 70 ? '#15803D' : item.score >= 45 ? '#D97706' : '#9E2224'
    roundRect(ctx, 350, y, fillWidth, 18, 9, true, false)

    // Score label
    ctx.fillStyle = '#162436'
    ctx.font = 'bold 14px Outfit, sans-serif'
    ctx.fillText(`${item.score}%`, 850, y + 14)
  })

  // 6. Caregiver AI Observations Card
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, 40, 910, width - 80, 320, 16, true, true)

  ctx.fillStyle = '#162436'
  ctx.font = 'bold 20px Outfit, sans-serif'
  ctx.fillText(`Caregiver & Activity Summary: ${data.aiHeadline || 'Steady Progress'}`, 65, 950)

  const obs = data.aiObservations || [
    'Patient shows active engagement in familiar cultural and musical games.',
    'Daily routine anchors and reminders recorded consistency throughout the period.',
    'Adaptive game difficulty smoothly adjusted to maintain confidence without stress.',
  ]

  obs.slice(0, 4).forEach((note, idx) => {
    ctx.fillStyle = '#374151'
    ctx.font = '15px Inter, sans-serif'
    ctx.fillText(`•  ${note}`, 65, 995 + idx * 38)
  })

  // 7. Footer Medical Disclaimer
  ctx.fillStyle = '#777778'
  ctx.font = 'italic 13px Inter, sans-serif'
  ctx.fillText(
    'Medical Disclaimer: Smriti Sathi is an assistive digital cognitive engagement tool. It does not provide medical diagnosis or treatment.',
    65,
    1340
  )

  return canvas
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = true
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}

export type ReportDeliveryMethod = 'native-share' | 'download'

export async function deliverReportImage(dataUrl: string, fileName: string): Promise<ReportDeliveryMethod> {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('The report image could not be encoded.')

  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({
      path: `reports/${fileName}`,
      data: dataUrl.slice(comma + 1),
      directory: Directory.Cache,
      recursive: true,
    })
    await Share.share({
      title: 'Smriti Sathi Care Report',
      text: 'Cognitive activity and care report generated by Smriti Sathi.',
      files: [saved.uri],
      dialogTitle: 'Save or share report',
    })
    return 'native-share'
  }

  const blob = await (await fetch(dataUrl)).blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = fileName
  a.href = objectUrl
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  return 'download'
}

export async function downloadReportImage(data: DoctorReportExportData): Promise<ReportDeliveryMethod> {
  const canvas = generateDoctorReportCanvas(data)
  const dataUrl = canvas.toDataURL('image/png')
  const safeName = (data.patientName || 'Patient').replace(/[^a-z0-9]/gi, '_')
  const fileName = `Smriti_Sathi_Care_Report_${safeName}_${new Date().toISOString().split('T')[0]}.png`
  return deliverReportImage(dataUrl, fileName)
}
