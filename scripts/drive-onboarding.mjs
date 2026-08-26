import { ReticleClient } from './run-reticle.mjs';

async function main() {
  const client = new ReticleClient();
  await client.init();

  const sessions = await client.callTool('reticle_sessions');
  const sessionId = sessions.sessions[0].sessionId;

  // Navigate to start fresh
  await client.callTool('reticle_navigate', { sessionId, url: 'http://localhost:5173/' });

  console.log('1. Starting recording for onboarding_full_flow...');
  await client.callTool('reticle_run', {
    tool: 'reticle_record',
    args: { action: 'start', recordingName: 'onboarding_full_flow' },
  });

  console.log('2. Step 1: Snapshot language selection screen...');
  const snap1 = await client.callTool('reticle_snapshot', { sessionId, mode: 'interactive' });
  console.log('Snapshot 1 tree:\n' + snap1.tree);

  const langMatch = snap1.tree.match(/button ".*English English"\s+\(ref=(e\d+)\)/);
  const langRef = langMatch ? langMatch[1] : undefined;

  console.log('3. Selecting English (' + langRef + ')...');
  await client.callTool('reticle_act', {
    sessionId,
    ref: langRef,
    action: 'click',
  });

  const snap2 = await client.callTool('reticle_snapshot', { sessionId, mode: 'interactive' });
  const next1Match = snap2.tree.match(/button "Next →"\s+\(ref=(e\d+)\)/);
  const next1Ref = next1Match ? next1Match[1] : undefined;

  console.log('4. Clicking Next on language screen (' + next1Ref + ')...');
  await client.callTool('reticle_act', {
    sessionId,
    ref: next1Ref,
    action: 'click',
  });

  console.log('5. Step 2: Snapshot patient info screen...');
  const snap3 = await client.callTool('reticle_snapshot', { sessionId, mode: 'interactive' });
  console.log('Snapshot 3 tree:\n' + snap3.tree);

  const nameMatch = snap3.tree.match(/textbox "Patient name"\s+\(ref=(e\d+)\)/);
  const nameRef = nameMatch ? nameMatch[1] : undefined;

  console.log('6. Typing patient name into', nameRef);
  await client.callTool('reticle_act', {
    sessionId,
    ref: nameRef,
    action: 'fill',
    args: { value: 'Sarala Devi' },
  });

  const snap4 = await client.callTool('reticle_snapshot', { sessionId, mode: 'interactive' });
  console.log('Snapshot 4 tree:\n' + snap4.tree);
  const next2Match = snap4.tree.match(/button "Next →"\s+\(ref=(e\d+)\)/);
  const next2Ref = next2Match ? next2Match[1] : undefined;

  console.log('7. Clicking Next (' + next2Ref + ') and asserting Clinical History heading appears...');
  const verdict = await client.callTool('reticle_act_and_wait', {
    sessionId,
    ref: next2Ref,
    action: 'click',
    until: {
      kind: 'allOf',
      predicates: [
        { kind: 'element', query: { role: 'heading', name: 'Clinical History' }, state: 'visible' },
        { kind: 'console', level: 'error', absent: true },
      ],
    },
  });
  console.log('Verdict:\n', JSON.stringify(verdict, null, 2));

  console.log('8. Reading state...');
  const state = await client.callTool('reticle_state', { sessionId });
  console.log('State:\n', JSON.stringify(state, null, 2));

  console.log('9. Stopping recording...');
  const recStop = await client.callTool('reticle_run', {
    tool: 'reticle_record',
    args: { action: 'stop', recordingName: 'onboarding_full_flow' },
  });
  console.log('Record stop:', recStop);

  client.close();
}

main().catch(console.error);
