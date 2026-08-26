# Product Requirements Document (PRD)

## Product Name: Smriti Sathi — AI-Driven Cognitive Therapeutics for Dementia

**Version:** 1.0
**Date:** August 25, 2026
**Status:** Draft
**Platform:** Android (mobile-first), low-compute devices
**Region:** North Eastern Region (NER), India

> **Note:** For medical advice or diagnosis, consult a professional. This product is an assistive digital therapeutic tool, not a diagnostic device.

---

## 1. Executive Summary

Smriti Sathi is a culturally localized, AI-powered cognitive gaming and memory assistance platform designed for elderly patients living with dementia and Mild Cognitive Impairment (MCI) in rural and remote areas of North Eastern India. The app operates fully **offline**, runs smoothly on **low-compute smartphones**, and provides continuous, adaptive cognitive stimulation through culturally familiar games, medicine reminders, and an AI companion that personalizes every session.

---

## 2. Problem Statement

- Rising dementia/MCI prevalence among the aging NER population.
- Severe shortage of PHCs/CHCs and neurological specialists in Assam, Meghalaya, Tripura, Arunachal Pradesh, Nagaland, Mizoram, Manipur.
- Geographic isolation accelerates cognitive decline, raises anxiety, and burdens caregivers and ASHA workers.
- Intermittent connectivity and legacy/budget Android devices rule out cloud-dependent solutions.

---

## 3. Goals & Objectives

| Goal | Description |
|---|---|
| G1 | Deliver daily cognitive stimulation via culturally relevant games |
| G2 | Support medication adherence through an easy, voice-assisted reminder system |
| G3 | Personalize therapy using an on-device AI that adapts difficulty, sequence, and feedback in real time |
| G4 | Ensure 100% offline functionality with zero data loss |
| G5 | Minimize patient frustration; maximize engagement and dignity (Errorless Learning) |
| G6 | Provide caregiver/ASHA visibility through telemetry sync when connectivity allows |

### Non-Goals (v1)
- Diagnosis of dementia or any medical condition.
- Cloud-only features; real-time multiplayer; social feeds.
- iOS support (deferred to v2).

---

## 4. Target Users & Personas

| Persona | Description | Primary Needs |
|---|---|---|
| **Patient (Primary)** | Elderly (60+), mild–moderate dementia/MCI, low digital literacy, possible vision/motor impairment, speaks Assamese/Bengali/Bodo/Manipuri/etc. | Simple UI, large touch targets, local language voice guidance, no-fail interactions |
| **Family Caregiver** | Adult child/spouse managing daily care | Medication logging, progress feedback, alerts |
| **ASHA Worker** | Community health worker visiting households | Offline P2P telemetry pull, adherence overview |

---

## 5. Feature Requirements

### 5.1 Feature F0 — First-Launch Onboarding & Patient Profile

**Description:** On first start, the app collects all essential patient information through a caregiver-assisted, guided wizard. All questions are asked aloud in the selected local language while displaying large text.

**Requirements:**
- FR-0.1: Language selection first (Assamese, Bengali, Bodo, Manipuri, Hindi, English) with audio playback of each option.
- FR-0.2: Collect: patient name, age, photo (or avatar), languages spoken, education background.
- FR-0.3: Collect clinical context: dementia stage (mild/moderate), existing diagnosis date (optional), current medications list, doctor/PHC contact.
- FR-0.4: Collect cultural/personal profile for game localization: home state/district, community/tribe (optional), familiar festivals, occupation history, hobbies, family photos (for "Faces of Home" game).
- FR-0.5: Collect daily routine anchors: wake time, meal times, medicine schedules, sleep time.
- FR-0.6: Collect caregiver details: name, phone, relationship; ASHA worker details (optional).
- FR-0.7: Run a short (5 min) **Baseline Assessment** using 2–3 Phase-1 games to seed AI parameters (reaction time, accuracy, interaction latency).
- FR-0.8: Every field skippable except name + language; nothing blocks completion.
- FR-0.9: Profile editable later only via a caregiver PIN gate ("Settings" hidden from main screen).
- FR-0.10: All data stored locally (SQLite); no account/server required at setup.

**Acceptance Criteria:**
- A new user can complete onboarding in under 10 minutes.
- App never shows an error state during onboarding; skipped fields get sensible defaults.
- Baseline results automatically configure initial game difficulty.

---

### 5.2 Feature F1 — Cognitive Games Section

**Description:** A library of culturally localized therapeutic games organized in three adaptive phases. The AI selects which game appears next (see F3).

#### Phase 1: Familiarization & Baseline

| Game | Cognitive Domain | NER Cultural Integration | Therapeutic Principle |
|---|---|---|---|
| Faces of Home | Episodic memory & recognition | Family photos, ASHA worker profiles | Spaced Retrieval Therapy — expanding recall intervals |
| Morning Melodies | Auditory memory & attention | Bihu dhol, Wangala drums, Mising flutes | Errorless Learning — correct image gently pulses if delayed |
| Tea Garden Walk | Visuospatial navigation | Assam tea estates | CST — trace path, collect tea leaves |
| Daily Life Sequence | Executive function (sequencing) | Tamol (betel nut)/tea preparation steps | Errorless Learning — items snap only into correct slots |

#### Phase 2: Targeted Cognitive Training

| Game | Cognitive Domain | NER Integration | Principle |
|---|---|---|---|
| Weaver's Loom | Pattern recognition | Gamosa, Naga shawl, Mizo Puan motifs | CST — find missing pattern segment |
| Bamboo Crafting | Object recognition & sorting | Baskets, sieves | EL — pieces highlight/guide |
| Cheraw Steps | Rhythmic attention & timing | Mizo Cheraw dance | Sustained attention — tap with bamboo rhythm |
| Wildlife Safari | Visual search & concentration | Rhino, Mithun, Hornbill | Visual discrimination in forest scenes |

#### Phase 3: Maintenance, Emotion & Social Connection

| Game | Cognitive Domain | NER Integration | Principle |
|---|---|---|---|
| Festival Tales | Verbal memory & comprehension | Bodo/Khasi/Garo/Bhutia folklore audio stories | Reminiscence — opinion-based prompts (no right/wrong) |
| Market Day | Calculation & working memory | Virtual local bazaar | Executive function — budget adjusts to avoid math anxiety |
| Memory Garden | Emotional regulation | Native orchids garden | Positive reinforcement — garden flourishes with completed reminders/meds |

**Functional Requirements:**
- FR-1.1: One-tap access to exactly **one recommended game** on the Home screen ("Today's Game"). A secondary "More Games" grid shows unlocked games.
- FR-1.2: Each session lasts 7–12 minutes; max 3 sessions/day suggested by AI.
- FR-1.3: Instructions permanently pinned at top of screen, spoken aloud, replayable via speaker button.
- FR-1.4: Errorless Learning guardrails: hesitation > 4 seconds triggers gentle visual/audio cue; no failure states, no red X, no buzzers.
- FR-1.5: SRT engine tracks per-item recall intervals (expand on success, drop back one step on miss).
- FR-1.6: Every interaction logged locally: accuracy, latency, hesitation count, cue usage, completion, frustration signals (tap force/rate).
- FR-1.7: Session end shows warm, non-judgmental praise animation ("You did wonderfully!").

**Acceptance Criteria:**
- Patient can complete any game with zero reading ability (voice-guided).
- No game can present a "Game Over / Failed" state.
- Hesitation cue fires within 4s consistently across all games.

---

### 5.3 Feature F2 — Medicine Reminder Section

**Description:** A dead-simple medication logger and reminder system woven into gameplay rewards (Memory Garden integration).

**Requirements:**
- FR-2.1: Caregiver adds medicines: name, dose form (tablet/capsule/syrup/injection photo), dosage, timings (morning/afternoon/evening/night or exact clock times), duration, food instructions (before/after meal — shown as plate icons).
- FR-2.2: Medicine entries created via large-photo cards: photo of the actual medicine strip/bottle captured by camera + big text label.
- FR-2.3: Reminder fires as full-screen gentle alert: spoken prompt in patient's language + medicine photo + green check button (min 96px). Snooze = single "Remind me in 10 minutes" button.
- FR-2.4: Patient confirms by tapping the check OR saying "Yes" (offline voice recognition). Confirmation waters the plant in Memory Garden (positive reinforcement loop).
- FR-2.5: Missed-dose handling: after grace period, app notifies caregiver (if configured) and logs event; never scolds the patient.
- FR-2.6: Simple weekly adherence view for caregiver: taken / missed / skipped per medicine (icon-based calendar, color + icon dual-coded).
- FR-2.7: Refill tracker: optional count of remaining doses with low-stock spoken warning to caregiver.
- FR-2.8: Hydration/activity reminders configurable alongside meds (feeds Memory Garden too).
- FR-2.9: Reminders fire fully offline via local notifications/alarm manager with reboot persistence.

**Acceptance Criteria:**
- Adding a medicine takes < 90 seconds for a caregiver.
- Reminder is dismissible by a patient with tremors without mis-taps (no double-confirm dialogs).
- Adherence log survives device restart and offline periods indefinitely.

---

### 5.4 Feature F3 — AI Companion Mode ("Sathi")

**Description:** An always-on, on-device AI layer that observes the patient, gives rich feedback, and continuously customizes plans, exercises, and games. Built on a Contextual Multi-Armed Bandit using **LinUCB**, chosen over deep RL/Thompson Sampling for determinism, auditability, and O(d²) Sherman-Morrison updates suited to Cortex-A53-class CPUs.

**Requirements:**
- FR-3.1: **Next-Game Prediction:** At each decision point, score every available game/difficulty arm:
 `a_t = argmax( x·θ̂_a + α·√(xᵀ A_a⁻¹ x) )`; queue winner immediately. Works 100% offline.
- FR-3.2: **Context vector x_t** includes: time-of-day bucket (sundowning awareness), last-3-session accuracy/reaction/completion, hesitation counts, Frustration Index (tap dynamics + optional front-camera emotion micro-expressions via INT8-quantized TFLite model), sleep/reminder adherence signals, phase progression level.
- FR-3.3: **Composite reward:** `r = w1·Completion + w2·UnpromptedAccuracy − w3·ExcessiveHesitation − w4·FrustrationIndex`. Weights configurable by clinical config pulled during sync.
- FR-3.4: **Dynamic Difficulty Adjustment:** Within each game, item complexity, board size, contrast clutter, and speed scale up/down per performance; de-escalation is instant (e.g., high Frustration Index → next session becomes Festival Tales reminiscence module).
- FR-3.5: **Personalized Plan Generation:** Weekly plan auto-built: number of sessions, game mix across phases, SRT interval schedule, reminder coaching — adjusted from observed trends.
- FR-3.6: **Rich Feedback Engine (lots of feedback):**
  - In-game: spoken encouragement after each correct action, gentle cues on hesitation, progress leaf/star animations.
  - Post-session: 3-part spoken summary in simple sentences — what they did well, one thing to practice, what's next ("Tomorrow we'll sing with the dhol again!").
  - Weekly patient-facing recap: garden growth visual + spoken praise montage.
  - Caregiver feedback digest: plain-language trend notes generated from reward trajectory (e.g., "Attention was best between 9–11 AM this week").
- FR-3.7: **Cognitive Stability Index:** derived metric from rolling reward/completion/latency trends, visualized as a simple rising/falling tree icon for caregivers.
- FR-3.8: **Predictive Alerts:** Successive Frustration Index spikes or Daily Life Sequence failures flag an alert to caregiver/ASHA dashboard (possible UTI/sleep-deprivation precursors).
- FR-3.9: All model matrices (A_a, b_a) persisted locally; updated via rank-1 Sherman-Morrison in O(d²); no retraining loops, no cloud inference dependency.
- FR-3.10: Exploration cap: α tuned so no more than ~30% of sessions introduce novel/harder arms, preventing distress.
- FR-3.11: Voice interaction everywhere: offline ASR (Sherpa-ONNX/Vosk + AI4Bharat IndicConformer ONNX models) for commands and answers; offline TTS for all speech.

**Acceptance Criteria:**
- Prediction decision computed in < 50 ms on Cortex-A53 device.
- After ≥ 20 sessions, ≥ 70% of presented games match caregiver-observed "good days" preferences (evaluated in pilot).
- Feedback is audible after every completed game without fail.

---

### 5.5 Feature F4 — Offline-First Architecture & Sync

- FR-4.1: Absolute offline functionality: game logic, AI inference, ASR/TTS, storage all on-device.
- FR-4.2: SQLite append-only event ledger + WatermelonDB lazy loading for fluid UI at hundreds of MB of telemetry.
- FR-4.3: CRDT-based sync engine merges patient↔cloud↔ASHA data with zero conflict loss when connectivity returns.
- FR-4.4: ASHA bridging: peer-to-peer sync (Bluetooth/Wi-Fi Direct) between patient device and ASHA tablet; aggregated push to district server when networked.
- FR-4.5: Asset updates (new games/audio packs) download in background on Wi-Fi; app never requires them to function.

---

### 5.6 Feature F5 — Gerontechnology UI/UX Standards (Mandatory)

| Dimension | Platform Standard |
|---|---|
| Touch targets | Minimum 48×48 px, generous spacing (tremor-safe) |
| Contrast | > 4.5:1 normal text, > 3:1 large text; icons always paired with sans-serif labels (color never sole indicator) |
| Motion | Static, user-initiated progression only; no auto-carousels/pop-ups |
| Navigation | Flat & linear; permanent Back + Home anchors; max depth = 1 tap from home |
| Instructions | Permanently pinned atop active task; spoken; never tutorial-once |
| Failure states | Prohibited; Errorless Learning throughout |
| Fonts | Large default (≥ 18sp scalable); high-legibility typeface |
| Audio | All text speakable; volume boost mode |

---

## 6. Technical Stack Summary

| Layer | Technology |
|---|---|
| App framework | React Native / Flutter (offline-first) |
| Local DB | SQLite + WatermelonDB (CRDT sync layer) |
| On-device ML | TensorFlow Lite (INT8 quantized emotion CV model), custom LinUCB engine (native/Kotlin) |
| Voice | Sherpa-ONNX / Vosk + AI4Bharat IndicConformer (ASR); system/offline TTS |
| Sync | CRDT merge engine → secure clinical backend; P2P Bluetooth/Wi-Fi Direct for ASHA |
| Target hardware | Android Go / 2GB RAM class, ARM Cortex-A53 |

---

## 7. Success Metrics

| Metric | Target (6-month pilot) |
|---|---|
| Session adherence (≥ 4 days/week) | ≥ 60% of enrolled patients |
| Median medication confirmation rate | ≥ 80% |
| Frustration-triggered session abandonment | ≤ 10% |
| Cognitive Stability Index trend | Stable/improving for ≥ 50% of mild-stage users |
| Crash-free offline sessions | ≥ 99.5% |
| Onboarding completion (caregiver-assisted) | ≥ 90% |

---

## 8. Release Plan

- **MVP (v0.1):** Onboarding wizard, 4 Phase-1 games, medicine reminders, basic AI difficulty adjustment, offline storage.
- **v0.2:** Full 11-game library, LinUCB next-game prediction, feedback engine, Memory Garden reinforcement loop, caregiver digest.
- **v0.3:** ASHA P2P sync, dashboards, predictive alerts, predictive Cognitive Stability Index, additional languages.
- **v1.0:** Clinical pilot hardening, accessibility audit, multi-state asset packs.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Patient distress from novelty | α-capped exploration; instant de-escalation to reminiscence modules |
| Data loss during long blackouts | CRDT append-only ledger; sync idempotency tests |
| Device thermal/battery drain | INT8 models; O(d²) bandit updates; capped frame rates |
| Caregiver misconfiguration of meds | Guided flows, photo-based verification, review summary before save |
| Privacy of health/emotion data | Local-first storage; encryption at rest; explicit consent during onboarding |

---

*End of PRD.*
