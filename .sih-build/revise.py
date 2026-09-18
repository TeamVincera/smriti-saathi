p='.sih-build/build.mjs';s=open(p).read();s=s.replace('fontSizePt:size','fontSize:size*4/3').replace("fontSizePt:18","fontSize:24").replace("verticalAlignment:'middle',wrap:'square',autoFit:'none'","verticalAlignment:'middle',wrap:'square',autoFit:'none',insets:{left:0,right:0,top:0,bottom:0}")
a=s.index("body(2,'TextBox 8'");b=s.index("body(4,'TextBox 8'",a)
s=s[:a]+'''body(2,'TextBox 8',[
 [{t:'Proposed Solution: 23 games with daily memory assistance'}],
 [{t:'Recall and attention. '},'Orchid Pairs matches hidden cards. Memory Tray recalls a missing item after a 10-second view. [1]'],
 [{t:'Familiar daily life. '},'Daily Life Sequence orders routines. Traditional Foods recognises regional dishes. Festival Tales invites family conversation. [2, 3]'],
 [{t:'Problem fit. '},'Six language choices, large controls, offline activities, reminders and a local caregiver view support everyday use.'],
 [{t:'What is different. '},'Regional content, gentle cues and difficulty that responds to answers, together in one app.']
],{left:64,top:165,width:1152,height:478});
body(3,'TextBox 8',[
 [{t:'Technologies. '},'React, TypeScript, Vite and Capacitor. IndexedDB stores local data. A service worker caches core assets.'],
 [{t:'Current game loop. '},'Choose local content, record an answer, update domain ability, then set the next round’s difficulty.'],
 [{t:'AI personalisation. '},'Local LinUCB recommends the next game. The separate 25-feature neural question engine still needs gameplay integration.'],
 [{t:'Optional online services. '},'A server proxy connects chat and speech providers. Core play continues offline.'],
 [{t:'Next engineering step. '},'Connect question ranking to real answer timing and hint events.']
],{left:64,top:165,width:1152,height:478});
''' + s[b:]
a=s.index('const sources=[');b=s.index('const notes=[',a)
s=s[:a]+'''const sources=[
 {label:'Chan et al. (2024), npj Digital Medicine',url:'https://doi.org/10.1038/s41746-023-00987-5',detail:'Computerised memory training: Orchid Pairs and Memory Tray. Dementia evidence is limited.'},
 {label:'Woods et al. (2023), Cochrane',url:'https://doi.org/10.1002/14651858.CD005562.pub3',detail:'Cognitive stimulation: varied recall, word and routine activities. Mostly group-based evidence.'},
 {label:'Elfrink et al. (2021), PLOS ONE',url:'https://doi.org/10.1371/journal.pone.0256251',detail:'Online Life Story Book trial: family memories and Festival Tales. Most outcomes were not significant.'}
];
body(6,'TextBox 8',sources.map((s,i)=>[{t:`[${i+1}] ${s.label}`,url:s.url},'\\n'+s.detail]).concat([
 [{t:'Scope: '},'Papers published within the last five years. These studies do not validate Smriti Sathi.']
]),{left:64,top:165,width:1152,height:481},28);
''' + s[b:]
a=s.index("notes.forEach");
s=s[:a]+'''notes[1] = `GAME ANALYSIS AND RESEARCH CONNECTIONS
The catalogue has 23 games. Six language choices exist, but individual question banks and screens do not have equally complete translations. Game labels describe intended task demands, not validated clinical outcomes.

Memory tasks [1]
Orchid Pairs: turn over two hidden cards and match them. Two boards, with board-level difficulty updates. A missed pair remains visible for two seconds. This exact timing is a design choice, not established by the cited review.
Memory Tray: view objects for ten seconds, then identify the missing item over four rounds.
Picture Memory: inspect a scene, then answer a recall question over four rounds.
Faces of Home: identify a family member from supplied photos or fallback avatars over five rounds. The code saves spacing levels, but target selection currently cycles through faces. It does not schedule retrieval from those spacing intervals.

Recognition and language tasks [2]
Traditional Foods: select a dish from its description using regional food banks.
Familiar Objects: identify household objects from a prompt.
Morning Melodies: listen to a synthesised instrument sound and choose the instrument. This is auditory recognition, not a music-therapy protocol.
Village Sounds: recognise familiar environmental sounds.
Northeast Places & Nature: identify regional landmarks.
Familiar Phrases: complete a familiar phrase.
Word Harvest: select words associated with a category.

Attention, sequence and reasoning tasks [2]
Daily Life Sequence: tap routine steps in order. Wrong choices highlight a helpful next step. A four-second cue timer supports completion.
Number Bridge: tap numbers in order.
Weaver’s Loom: complete a visual motif.
Bamboo Crafting: sort an item into a category.
Odd One Out: identify the item outside a category.
Wildlife Safari: find targets in a visual scene.
Spot the Difference: identify the changed item between two scenes.
Tea Garden Walk: follow a path across a grid.
Cheraw Steps: reproduce a left/right rhythm by tapping. It is not an exercise programme or a mobility assessment.
Market Day: select purchases within a budget. It cannot establish real-world financial capacity.

Conversation and calm activities [3]
Festival Tales: read personalised festival stories and select subjective preferences. There is no right/wrong answer.
Memory Garden: follow breathing cues and tap flowers to water them. Its completion measure represents participation, not cognitive accuracy.

Interpretation limits
The current scoring bridge uses a fixed 3500 ms latency and derives hint count from answer correctness. It does not feed actual per-question timing and hint events into the question engine. Some game domain aliases fall back to recognition. The separate question selector has no gameplay caller in the current source.
Use memory/attention scores as task-specific observations. Distinguish cued responses, independent responses and participation. Standardise timing, hint logging and domain mapping before formal evaluation.

References [1] Chan et al. (2024): https://doi.org/10.1038/s41746-023-00987-5 . [2] Woods et al. (2023): https://doi.org/10.1002/14651858.CD005562.pub3 . [3] Elfrink et al. (2021): https://doi.org/10.1371/journal.pone.0256251 . These links connect related intervention types to design choices. None evaluates these exact games.
Code evidence: src/games/*.tsx, src/lib/content.ts, src/lib/adaptive.ts, src/lib/srt.ts, src/lib/games.ts.`;
notes[2] = `CURRENT GAMEPLAY AND AI BOUNDARIES
Most scored games call nextLevel and recordAnswer in src/lib/adaptive.ts. A lightweight logistic ability model updates from correctness and sets the next round’s level. Local content generators create the actual rounds. Some games keep a fixed level during one session.
Home calls recommendNextGame in src/lib/ai.ts. It can request an online recommendation, with a local LinUCB policy as fallback. GameHost records completed sessions, and the local bandit updates from these outcomes.
The separate AdaptiveQuestionEngine implements 25-feature MLP plus LinUCB ranking and safeguards, but selectNextQuestion has no caller in the gameplay/content path. Its MLP weights are hand-set, not trained on a clinical dataset. The older answer bridge forwards a fixed 3500 ms latency and inferred hints. Further integration and instrumentation are required before presenting full question-level AI as operational.
A rule in the question engine favours easier eligible questions after repeated errors. That code does not mean all live games use that safeguard.
IndexedDB holds local records. Optional server proxy services support online chat and speech. Provider keys stay on the server. Offline speech depends on cached audio and available device voices. Production needs stronger access controls and backup.
Code evidence: src/lib/adaptive.ts, src/lib/content.ts, src/lib/adaptive/AdaptiveQuestionEngine.ts, src/lib/adaptive/MLInferenceEngine.ts, src/lib/ai.ts, src/lib/linucb.ts, src/screens/Home.tsx, src/games/GameHost.tsx, public/sw.js, server/ai-proxy.mjs.`;
notes[4] += '\\nGame-evaluation priorities: record real timing and explicit hint events, separate participation-only activities from scored tasks, and measure outcomes independently of app-generated scores. No study cited establishes that these regional themes improve outcomes in NER dementia patients.';
notes[5] = `SELECTED PAPERS: 11 SEPTEMBER 2021 TO 11 SEPTEMBER 2026

[1] Chan ATC, Ip RTF, Tran JYS, Chan JYC, Tsoi KKF. Computerized cognitive training for memory functions in mild cognitive impairment or dementia: a systematic review and meta-analysis. npj Digital Medicine 7, 1 (2024). Published 3 January 2024. https://doi.org/10.1038/s41746-023-00987-5
Relevance: visual and working-memory task design in Orchid Pairs, Memory Tray and Picture Memory. The review included 1489 people with MCI and 371 with dementia. The dementia group showed a verbal-memory effect only, with low-certainty evidence. That effect lost statistical significance after excluding high-risk studies. It does not validate visual-memory improvement in dementia from these games. MCI findings cannot be treated as dementia results.

[2] Woods B, Rai HK, Elliott E, Aguirre E, Orrell M, Spector A. Cognitive stimulation to improve cognitive functioning in people with dementia. Cochrane Database of Systematic Reviews 2023(1), CD005562. Published 31 January 2023. https://doi.org/10.1002/14651858.CD005562.pub3
Relevance: a varied programme of word, recognition, routine and conversation activities. The review included 37 trials and 2766 participants. It found modest short-term cognitive benefits, largely from group programmes. A self-guided digital game collection is a different delivery format. Clinical equivalence and app-specific efficacy remain unproven.

[3] Elfrink TR, Ullrich C, Kunz M, Zuidema SU, Westerhof GJ. The Online Life Story Book trial of digital reminiscence in very mild/mild dementia and informal caregivers. PLOS ONE 16(9), e0256251 (2021). Published 15 September 2021. https://doi.org/10.1371/journal.pone.0256251
Relevance: personal memories and family participation in Festival Tales and photo-based engagement. In this 42-participant trial, most patient and caregiver outcomes did not show statistically significant effects. Self-rated caregiver distress improved during the intervention. The intervention used guided life-story creation, not a face-identification game. It supports examining this design approach, not a claim of proven benefit.

Problem metadata: https://sih2026.vuce.in/ps/SIH26003 (community-maintained mirror, cross-checked against another public listing). Official SIH page was unavailable during research.
Presentation examples consulted for structure: SIH 2024 GreenSort AI, https://github.com/Aadiii00/SIH-Winners-PPt-and-Sources/blob/main/SIH_2024_AKY_GreenSort_AI.pdf ; SIH 2025 idea format, https://www.slideshare.net/slideshow/sih-hackathon-ppt-of-2025-india/283252951 . Winner status not independently established.
Research accessed 11 September 2026. Source citations support the statements noted, not the prototype as a whole.`;
''' + s[a:]
open(p,'w').write(s)
