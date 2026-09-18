# Smriti Sathi: complete project context and technical prompt

Use this document as the project context for Smriti Sathi, Team Vincera’s Smart India Hackathon 2026 idea for SIH26003. Base your work on the implementation facts below. Distinguish a feature that is connected to the user flow from code that exists but is not integrated. Do not invent team information, deployed services, measurements, partnerships, research results, clinical outcomes, model training or security guarantees.

## 1. Task and team context

The intended presentation task is to explain Smriti Sathi for SIH 2026, using the original SIH presentation template without redesigning its masters, logos, background, typography, footer or section order. Analyse the project and its games, use relevant SIH presentation examples for structure, and include only a few relevant research papers published within the preceding five years. Use natural, specific language, not generic promotional language. Explain how the system works, what distinguishes it, what is feasible, what remains unfinished, and how proposed benefits will be evaluated.

- Team name provided by the user: **Team Vincera**. The original reply was “team vincera”.
- Project name: **Smriti Sathi**.
- Chat companion name: **Sathi**.
- Competition: **Smart India Hackathon 2026**.
- Problem statement ID: **SIH26003**, also written SIH 26003.
- Problem statement title: **AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)**.
- Organisation: **Ministry of Development of North Eastern Region (MDoNER)**.
- Category: **Software**.
- Theme: **MedTech / BioTech / HealthTech**.
- Team ID: **not provided**. Use `[Registered team ID]` until supplied.
- Team members, leader, institution, department, mentor, contact details, registration numbers and roles: **not provided**. Do not infer these from a computer username or invent them.
- Source repository directory: `/Users/naitik/smriti sathi`.
- User-supplied template: `/Users/naitik/Downloads/SIH2026-IDEA-Presentation-Format (1).pptx`.
- This context reflects source inspection through **17 September 2026**. It is a source audit, not a new end-to-end runtime verification or clinical evaluation.

The supplied template has six presentation pages followed by a seventh instruction page. Its presentation sections are title, idea/proposed solution, technical approach, feasibility and viability, impact and benefits, and research and references. The instruction page specifies six presentation slides including the title and says the instruction page can be removed for submission. It also specifies PDF for portal upload. Keep the original template file intact and fill a copy. If the original template is unavailable to you, request that file rather than fabricating an identical template. Its slide dimensions are 12,192,000 by 6,858,000 EMU, equivalent to 13⅓ by 7½ inches. Existing template fonts include Arial, Times New Roman, Garamond, Calibri and TradeGothic. Those template fonts are separate from the application’s fonts.

## 2. Problem and product scope

The intended users are older adults living with dementia or memory difficulties in North Eastern India, together with family caregivers. The region-specific brief asks for cognitive games, adaptable difficulty, multilingual voice assistance, culturally familiar activities, medicine/hydration/routine/appointment reminders, caregiver monitoring, mobile/tablet access, and usefulness in low-connectivity settings. The wider problem statement also expects secure patient-data management and offline synchronisation support. These last requirements are not fully satisfied merely by storing data locally.

Smriti Sathi combines a browser application with Capacitor mobile shells. Its core is local: games, content, records, reminder configuration, adaptation state and fallback interactions can remain useful without a cloud service. Optional online chat and speech use a separate proxy. The application is not a clinically validated treatment, diagnostic tool, certified medical device or replacement for professional care. No clinical efficacy, accuracy improvement, caregiver-burden reduction, cost saving or trial result has been demonstrated by the repository.

A useful product description is: “A culturally familiar cognitive activity and daily memory-assistance app for older adults and their caregivers in North Eastern India.” Describe games as activities that practise a task or support engagement. Do not equate higher game scores with improved cognition, disease progression or treatment response.

## 3. Stack and application architecture

- React 18.3.1 and React DOM 18.3.1, declared with caret version ranges.
- TypeScript 5.6.3 and Vite 5.4.11, also declared with caret ranges.
- Vite React plugin 4.3.4.
- Capacitor core, Android, iOS and CLI in the 8.5.0 declared range.
- Capacitor Filesystem 8.1.3, Share 8.0.1, Network 8.0.1 and Local Notifications 8.3.1.
- Browser IndexedDB, CacheStorage, localStorage and limited sessionStorage.
- Native browser APIs for speech synthesis, optional speech recognition, media capture, audio playback and notifications.
- Node.js HTTP proxy in `server/ai-proxy.mjs`.
- Alternative Cloudflare Worker in `cloudflare/ai-proxy-worker.mjs`.
- Pure TypeScript numerical algorithms. No TensorFlow, PyTorch, ONNX runtime, native neural inference framework or vector database is declared in the application dependencies.
- Custom CSS and local content banks. Do not describe the app as using Tailwind, Redux, Zustand, React Router, Firebase, MongoDB, PostgreSQL, Supabase or Express.
- Vitest, Testing Library, jsdom, fake-indexeddb, Playwright and Reticle support development and verification.

Architecture:

```text
React UI in browser / Capacitor WebView
  AppProvider and custom hash router
    Local games and content generators
    Per-domain ability model and session recommender
    Caregiver reports and daily plan
    Reminder engine and native notification bridge
    IndexedDB records and adaptive state
    Service-worker asset cache and voice cache
    Optional /api/ai transport with endpoint failover
      Node proxy OR Cloudflare Worker
        Groq chat and Whisper transcription
        Sarvam neural TTS
        Azure neural TTS on the Node proxy
```

The frontend owns the authoritative local data. The proxy does not implement patient accounts, a persistent patient database or caregiver synchronisation. A running proxy is not proof that every provider is configured or reachable. A successful Groq status check does not validate Azure or Sarvam separately.

### Application startup and routing

`src/main.tsx` starts React. In development it clears stale app service-worker registrations/caches to avoid mixed modules during hot reload. Production registers `sw.js`. `App.tsx` retains the shell and services while lazily loading heavier screens through React `lazy` and `Suspense`.

The app has a custom hash router in `src/router.ts`, using `hashchange`, `window.location.hash`, `URLSearchParams` and a navigation helper. It is not React Router.

Routes:

- `/`: home and activity catalogue.
- `/game/<gameId>`: game host. Query parameter `d` supplies starting difficulty.
- `/reminders`: routine and appointment management.
- `/meds`: medicine management.
- `/hub`: caregiver hub.
- Onboarding takes precedence until the profile is onboarded.
- Unknown routes return to home.

`RouteErrorBoundary` isolates screen failures. `ScreenLoadingFallback` handles delayed route loading. `Layout` provides navigation and hides normal navigation during games. `ReminderOverlay` can appear above the current screen. The general chatbot is shown outside game routes.

### State management

`src/state.tsx` uses React Context and hooks through `AppProvider` and `useApp`. It contains profile, medicines, daily reminders, appointments, game limit, sessions, medication logs, language, theme and readiness. It supplies typed mutations and refresh functions. A shared promise tail serialises writes so an in-flight operation cannot repopulate data after reset. Native alarm synchronisation follows relevant local changes. Returning to the foreground or regaining window focus triggers native reminder resynchronisation.

The default daily game limit is three. Configuration declares `maxSessionsPerDay: 3`. Treat this as application configuration, not a clinically prescribed dose.

## 4. Onboarding, localisation and accessibility

Profile setup includes patient details, language, cultural context, routines, caregiver information, optional clinical context and a local caregiver PIN. An optional baseline activity uses three simple multiple-choice prompts. It is not a validated cognitive screen such as MoCA or MMSE.

Six language codes:

| Code | Language | Native label |
|---|---|---|
| `as` | Assamese | অসমীয়া |
| `bn` | Bengali | বাংলা |
| `brx` | Bodo | बड़ो |
| `mni` | Manipuri | ꯃꯩꯇꯩꯂꯣꯟ |
| `hi` | Hindi | हिन्दी |
| `en` | English | English |

`src/i18n.ts` contains translation dictionaries and interpolation. Not every question bank, game label or status message is equally translated. Several games select Hindi versus English content even while the wider interface offers six language choices. Never claim complete six-language speech/content parity.

Cultural inputs include state, district, community, festivals, occupation, hobbies and family members with photos/relationships. State choices include Assam, Meghalaya, Manipur, Nagaland, Mizoram, Tripura, Arunachal Pradesh, Sikkim and Other. Examples of selectable festivals include Bihu, Ali-Aye-Ligang, Baishagu and Me-Dam-Me-Phi. Some fields also allow personal entries.

The UI uses large touch controls, responsive layouts, clear selection states, gentle feedback, progress indicators, keyboard/ARIA support and reduced-motion handling in relevant components. Existing tests examine narrow screens, PIN entry, touch targets, localisation and accessibility behaviour. These implementation measures do not establish formal WCAG compliance or successful usability with dementia patients.

Application visual tokens include warm cream `#FBF8F2`, navy `#162436`, deep red `#9E2224`, white cards, sand surfaces and green success feedback. Display font preference is Outfit. Text font preference is Inter. Indic fallbacks include Noto Sans Bengali, Noto Sans Devanagari and Vrinda, followed by system fonts. Body text uses responsive sizing around 16–18 px. These are app design choices, not instructions to redesign the supplied SIH deck.

## 5. All 23 games and their actual mechanics

The game catalogue is `src/lib/games.ts`. Game screens are in `src/games`. Games unlock in three phases: phase 1 initially, phase 2 after four completed sessions, phase 3 after eight. These unlock thresholds are software rules, not a clinical progression schedule. The exact catalogue metadata is appended later in this document.

1. **Faces of Home** (`faces`, `FacesOfHome.tsx`): five rounds identifying a family member from name/relationship and photo/avatar options. Uses supplied family members when available and fallback avatars otherwise. Always includes the target among up to two distractors. Stores retrieval-spacing state after success/miss, but the target currently cycles by round index. Stored spacing levels do not currently determine when a face reappears. Includes a skip path.
2. **Morning Melodies** (`melodies`, `MorningMelodies.tsx`): five rounds listening to a generated instrument sound and selecting an instrument. Uses regional instrument metadata, optional state preference and auditory-domain difficulty updates. Prevents overlapping playback and permits replay. This is sound identification, not an implemented music-therapy protocol.
3. **Familiar Objects** (`objects`, `FamiliarObjects.tsx`): five rounds selecting a household item from a prompt. Uses a typed object bank, recognition-domain ability and supportive visual cues.
4. **Memory Tray** (`tray`, `MemoryTray.tsx`): four rounds observing a tray for ten seconds and identifying the missing item. Users can end the viewing phase early. It records a `working_memory` domain string. The canonical bridge does not explicitly map that exact alias, so it falls back to recognition in the newer engine.
5. **Daily Life Sequence** (`sequence`, `DailyLifeSequence.tsx`): three sets of routine steps. Users tap steps in their correct order. Wrong choices highlight the appropriate next step and do not place an incorrect step. A four-second timer can offer a cue. Round outcome updates sequencing ability.
6. **Traditional Foods & Harvest** (`foods`, `TraditionalFoods.tsx`): five rounds identifying local dishes/produce from descriptions. Uses regional food metadata and state preference. Correctness updates recognition ability. Cues highlight the answer after delay or a wrong choice.
7. **Orchid Pairs** (`pairs`, `OrchidPairs.tsx`): two hidden-card matching boards. Matching pairs remain visible. Mismatches stay visible for two seconds before closing. The next board’s level depends on board-level performance. This duration is a design setting, not a clinically established encoding interval. Its session completion counts matched pairs and should not be mistaken for first-attempt accuracy.
8. **Village & Nature Sounds** (`sounds`, `VillageSounds.tsx`): five environmental-sound identification rounds using a sound bank. Uses auditory-domain adaptation and supportive cues.
9. **Northeast Places & Nature** (`places`, `LandmarkRecognition.tsx`): five landmark-recognition rounds. Regional choices include places such as Kaziranga, Loktak Lake, tea estates and Tawang. State preference filters candidates when sufficient regional options exist. Higher levels can increase option count.
10. **Weaver’s Loom & Motifs** (`loom`, `WeaversLoom.tsx`): five visual-pattern completion rounds with regional textile motifs. Uses a pattern-domain model and generated choices.
11. **Picture Memory** (`picture`, `PictureMemory.tsx`): four scene-recall rounds with ten-second viewing periods. Users answer a detail question after observation. Although the screen updates a level, the inspected generator accepts `_level` without using it to change content. The `visual_memory` alias also lacks an explicit canonical-domain mapping.
12. **Bamboo Crafting** (`bamboo`, `BambooCrafting.tsx`): five categorisation/sorting rounds. Users match an item to a category, with difficulty updates based on answers.
13. **Odd One Out** (`oddone`, `OddOneOut.tsx`): five rounds identifying an item that does not fit the category. Uses categorisation-domain adaptation.
14. **Wildlife Safari** (`safari`, `WildlifeSafari.tsx`): two visual-search scenes. Users locate target wildlife among distractors. Stray taps affect the scene-level result and subsequent difficulty.
15. **Spot the Difference** (`spot`, `SpotDifference.tsx`): three comparisons in which the user identifies a changed object. Wrong taps affect performance. The implementation’s completion formula has a minimum floor, so do not present this metric as a validated diagnostic accuracy measure.
16. **Tea Garden Walk** (`teawalk`, `TeaGardenWalk.tsx`): two grid/path activities. Users follow a path. Wrong taps receive cues. Completion currently records successful path outcomes, so errors and ability updates are not equivalent to per-tap error rates.
17. **Cheraw Steps** (`cheraw`, `CherawSteps.tsx`): three left/right rhythm patterns inspired by bamboo clapping. Users listen then reproduce a tapping sequence. It records timing-pattern performance. It is not physical dance tracking, motion capture or a rehabilitation exercise assessment.
18. **Familiar Phrases** (`phrases`, `FamiliarPhrases.tsx`): four phrase-completion rounds using a local phrase bank. Uses verbal-domain adaptation.
19. **Word Harvest** (`word`, `WordHarvest.tsx`): three word-association/category activities. Correct selections and misses affect round-level verbal performance.
20. **Number Bridge** (`bridge`, `NumberBridge.tsx`): two number-ordering paths. Users tap numbered planks in order. Wrong taps affect the sequence-level result.
21. **Market Day** (`market`, `MarketDay.tsx`): a local-market budgeting/purchasing activity using generated stalls. It selects a level at session start and records an outcome influenced by overspending attempts. It does not establish real-world financial capacity. Some completion counts have a minimum floor.
22. **Festival Tales** (`tales`, `FestivalTales.tsx`): festival stories and subjective memory/preference prompts. Personalises from festivals, community and hobbies. Stories paginate into manageable parts. All preference answers count as participation. There is no objective right/wrong response and no adaptive challenge level.
23. **Memory Garden** (`garden`, `MemoryGardenGame.tsx`): breathing cues followed by tapping three flowers to water them. Supports reduced motion. Completion represents engagement, not cognitive accuracy. It does not diagnose emotion, use a camera or run a biometric model.

### Content, randomness and reusable game behaviour

`src/lib/content.ts` provides local round/board generators. Dedicated banks cover daily sequences, familiar objects, familiar phrases, instruments, memory trays, North East places, picture memory, traditional foods and village sounds. Some activities generate layouts procedurally. Regional relevance comes from metadata, local content and selected cultural fields, not from training a regional foundation model.

`src/lib/rng.ts` implements Mulberry32, a string-hash seed, Fisher–Yates shuffling, sampling and bounded integer helpers. A game-session seed combines the game ID with current time and a session counter. This supports repeatable generator tests with explicit seeds while making real sessions vary. It is not cryptographic randomness.

`src/games/shared.tsx` provides shared feedback/progress UI, shuffle helpers and timeout cleanup. Feedback states communicate correct choices or guidance. Gameplay uses local audio cues and animations. Avoid claiming every asset is a real-world recording: instrument playback includes synthesis in `src/lib/audio.ts`.

### Game host, logging and completion

`GameHost.tsx` selects the component by game ID, passes difficulty, collects actions and manages the completion screen. It records tap times, cues and session duration. It periodically offers a cue after inactivity. A completion guard prevents duplicate or stale completion after route changes.

The recorded session accuracy derives from each game’s `itemsUnprompted / itemsTotal`; those counters have different meanings across games. Average session latency currently uses `duration / action count`, with a fallback when there are no actions. It is not a clean mean of experimentally controlled response times. The host produces a session record and updates the session-level recommender. The completion screen uses a local session coach.

## 6. Adaptation: three separate mechanisms

Do not collapse the following mechanisms into one clinically trained AI model.

### A. Per-domain difficulty model used by games

`src/lib/adaptive.ts` maintains an ability estimate `theta` and count `n` per legacy game domain. It uses a one-parameter logistic model:

```text
P(correct | theta, level) = 1 / (1 + exp(-1.15 * (theta - level)))
learningRate = max(0.18, 1.1 / sqrt(n + 1))
newTheta = clamp(theta + learningRate * (outcome - predictedProbability), -0.5, 4.5)
nextLevel = round(clamp(theta - log(0.75 / 0.25) / 1.15 + 0.5, 0, 4))
```

Defaults: `theta = 0.8`, `n = 0`, `MAX_LEVEL = 4`. Ability updates persist in IndexedDB `kv` under `abilities`, with a 400 ms debounce. The 75% target is a design parameter, not a measured success rate or validated treatment target. Different games update per answer or per completed round/board. Some content generators do not consume the updated level.

`recordAnswer` also forwards an observation to the newer engine. That bridge currently uses a generated legacy question ID, `latencyMs: 3500`, and `hintsUsed: correct ? 0 : 1`. These are proxies, not measured per-question timing/hints. Unknown domain aliases fall back to `recognition`.

### B. Session-level contextual bandit used by the home recommendation

Files: `src/lib/ai.ts`, `src/lib/linucb.ts`, `src/lib/sathi.ts`.

Home calls `recommendNextGame`. It first attempts an online recommendation when available, and otherwise uses local LinUCB. Candidate arms are unlocked `gameId:difficulty` combinations for starting difficulties 0 and 1. A baseline can affect the first recommendation. `startingLevelFor` can select the harder starting arm after enough domain evidence.

The ten context features are morning, afternoon, evening/early time indicators; mean accuracy from the last three sessions; mean latency normalised by 12,000 ms; mean hesitation count normalised by eight; most recent frustration proxy; stored adherence rate; phase divided by three; and a constant bias. Missing history has defaults. Missing stored adherence falls back to 0.8, which is not a measured adherence result.

For each arm, LinUCB stores an inverse covariance matrix, reward vector and observation count. It scores expected reward plus an uncertainty bonus. Updates use Sherman–Morrison rank-one matrix updates. Default session exploration coefficient is 0.65. The policy halves exploration when recent novel share exceeds 0.3. The implementation’s exploration flag compares the selected arm with its internal mean-choice logic; do not portray it as a clinically meaningful confidence measure.

```text
reward = 0.4 * completion + 0.4 * accuracy
         - 0.1 * normalisedHesitation - 0.1 * frustrationProxy
```

Inputs are bounded in code and weights can come from configuration. The reward can be negative. GameHost feeds session outcomes into this policy. No clinical training dataset is involved.

### C. Separate question-level MLP + LinUCB engine

Files are under `src/lib/adaptive/`. The code exists, hydrates persisted state and can rank questions, but no inspected gameplay/content caller invokes `selectNextQuestion` or `selectNextQuestionAsync`. The legacy bridge records observations into it, which is different from using it to choose live questions. State clearly: **question-selector implementation exists; gameplay selection integration remains incomplete**.

Its eight canonical domains are memory, attention, recognition, recall, sequencing, visual recognition, auditory recognition and problem solving. Difficulty values are 1–5. Question metadata includes ID, game ID, domain, difficulty, language, regional relevance, estimated time, type, prompt, answer/options, optional media and cultural tags.

The 25 features, in order:

1. Overall accuracy.
2. Recent three-answer accuracy.
3. Recent five-answer accuracy.
4. Recent ten-answer accuracy.
5. Average latency divided by 15,000 ms.
6. Recent latency divided by 15,000 ms.
7. Total hints divided by ten.
8. Correct streak divided by five.
9. Incorrect streak divided by three.
10. Candidate difficulty divided by five.
11. Previous domain difficulty divided by five.
12. Candidate-domain score divided by 100.
13–20. Memory, attention, recognition, recall, sequencing, visual recognition, auditory recognition and problem-solving scores divided by 100.
21. Candidate attempt count divided by five.
22. Recency penalty.
23. Frequency in the last ten questions divided by three.
24. Regional relevance, with up to 0.15 added for matching cultural tags.
25. Bias equal to one.

Features are bounded to 0–1. Some defaults use logical-OR and therefore also replace zero values with defaults; these are implementation details requiring review before validation.

MLP: 25 inputs, hidden layers of 16 and eight ReLU units, one sigmoid output. It uses Float32Array weights and explicit CPU loops. Its 561 parameters occupy 2,244 bytes of numerical arrays, excluding code and runtime overhead. Weights are initialised by hand-written rules. There is no provided trained checkpoint, clinical calibration dataset or backpropagation training pipeline. Timing comments in source are targets, not benchmark results.

Question ranking combines `0.6 * banditScore + 0.4 * mlpScore`. The question bandit uses 25-dimensional arms and an exploration coefficient of 0.8. Persistence includes `adaptive_bandit_arms`. Hydration queues early updates/reset operations to prevent overwriting state loaded asynchronously.

The selection pipeline obtains a candidate pool, filters it, handles cold start, extracts features, ranks candidates and applies safeguards. The cold-start branch prefers easy questions and cultural matches. Empty-catalogue recovery returns a placeholder result. Explainability records question, score, reason, overrides and feature summaries.

Safeguards implemented in this separate selector:

- Avoid immediate repeats and recent candidates when alternatives exist.
- After two consecutive mistakes, filter away levels four and five when easier candidates exist.
- After three mistakes, prefer difficulty one or two where eligible alternatives exist.
- After recent latency above ten seconds, prefer easier eligible candidates.
- Limit upward jumps to one level when a suitable bounded candidate exists.

These are interaction rules, not validated medical assessments of fatigue or disease. Because gameplay does not call this selector, do not claim these exact rules control every game.

Question reward uses correctness plus latency and hint factors: `(correct ? 0.6 : -0.3) + 0.25 * latencyFactor + 0.15 * hintFactor`. The old bridge’s fixed latency and inferred hints limit what it learns. `PerformanceTracker`, `QuestionRepository`, `ExplainabilityLogger` and `abilityCacheReset` support observation aggregation, question indexing, local decision history and consistent resets.

### Retrieval spacing utilities

`src/lib/srt.ts` defines gaps `[1, 2, 4, 8]`, success/miss level changes and a round-scheduling helper. Faces of Home saves this state but does not use the scheduling helper for its current target sequence. Do not label that screen as a fully operational spaced-retrieval therapy schedule.

## 7. Local storage and data contracts

Database name: `smriti-sathi`. IndexedDB schema version: 2.

Object stores: `kv`, `events`, `sessions`, `meds`, `medlog`, `daily_reminders`, `appointments`. Events and medication logs use auto-incremented entries. Other record collections have their respective IDs/keys. The wrapper provides get, set, delete, add and get-all operations with transaction error handling. Invalid openings can retry instead of retaining a failed cached promise.

The `kv` store holds profile, configuration, bandit/adaptation state and other application settings. Profile loading validates basic shape and language. Configuration normalisation repairs missing/invalid nested values from older stored records. Default configuration includes reward weights 0.4/0.4/0.1/0.1, alpha 0.65, three daily sessions, 30-minute configured grace and light theme. The web reminder engine separately declares a 25-minute grace constant, so those values should not be conflated.

Data categories:

- Patient: name, date of birth/age, photo/avatar, education and spoken languages.
- Clinical context: user-entered mild/moderate stage, optional diagnosis date and doctor contact. This is input, not a diagnosis made by the app.
- Culture: state, district, community, festivals, occupation, hobbies and family records.
- Routines: wake, breakfast, lunch, dinner and sleep anchors.
- Caregiver: name, phone, relationship and optional ASHA name/phone. Storing ASHA contact details does not implement ASHA connectivity or a public-health integration.
- Profile: selected language, the nested records, optional PIN, onboarded flag and creation time.
- Medicine: name, photo, form, dosage text, times, food relation, instructions, duration, stock and active flag.
- Medicine log: medicine ID/name, scheduled occurrence, timestamp, taken/missed/skipped and interaction method.
- Session: game ID/name, difficulty, times, completion, accuracy, latency, hesitation/cue counts, frustration proxy, reward and exploration flag.
- Daily reminder: title, description, time, active/enabled flags, selected weekdays, category and icon.
- Appointment: title, date/time, doctor, location, notes and active/enabled flags.
- Alert: ID, time, severity, title key and detail.

LocalStorage includes preferences and helpers such as stored adherence, baseline and reminder deduplication/snooze keys. SessionStorage can carry the selected recommendation’s exploration flag. Voice blobs use CacheStorage and memory. These stores are not encrypted application databases. Browser clearing, profile reset or device loss can remove records. A downloadable report is not a full database backup.

## 8. Reminders, medicines, appointments and daily plan

`src/lib/reminders.ts` provides the in-app reminder engine and active-alarm subscription. It handles scheduled medicine occurrences, daily routines and appointments. It tracks confirmed and snoozed occurrences, deduplicates against stored logs and raises overlays. The inspected web constants are a 25-minute grace window and ten-minute snooze.

Confirming a medicine writes a local log and an event. Routine/appointment acknowledgement writes relevant events. The application can snooze or dismiss an active alarm. Confirmation indicates a user interaction, not verified medicine ingestion. Dosage is caregiver-entered text; the application must not prescribe or alter it.

`src/lib/alarmService.ts` bridges Capacitor Local Notifications. It checks and requests display permissions and handles Android exact-alarm settings where applicable. It configures channel `reminders_alarm`, action type `MED_ALARM_ACTIONS`, source marker `smriti-sathi` and `alarm.wav`. Android uses a high-importance alarm channel. IDs derive from a stable positive 32-bit hash. Scheduling/synchronisation operations are serialised to prevent old snapshots overwriting newer schedules. Only notifications belonging to the app are selected for its reconciliation logic.

Foreground/focus resynchronisation repairs schedules after permission, clock or timezone changes. Availability still depends on platform support, permission, OS scheduling, background restrictions and battery settings. Do not guarantee delivery while a browser is closed or describe local notifications as server push/SMS/WhatsApp alerts.

Default routines in the database helper include breakfast at 08:00, water at 09:00, a walk at 10:30, rest at 14:00 and family contact at 17:30. These are editable prototype defaults.

`src/lib/dailyPlan.ts` constructs a deterministic list from local medicines, routine reminders and appointments. It marks medicine occurrences complete from same-day taken logs, respects reminder weekdays, considers the earliest appointment within seven days, sorts by date/time and returns up to six items by default. It does not call AI. Generic reminders are initially represented as incomplete in this projection rather than inferred complete from every possible event.

## 9. Caregiver hub, analytics and report export

`CaregiverHub.tsx` and the caregiver components provide a local caregiver area, PIN gate, patient/routine/medicine administration, activity summaries and analytics. The PIN is stored as part of the local profile. It is not an account, verified identity, OTP system or secure remote authentication boundary.

`src/lib/reports.ts` filters sessions by period, builds summary metrics, domain bars and session trends, and generates local personalised insights/latest-session summaries. `src/lib/reportExport.ts` renders a 1000 × 1400 report canvas containing patient context, period, activity count, task accuracy, mean latency, logged medication adherence, domain display and optional summary text. Web paths allow a download; native paths use Filesystem and Share. It is a report image, not an electronic health-record integration or validated diagnostic report.

The `sathi.ts` frustration proxy is:

```text
0.45 * rapidTapRatio + 0.40 * cueRatio + 0.15 * sessionDurationFraction
```

Rapid taps are adjacent tap gaps under 180 ms. Duration fraction saturates at 14 minutes. The output is capped at one. It is not an emotion-recognition model or physiological measure.

The function named `cognitiveStabilityIndex` compares average reward over the last four sessions with the preceding four. Its states are flourishing, steady and drooping. It labels flourishing when recent reward is at least 0.62 and trend at least -0.03, and drooping when trend is at most -0.08 or recent reward below 0.35. This is a game-reward display heuristic, not a clinical cognitive-stability index.

The same file defines digest/alert helpers. Two of the last five sessions with frustration proxy above 0.65 can create a watch candidate. Two sequence sessions below 0.4 accuracy can create an urgent candidate. Some helper text currently overinterprets cognition or mentions illness. The product brief’s non-diagnostic boundary takes precedence for presentation claims; this wording requires clinical/content review and does not establish prediction of infection or decline. Presence of a helper is not proof that every string appears in every current screen.

`sessionCoach.ts` is a deterministic local completion companion:

- Invalid/insufficient input: suggest repeat, with insufficient-data flag.
- Completion at least 0.9 and accuracy at least 0.75: celebrate.
- Otherwise, duration at least eight minutes or at least five cues: rest.
- Otherwise, accuracy below 0.5, at least three cues, or duration at least six minutes with accuracy below 0.7: gentler.
- Otherwise: repeat.

These branches run in that order. An enhancer interface exists for possible future use, but the current coach does not invoke an online service.

## 10. Online AI, context and transport

`AIService.ts` provides chat, adaptive-game recommendation and caregiver-summary helpers with local fallbacks. Both its primary and fast model strings currently name `groq/compound-mini`; a fallback model field names `openai/gpt-oss-120b`. A model string in source is configuration, not evidence that the provider currently serves it or that a call succeeded.

Chat uses a system prompt plus up to six recent messages, approximately 2–4 short sentences of intended output, temperature 0.6 and a 250-token limit for the main call. Other requests use bounded structured JSON outputs. Client AI calls have an approximately eight-second abort timeout. Caregiver summary fields are sanitised, bounded to 280 characters and limited lists. Missing/unsafe values fall back locally.

The companion is intended to answer the actual question, use calm culturally respectful and gender-neutral language, admit missing information, avoid hallucinating records, avoid diagnosis/treatment/dose changes, and direct immediate danger to emergency services/caregivers. Those prompts and filters are safeguards, not a guarantee that generative output is safe.

`PatientContextBuilder.ts` supplies selected profile and routine data, medicine schedule, today’s logs, recent game history and upcoming appointments. It bounds record counts and sanitises untrusted field strings. It delimits user-entered fields as untrusted data in the system prompt. The context can contain a first name, medication details, appointments and caregiver details. Therefore, “local-first” does not mean no patient-related information can leave the device: online features transmit selected context to the proxy/provider.

The context builder mixes date representations in places, including UTC ISO dates and local dates. Timezone-sensitive logs/context deserve testing. Its name/comment does not prove privacy-law compliance.

`proxyClient.ts` supports one or multiple public endpoint bases from:

- `window.__SMRITI_AI_PROXY_URLS__` / `window.__SMRITI_AI_PROXY_URL__`.
- `VITE_AI_PROXY_URLS` / `VITE_AI_PROXY_URL`.
- Native development defaults: Android emulator `http://10.0.2.2:8787/api/ai`, iOS/local native `http://127.0.0.1:8787/api/ai`.
- Relative `/api/ai` when no configured/native base exists.

It normalises bases, prefers a previously successful endpoint and tries alternatives on failure. User aborts should not automatically mark the whole service unavailable. Chat parses `choices[0].message.content`, transcription parses `text`, and TTS returns a nonempty Blob.

`availability.ts` has unknown/offline/online states, a 2.5-second polling interval, four-second per-probe timeout, endpoint selection and Capacitor Network handling. Requests use `cache: no-store`. Device internet indication is not enough: backend health controls cloud readiness. Native network disconnect gates probes.

## 11. API proxy contract and security controls

Routes on both backends:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/ai/status` | Bounded Groq readiness probe and available/ready status |
| POST | `/api/ai/chat` | Validated chat request to Groq |
| POST | `/api/ai/transcribe` | Multipart audio transcription |
| POST | `/api/ai/tts` | Speech audio from a supported provider |
| OPTIONS | Supported API context | CORS preflight handling |

Node server details from source:

- Default port 8787.
- Current source default bind host is **`0.0.0.0`**. An older deployment document says `127.0.0.1`; the inspected code takes precedence. Set a deliberate bind address for the intended deployment.
- Chat-body cap 96 KiB.
- Transcription-body cap 8 MiB.
- TTS-body cap 16 KiB.
- Upstream request timeout 15 seconds.
- Groq readiness timeout three seconds.
- Readiness cache: four seconds after success, three after failure.
- Rate limiter: 30 requests per 60-second window per derived client identity/IP.
- Chat roles allow system, user and assistant.
- Chat validates 1–8 messages and 1–6000 characters per message.
- Temperature is clamped to 0–1 and requested output tokens to 1–700.
- Chat-model allowlist: `groq/compound-mini`, `groq/compound`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`.
- Unrecognised chat model falls back to `groq/compound-mini`.
- Groq chat endpoint is the provider’s OpenAI-compatible chat-completions route.
- Transcription uses `whisper-large-v3` through Groq.
- Provider errors are normalised instead of sending raw upstream details to the UI.
- Origin allowlist comes from `AI_PROXY_ORIGINS`. CORS does not use wildcard origins or credential cookies.
- `TRUST_PROXY=1` enables forwarded-IP use and should only be configured behind an appropriately controlled reverse proxy.
- The proxy does not intentionally log patient prompt text.

Server-only configuration names: `GROQ_API_KEY`, `SARVAM_API_KEY`, `AZURE_SPEECH_KEY`, optional `AZURE_SPEECH_REGION`, `SARVAM_SPEAKER`, `SARVAM_PACE`, `AI_PROXY_ORIGINS`, `PORT`, `HOST`, `TRUST_PROXY`. This document contains no actual credential values. Never request or expose credentials in generated slides or client code.

CORS, input validation and rate limiting are abuse controls. They are not user authentication, encryption of local data, a healthcare compliance certification or an authenticated patient API. An authenticated gateway/session/device-attestation design remains necessary for broader exposure. In-memory rate buckets in a Worker are not a durable globally coordinated quota system.

### Cloudflare Worker differences

`wrangler.toml` declares worker `smriti-sathi-ai-proxy`, entry `cloudflare/ai-proxy-worker.mjs`, compatibility date 2026-09-10 and workers.dev enabled. The configured origin examples cover local web and Capacitor origins. No verified public production URL was supplied.

The Worker exposes the same main routes and keeps provider secrets on the server side. It implements Groq chat/transcription and Sarvam TTS. **Azure TTS intentionally returns 503 in the Worker**, enabling client fallback. Do not imply Node/Worker provider parity. Deployment instructions use Wrangler secrets, then a public Worker base ending in `/api/ai` in the app’s nonsecret build configuration.

## 12. Speech, audio and offline fallbacks

`VoiceService.ts` coordinates synthesis, playback, cancellation, audio cache and browser speech. It uses generation/cancellation guards so stale async speech does not overlap later utterances. It can wait for available browser voices and fall back on audio failure. Text is sanitised and gendered address terms are normalised where implemented.

- Azure preferred neural path for Assamese.
- Sarvam neural path for supported Hindi, Bengali and English.
- Azure alternatives on the Node backend for Assamese, Bengali, Hindi and English.
- Cached audio and browser speech when online synthesis is unavailable.
- Last-resort cues when no speech path works.

Sarvam configuration: `bulbul:v3`, default allowlisted speaker `shreya`, default pace 0.9, permitted pace 0.5–2.0. Client profile identifier is `sarvam-bulbul-v3-shreya-0.9`. Speaker/pace control is server-owned, not arbitrary client configuration.

Azure voice mappings:

| Language | Voice |
|---|---|
| Assamese | `as-IN-YashmitaNeural` |
| Bengali | `bn-IN-TanishaaNeural` |
| Hindi | `hi-IN-SwaraNeural` |
| Indian English | `en-IN-NeerjaNeural` |

The Azure profile is `azure-neural-gentle-v2`. The Node implementation constructs escaped SSML with sentence/paragraph pauses and conservative rate/pitch/volume. Assamese uses about -12% rate; the other configured languages about -10%. Do not equate valid configuration strings with tested provider availability.

Browser fallback preferences: Assamese around rate 0.8, Hindi/Bengali around 0.82 and English around 0.86. Bodo falls back to a Hindi voice preference and Manipuri to a Bengali voice preference, each around 0.8. These fallback voices do not establish accurate Bodo/Manipuri speech. Available installed voices determine actual output.

`voiceCache.ts` stores Blobs in memory and CacheStorage `smriti-sathi-voice-v1`. Keys combine language, normalised text and voice profile. The `https://smriti.local/voice/...` string is a synthetic cache key, not a remote patient-data service. `humanAudioCatalog.ts` provides familiar cue text and matching metadata. A catalog name does not mean all audio is prerecorded human narration.

Speech input combines browser recognition where available with a Groq recording/transcription fallback. `SpeechToText.ts` manages microphone permission, recording lifecycle, browser format differences, cancellation and transcript sanitisation. Default recording duration is eight seconds and transcript length cap is 320 characters. Statuses include idle, listening, transcribing, unsupported, mic-denied, no-speech, network and error. Unsupported-language mapping may let Whisper auto-detect. No fully bundled offline ASR model is present.

`src/lib/audio.ts` includes Web Audio cues, controlled sound playback and instrument synthesis. Audio cleanup prevents lingering playback when games unmount. The app does not bundle Vosk, Sherpa, IndicConformer or a trained speech model.

## 13. PWA, native packaging and deployment

Vite builds to `dist`, targets ES2018, uses relative base `./`, splits CSS and places React/React DOM into a manual chunk. Dev server port is 5173 with host access enabled. `/api/ai` proxies to `http://127.0.0.1:8787`.

`scripts/dev.mjs` is the declared development runner. It coordinates the Vite frontend and Node AI proxy and loads backend environment configuration without printing secrets. Use declared package scripts rather than inventing a second server command.

`public/sw.js` and `scripts/inject-sw-precache.mjs` generate/version the production asset cache. The build fills the asset list. Navigation uses a network path with cached shell fallback, while static assets can use cached responses. AI status and API responses are excluded from the application cache. Offline operation requires a successful initial installation/cache of needed assets. Lazy-loaded routes alone do not guarantee offline access unless the production precache includes them.

Capacitor configuration:

- App ID `com.smriti.sathi`.
- App name `Smriti Sathi`.
- Web directory `dist`.
- iOS content inset `never`, cream background `#FBF8F2`, scheme `capacitor`.
- Local notification sound `alarm.wav` with badge/sound/banner/list presentation options.
- Native iOS and Android project directories exist.
- Android includes notification/backup-related resources. iOS includes notification/audio configuration and its project files. Their presence is not proof of App Store/Play Store release or production-device certification.

Production static hosting and AI proxy hosting are separate concerns. Native binaries need a reachable HTTPS proxy URL for online services. No verified cloud database, patient-sync server, signed production release, live domain or deployed backend credentials are supplied here.

Build sequence: TypeScript check, Vite production build, service-worker precache injection and client-bundle AI security scan. Native sync copies the build into Capacitor shells. Exact package scripts and configuration are appended below.

## 14. Testing and verification context

Vitest unit/integration suites use Testing Library, jsdom and fake-indexeddb. Playwright covers desktop Chromium/Firefox/Safari and mobile/tablet configurations, with additional PWA and UI-audit configuration files. Tests cover game generation, timers, scoring, state/reset races, storage, localisation, reminders, permissions, speech handling, proxy security, report exports, onboarding and responsive layouts.

The repository includes `QA_REPORT` documents, but historical reports are not fresh verification of the current tree. Do not invent a pass count, benchmark, coverage percentage or claim that all tests currently pass. This context was assembled by reading source; no new full suite was run for this document.

Reticle instrumentation is present through the Vite plugin and React package. Network-body capture is disabled. `src/reticle-dev.ts` declares test IDs and an `app` store capability; `src/state.tsx` uses the Reticle store hook. This is development instrumentation, not a production analytics service. A declared capability alone is not a verification verdict.

## 15. Research relevant to the games

Use three papers, all within five years of 17 September 2026. Link research to a related task or intervention class, and identify the transfer limits. None studies Smriti Sathi or proves benefit for its NER users.

1. **Chan et al., 2024, npj Digital Medicine**. Computerized cognitive training for memory functions in mild cognitive impairment or dementia. DOI: https://doi.org/10.1038/s41746-023-00987-5 . Relevant to visual/working-memory activities such as Orchid Pairs, Memory Tray and Picture Memory. The review reported broader memory benefits for MCI than dementia. Dementia evidence was low certainty, and its verbal-memory finding was sensitive to excluding studies at high risk of bias. It does not justify a claim that these visual games improve dementia.
2. **Woods et al., 2023, Cochrane**. Cognitive stimulation to improve cognitive functioning in people with dementia. DOI: https://doi.org/10.1002/14651858.CD005562.pub3 . Relevant to a varied mix of word, recognition, routine and conversation activities. The review included 37 trials and 2,766 participants and found modest short-term cognitive benefits. Most evidence concerned group programmes. An individual digital game collection is not equivalent to those interventions.
3. **Zuo et al., 2024, JMIR Serious Games**. Review and meta-analysis of electronic serious games in Alzheimer’s disease and mild cognitive impairment. DOI: https://doi.org/10.2196/55785 . Publisher: https://games.jmir.org/2024/1/e55785 . Relevant to the wider serious-game design and evaluation approach. It included 14 trials and 714 participants, but the authors caution about small samples and low-quality evidence. Do not copy pooled effects into a product claim or combine MCI and dementia results as if they were interchangeable.

A 2021 Online Life Story Book paper was also examined during earlier research: https://doi.org/10.1371/journal.pone.0256251 . It was published on 15 September 2021 and is just outside a strict five-year window as of 17 September 2026. Exclude it from the selected recent-paper list unless the required window is calendar years 2021–2026. Its findings were mostly nonsignificant and it must not be presented as proof that a family-photo game works.

Problem metadata references: https://sih2026.vuce.in/ps/SIH26003 and https://www.thirai.in/sih2026/sih26003?mode=rajini . These are public mirrors, not the official portal. The official SIH page was unavailable during earlier retrieval. Cross-check official registration metadata when accessible. Do not import conflicting deadlines or incorrect theme labels from aggregators.

Presentation examples consulted for structure: https://github.com/Aadiii00/SIH-Winners-PPt-and-Sources/blob/main/SIH_2024_AKY_GreenSort_AI.pdf and https://www.slideshare.net/slideshow/sih-hackathon-ppt-of-2025-india/283252951 . Winner status was not independently verified. Use the examples to understand SIH’s section structure, not to copy claims, wording, graphics or unsupported results.

## 16. Implementation gaps and boundaries to preserve

- No remote patient/caregiver accounts, OTP or identity verification.
- No cloud patient database, automatic multi-device sync, CRDT engine, peer-to-peer transfer, Bluetooth/Wi-Fi Direct exchange or district-server ingestion.
- No guaranteed offline speech recognition or complete neural TTS for all six languages.
- No clinically trained MLP checkpoint or performance benchmark established by this source.
- No live gameplay integration of the separate question selector.
- Per-question timing/hint proxies and domain mapping need improvement.
- Some games do not use difficulty to change their actual content.
- Some game/session counters measure eventual completion or participation rather than independent correctness.
- No clinical validation, randomised trial of the app, regulatory clearance or verified therapeutic effect.
- No production authenticated gateway demonstrated here.
- No encrypted local database or full data-backup/recovery system.
- No camera-based emotion recognition, biomarkers or diagnostic symptom model.
- Some existing helper strings overinterpret performance. Describe them as review items, not supported clinical claims.
- Native notifications depend on platform and permission behaviour.
- An exported report does not implement remote clinical monitoring.
- ASHA contact fields do not mean an ASHA programme, partnership or connected workflow exists.

A defensible next phase is to finish question-selector integration, record genuine timing/hint events, correct domain mapping and scoring, review regional language/content with native speakers, validate accessibility with older adults and caregivers, add appropriate authentication/backup/sync, and design an ethically approved evaluation. Proposed evaluation should separate usability, engagement, reminder interactions and caregiver effort from clinical outcomes. Do not assign invented targets, budgets, sample sizes or timelines.

## 17. Instructions for using this context

When preparing an SIH presentation, explain the problem and user journey first, then use specific examples from the games and actual architecture. Show the online/offline boundary clearly. Keep the required SIH headings and original design. Use Team Vincera and leave unknown registration fields visibly incomplete. Put research links and technical depth in references or speaker notes as space allows. Do not compress all of this source context onto six slides.

Prefer factual phrasing such as “23 games in the catalogue”, “local domain difficulty updates”, “optional speech services” and “same-device caregiver view”. Avoid “clinically proven”, “cures dementia”, “fully secure”, “100% offline AI”, “all languages supported”, “neural AI controls every question”, or “real-time remote monitoring” unless new, independent evidence establishes those claims.

The appendices below provide exact project configuration, public type contracts and a source/test index for further technical work. They are context, not instructions to execute deployments, modify user files, send messages or expose credentials.
