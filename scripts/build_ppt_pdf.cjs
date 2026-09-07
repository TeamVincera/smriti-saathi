const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
  const mdPath = path.resolve(__dirname, '../PPT_TECHNICAL_BREAKDOWN.md');
  const pdfPath = path.resolve(__dirname, '../PPT_TECHNICAL_BREAKDOWN.pdf');
  const tempHtml = path.resolve(__dirname, '../temp_ppt_view.html');

  const rawMd = fs.readFileSync(mdPath, 'utf-8');

  // Convert markdown tables and blocks into clean HTML
  let htmlBody = rawMd
    .replace(/^# (.*$)/gim, '<h1 class="t1">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="t2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="t3">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>')
    .replace(/`([^`\n]+)`/gim, '<code>$1</code>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>');

  // Process tables and paragraphs
  const lines = htmlBody.split('\n');
  let inTable = false;
  let newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) continue; // divider
      if (!inTable) {
        inTable = true;
        newLines.push('<table>');
        const cells = line.split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('');
        newLines.push(`<thead><tr>${cells}</tr></thead><tbody>`);
      } else {
        const cells = line.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
        newLines.push(`<tr>${cells}</tr>`);
      }
    } else {
      if (inTable) {
        inTable = false;
        newLines.push('</tbody></table>');
      }
      newLines.push(lines[i]);
    }
  }
  if (inTable) newLines.push('</tbody></table>');

  const fullHtml = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Smriti Sathi — Technical PPT Breakdown</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', sans-serif;
        padding: 24px;
        color: #1E293B;
        background: #FBF8F2;
        line-height: 1.6;
        font-size: 13px;
      }
      .banner {
        background: linear-gradient(135deg, #162436 0%, #253950 100%);
        color: white;
        padding: 24px;
        border-radius: 12px;
        margin-bottom: 20px;
      }
      .banner h1 {
        font-family: 'Outfit', sans-serif;
        color: white;
        font-size: 26px;
        margin: 6px 0;
      }
      .banner p {
        color: #CBD5E1;
        font-size: 14px;
        margin: 0;
      }
      .tag {
        color: #F8D070;
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      h2.t2 {
        font-family: 'Outfit', sans-serif;
        color: #162436;
        font-size: 18px;
        border-bottom: 2px solid #162436;
        padding-bottom: 4px;
        margin-top: 26px;
        margin-bottom: 12px;
      }
      h3.t3 {
        font-family: 'Outfit', sans-serif;
        color: #9E2224;
        font-size: 15px;
        margin-top: 16px;
        margin-bottom: 8px;
      }
      pre {
        background: #162436;
        color: #F8D070;
        padding: 14px;
        border-radius: 8px;
        overflow-x: auto;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        margin: 12px 0;
      }
      pre code {
        background: none;
        color: inherit;
        padding: 0;
      }
      code {
        font-family: 'JetBrains Mono', monospace;
        background: #E2E8F0;
        color: #0F172A;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11.5px;
      }
      ul {
        margin-left: 20px;
        margin-bottom: 10px;
      }
      li {
        margin-bottom: 4px;
      }
      @page {
        size: A4;
        margin: 14mm;
      }
    </style>
  </head>
  <body>
    <div class="banner">
      <div class="tag">Smart India Hackathon (SIH) Technical Guide</div>
      <h1>Smriti Sathi PPT Technical Breakdown</h1>
      <p>Architecture, Stack, Data Flow, Code Snippets & Slides Outline</p>
    </div>
    ${newLines.join('\n')}
  </body>
  </html>`;

  fs.writeFileSync(tempHtml, fullHtml, 'utf-8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + tempHtml, { waitUntil: 'networkidle' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
  });

  await browser.close();
  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);

  console.log('PDF successfully generated at:', pdfPath);

  try {
    execSync(`open "${pdfPath}"`);
    console.log('PDF opened in native macOS Preview app!');
  } catch (e) {
    console.log('Could not open viewer:', e.message);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
