import React, { useState } from "react";
import { Agent } from "../types";
import {
  X,
  Plus,
  RotateCcw,
  Trash2,
  Edit2,
  Terminal,
  Cpu,
  Bot,
  Sparkles,
  Code,
  Command,
  Globe,
  Server,
  Settings,
  Play,
  Flame,
  Zap,
  Info,
  ChevronLeft,
  Key,
} from "lucide-react";
import * as Icons from "lucide-react";

interface AgentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onSaveAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onResetAgents: () => void;
}

const AVAILABLE_ICONS = [
  { name: "Terminal", comp: Terminal },
  { name: "Cpu", comp: Cpu },
  { name: "Bot", comp: Bot },
  { name: "Sparkles", comp: Sparkles },
  { name: "Code", comp: Code },
  { name: "Command", comp: Command },
  { name: "Globe", comp: Globe },
  { name: "Server", comp: Server },
  { name: "Settings", comp: Settings },
  { name: "Play", comp: Play },
  { name: "Flame", comp: Flame },
  { name: "Zap", comp: Zap },
];

const PRESETS_COLORS = [
  "#ea580c", // Sienna Orange (Claude standard)
  "#10b981", // Emerald Green
  "#2563eb", // Royal Blue
  "#8b5cf6", // Violet Purple
  "#ec4899", // Hot Pink
  "#f59e0b", // Amber Yellow
  "#06b6d4", // Cyan
  "#ef4444", // Ruby Red
  "#4b5563", // Slate Gray
];

export default function AgentsDrawer({
  isOpen,
  onClose,
  agents,
  onSaveAgent,
  onDeleteAgent,
  onResetAgents,
}: AgentsDrawerProps) {
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [argInput, setArgInput] = useState("");
  const [args, setArgs] = useState<string[]>([]);
  const [cwd, setCwd] = useState("");
  const [envRows, setEnvRows] = useState<{ id: string; key: string; value: string }[]>([]);
  const [selectedIcon, setSelectedIcon] = useState("Terminal");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  const startEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsCreating(false);
    setName(agent.name);
    setCommand(agent.command);
    setArgs(agent.args);
    setArgInput("");
    setCwd(agent.cwd || "");
    setSelectedIcon(agent.icon || "Terminal");
    setSelectedColor(agent.color || "#3b82f6");

    // Map record to list of rows
    const rows = Object.entries(agent.env || {}).map(([k, v]) => ({
      id: Math.random().toString(),
      key: k,
      value: v,
    }));
    setEnvRows(rows.length > 0 ? rows : [{ id: Math.random().toString(), key: "", value: "" }]);
  };

  const startCreate = () => {
    setEditingAgent(null);
    setIsCreating(true);
    setName("");
    setCommand("");
    setArgs([]);
    setArgInput("");
    setCwd("");
    setSelectedIcon("Terminal");
    setSelectedColor("#3b82f6");
    setEnvRows([{ id: Math.random().toString(), key: "", value: "" }]);
  };

  // Environment Row handlers
  const handleAddEnvRow = () => {
    setEnvRows([...envRows, { id: Math.random().toString(), key: "", value: "" }]);
  };

  const handleRemoveEnvRow = (id: string) => {
    setEnvRows(envRows.filter((r) => r.id !== id));
  };

  const handleEnvRowChange = (id: string, field: "key" | "value", val: string) => {
    setEnvRows(
      envRows.map((r) => (r.id === id ? { ...r, [field]: val.toUpperCase().replace(/[^A-Z0-0_]/g, "") && field === "key" ? val.toUpperCase().replace(/[^A-Z0-9_]/g, "") : val } : r))
    );
  };

  // Argument chips handlers
  const handleAddArg = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const val = argInput.trim();
      if (val && !args.includes(val)) {
        setArgs([...args, val]);
      }
      setArgInput("");
    }
  };

  const handleRemoveArg = (argToRemove: string) => {
    setArgs(args.filter((a) => a !== argToRemove));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) return;

    // Build env variables map
    const customEnv: Record<string, string> = {};
    envRows.forEach((r) => {
      const k = r.key.trim();
      if (k) {
        customEnv[k] = r.value;
      }
    });

    const savedAgent: Agent = {
      id: editingAgent ? editingAgent.id : `agent-${Math.random().toString(36).substring(2, 11)}`,
      name: name.trim(),
      command: command.trim(),
      args: [...args],
      cwd: cwd.trim() || undefined,
      env: customEnv,
      icon: selectedIcon,
      color: selectedColor,
      builtin: editingAgent ? editingAgent.builtin : false,
    };

    onSaveAgent(savedAgent);
    cancelForm();
  };

  const cancelForm = () => {
    setEditingAgent(null);
    setIsCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none">
      {/* Click outside backdrop close drawer (only if not editing to prevent losing work) */}
      <div className="flex-1" onClick={editingAgent || isCreating ? undefined : onClose} />

      <div className="w-full max-w-md h-full bg-[#111112] border-l border-[#2d2d2d] flex flex-col shadow-2xl relative">
        {/* Drawer Header */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-[#2d2d2d] bg-[#111112] z-20">
          {(editingAgent || isCreating) ? (
            <button
              onClick={cancelForm}
              className="flex items-center text-xs font-mono text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1 text-orange-500" />
              Back
            </button>
          ) : (
            <h2 className="text-sm font-mono font-bold tracking-wider text-gray-200">AGENT MANAGER</h2>
          )}

          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Dynamic drawer content viewport */}
        <div className="flex-1 overflow-y-auto p-6 z-10 font-sans">
          {editingAgent || isCreating ? (
            /* ================= FORM EDITOR VIEW ================= */
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <h3 className="text-xs font-mono text-orange-500 uppercase tracking-widest font-semibold mb-1">
                  {isCreating ? "Deploy New Custom Agent" : `RECONFIGURE: ${editingAgent?.name}`}
                </h3>
                <p className="text-[11px] text-gray-400 font-mono">
                  All parameters will take effect immediately upon respawning connected terminals.
                </p>
              </div>

              {/* Agent Identifiers */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase font-medium">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Claude Opus CLI, Local Shell"
                    className="w-full px-3 py-2 bg-[#0c0c0d] border border-[#2d2d2d] rounded-sm text-xs font-mono text-gray-200 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase font-medium">Command Binary</label>
                  <input
                    type="text"
                    required
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="e.g. claude, bash, npx"
                    className="w-full px-3 py-2 bg-[#0c0c0d] border border-[#2d2d2d] rounded-sm text-xs font-mono text-gray-200 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    Ensure this command is globally available on the machine running your local Node bridge.
                  </p>
                </div>

                {/* Arguments Chips */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase font-medium">
                    Arguments
                  </label>
                  <div className="flex flex-wrap gap-1.5 bg-[#0c0c0d] border border-[#2d2d2d] rounded-sm p-2 min-h-10 items-center">
                    {args.map((a, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1c1c1e] hover:bg-neutral-800 rounded text-[10px] font-mono text-orange-400 border border-[#2d2d2d]"
                      >
                        {a}
                        <button type="button" onClick={() => handleRemoveArg(a)} className="text-gray-500 hover:text-white font-bold ml-0.5">
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={argInput}
                      onChange={(e) => setArgInput(e.target.value)}
                      onKeyDown={handleAddArg}
                      placeholder={args.length === 0 ? "Press SPACE or ENTER to add, e.g. --model" : ""}
                      className="border-0 bg-transparent py-0.5 px-1 font-mono text-xs text-gray-300 focus:outline-hidden focus:ring-0 flex-1 min-w-[120px]"
                    />
                  </div>
                </div>

                {/* Working Directory */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase font-medium">
                    Working Directory (CWD) <span className="text-gray-500 lowercase font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={cwd}
                    onChange={(e) => setCwd(e.target.value)}
                    placeholder="e.g. /Users/dev/workspace or C:\Projects"
                    className="w-full px-3 py-2 bg-[#0c0c0d] border border-[#2d2d2d] rounded-sm text-xs font-mono text-gray-200 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>

                {/* Env Vars key-value pairs list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-mono text-gray-400 uppercase font-medium">Environment Variables</label>
                    <button
                      type="button"
                      onClick={handleAddEnvRow}
                      className="text-[10px] font-mono text-orange-400 hover:text-orange-300 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Var
                    </button>
                  </div>

                  <div className="space-y-2">
                    {envRows.map((r) => (
                      <div key={r.id} className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={r.key}
                          onChange={(e) => handleEnvRowChange(r.id, "key", e.target.value)}
                          placeholder="KEY"
                          className="w-1/3 px-2 py-1 bg-[#0c0c0d] border border-[#2d2d2d] rounded-sm text-xs font-mono text-gray-200 uppercase focus:outline-hidden focus:border-orange-500"
                        />
                        <span className="text-xs text-gray-600 font-mono">=</span>
                        <input
                          type="text"
                          value={r.value}
                          onChange={(e) => handleEnvRowChange(r.id, "value", e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-2 py-1 bg-[#0c0c0d] border border-[#2d2d2d] rounded-sm text-xs font-mono text-gray-200 focus:outline-hidden focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEnvRow(r.id)}
                          disabled={envRows.length === 1 && r.key === ""}
                          className="p-1 text-gray-500 hover:text-red-400 hover:bg-[#151516] rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aesthetic Palette Customizer: Icon & Color Dot selection */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-2 uppercase font-medium">Visual Launcher Icon</label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVAILABLE_ICONS.map((ic) => {
                        const IconComponent = ic.comp;
                        const isSelected = selectedIcon === ic.name;
                        return (
                          <button
                            key={ic.name}
                            type="button"
                            onClick={() => setSelectedIcon(ic.name)}
                            className={`p-2 flex justify-center items-center rounded-sm border transition-all ${
                              isSelected
                                ? "bg-orange-500/10 border-orange-500 text-orange-500 scale-105"
                                : "bg-[#0c0c0d] border-[#2d2d2d] hover:border-[#3d3d3d] text-gray-400"
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-2 uppercase font-medium">Accent Core Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESETS_COLORS.map((c) => {
                        const isSelected = selectedColor === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className="w-6 h-6 rounded-full border relative flex items-center justify-center transition-transform hover:scale-110 shadow-xs"
                            style={{ backgroundColor: c, borderColor: isSelected ? "#ffffff" : "transparent" }}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit panel buttons */}
              <div className="flex gap-2 pt-4 border-t border-[#2d2d2d] font-mono">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 px-4 py-2 bg-[#0c0c0d] hover:bg-[#1a1a1c] text-gray-300 rounded-sm text-xs font-semibold transition-colors border border-[#2d2d2d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-sm text-xs font-semibold transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* ================= LIST OF CURRENT AGENTS VIEW ================= */
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-[#151516] p-4 rounded-sm border border-[#2d2d2d]">
                <div className="flex items-start space-x-1 max-w-[210px]">
                  <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-400 font-mono leading-normal">
                    Built-in presets are system sealed but values remain adjustable. Resets restore original values.
                  </p>
                </div>
                <button
                  onClick={onResetAgents}
                  className="inline-flex items-center px-2 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[10px] font-mono text-gray-300 rounded-sm duration-200 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 mr-1 text-orange-400" /> Reset presets
                </button>
              </div>

              <div className="space-y-2.5">
                {agents.map((ag) => {
                  // Icon loader fallback
                  const Comp = (Icons as any)[ag.icon] || Terminal;
                  return (
                    <div
                      key={ag.id}
                      className="group border border-[#2d2d2d] hover:border-[#3d3d3d] bg-black p-3 h-18 rounded-sm flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden leading-tight">
                        <div
                          className="p-2 justify-center items-center flex rounded-md shrink-0"
                          style={{ backgroundColor: `${ag.color}15` }}
                        >
                          <Comp className="w-4 h-4" style={{ color: ag.color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="font-mono text-xs font-bold text-gray-200 truncate">{ag.name}</h4>
                            {ag.builtin && (
                              <span className="text-[8px] bg-cyan-950/80 text-cyan-400 px-1 py-0.5 rounded font-mono select-none">
                                PRESET
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                            {ag.command} {ag.args.join(" ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5">
                        <button
                          onClick={() => startEdit(ag)}
                          className="p-1.5 text-gray-500 hover:text-white hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                          title="Edit Agent Configuration"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!ag.builtin && (
                          <button
                            onClick={() => onDeleteAgent(ag.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                            title="Delete Agent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Spawn custom button */}
              <button
                onClick={startCreate}
                className="w-full py-2.5 mt-2 bg-orange-600 hover:bg-orange-500 text-white rounded-sm text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Deploy Custom Agent...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
