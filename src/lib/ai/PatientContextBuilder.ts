/**
 * PatientContextBuilder
 * Builds minimal, privacy-compliant context for Groq AI interactions.
 * Strictly avoids sending raw database dumps or unnecessary private records.
 */

import type { Profile, Med, DailyReminder, AppointmentReminder, SessionRecord } from '../types'

export interface MinimalPatientContext {
  name: string
  language: string
  dementiaStage?: string
  todayMeds: { name: string; time: string; food: string }[]
  todayReminders: { title: string; time: string; category?: string }[]
  upcomingAppointment?: { title: string; date: string; time: string; doctorName?: string }
  recentGames: { name: string; accuracyPct: number }[]
  caregiverRelationship?: string
}

export class PatientContextBuilder {
  public static build(params: {
    profile: Profile | null
    meds?: Med[]
    dailyReminders?: DailyReminder[]
    appointments?: AppointmentReminder[]
    sessions?: SessionRecord[]
  }): MinimalPatientContext {
    const { profile, meds = [], dailyReminders = [], appointments = [], sessions = [] } = params
    const todayStr = new Date().toISOString().split('T')[0]

    // Active meds
    const todayMeds = meds
      .filter((m) => m.active)
      .flatMap((m) =>
        m.times.map((t) => ({
          name: m.name,
          time: t,
          food: m.food === 'before' ? 'before food' : m.food === 'after' ? 'after food' : 'anytime',
        }))
      )
      .slice(0, 5)

    // Active reminders
    const todayReminders = dailyReminders
      .filter((r) => r.active)
      .map((r) => ({
        title: r.title,
        time: r.time,
        category: r.category,
      }))
      .slice(0, 5)

    // Next upcoming appointment
    const nextAppt = appointments
      .filter((a) => a.active && a.date >= todayStr)
      .sort((x, y) => `${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`))[0]

    // Last 3 sessions
    const recentGames = sessions
      .slice(-3)
      .map((s) => ({
        name: s.gameName,
        accuracyPct: Math.round(s.accuracy * 100),
      }))

    return {
      name: profile?.patient.name || 'Friend',
      language: profile?.language || 'en',
      dementiaStage: profile?.clinical.stage || 'mild',
      todayMeds,
      todayReminders,
      upcomingAppointment: nextAppt
        ? {
            title: nextAppt.title,
            date: nextAppt.date,
            time: nextAppt.time,
            doctorName: nextAppt.doctorName,
          }
        : undefined,
      recentGames,
      caregiverRelationship: profile?.caregiver.relationship,
    }
  }

  public static toSystemPrompt(ctx: MinimalPatientContext): string {
    const medList = ctx.todayMeds.length
      ? ctx.todayMeds.map((m) => `${m.name} at ${m.time} (${m.food})`).join(', ')
      : 'None'

    const reminderList = ctx.todayReminders.length
      ? ctx.todayReminders.map((r) => `${r.title} at ${r.time}`).join(', ')
      : 'None'

    const apptInfo = ctx.upcomingAppointment
      ? `${ctx.upcomingAppointment.title} on ${ctx.upcomingAppointment.date} at ${ctx.upcomingAppointment.time} with ${ctx.upcomingAppointment.doctorName || 'Doctor'}`
      : 'None scheduled'

    const recentPlay = ctx.recentGames.length
      ? ctx.recentGames.map((g) => `${g.name} (${g.accuracyPct}% score)`).join(', ')
      : 'None today'

    return `You are Sathi, a warm, patient, and caring cognitive companion designed for elderly individuals and people living with mild dementia or memory challenges in North-Eastern India.

CURRENT PATIENT CONTEXT:
- Patient Name: ${ctx.name}
- Preferred Language: ${ctx.language}
- Today's Stored Medicines: ${medList}
- Today's Stored Reminders: ${reminderList}
- Stored Upcoming Appointment: ${apptInfo}
- Recent Games Completed: ${recentPlay}

STRICT MEDICAL SAFETY & COMMUNICATION RULES:
1. NEVER diagnose illnesses, predict clinical disease progression, or suggest medical treatments.
2. NEVER advise changing, stopping, or taking medication dosages. If asked about taking medication now, cite stored records cautiously (e.g. "Your caregiver recorded that your ${ctx.todayMeds[0]?.name || 'medicine'} is scheduled for ${ctx.todayMeds[0]?.time || 'later'}. Please check with your caregiver").
3. NEVER invent appointments, medicines, or health data not listed above.
4. Keep sentences short (1-2 sentences), gentle, clear, encouraging, and respectful.
5. Answer in the patient's preferred language (${ctx.language === 'hi' ? 'Hindi' : ctx.language === 'as' ? 'Assamese' : ctx.language === 'bn' ? 'Bengali' : ctx.language === 'mni' ? 'Manipuri' : 'English'}).
6. If the user asks general or memory questions, respond with warmth and reassuring clarity.`
  }
}
