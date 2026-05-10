"use client";

/**
 * CopilotPanel
 *
 * Right-hand AI Copilot surface of the Rovr dashboard. Wired to the
 * `useAIStore` for conversation state and the orchestration layer's
 * `dispatchCopilotMessage` helper for `/api/chat` calls.
 */

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";

import { buildUserMessage } from "@/lib/ai/chatAssistant";
import { dispatchCopilotMessage } from "@/lib/orchestration";
import { useAIStore } from "@/store/ai-store";
import { useCustomerStore } from "@/store/customer-store";
import type { ChatMessage } from "@/types/ai";

export function CopilotPanel() {
  const chatHistory = useAIStore((s) => s.chatHistory);
  const isChatting = useAIStore((s) => s.isChatting);
  const chatError = useAIStore((s) => s.chatError);
  const appendMessage = useAIStore((s) => s.appendMessage);
  const setChatError = useAIStore((s) => s.setChatError);
  const clearChat = useAIStore((s) => s.clearChat);
  const hasCustomers = useCustomerStore((s) => s.ranked.length > 0);

  const [draft, setDraft] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll whenever the thread changes or typing state flips.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatHistory.length, isChatting]);

  // If a previous send failed, restore the user's text so they can retry.
  useEffect(() => {
    if (chatError && lastFailedMessage && !draft) {
      setDraft(lastFailedMessage);
    }
  }, [chatError, lastFailedMessage, draft]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isChatting) return;

    const userMsg = buildUserMessage(trimmed);
    appendMessage(userMsg);
    setChatError(null);
    setDraft("");

    const response = await dispatchCopilotMessage(trimmed);
    if (!response) {
      setLastFailedMessage(trimmed);
    } else {
      setLastFailedMessage(null);
    }
  };

  return (
    <div
      className={`
        flex h-full w-full flex-col overflow-hidden rounded-xl
        border border-blue-500/20 bg-zinc-900/40 backdrop-blur-xl
        shadow-[0_0_40px_-12px_rgba(59,130,246,0.25)]
        transition-shadow duration-300
        ${isChatting ? "shadow-[0_0_60px_-8px_rgba(59,130,246,0.55)]" : ""}
      `}
      aria-label="Rovr AI Copilot"
    >
      <CopilotHeader onClear={clearChat} hasMessages={chatHistory.length > 0} />

      <MessageThread
        ref={threadRef}
        messages={chatHistory}
        isChatting={isChatting}
        error={chatError}
        hasCustomers={hasCustomers}
      />

      <ComposerBar
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        disabled={isChatting}
      />
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function CopilotHeader({
  onClear,
  hasMessages,
}: {
  onClear: () => void;
  hasMessages: boolean;
}) {
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

      <div className="flex items-center gap-2">
        {hasMessages ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear conversation"
            title="Clear conversation"
            className="
              flex h-7 w-7 cursor-pointer items-center justify-center
              rounded-md text-zinc-500 transition-colors
              hover:bg-white/5 hover:text-zinc-200
            "
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
        <StatusDot />
      </div>
    </header>
  );
}

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

interface MessageThreadProps {
  messages: readonly ChatMessage[];
  isChatting: boolean;
  error: string | null;
  hasCustomers: boolean;
}

const MessageThread = forwardRef<HTMLDivElement, MessageThreadProps>(
  function MessageThread(
    { messages, isChatting, error, hasCustomers },
    ref,
  ) {
    const showWelcome = messages.length === 0 && !isChatting;

    return (
      <div
        ref={ref}
        className="
          flex-1 space-y-6 overflow-y-auto px-5 py-6
          [scrollbar-width:thin]
          [scrollbar-color:theme(colors.zinc.700)_transparent]
        "
        role="log"
        aria-live="polite"
        aria-label="Chat history"
      >
        {showWelcome ? <WelcomeBlock hasCustomers={hasCustomers} /> : null}

        {messages.map((m, idx) =>
          m.role === "assistant" ? (
            <AssistantBubble
              key={m.id}
              content={m.content}
              animate={idx === messages.length - 1}
            />
          ) : (
            <UserBubble key={m.id} content={m.content} />
          ),
        )}

        <AnimatePresence>
          {isChatting ? <TypingIndicator /> : null}
        </AnimatePresence>

        {error ? <ErrorBanner message={error} /> : null}
      </div>
    );
  },
);

function WelcomeBlock({ hasCustomers }: { hasCustomers: boolean }) {
  const suggestions = useMemo(
    () =>
      hasCustomers
        ? [
            "Who should I visit first today?",
            "Summarise today's revenue opportunity.",
            "Which accounts are going stale?",
          ]
        : [
            "Activate Demo Mode",
            "What CSV columns do I need?",
            "How does prioritisation work?",
          ],
    [hasCustomers],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3"
    >
      <div className="rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-violet-500/5 p-4">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400/80">
          Rovr
        </div>
        <p className="text-sm leading-relaxed text-zinc-200">
          I&apos;m your territory intelligence copilot. Ask me anything about your
          accounts, today&apos;s route, or revenue opportunity — every answer is
          grounded in the data on your dashboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <SuggestionChip key={s} label={s} />
        ))}
      </div>
    </motion.div>
  );
}

function SuggestionChip({ label }: { label: string }) {
  return (
    <span
      className="
        inline-flex cursor-default items-center rounded-full
        border border-white/10 bg-zinc-800/60 px-3 py-1
        text-[11px] text-zinc-300
      "
    >
      {label}
    </span>
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

function AssistantBubble({
  content,
  animate,
}: {
  content: string;
  animate: boolean;
}) {
  const [revealed, setRevealed] = useState(animate ? "" : content);

  useEffect(() => {
    if (!animate) {
      setRevealed(content);
      return;
    }
    setRevealed("");
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i = Math.min(
        i + Math.max(2, Math.floor(content.length / 140)),
        content.length,
      );
      setRevealed(content.slice(0, i));
      if (i < content.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [content, animate]);

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
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
          {revealed}
          {animate && revealed.length < content.length ? (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-blue-400/70 align-[-1px]" />
          ) : null}
        </p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-center gap-2"
      aria-label="Rovr is thinking"
    >
      <div className="border-l-2 border-blue-500/60 pl-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400/80">
          Rovr
        </div>
      </div>
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </motion.div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300"
    >
      <span className="font-semibold">Copilot failed:</span> {message}
    </motion.div>
  );
}

/* ─── Composer ──────────────────────────────────────────────────── */

function ComposerBar({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
}) {
  const hasContent = value.trim().length > 0;
  const enabled = hasContent && !disabled;

  return (
    <form onSubmit={onSubmit} className="shrink-0 border-t border-white/5 p-4">
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
          placeholder={disabled ? "Rovr is thinking…" : "Ask Rovr anything..."}
          aria-label="Message Rovr Copilot"
          disabled={disabled}
          className="
            flex-1 bg-transparent px-1 py-1 text-sm text-zinc-100
            placeholder:text-zinc-500
            focus:outline-none disabled:opacity-60
          "
        />

        <motion.button
          type="submit"
          disabled={!enabled}
          whileHover={
            enabled
              ? { boxShadow: "0 0 22px 0 rgba(59, 130, 246, 0.55)" }
              : undefined
          }
          whileTap={enabled ? { scale: 0.96 } : undefined}
          transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
          className={`
            flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
            bg-gradient-to-br from-blue-500 to-violet-500 text-white
            transition-opacity duration-200
            ${enabled ? "opacity-100 cursor-pointer" : "opacity-40 cursor-not-allowed"}
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
