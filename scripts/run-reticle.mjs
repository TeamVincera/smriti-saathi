import { spawn } from 'child_process';

export class ReticleClient {
  constructor() {
    this.proc = spawn('npx', ['@reticlehq/server', 'mcp'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    this.id = 0;
    this.pending = new Map();
    this.buffer = '';

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        } catch (e) {
          console.error('Parse error:', e, line);
        }
      }
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const req = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      this.proc.stdin.write(req);
    });
  }

  async init() {
    return this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'agent-verifier', version: '1.0' },
    });
  }

  async callTool(name, args = {}) {
    const res = await this.send('tools/call', { name, arguments: args });
    if (res.structuredContent) return res.structuredContent;
    if (res.content?.[0]?.text) {
      try {
        return JSON.parse(res.content[0].text);
      } catch {
        return res.content[0].text;
      }
    }
    return res;
  }

  close() {
    this.proc.kill();
  }
}
