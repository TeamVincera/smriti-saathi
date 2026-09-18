import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { finalizePresentation } from '/Users/naitik/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations/container_tools/artifact_tool_utils.mjs';
const w='/Users/naitik/smriti sathi';
const sk='/Users/naitik/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const source='/Users/naitik/Downloads/SIH2026-IDEA-Presentation-Format (1).pptx';
const result=await finalizePresentation({
 workspaceDir:w,candidatePath:path.join(w,'.sih-build/candidate.pptx'),finalPath:path.join(w,'output/sih/Team-Vincera-Smriti-Sathi-SIH26003.pptx'),
 pythonExecutable:'/Users/naitik/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
 integrityValidatorPath:path.join(sk,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(sk,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:6,
 fontPolicy:{basis:'reference',families:['Arial','Times New Roman','Garamond'],referencePath:source,referenceSha256:crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex')},
 verifyArtifactToolImport:true,receiptPath:path.join(w,'.sih-build/final-validation.json')
});
console.log(result);
