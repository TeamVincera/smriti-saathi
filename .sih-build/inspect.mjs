import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('/Users/naitik/Downloads/SIH2026-IDEA-Presentation-Format (1).pptx'));
await fs.writeFile('.sih-build/template-inspect.txt',(await p.inspect({kind:'slide,textbox,shape,image,layout',maxChars:60000})).ndjson);
for(let i=0;i<p.slides.items.length;i++){
 const s=p.slides.items[i]; const b=await p.export({slide:s,format:'png',scale:1}); await fs.writeFile(`.sih-build/template-${i+1}.png`,new Uint8Array(await b.arrayBuffer()));
}
console.log('Rendered',p.slides.items.length);
