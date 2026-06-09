import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import os from 'os';

const PORT = 8787;
// Bind back to 127.0.0.1 (localhost) ONLY for safety reasons!
const HOST = '127.0.0.1';

const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || '';

const wss = new WebSocketServer({ port: PORT, host: HOST });

console.log('====================================================');
console.log(`===> CLI Agents Local Bridge running on ws://${HOST}:${PORT}`);
if (BRIDGE_TOKEN) {
  console.log('===> Security Mode: Enabled (Shared Token checking active)');
} else {
  console.log('===> Security Mode: Disabled (No BRIDGE_TOKEN env var detected - unsafe for non-localhost entries!)');
}
console.log('====================================================');

wss.on('connection', (ws, req) => {
  // Parse token from connection request query parameters
  const urlParams = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`).searchParams;
  const tokenParam = urlParams.get('token') || '';

  // Validate security token if configured
  if (BRIDGE_TOKEN && tokenParam !== BRIDGE_TOKEN) {
    console.warn(`[Blocked Attempt] Connection request from ${req.socket.remoteAddress} failed token validation.`);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Access Unauthorized: Invalid safety token. Configure matches on both Applet UI & local bridge environment.' 
    }));
    ws.close();
    return;
  }

  console.log(`[Connected] Secure browser session established from ${req.socket.remoteAddress}`);
  
  let ptyProcess = null;

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'spawn') {
        const shell = msg.command;
        const args = msg.args || [];
        const cwd = msg.cwd || os.homedir();
        // Fallback default LANG environments
        const env = { 
          ...process.env, 
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          LANG: 'en_US.UTF-8',
          ...msg.env 
        };

        console.log(`[Spawn Process] Launching command: "${shell}" with args [${args.join(', ')}]`);

        // Spawn a real, interactive terminal process using native node-pty bindings
        ptyProcess = pty.spawn(shell, args, {
          name: 'xterm-256color',
          cols: msg.cols || 80,
          rows: msg.rows || 24,
          cwd,
          env,
        });

        // Redirect stream bytes from process to WebSocket wrapper
        ptyProcess.onData((data) => {
          ws.send(JSON.stringify({ type: 'data', data }));
        });

        // Notify client when process terminates
        ptyProcess.onExit(({ exitCode }) => {
          console.log(`[Terminate] CLI Process closed with status code ${exitCode}`);
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
      console.error('[Session Error]', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[Disconnected] Browser session ended.');
    if (ptyProcess) {
      console.log(`[Clean Up] Closing dangling process: "${ptyProcess.process}"`);
      ptyProcess.kill();
      ptyProcess = null;
    }
  });
});
