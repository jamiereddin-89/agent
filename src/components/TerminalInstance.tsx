import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Agent, BridgeConfig } from "../types";
import { AlertCircle, Terminal as TermIcon, RotateCcw, Power, Cpu } from "lucide-react";

interface TerminalInstanceProps {
  paneId: string;
  agent: Agent;
  bridgeConfig: BridgeConfig;
  isActive: boolean;
  onShowSetupInstructions: () => void;
}

export default function TerminalInstance({
  paneId,
  agent,
  bridgeConfig,
  isActive,
  onShowSetupInstructions,
}: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error" | "exited">("connecting");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use a ref to keep track of current container width/height to avoid resizing to 0
  const sizeRef = useRef({ cols: 80, rows: 24 });

  // Separate connection key to let user manual trigger reconnects
  const [reconnectKey, setReconnectKey] = useState(0);

  const handleReconnect = () => {
    setStatus("connecting");
    setExitCode(null);
    setErrorMessage(null);
    setReconnectKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Create Terminal instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", Courier, monospace',
      letterSpacing: 0.5,
      lineHeight: 1.3,
      allowTransparency: true,
      theme: {
        background: "#000000", // pure pitch black per Immersive Design mockup
        foreground: "#d1d1d1", // sleek light gray
        cursor: agent.color || "#3b82f6",
        cursorAccent: "#000000",
        selectionBackground: `${agent.color}44`, // 25% opacity accent
        black: "#111112",
        red: "#ef4444",
        green: "#5ef1ff",
        yellow: "#f1ff5e",
        blue: "#8e75ff",
        magenta: "#ec4899",
        cyan: "#5ef1ff",
        white: "#d1d1d1",
        brightBlack: "#4b5563",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#f472b6",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Render original terminal to container
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome line
    term.writeln(`\x1b[90mPreparing CLI session for \x1b[0m\x1b[1m\x1b[38;2;${hexToRgbString(agent.color)}m${agent.name}\x1b[0m`);
    term.writeln(`\x1b[90mConfigured binary: "${agent.command}" ${agent.args.join(" ")}\x1b[0m\r\n`);

    // 2. Setup WebSocket connection
    let wsUrl = bridgeConfig.url;
    if (bridgeConfig.token) {
      const glue = wsUrl.includes("?") ? "&" : "?";
      wsUrl += `${glue}token=${encodeURIComponent(bridgeConfig.token)}`;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;
    } catch (e: any) {
      console.error("WS connection error", e);
      setStatus("error");
      setErrorMessage(e.message || "Failed to create WebSocket instance.");
      return;
    }

    // 3. Bind WebSocket handlers
    ws.onopen = () => {
      setStatus("connected");
      // Grab direct columns and rows
      try {
        fitAddon.fit();
      } catch (err) {}
      
      const cols = term.cols || 80;
      const rows = term.rows || 24;
      sizeRef.current = { cols, rows };

      // Send Spawn request
      const spawnPayload = {
        type: "spawn",
        command: agent.command,
        args: agent.args,
        cwd: agent.cwd || undefined,
        env: {
          ...processEnvMock(),
          ...agent.env,
        },
        cols,
        rows,
      };
      ws.send(JSON.stringify(spawnPayload));
      term.writeln("\x1b[32m✔ Connected to local bridge. Spawning CLI agent process...\x1b[0m\r\n");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "data") {
          term.write(msg.data);
        } else if (msg.type === "exit") {
          setStatus("exited");
          setExitCode(msg.code !== undefined ? msg.code : 0);
          term.writeln(`\r\n\x1b[1;33mℹ [Agent Process Exited with status: ${msg.code}]\x1b[0m\r\n`);
        } else if (msg.type === "error") {
          setStatus("error");
          setErrorMessage(msg.message);
          term.writeln(`\r\n\x1b[1;31m✘ Bridge Error: ${msg.message}\x1b[0m\r\n`);
        }
      } catch (e) {
        // Fallback for raw data if not JSON, but the protocol expects JSON
        term.write(event.data);
      }
    };

    ws.onerror = (err) => {
      console.error("WS error event triggered:", err);
      // Don't overwrite state immediately if close event will capture it, but ensures feedback
      setStatus("error");
    };

    ws.onclose = (event) => {
      if (ws.readyState === WebSocket.CLOSED) {
        socketRef.current = null;
        setStatus((curr) => {
          if (curr === "connected" || curr === "connecting") {
            return "disconnected";
          }
          return curr;
        });
      }
    };

    // 4. Bind terminal stdin handler
    const disposableOnData = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "stdin",
            data,
          })
        );
      }
    });

    // 5. Watch for container resizing
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      // debounce or gate to prevent 0-sizes
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      try {
        fitAddon.fit();
        const currentCols = term.cols;
        const currentRows = term.rows;

        if (currentCols !== sizeRef.current.cols || currentRows !== sizeRef.current.rows) {
          sizeRef.current = { cols: currentCols, rows: currentRows };
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "resize",
                cols: currentCols,
                rows: currentRows,
              })
            );
          }
        }
      } catch (fitErr) {
        // Safe catch for pre-render fitting
      }
    });

    resizeObserver.observe(containerRef.current);
    resizeObserverRef.current = resizeObserver;

    // Cleanup terminal & connections
    return () => {
      disposableOnData.dispose();
      resizeObserver.disconnect();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        // Send a kill signal if possible or close WS directly
        try {
          ws.send(JSON.stringify({ type: "kill" }));
        } catch (_) {}
        ws.close();
      }
      term.dispose();
      terminalRef.current = null;
    };
  }, [paneId, agent.id, reconnectKey]);

  // Keep Fit Addon aligned whenever active panel focus changes
  useEffect(() => {
    if (isActive && fitAddonRef.current && terminalRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          terminalRef.current?.focus();
        } catch (_) {}
      }, 50);
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      {/* Actual terminal host */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full p-2.5 overflow-hidden font-mono"
        style={{ contentVisibility: "auto" }}
      />

      {/* Overlays dependent on connection status */}
      {status === "connecting" && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-10">
          <div className="flex animate-pulse flex-col items-center space-y-4">
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <Power className="w-6 h-6 animate-spin text-orange-500" />
            </div>
            <div>
              <p className="text-gray-200 font-mono text-sm font-medium">Connecting to Local CLI Bridge...</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{bridgeConfig.url}</p>
            </div>
          </div>
        </div>
      )}

      {status === "disconnected" && (
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-10 border border-neutral-800/80">
          <div className="max-w-md bg-neutral-900/90 p-5 rounded-xl border border-neutral-800 flex flex-col items-center space-y-4">
            <div className="p-3 bg-red-950/50 rounded-full border border-red-900/30">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm tracking-tight">Local Bridge Offline</h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                The terminal could not connect to your local Node bridge at{" "}
                <code className="text-orange-400 bg-neutral-950 px-1 py-0.5 rounded text-[11px]">{bridgeConfig.url}</code>.
              </p>
            </div>
            <div className="flex w-full gap-2 pt-2">
              <button
                onClick={onShowSetupInstructions}
                className="flex-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-gray-300 font-mono text-xs rounded-lg transition-colors border border-neutral-700/50"
              >
                Setup Guide
              </button>
              <button
                onClick={handleReconnect}
                className="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-10 border border-red-950/40">
          <div className="max-w-md bg-neutral-900/90 p-5 rounded-xl border border-red-900/20 flex flex-col items-center space-y-4">
            <div className="p-3 bg-red-950/50 rounded-full border border-red-900/30">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-200 text-sm">Bridge Connection Error</h3>
              {errorMessage && (
                <pre className="text-[11px] text-red-400 mt-2 bg-neutral-950 p-2 rounded-lg text-left overflow-x-auto max-w-full font-mono border border-red-900/20 leading-relaxed whitespace-pre-wrap">
                  {errorMessage}
                </pre>
              )}
            </div>
            <div className="flex w-full gap-2 pt-1">
              <button
                onClick={onShowSetupInstructions}
                className="flex-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-gray-300 font-mono text-xs rounded-lg transition-colors border border-neutral-700/50"
              >
                Guide
              </button>
              <button
                onClick={handleReconnect}
                className="flex-1 px-3 py-1.5 bg-neutral-200 hover:bg-white text-gray-900 font-mono text-xs rounded-lg transition-all font-semibold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "exited" && (
        <div className="absolute inset-y-0 right-0 left-0 bg-black/40 backdrop-blur-3xs flex flex-col items-center justify-center p-4 z-10">
          <div className="bg-[#0b0c10]/95 max-w-xs border border-neutral-800 p-4 rounded-xl text-center space-y-3 shadow-xl">
            <div className="flex items-center justify-center gap-1.5 text-orange-500">
              <Cpu className="w-4 h-4 animate-pulse" />
              <div className="bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-xs font-mono text-gray-400">
                Code {exitCode}
              </div>
            </div>
            <p className="text-xs text-gray-300 font-mono">Agent process has terminated.</p>
            <button
              onClick={handleReconnect}
              className="w-full px-3 py-1.5 bg-orange-600/90 hover:bg-orange-500 text-white font-mono text-xs rounded-lg transition-all flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Respawn Agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple color helper
function hexToRgbString(hex: string): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r},${g},${b}`;
}

// Environmental helper context representation
function processEnvMock() {
  return {
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    LANG: "en_US.UTF-8",
  };
}
