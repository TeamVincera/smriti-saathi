# 🌿 Smriti Sathi (स्मृति साथी)
### *Culturally Grounded Cognitive Care, Routine Support & AI Companion*

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue?style=for-the-badge&logo=target)](https://www.sih.gov.in/)
[![Problem Statement ID](https://img.shields.io/badge/Problem%20Statement-SIH26003-orange?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Android%20%7C%20iOS-purple?style=for-the-badge)](#)
[![Offline First](https://img.shields.io/badge/Architecture-Offline--First-teal?style=for-the-badge)](#)

---

## 📌 SIH 2026 Context & Problem Statement

- **Initiative:** Smart India Hackathon (SIH) 2026
- **Problem Statement ID:** `SIH26003`
- **Domain:** MedTech / Healthcare / Assistive Digital Technologies
- **Organization / Team:** **Team Vincera** (`TeamVincera`)

### The Challenge
Over **8.8 million older adults in India** live with dementia or Mild Cognitive Impairment (MCI). Existing digital cognitive exercises and reminder apps face major barriers in Indian demographics:
1. **Linguistic & Cultural Alienation:** Most tools rely on western cultural concepts and English prompts.
2. **Internet Connectivity Barriers:** Tier-2, tier-3, and rural regions frequently face intermittent or absent connectivity.
3. **Complex Interfaces:** High cognitive load, small buttons, and punishing scoring increase patient agitation and anxiety.
4. **Caregiver Burnout:** Lack of gentle, non-intrusive monitoring of routine medication adherence and cognitive stability.

### The Solution: Smriti Sathi
**Smriti Sathi (स्मृति साथी)** is an offline-first, culturally familiar assistive mobile and progressive web application (PWA) designed to foster cognitive wellness, preserve memory through reminiscence therapy, reinforce daily medication routines, and provide peace of mind to caregivers and frontline healthcare workers (ASHAs).

---

## 🌟 Key Features

### 1. 🧠 23 Culturally Rooted Cognitive Games (3 Unlock Phases)
- **Low-Frustration Progression:** Specially structured to prevent cognitive distress. Phase 1 begins with gentle familiarity; Phase 2 unlocks after 4 completed sessions; Phase 3 unlocks after 8 sessions.
- **Regional Cultural Themes:** Designed around Indian heritage (Assamese Tea Gardens, Cheraw Bamboo Dance, Weaver's Loom, Market Day, Village Sounds, Festival Tales, Traditional Foods, Orchid Pairs).
- **Adaptive Machine Learning Engine:** On-device **LinUCB Contextual Multi-Armed Bandit** coupled with a 25-feature question engine that personalizes game difficulty dynamically based on response speed, hints used, and comfort level.
- **Zero Cloud Dependence:** All gameplay and performance data persist locally in browser **IndexedDB**.

### 2. 🎙️ Multilingual Conversational AI Voice Companion
- **Warm Reminiscence Partner:** Empathetic conversational companion powered by **Groq LLaMA 3.3** for comforting reminiscence interactions.
- **Indigenous Indic Speech:** High-fidelity Neural Text-to-Speech (TTS) and Speech-to-Text (STT) powered by **Sarvam AI** (`bulbul:v1`) and **Azure Cognitive Speech Services**.
- **6 Supported Languages:** Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), Bodo (बड़ो), Manipuri (মৈতৈলোন্), and Indian English.
- **Graceful Offline Fallback:** When internet is unavailable, the app seamlessly switches to pre-cached human audio, local prompt banks, and the on-device Web Speech API.

### 3. ⏰ High-Contrast Audio-Visual Medication & Routine Alarms
- **Older-Adult-First UI:** Extra-large touch targets (minimum 48px), high-contrast visual cues, and gentle auditory chimes.
- **Capacitor Native Notifications:** Schedules exact on-device alarms and local notifications on Android and iOS even when the app is closed.
- **Non-Punitive Adherence Logging:** Accommodates gentle snoozing and caregiver verification without stressful countdowns.

### 4. 🛡️ Local-First Caregiver Support & Analytics Hub
- **Privacy-Guaranteed PIN Gate:** Secured by a local PIN stored exclusively on the user's hardware.
- **Longitudinal Stability Indices:** Tracks cognitive engagement trends, game completion consistency, and medication adherence over time.
- **Assistive Summaries:** Formats non-diagnostic observational briefs to help families and physicians understand daily trends without clinical overreach.

---

## 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│                       Smriti Sathi Frontend                       │
│             React 18 + Vite + TailwindCSS + Lucide Icons          │
│                Capacitor 8 (Native Android & iOS APK/IPA)         │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
       ┌──────────────────────────┴──────────────────────────┐
       ▼                                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────────┐
│         LOCAL-FIRST ENGINE            │ │        ONLINE AI PROXY LAYER          │
│          (Works 100% Offline)         │ │            (Optional Cloud)           │
│                                       │ │                                       │
│ • IndexedDB Data Layer (`idb`)        │ │ • Secure Node.js / Cloudflare Worker  │
│ • LinUCB Contextual Bandit Engine     │ │ • Groq LLaMA 3.3 70B Conversation     │
│ • 23 Regional Mini-Games Logic        │ │ • Sarvam AI Indic Speech Engine       │
│ • Service Worker Offline Cache (PWA)  │ │ • Azure Speech Neural Synthesis       │
│ • Capacitor Local Notifications       │ │ • Origin Isolation & Zero PII Logging │
│ • Web Speech API / Cached Audio       │ │                                       │
└───────────────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Category | Technologies |
|---|---|
| **Frontend Framework** | React 18.3, TypeScript 5.6, Vite 5.4 |
| **Styling & UI** | Tailwind CSS, Lucide React, Accessible Mobile Tokens |
| **Mobile Shell** | Capacitor 8 (Android & iOS native bridges) |
| **Local Persistence** | IndexedDB via `idb`, LocalStorage, Service Worker Cache |
| **Machine Learning** | Contextual Multi-Armed Bandit (LinUCB) + Multi-Feature Adaptive Engine |
| **Speech & AI** | Sarvam AI (`bulbul:v1`), Groq LLaMA 3.3, Azure Cognitive Speech Services |
| **Backend & Edge** | Node.js Express Proxy / Cloudflare Workers (`wrangler`) |
| **Quality Assurance** | Vitest 4, Playwright (E2E across Desktop, iOS Safari, Android Pixel) |

---

## 🚀 Installation & Setup Guide

Follow these steps to run Smriti Sathi locally on your computer.

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: ([Download Git](https://git-scm.com/))
- *(Optional for Mobile Development)*:
  - **Android Studio** (for building the Android APK)
  - **Xcode** (macOS only, for building the iOS app)

---

### 2. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/TeamVincera/smriti-saathi.git

# Navigate into the project directory
cd smriti-saathi
```

---

### 3. Install Dependencies

```bash
npm install
```

---

### 4. Configure Environment Variables (Optional for Online AI)

The core application (games, routines, alarms, adaptive engine) works **100% offline out-of-the-box** without any API keys.

To enable the optional online AI chatbot and neural voice synthesis:
```bash
# Copy the example environment file
cp .env.example .env
```
Edit `.env` and provide your API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
SARVAM_API_KEY=your_sarvam_api_key_here
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=eastus

AI_PROXY_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost
VITE_AI_PROXY_URL=http://localhost:3001/api/ai
```

---

### 5. Run the Application

#### Option A: Run Full App with Integrated Local AI Proxy
```bash
npm run dev
```
This boots both the local Vite dev server and the secure AI backend proxy simultaneously!
- Open your browser at: **`http://localhost:5173`**

#### Option B: Run Web App Only (Offline/Client Mode)
```bash
npm run dev:vite
```

---

### 6. Build for Production & Progressive Web App (PWA)

To generate an optimized, offline-cached production build:
```bash
# Typecheck, build assets, and generate Service Worker precache
npm run build

# Preview production build locally
npm run preview
```

---

### 7. Run on Mobile Devices (Capacitor)

#### Android:
```bash
# Sync web build to Android project
npm run android:sync

# Open in Android Studio
npm run android:open
```
*From Android Studio, click **Run** to launch on your connected phone or emulator.*

#### iOS (macOS only):
```bash
# Sync web build to iOS project
npm run ios:sync

# Open in Xcode
npm run ios:open
```

---

### 8. Run Automated Test Suites

Smriti Sathi includes comprehensive unit, integration, and end-to-end accessibility test suites:

```bash
# Run Vitest unit & integration tests
npm run test

# Run Playwright end-to-end tests across browsers
npm run test:e2e

# Run mobile viewport accessibility audits
npm run test:e2e:mobile
```

---

## 📁 Directory Structure

```text
smriti-saathi/
├── android/               # Native Android Capacitor project
├── ios/                   # Native iOS Xcode project
├── public/                # Static assets, icons, audio chimes, PWA manifest
├── server/                # Secure server-side AI proxy (Groq, Sarvam, Azure)
├── cloudflare/            # Cloudflare Worker deployment configuration
├── scripts/               # Automated verification, icon generation & dev runners
├── test/
│   ├── unit/              # Vitest unit tests (LinUCB, alarms, voice, formatters)
│   ├── integration/       # Component & database integration tests
│   └── e2e/               # Playwright multi-device accessibility & user flow tests
├── src/
│   ├── components/        # Reusable UI widgets (WaveformMic, Reminders, DailyPlan)
│   ├── games/             # 23 Culturally themed cognitive stimulation games
│   ├── lib/
│   │   ├── adaptive/      # LinUCB bandit engine & question difficulty adaptation
│   │   ├── ai/            # Conversational patient context & fallback builders
│   │   ├── voice/         # Sarvam AI, Azure, and WebSpeech audio pipelines
│   │   ├── db.ts          # IndexedDB schema and persistence helpers
│   │   └── reminders.ts   # Audio-visual alarms and Capacitor notification manager
│   ├── screens/           # Main views (Home, Games, Meds, CaregiverHub, Onboarding)
│   ├── styles/            # Design system tokens and high-contrast CSS rules
│   ├── App.tsx            # Main application router and state boundary
│   └── main.tsx           # Application entry point & PWA service worker registration
├── package.json
└── vite.config.ts
```

---

## 👥 Team Vincera — Contributors (SIH 2026)

| Member | Role | GitHub |
|---|---|---|
| **Naitik Singhal** | Team Lead / Full Stack Architect | [@naitiksinghalns-netizen](https://github.com/naitiksinghalns-netizen) |
| **Team Member 2** | AI / ML & Adaptive Systems | [@username2](https://github.com/) |
| **Team Member 3** | Mobile & Native Shell (Capacitor) | [@username3](https://github.com/) |
| **Team Member 4** | UI/UX & Regional Language Specialist | [@username4](https://github.com/) |
| **Team Member 5** | QA, Accessibility & Voice Engineering | [@username5](https://github.com/) |

---

## 📜 Medical & Regulatory Disclaimer

> **Smriti Sathi is an assistive memory, routine, and caregiver-support platform.**
> It is **not** a certified medical device, diagnostic instrument, or clinical treatment for Alzheimer's disease, dementia, or any other medical condition. The platform does not diagnose, prescribe medications, or replace direct consultation with qualified physicians, neurologists, or healthcare professionals.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
