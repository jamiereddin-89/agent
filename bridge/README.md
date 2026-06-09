# CLI Agents Local WebSocket Bridge

This tiny Node utility spawns interactive pseudoterminal (PTY) processes on your local machine and tunnels their stdin/stdout streams over a local WebSocket server. 

This bridges the gap between sandboxed web apps running in the cloud (like AI Studio) and local command line binaries.

## How it Works

```text
Browser (AI Studio dev site)
       │ WebSockets (ws://localhost:8787)
       ▼
Local Bridge (running server.js)
       │ node-pty spawn()
       ▼
your CLI binary (bash, zsh, claude, npx, etc.)
```

## Security Design

1. **Hosts Binding**: The bridge listens directly on `127.0.0.1` (localhost). It does *not* bind to external addresses. This guarantees only local browser sessions can reach it.
2. **Access Security Token**: To prevent malicious scripts on general websites from hijacking your bridge, you can configure an environment variable called `BRIDGE_TOKEN` on start. If set, any incoming WebSocket connection must provide this matching token via query parameter (e.g., `ws://localhost:8787?token=my_secret`), or it will be immediately dropped.

---

## Installation & Start

### Step 1: Clone or Copy this folder
Place these files (`package.json`, `server.js`) inside a directory on your machine.

### Step 2: Install Dependencies
Open your shell terminal in the folder and type:
```bash
npm install
```

> **Windows Users**: `node-pty` requires a C++ compiler to bind directly to Windows terminal APIs. Run Powershell as Administrator and install the windows build utilities beforehand in case npm complains:
> ```powershell
> npm install --global --production windows-build-tools
> ```

### Step 3: Run the Server
Simply kickstart the service:
```bash
# Optional: Secure your sessions with a random secret key
export BRIDGE_TOKEN="your_random_token_here"

npm start
```

If using Windows Powershell:
```powershell
$env:BRIDGE_TOKEN="your_random_token_here"
npm start
```

The bridge will now start listening on `ws://127.0.0.1:8787`. Enter the exact same token in your dashboard topbar to instantly synchronize!
