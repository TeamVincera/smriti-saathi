import { ReticleClient } from './run-reticle.mjs';

async function main() {
  const client = new ReticleClient();
  await client.init();

  console.log('1. Checking sessions...');
  const sessions = await client.callTool('reticle_sessions');
  console.log('Sessions:', JSON.stringify(sessions));

  const sessionId = sessions.sessions[0].sessionId;

  console.log('\n2. Starting recording for flow: garden_navigation...');
  const recStart = await client.callTool('reticle_run', {
    tool: 'reticle_record',
    args: { action: 'start', recordingName: 'garden_navigation' },
  });
  console.log('Record start:', recStart);

  console.log('\n3. Taking snapshot...');
  const snapshot = await client.callTool('reticle_snapshot', {
    sessionId,
    mode: 'interactive',
  });
  console.log('Snapshot nodes count:', snapshot.nodes);
  console.log('Snapshot tree:\n' + snapshot.tree);

  // Find garden tab ref from snapshot tree
  // Tree line format: - button "Garden" (ref=e114)
  const gardenMatch = snapshot.tree.match(/button "Garden"\s+\(ref=(e\d+)\)/);
  const gardenRef = gardenMatch ? gardenMatch[1] : undefined;
  console.log('Garden button ref:', gardenRef);

  console.log('\n4. Driving action: Click Garden tab and wait for garden page...');
  const gardenVerdict = await client.callTool('reticle_act_and_wait', {
    sessionId,
    ref: gardenRef,
    action: 'click',
    until: {
      kind: 'allOf',
      predicates: [
        { kind: 'route', contains: '/garden' },
        { kind: 'element', query: { role: 'heading', name: 'Garden' }, state: 'visible' },
        { kind: 'console', level: 'error', absent: true },
      ],
    },
  });
  console.log('Garden verdict:', JSON.stringify(gardenVerdict, null, 2));

  // Take snapshot on garden page to find Home button ref
  const snap2 = await client.callTool('reticle_snapshot', {
    sessionId,
    mode: 'interactive',
  });
  const homeMatch = snap2.tree.match(/button "Home"\s+\(ref=(e\d+)\)/);
  const homeRef = homeMatch ? homeMatch[1] : undefined;
  console.log('Home button ref:', homeRef);

  console.log('\n5. Driving action: Click Home tab and wait for home page...');
  const homeVerdict = await client.callTool('reticle_act_and_wait', {
    sessionId,
    ref: homeRef,
    action: 'click',
    until: {
      kind: 'allOf',
      predicates: [
        { kind: 'element', query: { role: 'button', name: '▶ Start' }, state: 'visible' },
        { kind: 'console', level: 'error', absent: true },
      ],
    },
  });
  console.log('Home verdict:', JSON.stringify(homeVerdict, null, 2));

  console.log('\n6. Reading state...');
  const state = await client.callTool('reticle_state', { sessionId });
  console.log('State:', JSON.stringify(state, null, 2));

  console.log('\n7. Stopping recording...');
  const recStop = await client.callTool('reticle_run', {
    tool: 'reticle_record',
    args: { action: 'stop', recordingName: 'garden_navigation' },
  });
  console.log('Record stop:', recStop);

  console.log('\n8. Saving flow: garden_navigation...');
  const flowSave = await client.callTool('reticle_run', {
    tool: 'reticle_flow_save',
    args: { flowName: 'garden_navigation' },
  });
  console.log('Flow save:', JSON.stringify(flowSave, null, 2));

  client.close();
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
