"use client";

/**
 * CopilotPanel
 *
 * Right-hand AI Copilot surface of the Rovr dashboard.
 *
 * Visual grammar (see `.kiro/specs/rovr-frontend-polish/requirements.md`
 * Requirement 6):
 *   - Glass container with a subtle electric-blue border ring, communicating
 *     "AI is present / listening".
 *   - Header with the product name and a pulsing emerald "online" dot.
 *   - Scrollable thread: user bubbles aligned right on a neutral zinc-800
 *     surface; assistant messages aligned left on a transparent surface with
 *     a left-border accent.
 *   - Composer: sleek dark input with a glowing blue→violet submit button.
 *
 * This component is presentation-only for now. It renders three hardcoded
 * `ChatMessage` records so the visual rhythm of the thread can be verified
 * before the store + `/api/chat` wiring lands. When connected, replace
 * `MOCK_MESSAGES` with `useAIStore((s) => s.chatHistory)` and dispatch the
 * submit handler through `appendMessage` + `/api/chat`.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";

import type { ChatMessage } from "@/types/ai";

/** Hardcoded thread: user, assistant, user. Typed against the real domain. */
const MOCK_MESSAGES: readonly ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "Who should I visit first today?",
    timestamp: "2025-05-10T08:14:00+08:00",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Start with **Tan Beverages (PJ)** — RM 18,400 pipeline, High tier, and only 7 minutes from your origin. You'll clear the highest-value stop before traffic builds up on the Federal Highway.",
    timestamp: "2025-05-10T08:14:06+08:00",
  },
  {
    id: "m3",
    role: "user",
    content: "Why not Sinar Mart in Shah Alam?",
    timestamp: "2025-05-10T08:15:12+08:00",
  },
] as const;

export function CopilotPanel() {
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return; // Requirement 6.10 — suppress empty submissions.
    // TODO: dispatch to `useAIStore.appendMessage` + POST `/api/chat`.
    setDraft("");
  };

  return (
    <div
      className="
        flex h-full w-full flex-col overflow-hidden rounded-xl
        border border-blue-500/20 bg-zinc-900/40 backdrop-blur-xl
        shadow-[0_0_40px_-12px_rgba(59,130,246,0.25)]
      "
      aria-label="Rovr AI Copilot"
    >
      <CopilotHeader />

      <MessageThread messages={MOCK_MESSAGES} />

      <ComposerBar
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function CopilotHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 ring-1 ring-inset ring-blue-500/30"
          aria-hidden="true"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-300" strokeWidth={2.25} />
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Rovr AI Copilot
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Gemini 2.5 Flash
          </span>
        </div>
      </div>

      <StatusDot />
    </header>
  );
}

/** Pulsing emerald online indicator with a soft halo. */
function StatusDot() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-400/90">
        Online
      </span>
    </div>
  );
}

/* ─── Thread ────────────────────────────────────────────────────── */

function MessageThread({
  messages,
}: {
  messages: readonly ChatMessage[];
}) {
  return (
    <div
      className="
        flex-1 space-y-6 overflow-y-auto px-5 py-6
        [scrollbar-width:thin]
        [scrollbar-color:theme(colors.zinc.700)_transparent]
      "
      role="log"
      aria-live="polite"
      aria-label="Chat history"
    >
      {messages.map((m) =>
        m.role === "assistant" ? (
          <AssistantBubble key={m.id} content={m.content} />
        ) : (
          <UserBubble key={m.id} content={m.content} />
        ),
      )}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-800 px-4 py-2.5 text-sm leading-relaxed text-zinc-100">
        {content}
      </div>
    </motion.div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex justify-start"
    >
      <div className="max-w-[92%] border-l-2 border-blue-500/60 pl-4">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400/80">
          Rovr
        </div>
        <p className="text-sm leading-relaxed text-zinc-200">{content}</p>
      </div>
    </motion.div>
  );
}

/* ─── Composer ──────────────────────────────────────────────────── */

function ComposerBar({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const hasContent = value.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 border-t border-white/5 p-4"
    >
      <div
        className="
          flex items-center gap-2 rounded-xl border border-white/5
          bg-zinc-900/70 px-3 py-2
          transition-colors duration-200
          focus-within:border-blue-500/40
          focus-within:ring-1 focus-within:ring-blue-500/20
        "
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask Rovr anything..."
          aria-label="Message Rovr Copilot"
          className="
            flex-1 bg-transparent px-1 py-1 text-sm text-zinc-100
            placeholder:text-zinc-500
            focus:outline-none
          "
        />

        <motion.button
          type="submit"
          disabled={!hasContent}
          whileHover={
            hasContent
              ? { boxShadow: "0 0 22px 0 rgba(59, 130, 246, 0.55)" }
              : undefined
          }
          whileTap={hasContent ? { scale: 0.96 } : undefined}
          transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
          className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
            bg-gradient-to-br from-blue-500 to-violet-500 text-white
            transition-opacity duration-200
            ${hasContent ? "opacity-100 cursor-pointer" : "opacity-40 cursor-not-allowed"}
          `}
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </motion.button>
      </div>
    </form>
  );
}

export default CopilotPanel;
