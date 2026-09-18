# MASTER SYSTEM PROMPT: SMRITI SATHI (SIH 26003) — COMPLETE TECHNICAL SPECIFICATION & PROJECT ARCHITECTURE

You are an expert full-stack systems architect, clinical software engineer, and technical documentation specialist. Below is the complete, exhaustive, ground-truth technical specification of **Smriti Sathi**, an offline-first assistive memory and cognitive engagement platform created for **Smart India Hackathon 2026 (SIH 2026)**.

---

## 1. METADATA & TEAM DETAILS
- **Team Name**: Team Vincera (`vincera`)
- **Competition**: Smart India Hackathon 2026 (SIH 2026)
- **Problem Statement ID**: SIH26003 / SIH 26003
- **Problem Statement Title**: AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)
- **Nodal Ministry / Organization**: Ministry of Development of North Eastern Region (MDoNER)
- **Theme**: MedTech / BioTech / HealthTech
- **Category**: Software
- **Target Demographics**: Older adults experiencing mild-to-moderate cognitive impairment / dementia and their primary family caregivers across the North Eastern Region of India (Assam, Meghalaya, Manipur, Mizoram, Nagaland, Tripura, Arunachal Pradesh, Sikkim).
- **Core Product Identity**: "Smriti Sathi" (with AI conversational companion named "Sathi").
- **Clinical & Legal Boundary**: Assistive, non-diagnostic digital cognitive stimulation and memory support tool. It is NOT a certified medical device, NOT a diagnostic instrument, NOT a clinical therapy replacement, and DOES NOT prescribe, alter, or recommend medication adjustments.

---

## 2. SYSTEM ARCHITECTURE & REPOSITORY COMPONENT BREAKDOWN

### 2.1 Technology Stack
- **Frontend Framework**: React 18.3.1, React DOM 18.3.1 (React Hooks, Context API, Suspense, Lazy loading)
- **Language**: TypeScript 5.6.3 (`strict: true`, ES2018 target)
- **Build Tool & Bundler**: Vite 5.4.11 (`@vitejs/plugin-react` 4.3.4, custom CSS, manual chunking for `react`/`react-dom`)
- **Hybrid Native Runtime**: Capacitor 8.5.0 (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/cli`)
- **Native Plugins**:
  - `@capacitor/local-notifications` 8.3.1 (Scheduled exact local alarms, action categories)
  - `@capacitor/filesystem` 8.1.3 (Saving canvas diagnostic summary reports)
  - `@capacitor/share` 8.0.1 (Native share sheet for reports)
  - `@capacitor/network` 8.0.1 (Network interface state monitoring)
- **Local Persistence**: Browser IndexedDB (Database: `smriti-sathi`, Version: 2) + `localStorage` (UI preferences/caches) + `CacheStorage` (`smriti-sathi-voice-v1` for synthesized TTS blobs).
- **Backend AI Proxy**:
  - Node.js native HTTP server (`server/ai-proxy.mjs`, default port: 8787, host: `0.0.0.0`)
  - Cloudflare Worker (`cloudflare/ai-proxy-worker.mjs`, Wrangler config `wrangler.toml`)
- **Testing & Quality Assurance**:
  - Vitest 4.1.11, `@testing-library/react` 16.3.2, `@testing-library/dom` 10.4.1, `@testing-library/jest-dom` 7.0.1
  - `fake-indexeddb` 6.2.5, `jsdom` 30.0.1
  - Playwright 1.62.1 (Multi-browser: Chromium, Firefox, Safari; Mobile & Tablet emulation: Pixel 7, iPhone 14, iPad Pro 11; PWA & UI-audit configs)
  - Reticle Instrumentation (`@reticlehq/react` 2.12.0, `@reticlehq/vite-plugin` 2.12.0)

### 2.2 Offline-First Design Topology
```text
┌─────────────────────────────────────────────────────────────────────────┐
│              BROWSER WEBVIEW / CAPACITOR NATIVE SHELL                   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     REACT APPLICATION SHELL                       │  │
│  │  - AppProvider Context (Global state, auth PIN, profiles)         │  │
│  │  - Custom Hash Router (/, /game/:id, /reminders, /meds, /hub)     │  │
│  │  - Layout Shell & ReminderOverlay Bridge                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│         │                                                │              │
│  ┌──────┴───────────────────────────┐     ┌──────────────┴───────────┐  │
│  │      LOCAL LOGIC (OFFLINE)       │     │   PROXY CLIENT (ONLINE)  │  │
│  │  - 23 Cultural Cognitive Games   │     │   (/api/ai endpoint)     │  │
│  │  - Mulberry32 Deterministic RNG  │     └──────────────┬───────────┘  │
│  │  - 1-PL Logistic Ability Models  │                    │              │
│  │  - 10-Feature LinUCB Recommender │                    │ HTTPS/WSS    │
│  │  - 25-Feature MLP + Guard Engine │                    ▼              │
│  │  - In-App Reminder Scheduler     │       ┌────────────────────────┐  │
│  │  - HTML5 Canvas Report Generator │       │  NODE OR CLOUDFLARE    │  │
│  │  - Web Speech TTS/ASR Fallback   │       │     AI PROXY GATEWAY   │  │
│  └──────┬───────────────────────────┘       └────────────┬───────────┘  │
│         │                                                │              │
│  ┌──────▼───────────────────────────┐       ┌────────────▼───────────┐  │
│  │        CLIENT STORAGE            │       │   EXTERNAL PROVIDERS   │  │
│  │  - IndexedDB (7 Object Stores)   │       │  - Groq Llama/Compound │  │
│  │  - LocalStorage / SessionStorage │       │  - Groq Whisper v3 ASR │  │
│  │  - CacheStorage (Voice Audio)    │       │  - Sarvam Bulbul v3 TTS│  │
│  │  - Capacitor LocalNotifications  │       │  - Azure Speech TTS    │  │
│  └──────────────────────────────────┘       └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPREHENSIVE DATA CONTRACTS & CLIENT STORAGE

### 3.1 IndexedDB Architecture (`smriti-sathi`, Version 2)
The database operates with seven distinct object stores:
1. **`kv`**: Key-value pair store for `profile`, `config`, `abilities`, `adaptive_bandit_arms`, `adaptive_question_repo`, `app_readiness`.
2. **`events`**: Append-only event ledger (auto-increment key: `id`, indexed by `ts`, `kind`). Records app interactions (`app_open`, `session_start`, `action_correct`, `action_cued`, `tap_burst`, `med_taken`, `reminder_fired`, etc.).
3. **`sessions`**: Detailed gameplay records (key: `id`, indexed by `gameId`, `startedAt`, `reward`).
4. **`meds`**: Medication catalogue (key: `id`, indexed by `active`, `name`).
5. **`medlog`**: Medication administration history (auto-increment key: `id`, indexed by `medId`, `scheduledFor`, `ts`).
6. **`daily_reminders`**: Lifestyle and routine alarms (key: `id`, indexed by `category`, `enabled`).
7. **`appointments`**: Medical, diagnostic, and family appointments (key: `id`, indexed by `date`).

### 3.2 Core TypeScript Type Definitions (`src/lib/types.ts`)
```typescript
export type Language = 'as' | 'bn' | 'brx' | 'mni' | 'hi' | 'en';

export interface PatientProfile {
  name: string;
  dob?: string;
  age?: number;
  photo?: string;
  avatar?: string;
  languagesSpoken?: Language[];
  education?: string;
}

export interface ClinicalContext {
  stage: 'mild' | 'moderate';
  diagnosisDate?: string;
  doctorContact?: string;
}

export interface CulturalProfile {
  state?: string;
  district?: string;
  community?: string;
  festivals?: string[];
  occupation?: string;
  hobbies?: string[];
  familyMembers?: { name: string; relation: string; emoji?: string; photo?: string }[];
}

export interface RoutineAnchors {
  wake?: string;      // "HH:MM"
  breakfast?: string; // "HH:MM"
  lunch?: string;     // "HH:MM"
  dinner?: string;    // "HH:MM"
  sleep?: string;     // "HH:MM"
}

export interface CaregiverInfo {
  name?: string;
  phone?: string;
  relationship?: string;
  ashaName?: string;
  ashaPhone?: string;
}

export interface Profile {
  language: Language;
  patient: PatientProfile;
  clinical: ClinicalContext;
  cultural: CulturalProfile;
  routine: RoutineAnchors;
  caregiver: CaregiverInfo;
  pin?: string;       // 4-digit PIN for Caregiver Hub access
  onboarded: boolean;
  createdAt: number;
}

export interface Med {
  id: string;
  name: string;
  photo?: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'drops' | 'injection' | 'ointment' | 'other';
  dosage: string;
  times: string[];    // Array of "HH:MM"
  food: 'before' | 'after' | 'none';
  instructions?: string;
  durationDays?: number;
  stock?: number;
  active: boolean;
}

export interface MedLogEntry {
  medId: string;
  medName: string;
  scheduledFor: string;
  ts: number;
  status: 'taken' | 'missed' | 'skipped';
  method?: 'tap' | 'slide' | 'voice';
}

export interface SessionRecord {
  id: string;
  gameId: string;
  gameName: string;
  difficulty: number;
  startedAt: number;
  endedAt: number;
  completion: number;       // 0.0 to 1.0
  accuracy: number;         // 0.0 to 1.0
  avgLatencyMs: number;
  hesitations: number;      // Taps > 4000ms delay or inactivity prompt hits
  cuesUsed: number;         // Hints/cues given
  frustrationIndex: number; // Computed metric [0.0, 1.0]
  reward: number;           // LinUCB calculated feedback
  exploration: boolean;     // LinUCB arm exploration flag
}

export interface DailyReminder {
  id: string;
  title: string;
  titleHi?: string;
  description?: string;
  time: string;             // "HH:MM"
  emoji?: string;
  enabled?: boolean;
  active?: boolean;
  days?: number[];          // 0=Sun..6=Sat (undefined = every day)
  category?: 'hydration' | 'meal' | 'activity' | 'rest' | 'routine' | 'general' | string;
}

export interface AppointmentReminder {
  id: string;
  title: string;
  doctorName?: string;
  date: string;             // "YYYY-MM-DD"
  time: string;             // "HH:MM"
  location?: string;
  notes?: string;
  enabled?: boolean;
  active?: boolean;
}

export interface ClinicalConfig {
  weights: { completion: number; accuracy: number; hesitation: number; frustration: number };
  alpha: number;             // Bandit exploration parameter (default: 0.65)
  maxSessionsPerDay: number; // Default: 3
  gracePeriodMin: number;    // Default: 30 minutes
  theme: 'light' | 'dark';
}
```

---

## 4. MULTI-TIER ADAPTIVE AI & COGNITIVE ENGINE SPECIFICATIONS

Smriti Sathi uses three distinct mathematical adaptation and personalization mechanisms running locally on device:

### 4.1 Mechanism A: Domain-Level 1-Parameter Logistic Item Response Theory (IRT)
Located in `src/lib/adaptive.ts`. Governs dynamic game difficulty in real time without neural networks.
- **Latent Trait Formulation**:
  $$P(\text{correct} \mid \theta, \text{level}) = \frac{1}{1 + \exp\bigl(-1.15 \cdot (\theta - \text{level})\bigr)}$$
- **Adaptive Step Size**:
  $$\eta = \max\left(0.18, \, \frac{1.1}{\sqrt{n + 1}}\right)$$
  where $n$ is total observed responses for the domain.
- **Parameter Update**:
  $$\theta \leftarrow \text{clamp}\Bigl(\theta + \eta \cdot \bigl(\text{outcome} - P(\text{correct})\bigr), \, -0.5, \, 4.5\Bigr)$$
- **Target Difficulty Convergence**: Converges toward a 75% target success rate:
  $$\text{targetDifficulty} = \text{round}\left(\text{clamp}\left(\theta - \frac{\ln(0.75 / 0.25)}{1.15} + 0.5, \, 0, \, 4\right)\right)$$
- **State Storage**: Debounced (400ms) persistence to IndexedDB `kv` store under key `abilities`.

### 4.2 Mechanism B: Session-Level Contextual Bandit (LinUCB) for Game Recommendation
Located in `src/lib/linucb.ts` & `src/lib/sathi.ts`. Selects the optimal game and starting difficulty on the Home screen.
- **Context Vector $x_t \in \mathbb{R}^{10}$**:
  1. `isMorning`: $t \in [05:00, 11:59]$ (0 or 1)
  2. `isAfternoon`: $t \in [12:00, 16:59]$ (0 or 1)
  3. `isEveningOrEarly`: $t \ge 17:00$ or $t < 05:00$ (0 or 1)
  4. `recentAccuracy`: Rolling mean accuracy across last 3 sessions $\in [0, 1]$
  5. `recentLatencyNorm`: Mean latency / 12,000ms $\in [0, 1]$
  6. `recentHesitationNorm`: Mean hesitation count / 8 $\in [0, 1]$
  7. `recentFrustration`: Most recent frustration index $\in [0, 1]$
  8. `adherenceRate`: Logged medication adherence rate $\in [0, 1]$ (default fallback 0.8)
  9. `phaseFraction`: Current game unlock phase / 3 $\in [0.33, 1.0]$
  10. `bias`: Constant $1.0$
- **Candidate Arm Set**: Each unlocked $(gameId, startingDifficulty)$ pair (difficulties 0 and 1).
- **Arm State**: For each arm $a$:
  - $A_a^{-1} \in \mathbb{R}^{10 \times 10}$ (Inverse covariance matrix, initialized to $I_{10}$)
  - $b_a \in \mathbb{R}^{10}$ (Accumulated reward vector, initialized to $\mathbf{0}$)
  - $n_a \in \mathbb{N}$ (Observation count)
- **Selection Policy**:
  $$\hat{\theta}_a = A_a^{-1} b_a, \quad s_a = \alpha \sqrt{x_t^T A_a^{-1} x_t}$$
  $$a^* = \arg\max_a \bigl(x_t^T \hat{\theta}_a + s_a\bigr)$$
- **Online Rank-1 Matrix Inversion (Sherman–Morrison)**:
  $$A_{\text{new}}^{-1} = A_{\text{old}}^{-1} - \frac{A_{\text{old}}^{-1} x_t x_t^T A_{\text{old}}^{-1}}{1 + x_t^T A_{\text{old}}^{-1} x_t}, \quad b_{\text{new}} = b_{\text{old}} + r_t x_t$$
- **Reward Function Formulation**:
  $$r_t = 0.4 \cdot \text{completion} + 0.4 \cdot \text{accuracy} - 0.1 \cdot \text{hesitationNorm} - 0.1 \cdot \text{frustrationIndex}$$

### 4.3 Mechanism C: Question-Level Neural Network (MLP) & Dynamic Bandit Selector
Located in `src/lib/adaptive/`. Implemented via pure TypeScript with `Float32Array` buffers (no WASM or external ML library required).
- **Architecture**: 25 Input features $\to$ Hidden Layer 1 (16 ReLU units) $\to$ Hidden Layer 2 (8 ReLU units) $\to$ Output (1 Sigmoid unit).
  - Total parameters: 561 weights/biases $(25 \times 16 + 16 + 16 \times 8 + 8 + 8 \times 1 + 1 = 561)$. Memory footprint: 2,244 bytes.
- **Input Feature Vector ($x \in \mathbb{R}^{25}$)**:
  1. `overallAccuracy`: Cumulative user accuracy
  2. `recentAccuracy3`: Accuracy across last 3 answers
  3. `recentAccuracy5`: Accuracy across last 5 answers
  4. `recentAccuracy10`: Accuracy across last 10 answers
  5. `avgLatencyNorm`: Cumulative average latency / 15,000ms
  6. `recentLatencyNorm`: Recent latency / 15,000ms
  7. `totalHintsNorm`: Cumulative hints used / 10
  8. `streakCorrectNorm`: Current consecutive correct / 5
  9. `streakIncorrectNorm`: Current consecutive incorrect / 3
  10. `candidateDifficultyNorm`: Item difficulty level / 5
  11. `domainDifficultyNorm`: Current user domain rating / 5
  12. `domainScoreNorm`: Specific domain performance score / 100
  13–20. `domainScores`: 8 Canonical domain ratings (Memory, Attention, Recognition, Recall, Sequencing, Visual Recognition, Auditory Recognition, Problem Solving) / 100
  21. `attemptCountNorm`: Attempts on candidate question / 5
  22. `recencyPenalty`: Exponential decay factor based on elapsed trials since question was last seen
  23. `frequencyLast10Norm`: Occurrences of question in last 10 trials / 3
  24. `regionalRelevance`: Regional/cultural relevance score + 0.15 cultural tag match boost
  25. `bias`: Constant $1.0$
- **Hybrid Scoring Policy**:
  $$\text{Score}(q) = 0.6 \cdot \text{LinUCBScore}(q) + 0.4 \cdot \text{MLPScore}(q)$$
- **Deterministic Clinical Safety Guards (`SafetyGuard.ts`)**:
  - *Anti-Repetition*: Eliminates immediate repeats if candidate pool contains alternatives.
  - *Failure Protection*: After 2 consecutive failures, eliminates difficulty levels 4 and 5.
  - *Frustration Ceiling*: After 3 consecutive failures, restricts selection strictly to difficulty 1 or 2.
  - *Fatigue Detection*: Latency $> 10,000\text{ms}$ forces selection toward lowest eligible difficulty.
  - *Difficulty Smoothing*: Restricts maximum upward difficulty step to $\le +1$ level.

### 4.4 Behavioral Biomarker & Heuristic Modeling
Located in `src/lib/sathi.ts`.
- **Frustration Proxy ($F_t \in [0.0, 1.0]$)**:
  $$F_t = 0.45 \cdot \left(\frac{\text{rapidTaps}}{\text{totalTaps}}\right) + 0.40 \cdot \left(\frac{\text{cuesUsed}}{\text{itemsTotal}}\right) + 0.15 \cdot \min\left(1.0, \, \frac{\text{durationSec}}{840}\right)$$
  where *rapid taps* are defined as inter-tap intervals $< 180\text{ms}$ indicating tremor, screen tapping agitation, or frantic presses.
- **Cognitive Stability Indicator (`cognitiveStabilityIndex`)**:
  Computes rolling mean reward over the last 4 completed sessions ($R_{\text{curr}}$) against the prior 4 sessions ($R_{\text{prev}}$). Trend $\Delta = R_{\text{curr}} - R_{\text{prev}}$.
  - `flourishing`: $R_{\text{curr}} \ge 0.62$ and $\Delta \ge -0.03$
  - `steady`: Intermediate performance
  - `drooping`: $\Delta \le -0.08$ or $R_{\text{curr}} < 0.35$

---

## 5. COMPLETE CATALOGUE OF 23 COGNITIVE GAMES

The games are categorized into three unlock phases. Progression rules require 4 sessions to unlock Phase 2, and 8 sessions to unlock Phase 3.

| # | ID | Game Name | Phase | Cognitive Domain | Cultural Context (NER) | Underlying Clinical / Computational Principle |
|---|---|---|---|---|---|---|
| 1 | `faces` | Faces of Home | 1 | Family & Caregiver Recognition | Caregiver photos & regional family avatars | Spaced Retrieval Therapy (SRT) with errorless option cues |
| 2 | `melodies` | Morning Melodies | 1 | Auditory & Instrument Recognition | 40+ instruments from Assam, Meghalaya, Mizoram, Nagaland, etc. | Auditory discrimination & Web Audio sound synthesis |
| 3 | `objects` | Familiar Objects | 1 | Semantic & Object Recognition | Tamol cutter, Japi hat, brass handi, tea plucking basket | Functional & episodic semantic object association |
| 4 | `tray` | Memory Tray | 1 | Visual Working Memory | Morning tea tray, local spices, seasonal fruits | Kim’s Game visual retention paradigm (10s viewing window) |
| 5 | `sequence` | Daily Life Sequence | 1 | Executive Function & Sequencing | Making Assam tea, preparing betel nut, morning prayer | Script memory & Chaining of daily life living (ADL) tasks |
| 6 | `foods` | Traditional Foods & Harvest | 1 | Cultural Semantic Memory | Khar, Masor Tenga, Bamboo Shoot Pork, Thukpa, Pitha | Semantic recognition via regional culinary descriptions |
| 7 | `pairs` | Orchid Pairs | 1 | Paired Associative Learning | Indigenous Northeast orchids (Foxtail, Blue Vanda, etc.) | Visual card matching with 2-second mismatch encoding delay |
| 8 | `sounds` | Village & Nature Sounds | 1 | Auditory Grounding | Monastic bell, hornbill call, tea garden rain, river stream | Environmental sound association & auditory grounding |
| 9 | `places` | Northeast Places & Nature | 2 | Geographic & Landmark Memory | Kaziranga, Loktak Lake, Majuli, Tawang Monastery | Landmark recognition filtered by user's home state |
| 10 | `loom` | Weaver’s Loom & Motifs | 2 | Pattern Completion & Visual Reasoning | Assamese Gamusa, Eri silk, Muga geometric textile motifs | Visual inductive reasoning and spatial matrix completion |
| 11 | `picture` | Picture Memory | 2 | Episodic Visual Recall | Detailed village market and harvest festival illustrations | Delayed visual recall of complex scenes (10s inspection) |
| 12 | `bamboo` | Bamboo Crafting | 2 | Sorting & Categorisation | Sorting raw bamboo, cane baskets, fish traps, hand fans | Taxonomic sorting & dual-category executive classification |
| 13 | `oddone` | Odd One Out | 2 | Cognitive Flexibility | Mixed Northeast fauna, crafts, instruments, vegetables | Divergent semantic categorization & intrusion detection |
| 14 | `safari` | Wildlife Safari | 2 | Visual Search & Selective Attention | Spotting one-horned rhino, red panda, clouded leopard | Visual search among high-density distractors |
| 15 | `spot` | Spot the Difference | 2 | Visual Discrimination | Twin regional drawings with subtle object transformations | Visual scanning & comparative feature extraction |
| 16 | `teawalk` | Tea Garden Walk | 3 | Spatial Working Memory & Motor Planning | Walking paths between tea bushes to the weighing shed | Grid path retention & step-by-step motor planning |
| 17 | `cheraw` | Cheraw Steps | 3 | Rhythm & Working Memory | Mizo Cheraw (bamboo dance) rhythmic clapping patterns | Auditory-motor rhythm synchronization & sequence replay |
| 18 | `phrases` | Familiar Phrases | 3 | Verbal Fluency & Semantic Completion | Traditional proverbs and idioms in Assamese, Bengali, Hindi | Cued verbal completion and lexical retrieval |
| 19 | `word` | Word Harvest | 3 | Lexical Access & Semantic Clustering | Categorical word collection (Monsoon words, kitchen herbs) | Controlled verbal association and semantic fluency |
| 20 | `bridge` | Number Bridge | 3 | Numerical Working Memory | River crossing by ordering numbered bamboo bridge planks | Numerical sequencing & forward digit-span analog |
| 21 | `market` | Market Day | 3 | Ecological Arithmetic & Budgeting | Weekly Haat market budgeting (buying ginger, rice, salt) | Everyday financial calculation within a fixed coin budget |
| 22 | `tales` | Festival Tales | 3 | Reminiscence & Emotional Narrative | Bihu, Hornbill, Chapchar Kut, Wangala festival stories | Reminiscence therapy (zero wrong answers; pure engagement) |
| 23 | `garden` | Memory Garden | 3 | Sensory Mindfulness & Relaxation | Paced breathing visualizer and gentle flower watering | Low-cognitive-load sensory calming and anxiety reduction |

---

## 6. MULTILINGUAL & CULTURAL ADAPTATION SPECIFICATION

The platform natively supports six languages with cultural token mapping:

| Code | Language | Script / Native | Regional Focus |
|---|---|---|---|
| `as` | Assamese | অসমীয়া | Assam, Brahmaputra Valley |
| `bn` | Bengali | বাংলা | Tripura, Barak Valley (Assam), West Bengal border |
| `brx`| Bodo | बड़ो (Devanagari) | Bodoland Territorial Region (BTR, Assam) |
| `mni`| Manipuri | ꯃꯩꯇꯩꯂꯣꯟ (Meitei Mayek) | Manipur, Imphal Valley |
| `hi` | Hindi | हिन्दी | North Eastern urban centers & pan-Indian fallback |
| `en` | English | English | Administrative, educational & international fallback |

### 6.1 Cultural Profile Fields
- **State Selection**: Assam, Meghalaya, Manipur, Nagaland, Mizoram, Tripura, Arunachal Pradesh, Sikkim, or Other.
- **District & Community**: User-entered cultural community (e.g., Ahom, Khasi, Mizo, Bodo, Meitei, Garo, Naga).
- **Regional Festivals**: Pre-configured multi-select options including Bihu (Rongali/Bhogali/Kongali), Hornbill, Chapchar Kut, Wangala, Losar, Ali-Aye-Ligang, Baishagu, Ningol Chakouba, Me-Dam-Me-Phi, Durga Puja.
- **Family Tree & Reminiscence**: Caregiver entry of family members with relationship labels, localized honorifics, custom photos, and avatar selections.

---

## 7. MEDICINE ADHERENCE, ROUTINES & NOTIFICATIONS

### 7.1 In-App Reminder Engine (`src/lib/reminders.ts`)
- **Grace Window**: Configured at 25 minutes (`GRACE_PERIOD_MS = 25 * 60 * 1000`).
- **Snooze Duration**: Fixed 10-minute increment (`SNOOZE_MS = 10 * 60 * 1000`).
- **Deduplication**: Cross-checks IndexedDB `medlog` to verify if a medication scheduled for a specific time slot was already taken today before firing an alarm.
- **Active Overlay**: In-app full-screen accessible modal (`ReminderOverlay.tsx`) with high-contrast text, spoken instructions, and large-touch action buttons:
  - *Taken*: Logs exact timestamp and interaction method (`tap`, `slide`, `voice`).
  - *Snooze (10 min)*: Defers alarm for 10 minutes.
  - *Dismiss/Skip*: Logs reason and updates adherence tracking.

### 7.2 Native Alarm Bridge (`src/lib/alarmService.ts`)
- Utilizes `@capacitor/local-notifications`.
- **Android Specifics**: High-importance notification channel `reminders_alarm` (`importance: 5`), custom vibration pattern, custom sound file `alarm.wav` packaged in native raw assets, exact alarm scheduling (`exact: true`).
- **iOS Specifics**: Presentation options configured for `badge`, `sound`, `banner`, `list`.
- **Hash ID Determinism**: Derives positive 32-bit integer IDs from reminder strings to prevent duplicate OS notification registrations.
- **Lifecycle Resync**: Automatically triggers reconciliation on `app_open`, foreground resumption, and window focus events.

### 7.3 Daily Plan Projection (`src/lib/dailyPlan.ts`)
- Aggregates medication schedule, routine alarms, and appointments up to 7 days ahead.
- Generates a sorted chronological timeline (capped at 6 items) showing completion states based on real-time execution.

---

## 8. CAREGIVER HUB, ANALYTICS & CANVAS REPORT EXPORT

### 8.1 Access Gate & PIN Protection (`CaregiverHub.tsx`)
- Device-local 4-digit PIN access gate preventing accidental patient navigation into settings.
- Stored locally in profile record inside IndexedDB `kv`. (Not a remote authentication or cloud session).

### 8.2 Client-Side Diagnostic Report Canvas (`src/lib/reportExport.ts`)
- Renders an ultra-high-resolution 1000 × 1400 PNG report image completely on the client using HTML5 Canvas (`OffscreenCanvas` / standard `HTMLCanvasElement`).
- **Visual Structure**:
  - *Header*: Smriti Sathi branding, patient name, age, primary language, caregiver name, and generation date.
  - *Overall Metrics Card*: Total sessions completed, average engagement score, task accuracy percentage, and average latency.
  - *Medication Adherence Gauge*: Calculated percentage from `medlog` with status breakdown (taken / missed / snoozed).
  - *Domain Performance Radar / Horizontal Bars*: Visual breakdown across memory, visual recognition, auditory discrimination, sequencing, and executive motor planning.
  - *Clinical Caution Note*: Explicitly watermarked non-diagnostic disclaimer.
- **Export Pipelines**:
  - *Browser Environment*: Triggers automatic binary PNG file download (`smriti-sathi-report-<date>.png`).
  - *Capacitor Native Shell*: Writes to `@capacitor/filesystem` (Cache directory) and triggers `@capacitor/share` native system share sheet (allowing direct sharing via WhatsApp, email, or local printing).

### 8.3 Completion Companion (`sessionCoach.ts`)
A deterministic rule engine executed immediately upon finishing a game:
1. *Insufficient Data*: Less than 1 completed item $\to$ Suggests repeating.
2. *Celebration*: Completion $\ge 0.90$ and Accuracy $\ge 0.75$ $\to$ Warm positive reinforcement.
3. *Rest Recommendation*: Duration $\ge 8\text{ min}$ or Cues $\ge 5$ $\to$ Suggests resting and drinking water.
4. *Gentle Adjustment*: Accuracy $< 0.50$, Cues $\ge 3$, or Duration $\ge 6\text{ min}$ with Accuracy $< 0.70$ $\to$ Suggests easing pace.
5. *Default*: Warm encouragement to proceed.

---

## 9. AI PROXY CONTRACT, ONLINE INTEGRATION & VOICE PIPELINES

To protect upstream API keys and prevent reverse engineering, client bundles NEVER contain provider API secrets. All online operations pass through an intermediate HTTP proxy (`server/ai-proxy.mjs` or `cloudflare/ai-proxy-worker.mjs`).

### 9.1 API Proxy Specification & Endpoints
- **Transport Security**: HTTPS mandatory in production; strict CORS origin verification against `AI_PROXY_ORIGINS`.
- **Body Payload Limits**:
  - Chat: Max 96 KiB
  - Transcription: Max 8 MiB
  - TTS: Max 16 KiB
- **Rate Limiting**: Sliding window rate-limiter allowing 30 requests per 60 seconds per IP address.
- **Upstream Timeout**: 15 seconds timeout per provider request.

#### Endpoint 1: `GET /api/ai/status`
- Probes Groq provider availability.
- Internal caching: 4 seconds for success, 3 seconds for failure.
- Returns: `{ "status": "ok", "provider": "groq", "model": "compound-mini", "features": { "chat": true, "transcribe": true, "tts": true } }`.

#### Endpoint 2: `POST /api/ai/chat`
- Sanitized message array (1 to 8 messages, max 6,000 chars per message).
- Clamped parameters: temperature $\in [0.0, 1.0]$, max output tokens $\le 700$.
- Model Allowlist: `groq/compound-mini`, `groq/compound`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`.
- Fallback: Defaults to `groq/compound-mini`.

#### Endpoint 3: `POST /api/ai/transcribe`
- Handles `multipart/form-data` containing audio recordings.
- Dispatches to Groq Whisper Large v3 (`whisper-large-v3`).
- Returns: `{ "text": "<transcribed text>" }`.

#### Endpoint 4: `POST /api/ai/tts`
- Dispatches text-to-speech synthesis to configured neural voice engines based on language code and voice profile.
- Returns raw audio stream (`audio/mpeg` or `audio/wav`).

### 9.2 Speech & Audio Synthesis Pipeline (`src/lib/voice/`)
- **Tier 1 (Neural High-Fidelity Online TTS)**:
  - **Assamese (`as`)**: Azure Speech Neural voice `as-IN-YashmitaNeural` with custom SSML (rate: -12%, gentle pitch modulation, paragraph pauses).
  - **Hindi (`hi`), Bengali (`bn`), English (`en`)**: Sarvam AI Bulbul v3 neural voice (`sarvam-bulbul-v3`, default speaker: `shreya`, pace: 0.9).
  - **Azure Alternatives on Node Proxy**: `bn-IN-TanishaaNeural` (Bengali), `hi-IN-SwaraNeural` (Hindi), `en-IN-NeerjaNeural` (Indian English).
- **Tier 2 (Local Audio Cache)**:
  - `voiceCache.ts` indexes generated audio blobs in CacheStorage under `smriti-sathi-voice-v1` using synthetic SHA-256 cache keys (`https://smriti.local/voice/<lang>/<hash>`).
- **Tier 3 (Browser Web Speech API Fallback)**:
  - SpeechSynthesisUtterance using pre-matched client OS voices: Assamese (rate 0.8), Bengali (rate 0.82), Hindi (rate 0.82), English (rate 0.86).
  - Fallback voice proxies: Bodo (`brx`) falls back to Hindi voice; Manipuri (`mni`) falls back to Bengali voice.
- **Tier 4 (Synthesized Web Audio Tones & Chimes)**:
  - Procedural sound synthesis in `src/lib/audio.ts` utilizing `AudioContext` oscillators (sine/triangle waves for gentle chimes, completion fanfares, and errorless hints).

### 9.3 Speech-to-Text Input Pipeline (`SpeechToText.ts`)
- **Primary**: Native browser `webkitSpeechRecognition` / `SpeechRecognition` when available.
- **Fallback**: MediaRecorder audio capture (max 8 seconds, 16kHz mono audio buffer) converted to Blob, sent via `POST /api/ai/transcribe` to Groq Whisper Large v3.
- Output text is sanitized, stripped of hallucinated punctuation loops, and capped at 320 characters.

---

## 10. SECURITY BOUNDARY & PRIVACY ARCHITECTURE

1. **Zero Secret Leakage Guarantee**:
   - Upstream secrets (`GROQ_API_KEY`, `SARVAM_API_KEY`, `AZURE_SPEECH_KEY`) are exclusively stored in proxy environment variables.
   - Build automation includes `scripts/check-ai-security.mjs`, which statically parses the compiled `dist/` bundle for provider URLs, credential variable patterns, authorization headers, and raw API key signatures. The build fails immediately if any secret pattern is detected.
2. **Context Sanitization & Prompt Injection Protection (`PatientContextBuilder.ts`)**:
   - Untrusted user fields (patient names, notes, custom family entries) are sanitized, length-bounded, and wrapped in strict structural delimiters inside the LLM prompt.
   - System prompts instruct the model never to accept instructions embedded in user fields and never to emit medical diagnoses or medication alterations.
3. **No Patient Logging**:
   - The proxy does not log request bodies, patient names, transcriptions, or prompt text to stdout or disk.
4. **Local Data Isolation**:
   - All patient records, medication logs, and game metrics remain strictly on the user's device in IndexedDB. No remote database or synchronization pipeline exists in this build.

---

## 11. REPOSITORY FILE & DIRECTORY INDEX

```text
/Users/naitik/smriti sathi
├── capacitor.config.json           # Native shell config (appId: com.smriti.sathi, local notifications)
├── package.json                    # Project dependencies, scripts, and engine configs
├── vite.config.ts                  # Vite build config (manualChunks, proxy /api/ai -> 8787)
├── tsconfig.json                   # TypeScript compiler configuration (strict mode)
├── wrangler.toml                   # Cloudflare Worker deployment definition
├── server/
│   └── ai-proxy.mjs                # Node.js HTTPS/HTTP proxy for Groq, Sarvam & Azure
├── cloudflare/
│   └── ai-proxy-worker.mjs         # Cloudflare Worker alternative proxy
├── scripts/
│   ├── dev.mjs                     # Development orchestrator (Vite + Node proxy concurrent runner)
│   ├── inject-sw-precache.mjs      # Production service worker manifest injection
│   └── check-ai-security.mjs       # Static security scanner preventing API key leakage
├── public/
│   ├── sw.js                       # Service Worker for offline asset caching
│   ├── alarm.wav                   # Native audio asset for medication alarms
│   └── manifest.json               # Progressive Web App manifest
├── src/
│   ├── main.tsx                    # Application bootstrap and Service Worker registration
│   ├── App.tsx                     # Top-level shell with React.lazy routes and Suspense
│   ├── router.ts                   # Custom hash-based router implementation
│   ├── state.tsx                   # Central AppProvider Context, hooks, and IndexedDB sync
│   ├── i18n.ts                     # Localization dictionary for all 6 supported languages
│   ├── screens/
│   │   ├── Home.tsx                # Dashboard, next-game recommendation, daily plan
│   │   ├── Onboarding.tsx          # 6-step accessible caregiver/patient setup flow
│   │   ├── Reminders.tsx           # Routine & appointment reminder administration
│   │   ├── Meds.tsx                # Medication tracking & adherence management
│   │   └── CaregiverHub.tsx        # PIN-gated caregiver analytics and report exports
│   ├── games/                      # Implementations of all 23 cognitive games
│   │   ├── GameHost.tsx            # Universal game container, telemetry tracker, cue engine
│   │   ├── shared.tsx              # Shared UI components, progress bars, sound triggers
│   │   ├── FacesOfHome.tsx         # Game 1: Spaced retrieval family memory
│   │   ├── MorningMelodies.tsx     # Game 2: Instrument identification
│   │   ├── FamiliarObjects.tsx     # Game 3: Semantic object identification
│   │   ├── MemoryTray.tsx          # Game 4: Kim's game visual working memory
│   │   ├── DailyLifeSequence.tsx   # Game 5: ADL routine sequencing
│   │   ├── TraditionalFoods.tsx    # Game 6: Regional culinary recall
│   │   ├── OrchidPairs.tsx         # Game 7: Paired associative orchid matching
│   │   ├── VillageSounds.tsx       # Game 8: Environmental sound recognition
│   │   ├── LandmarkRecognition.tsx # Game 9: Northeast geographic memory
│   │   ├── WeaversLoom.tsx         # Game 10: Textile pattern completion
│   │   ├── PictureMemory.tsx       # Game 11: Scene visual recall
│   │   ├── BambooCrafting.tsx      # Game 12: Craft sorting & categorization
│   │   ├── OddOneOut.tsx           # Game 13: Intrusion detection & flexibility
│   │   ├── WildlifeSafari.tsx      # Game 14: Visual search & selective attention
│   │   ├── SpotDifference.tsx      # Game 15: Comparative visual discrimination
│   │   ├── TeaGardenWalk.tsx       # Game 16: Spatial grid memory
│   │   ├── CherawSteps.tsx         # Game 17: Rhythmic motor planning
│   │   ├── FamiliarPhrases.tsx     # Game 18: Verbal fluency & proverb completion
│   │   ├── WordHarvest.tsx         # Game 19: Semantic lexical clustering
│   │   ├── NumberBridge.tsx        # Game 20: Numerical sequence ordering
│   │   ├── MarketDay.tsx           # Game 21: Ecological everyday budgeting
│   │   ├── FestivalTales.tsx       # Game 22: Reminiscence narrative engagement
│   │   └── MemoryGardenGame.tsx    # Game 23: Sensory mindfulness & relaxation
│   ├── lib/
│   │   ├── types.ts                # Authoritative TypeScript types and interfaces
│   │   ├── db.ts                   # IndexedDB wrapper functions and schema definitions
│   │   ├── games.ts                # Metadata and phase declarations for 23 games
│   │   ├── adaptive.ts             # 1-PL IRT ability estimation algorithms
│   │   ├── linucb.ts               # 10-feature LinUCB matrix operations
│   │   ├── sathi.ts                # Frustration proxy and cognitive stability metrics
│   │   ├── sessionCoach.ts         # Post-session deterministic feedback rules
│   │   ├── alarmService.ts         # Capacitor LocalNotifications bridge
│   │   ├── reminders.ts            # Web reminder reconciliation loop
│   │   ├── dailyPlan.ts            # Daily activity timeline generator
│   │   ├── reportExport.ts         # High-resolution Canvas caregiver report generator
│   │   ├── reports.ts              # Aggregator for caregiver statistics & domain scores
│   │   ├── audio.ts                # Web Audio API procedural sound synthesis
│   │   ├── rng.ts                  # Mulberry32 deterministic PRNG
│   │   ├── adaptive/               # 25-feature MLP and question bandit selector
│   │   │   ├── MLInferenceEngine.ts # Pure TypeScript 25->16->8->1 neural network
│   │   │   ├── BanditPolicy.ts      # 25-feature LinUCB arm learner
│   │   │   ├── SafetyGuard.ts       # Clinical safety rules & failure protection
│   │   │   ├── FeatureExtractor.ts  # 25-dimensional feature normalization
│   │   │   └── AdaptiveQuestionEngine.ts # Question ranking pipeline
│   │   ├── ai/                     # Cloud AI integration & proxies
│   │   │   ├── AIService.ts         # Groq LLM client with local fallbacks
│   │   │   ├── PatientContextBuilder.ts # Context sanitizer and prompt builder
│   │   │   ├── proxyClient.ts       # Failover-capable HTTP proxy client
│   │   │   └── availability.ts      # Network & proxy health monitor
│   │   └── voice/                  # Multilingual voice synthesis & STT
│   │       ├── VoiceService.ts      # Central multi-tier TTS coordinator
│   │       ├── AzureSpeechService.ts # Azure neural TTS via proxy
│   │       ├── SarvamSpeechService.ts # Sarvam Bulbul v3 TTS via proxy
│   │       ├── SpeechToText.ts      # Speech recognition & Whisper fallback
│   │       └── voiceCache.ts        # CacheStorage audio blob persistence
│   └── components/
│       ├── Layout.tsx              # Application layout & navigation bar
│       ├── ReminderOverlay.tsx     # Full-screen medication/routine alarm modal
│       ├── AIChatbot.tsx           # Voice/text floating conversational assistant
│       ├── WaveformMic.tsx         # Live audio visualizer component
│       ├── DailyPlanCard.tsx       # Timeline presentation component
│       └── caregiver/              # Caregiver analytics and admin sub-views
└── test/                           # Vitest and Playwright test suites
```

---

## 12. ACADEMIC & CLINICAL RESEARCH CITATIONS (5-YEAR WINDOW: 2021–2026)

When defending the design decisions of Smriti Sathi in academic or hackathon evaluations, reference these three recent peer-reviewed publications:

1. **Chan et al., 2024, *npj Digital Medicine***
   - *Citation*: Chan, J. Y. C., et al. (2024). Computerized cognitive training for memory functions in mild cognitive impairment or dementia: a systematic review and meta-analysis. *npj Digital Medicine*, 7(1), 1–14. [DOI: 10.1038/s41746-023-00987-5](https://doi.org/10.1038/s41746-023-00987-5).
   - *Relevance to Smriti Sathi*: Validates the multi-domain visual working memory tasks used in Orchid Pairs, Memory Tray, and Picture Memory, while establishing that digital cognitive stimulation demonstrates moderate positive effects in mild cognitive impairment (MCI).
2. **Woods et al., 2023, *Cochrane Database of Systematic Reviews***
   - *Citation*: Woods, B., et al. (2023). Cognitive stimulation to improve cognitive functioning in people with dementia. *Cochrane Database of Systematic Reviews*, Issue 1. Art. No.: CD005562. [DOI: 10.1002/14651858.CD005562.pub3](https://doi.org/10.1002/14651858.CD005562.pub3).
   - *Relevance to Smriti Sathi*: Supports the inclusion of culturally grounded reminiscence activities (Festival Tales, Faces of Home, Familiar Phrases) as effective cognitive stimulation therapy (CST) components that sustain engagement and mood without inducing failure frustration.
3. **Zuo et al., 2024, *JMIR Serious Games***
   - *Citation*: Zuo, K., et al. (2024). Electronic serious games in Alzheimer disease and mild cognitive impairment: Systematic review and meta-analysis. *JMIR Serious Games*, 12, e55785. [DOI: 10.2196/55785](https://doi.org/10.2196/55785).
   - *Relevance to Smriti Sathi*: Evaluates ecological gamification approaches in elderly populations, affirming the necessity of assistive errorless learning, dynamic difficulty adjustment (such as our 1-PL IRT and LinUCB models), and short-session caps (default 3 sessions/day).

---

## 13. TECHNICAL BOUNDARIES, ETHICAL CONSTRAINTS & ROADMAP

### 13.1 What is Shipped & Operational Now
- Full offline capability for all 23 cognitive games, local persistence, and deterministic RNG.
- Dynamic difficulty adjustment via 1-PL IRT and home screen game recommendation via 10-feature LinUCB.
- Full medication, routine, and appointment reminder loop with Capacitor native local alarms.
- High-resolution client-side canvas caregiver summary report generation and native sharing.
- Multi-tier speech synthesis with Azure and Sarvam neural speech via secure server proxy.
- Static client-side security scanner verifying zero leak of API keys.

### 13.2 Explicit Implementation Boundaries & Future Roadmap
- *No Cloud Patient Database*: All records are strictly on-device in IndexedDB. Multi-device sync, CRDT engines, or cloud accounts are planned future roadmap items.
- *Local Access Control Only*: The Caregiver PIN is a local UI access gate, not an authenticated OAuth/JWT session or biometric identity verification.
- *Assistance, Not Diagnosis*: The application explicitly disclaims diagnostic authority. The cognitive stability index and frustration proxy are engagement heuristics, not clinical biomarkers.
- *ASHA Community Integration*: ASHA worker contact fields are stored as local directory data; there is no live tele-health or MDoNER public health network integration in this prototype build.
