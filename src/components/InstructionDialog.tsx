import React, { useState } from "react";
import { X, Copy, Check, Terminal, ExternalLink, ShieldCheck, HelpCircle } from "lucide-react";

interface InstructionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export default function InstructionDialog({ isOpen, onClose, token }: InstructionDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeOSTab, setActiveOSTab] = useState<"unix" | "windows">("unix");

  if (!isOpen) return null;

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const packageJsonCode = `{
  "name": "cli-agents-bridge",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "ws": "^8.18.0",
    "node-pty": "^1.1.0"
  }
}`;

  const serverJsCode = `import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import os from 'os';

const PORT = 8787;
const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || '';

console.log(\`===> CLI Agents Local Bridge running on ws://localhost:\${PORT}\`);
if (BRIDGE_TOKEN) {
  console.log('===> Security Mode: Active (Token check enabled)');
} else {
  console.log('===> Security Mode: Disabled (Add BRIDGE_TOKEN env var to secure)');
}

wss.on('connection', (ws, req) => {
  // Validate token if configured
  const urlParams = new URL(req.url || '', \`http://\${req.headers.host || 'localhost'}\`).searchParams;
  const tokenParam = urlParams.get('token') || '';

  if (BRIDGE_TOKEN && tokenParam !== BRIDGE_TOKEN) {
    console.warn(\`[Auth Rejected] Connection request from \${req.socket.remoteAddress} with invalid token.\`);
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication rejected: Invalid safety token.' }));
    ws.close();
    return;
  }

  console.log('[Connected] Client established secure session.');
  let ptyProcess = null;

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'spawn') {
        const shell = msg.command;
        const args = msg.args || [];
        const cwd = msg.cwd || os.homedir();
        const env = { ...process.env, ...msg.env };

        console.log(\`[Spawn] Executing: "\${shell}" \${args.join(' ')}\`);

        ptyProcess = pty.spawn(shell, args, {
          name: 'xterm-256color',
          cols: msg.cols || 80,
          rows: msg.rows || 24,
          cwd,
          env,
        });

        // Pipe stdout/stderr data back to websocket
        ptyProcess.onData((data) => {
          ws.send(JSON.stringify({ type: 'data', data }));
        });

        ptyProcess.onExit(({ exitCode }) => {
          console.log(\`[Exit] Process finished with code \${exitCode}\`);
          ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
          ptyProcess = null;
        });

      } else if (msg.type === 'stdin') {
        if (ptyProcess) {
          ptyProcess.write(msg.data);
        }
      } else if (msg.type === 'resize') {
        if (ptyProcess) {
          ptyProcess.resize(msg.cols, msg.rows);
        }
      } else if (msg.type === 'kill') {
        if (ptyProcess) {
          ptyProcess.kill();
          ptyProcess = null;
        }
      }
    } catch (err) {
      console.error('[Error] Parsing websocket frame:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[Disconnected] Client closed connection.');
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
  });
});`;

  const unixCommands = `# Create a local bridge workspace
mkdir cli-bridge && cd cli-bridge

# Quick-write config files (or download package.json / server.js directly)
# Then install dependencies
npm install

# Start the bridge (with our configured safety token)
export BRIDGE_TOKEN="${token}"
npm start`;

  const winCommands = `# Create secure workspace
mkdir cli-bridge; cd cli-bridge

# Complete install
npm install

# Start the bridge on Windows
$env:BRIDGE_TOKEN="${token}"
npm start`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#111112] border border-[#2d2d2d] w-full max-w-2xl max-h-[90vh] rounded-sm flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-[#2d2d2d] bg-[#111112]">
          <div className="flex items-center space-x-2 text-orange-500">
            <Terminal className="w-5 h-5" />
            <h2 className="text-sm font-mono font-bold tracking-wider text-gray-200">LOCAL NODE BRIDGE SETUP</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-[#151516] rounded transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content scrolling portal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              Lovable runs inside a secure, sandboxed web environment (Cloudflare Workers / SSR). To execute local build
              cli tools like <code className="text-orange-400 bg-black px-1 py-0.5 rounded">claude-code</code>,
              your browser connects to a lightweight WebSocket bridge running locally on your own machine.
            </p>
          </div>

          {/* Tab Selection */}
          <div className="border-b border-[#2d2d2d] flex justify-between items-end font-mono">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveOSTab("unix")}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 rounded-t-sm cursor-pointer ${
                  activeOSTab === "unix"
                    ? "border-orange-500 text-orange-500 bg-[#0c0c0d]"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                macOS / Linux
              </button>
              <button
                onClick={() => setActiveOSTab("windows")}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 rounded-t-sm cursor-pointer ${
                  activeOSTab === "windows"
                    ? "border-orange-500 text-orange-500 bg-[#0c0c0d]"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                Windows Powershell
              </button>
            </div>
            <div className="text-[10px] text-gray-500 pb-2">Step 1 of 2: Installation</div>
          </div>

          {/* Quick installation step */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-300 mb-2 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Install dependencies and launch the bridge:
              </p>
              <div className="relative font-mono">
                <pre className="text-[11px] bg-[#0c0c0d] border border-[#2d2d2d] p-4 rounded-sm text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
                  {activeOSTab === "unix" ? unixCommands : winCommands}
                </pre>
                <button
                  onClick={() => handleCopyText(activeOSTab === "unix" ? unixCommands : winCommands, 1)}
                  className="absolute right-3 top-3 p-1.5 bg-[#111112] hover:bg-[#151516] text-gray-400 hover:text-white rounded border border-[#2d2d2d] transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIndex === 1 ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {activeOSTab === "windows" ? (
              <div className="bg-orange-950/20 border border-orange-900/20 p-4 rounded-sm space-y-2">
                <h4 className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-orange-400" /> Windows C++ compiler requirement
                </h4>
                <p className="text-[11px] text-gray-300 leading-relaxed font-mono">
                  The <code className="text-orange-400 font-bold">node-pty</code> native binding spawns OS terminal
                  processes. On Windows, it compiles C++ modules on initial install. Ensure you have Node build modules:
                </p>
                <div className="relative font-mono bg-black p-2.5 rounded-sm border border-[#2d2d2d] select-text">
                  <code className="text-[10px] text-gray-400">npm install --global --production windows-build-tools</code>
                </div>
              </div>
            ) : (
              <div className="bg-[#151516] border border-[#2d2d2d] p-4 rounded-sm space-y-1">
                <h4 className="text-xs font-mono font-bold text-gray-300">Tip: Pre-compiled folder</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                  We have pre-created all these modular bridge files ready inside your workspace in the{" "}
                  <code className="text-orange-400 font-bold">bridge/</code> folder. You can download or clone them
                  directly!
                </p>
              </div>
            )}
          </div>

          {/* Deep dive files if user wants to build manually */}
          <div className="space-y-4 border-t border-[#2d2d2d] pt-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono font-bold text-gray-200 uppercase tracking-widest">
                Source Code Blueprint
              </h3>
              <p className="text-[10px] text-gray-500 font-mono">For manual folder configurations</p>
            </div>

            {/* package.json */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono font-semibold text-orange-400 bg-orange-950/15 border border-orange-905/30 px-2 py-0.5 rounded-sm">
                  bridge/package.json
                </span>
                <button
                  onClick={() => handleCopyText(packageJsonCode, 2)}
                  className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedIndex === 2 ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <pre className="text-[10.5px] bg-[#0c0c0d] border border-[#2d2d2d] p-3.5 rounded-sm text-gray-400 overflow-x-auto select-text leading-relaxed font-mono">
                {packageJsonCode}
              </pre>
            </div>

            {/* server.js */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono font-semibold text-orange-400 bg-orange-950/15 border border-orange-905/30 px-2 py-0.5 rounded-sm">
                  bridge/server.js
                </span>
                <button
                  onClick={() => handleCopyText(serverJsCode, 3)}
                  className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedIndex === 3 ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <pre className="text-[10.5px] bg-[#0c0c0d] border border-[#2d2d2d] p-3.5 rounded-sm text-gray-400 overflow-x-auto select-text leading-normal max-h-64 font-mono">
                {serverJsCode}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-[#2d2d2d] bg-[#111112] flex items-center justify-between font-mono text-xs text-gray-500">
          <p className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Runs under your normal system user
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-sm transition-colors shadow-md cursor-pointer"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
