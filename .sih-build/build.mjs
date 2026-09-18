import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const source='/Users/naitik/Downloads/SIH2026-IDEA-Presentation-Format (1).pptx';
const p=await PresentationFile.importPptx(await FileBlob.load(source));
const snap=(await p.inspect({kind:'textbox',maxChars:60000})).ndjson.split('\n').filter(Boolean).map(x=>JSON.parse(x));
const get=(slide,name)=>p.resolve(snap.find(x=>x.slide===slide&&x.name===name).id);
const edits=[];
function body(slide,name,paras,box,size=28){
 const s=get(slide,name); s.text=paras.map(x=>({spaceAfter:1100,runs:x.map(r=>typeof r==='string'?{run:r}:{run:r.t,textStyle:{bold:true,color:'#204D82'},...(r.url?{link:{uri:r.url,isExternal:true}}:{})})}));
 s.text.style={fontSize:size*4/3,typeface:'Arial',color:'#000000',alignment:'left',verticalAlignment:'top',wrap:'square',autoFit:'none',insets:{left:0,right:0,top:0,bottom:0}};
 for(const para of paras)for(const r of para)if(typeof r!=='string')s.text.get(r.t).fill='#204D82';
 if(box)s.position=box;
 edits.push({slide,name,geometry:!!box});
}
get(1,'Subtitle 3').text.replace('TITLE PAGE','SMRITI SATHI'); edits.push({slide:1,name:'Subtitle 3'});
body(1,'TextBox 9',[
 [{t:'Problem Statement ID: '},'SIH26003'],
 [{t:'Problem Statement Title:'},'\nAI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)'],
 [{t:'Theme: '},'MedTech / BioTech / HealthTech'],
 [{t:'PS Category: '},'Software'],
 [{t:'Team ID: '},'[Enter registered ID]'],
 [{t:'Team Name: '},'Team Vincera']
],{left:44,top:245,width:635,height:454},24);
get(2,'Title 1').text.replace('IDEA TITLE','SMRITI SATHI'); edits.push({slide:2,name:'Title 1'});
for(let i=2;i<=6;i++){
 const e=snap.find(x=>x.slide===i&&x.name.startsWith('Oval'));
 const s=p.resolve(e.id); s.text='Team\nVincera';
 s.text.style={typeface:'Arial',fontSize:24,color:'#000000',alignment:'center',verticalAlignment:'middle',wrap:'square',autoFit:'none',insets:{left:0,right:0,top:0,bottom:0}};
 edits.push({slide:i,name:e.name});
}
body(2,'TextBox 8',[
 [{t:'Proposed Solution: games and daily memory assistance'}],
 [{t:'23 games. '},'Orchid Pairs matches hidden cards. Memory Tray asks which item disappeared after a 10-second view. [1]'],
 [{t:'Familiar daily life. '},'Order routines in Daily Life Sequence. Recognise regional foods. Share memories through Festival Tales. [2, 3]'],
 [{t:'Problem fit. '},'Six language choices, large controls, offline activities, medicine/routine reminders and a local caregiver view.'],
 [{t:'Innovation. '},'Regional content and gentle cues combine with difficulty that responds to answers.']
],{left:64,top:165,width:1152,height:478});
body(3,'TextBox 8',[
 [{t:'Technologies. '},'React, TypeScript, Vite and Capacitor. IndexedDB stores local data. A service worker caches core assets.'],
 [{t:'Current game loop. '},'Choose local content, record an answer, update domain ability, then set the next round’s difficulty.'],
 [{t:'AI personalisation. '},'Local LinUCB recommends the next game. The separate 25-feature neural question engine still needs gameplay integration.'],
 [{t:'Optional online services. '},'A server proxy connects chat and speech providers. Core play continues offline.']
],{left:64,top:165,width:1152,height:478});
body(4,'TextBox 8',[
 [{t:'Feasibility. '},'Games, local adaptation, reminders and caregiver views run on standard mobile/tablet hardware.'],
 [{t:'Challenges and risks. '},'Speech support varies by language. Notifications need permissions. Clearing app data can erase local records.'],
 [{t:'Strategies. '},'Use cached audio and text fallbacks. Check permissions. Add encrypted backup, authentication and sync before wider deployment.'],
 [{t:'Next validation. '},'Native-speaker review, accessibility sessions with older adults, then a clinician-supervised pilot.']
],{left:64,top:178,width:1152,height:453});
body(5,'TextBox 8',[
 [{t:'For older adults. '},'Familiar activities aim to encourage daily engagement and shared play with family.'],
 [{t:'For caregivers. '},'One local view shows completed sessions, reminder logs and activity trends.'],
 [{t:'For remote households. '},'Core use needs no continuous connection or special hardware. Optional cloud services add running costs.'],
 [{t:'How we will measure benefit. '},'Measure completion, reminder acknowledgement, caregiver effort and usability in a pilot. Clinical benefit remains unproven.']
],{left:64,top:178,width:1152,height:453});
const sources=[
 {label:'Chan et al. (2024), npj Digital Medicine',url:'https://doi.org/10.1038/s41746-023-00987-5',detail:'Memory training. Design link: Pairs and Tray. Dementia evidence is limited.'},
 {label:'Woods et al. (2023), Cochrane',url:'https://doi.org/10.1002/14651858.CD005562.pub3',detail:'Cognitive stimulation. Design link: varied activities. Evidence is mostly from groups.'},
 {label:'Elfrink et al. (2021), PLOS ONE',url:'https://doi.org/10.1371/journal.pone.0256251',detail:'Life Story Book trial. Design link: Festival Tales. Most outcomes were not significant.'}
];
body(6,'TextBox 8',sources.map((s,i)=>[{t:`[${i+1}] ${s.label}`,url:s.url},'\n'+s.detail]).concat([
 [{t:'Scope: '},'2021–2026 research. These papers do not validate Smriti Sathi.']
]),{left:64,top:165,width:1152,height:481},28);
const notes=[
 'Smriti Sathi is an assistive cognitive engagement and daily routine prototype for older adults and their families. It does not diagnose dementia or establish a treatment effect. Team name provided by the team: Team Vincera. Registered team ID remains to be entered.\nProblem statement title, ministry, category and theme: https://sih2026.vuce.in/ps/SIH26003 . This is a community-maintained mirror. The official SIH page could not be retrieved during research. Cross-check registration metadata on the portal before submission.\nCode evidence: package.json, PRD.md, src/lib/types.ts.',
 'The game catalogue contains 23 games. Examples include Faces of Home, Traditional Foods & Harvest, Daily Life Sequence, Orchid Pairs and Northeast Places & Nature. The six language choices are Assamese, Bengali, Bodo, Manipuri, Hindi and English. Content breadth and speech support vary by language.\nCore offline use assumes the app and required assets are installed/cached. Browser speech synthesis depends on available device voices. Online neural speech and transcription require service availability. Caregiver access currently operates on the same device. Remote accounts and multi-device sync are roadmap work.\nCode evidence: src/lib/games.ts, src/lib/types.ts, src/games/FacesOfHome.tsx, src/screens/Reminders.tsx, src/lib/adaptive/AdaptiveQuestionEngine.ts, src/lib/db.ts, public/sw.js.\nProblem alignment: https://sih2026.vuce.in/ps/SIH26003 .',
 'Question selection extracts 25 features. The MLP has layers 25, 16, 8 and 1 and uses hand-set default weights, with no clinical training dataset established in this repository. The engine combines 60% LinUCB score and 40% MLP score, then applies safeguards. The contextual bandit updates from observed responses. There is also a separate session-level recommender.\nSafety rules reduce immediate repetition, favour easier eligible questions after repeated mistakes, and limit jumps in difficulty when suitable alternatives exist. These are usability rules, not clinical assessments of fatigue or disease.\nIndexedDB holds local profiles, events, sessions, medicines, logs and reminders. Optional proxy services use server-held provider keys. Production still needs a proper authenticated gateway. The local caregiver PIN is not cloud authentication or encrypted storage.\nCode evidence: src/lib/adaptive/FeatureExtractor.ts, MLInferenceEngine.ts, AdaptiveQuestionEngine.ts, BanditPolicy.ts, SafetyGuard.ts, src/lib/linucb.ts, src/lib/db.ts, server/ai-proxy.mjs, src/lib/voice/VoiceService.ts.\nMethod reference: Li, Chu, Langford and Schapire (2010), A Contextual-Bandit Approach to Personalized News Article Recommendation. https://arxiv.org/abs/1003.0146 . The paper motivates the algorithm, not medical efficacy.',
 'Feasibility refers to implementation visible in the repository, not a clinical trial or a claim of production readiness. No new live app verification was performed to prepare this deck.\nCurrent limitations include device-local data, no remote caregiver authorisation or multi-device synchronisation, variable language/speech coverage, notification permissions and OS delivery restrictions. The application database is not encrypted. Proposed mitigations such as encrypted backup, authentication and sync require further implementation.\nPilot plan: native-speaker review, caregiver-assisted accessibility sessions on representative devices, and a clinician-supervised evaluation with an appropriate consent process. These are proposed activities with no claimed recruitment, partnership or results.\nCode evidence: PRD.md sections 4, 6, 7 and 9; src/lib/voice/VoiceService.ts; src/lib/voice/SpeechToText.ts; src/lib/alarmService.ts; src/lib/db.ts; docs/AI_PROXY.md.',
 'Benefits on this slide are intended outcomes to evaluate. We have no measured reduction in caregiver burden, improvement in medication adherence, cost saving or clinical efficacy for Smriti Sathi. Reminder acknowledgement is an interaction measure and does not prove a medicine was consumed.\nCochrane found modest short-term cognitive benefits across cognitive stimulation studies, mostly group programmes. Results cannot be transferred to this individual digital prototype.\nReferences: Woods et al. (2023), https://doi.org/10.1002/14651858.CD005562.pub3 ; WHO caregiver information, https://www.who.int/news-room/questions-and-answers/item/dementia-information-for-caregivers .\nImplementation evidence: src/components/caregiver/CaregiverAnalytics.tsx, src/lib/reports.ts, src/lib/reportExport.ts, src/lib/reminders.ts. Local report sharing is implemented. Full database backup is not.',
 sources.map(s=>s.label+'\n'+s.url+'\n'+s.detail).join('\n\n')+'\n\nPresentation references informed structure only. No claim that repository examples are verified SIH winners. Source template: SIH2026-IDEA-Presentation-Format (1).pptx, supplied by the team. Research accessed 11 September 2026. Code evidence: PRD.md, PPT_TECHNICAL_BREAKDOWN.md and implementation files cited on individual slides.'
];
notes[1] = `GAME ANALYSIS AND RESEARCH CONNECTIONS
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
notes[1] += '\nAdditional code detail: Picture Memory records difficulty updates, but its content generator currently ignores the level argument. Faces of Home uses a fixed five-round sequence. Do not claim every game changes its content difficulty after every answer.';
notes[4] += '\nGame-evaluation priorities: record real timing and explicit hint events, separate participation-only activities from scored tasks, and measure outcomes independently of app-generated scores. No study cited establishes that these regional themes improve outcomes in NER dementia patients.';
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
notes.forEach((n,i)=>p.slides.items[i].speakerNotes.textFrame.setText(n));
await fs.writeFile('.sih-build/edits.json',JSON.stringify(edits,null,2));
await (await PresentationFile.exportPptx(p)).save('.sih-build/authored.pptx');
console.log('Authored',edits.length,'content fields');
