export type Language = 'as' | 'bn' | 'brx' | 'mni' | 'hi' | 'en'

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'brx', label: 'Bodo', native: 'बड़ो' },
  { code: 'mni', label: 'Manipuri', native: 'ꯃꯩꯇꯩꯂꯣꯟ' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'en', label: 'English', native: 'English' },
]

export interface PatientProfile {
  name: string
  dob?: string
  age?: number
  photo?: string
  avatar?: string
  languagesSpoken?: Language[]
  education?: string
}

export interface ClinicalContext {
  stage: 'mild' | 'moderate'
  diagnosisDate?: string
  doctorContact?: string
}

export interface CulturalProfile {
  state?: string
  district?: string
  community?: string
  festivals?: string[]
  occupation?: string
  hobbies?: string[]
  familyMembers?: { name: string; relation: string; emoji?: string; photo?: string }[]
}

export interface RoutineAnchors {
  wake?: string
  breakfast?: string
  lunch?: string
  dinner?: string
  sleep?: string
}

export interface CaregiverInfo {
  name?: string
  phone?: string
  relationship?: string
  ashaName?: string
  ashaPhone?: string
}

export interface Profile {
  language: Language
  patient: PatientProfile
  clinical: ClinicalContext
  cultural: CulturalProfile
  routine: RoutineAnchors
  caregiver: CaregiverInfo
  pin?: string
  onboarded: boolean
  createdAt: number
}

export type MedForm = 'tablet' | 'capsule' | 'syrup' | 'drops' | 'injection' | 'ointment' | 'other'

export interface Med {
  id: string
  name: string
  photo?: string
  form: MedForm
  dosage: string
  times: string[]
  food: 'before' | 'after' | 'none'
  instructions?: string
  durationDays?: number
  stock?: number
  active: boolean
}

export type MedStatus = 'taken' | 'missed' | 'skipped'

export interface MedLogEntry {
  medId: string
  medName: string
  scheduledFor: string
  ts: number
  status: MedStatus
  method?: 'tap' | 'slide' | 'voice'
}

export type EventKind =
  | 'app_open'
  | 'onboarding_step'
  | 'onboarding_done'
  | 'baseline_result'
  | 'session_start'
  | 'action_correct'
  | 'action_cued'
  | 'action_wrong'
  | 'hesitation_cue'
  | 'tap_burst'
  | 'session_end'
  | 'reminder_fired'
  | 'reminder_snoozed'
  | 'reminder_completed'
  | 'reminder_dismissed'
  | 'med_taken'
  | 'med_logged'
  | 'alert_raised'
  | 'sync_stub'

export interface LedgerEvent {
  ts: number
  kind: EventKind
  gameId?: string
  data?: Record<string, unknown>
}

export interface SessionRecord {
  id: string
  gameId: string
  gameName: string
  difficulty: number
  startedAt: number
  endedAt: number
  completion: number
  accuracy: number
  avgLatencyMs: number
  hesitations: number
  cuesUsed: number
  frustrationIndex: number
  reward: number
  exploration: boolean
}

export interface ArmState {
  Ainv: number[][]
  b: number[]
  n: number
}

export interface SrtItem {
  key: string
  level: number
  lastSeenTs?: number
}

export interface DailyReminder {
  id: string
  title: string
  titleHi?: string
  description?: string
  time: string // "HH:MM"
  emoji?: string
  enabled?: boolean
  active?: boolean
  days?: number[] // 0=Sun, 1=Mon, ..., 6=Sat (undefined = every day)
  category?: 'hydration' | 'meal' | 'activity' | 'rest' | 'routine' | 'general' | string
}

export interface AppointmentReminder {
  id: string
  title: string
  doctorName?: string
  date: string // "YYYY-MM-DD"
  time: string // "HH:MM"
  location?: string
  notes?: string
  enabled?: boolean
  active?: boolean
}

export interface AppAlert {
  id: string
  ts: number
  severity: 'info' | 'watch' | 'urgent'
  titleKey: string
  detail: string
}

export interface ClinicalConfig {
  weights: { completion: number; accuracy: number; hesitation: number; frustration: number }
  alpha: number
  maxSessionsPerDay: number
  gracePeriodMin: number
  theme: 'light' | 'dark'
}

export const DEFAULT_CONFIG: ClinicalConfig = {
  weights: { completion: 0.4, accuracy: 0.4, hesitation: 0.1, frustration: 0.1 },
  alpha: 0.65,
  maxSessionsPerDay: 3,
  gracePeriodMin: 30,
  theme: 'light',
}

