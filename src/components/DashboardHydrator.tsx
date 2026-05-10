"use client";

/**
 * DashboardHydrator
 *
 * Visible toolbar on the dashboard overlay providing:
 *   - Demo Mode toggle (re-runs the pipeline with the seed dataset)
 *   - CSV upload input (parses client-side -> reseeds -> re-runs pipeline)
 *   - Live pipeline status indicator
 *
 * Actual orchestration bootstrap is handled in `AppShell` so every route
 * sees populated stores. This component only exposes user controls.
 */

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";

import { parseCustomerCsv } from "@/lib/csv-parser";
import { bootstrapDashboard } from "@/lib/orchestration";
import { useAIStore } from "@/store/ai-store";
import { useCustomerStore } from "@/store/customer-store";
import { useKPIStore } from "@/store/kpi-store";
import { useRouteStore } from "@/store/route-store";

export function DashboardHydrator() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isRebooting, setIsRebooting] = useState(false);

  const demoMode = useCustomerStore((s) => s.demoMode);
  const customersCount = useCustomerStore((s) => s.ranked.length);
  const isCustomersLoading = useCustomerStore((s) => s.isLoading);
  const isGeneratingInsights = useAIStore((s) => s.isGeneratingInsights);
  const isOptimizing = useRouteStore((s) => s.isOptimizing);
  const isKpisLoading = useKPIStore((s) => s.isLoading);

  const isPipelineRunning =
    isRebooting ||
    isCustomersLoading ||
    isOptimizing ||
    isGeneratingInsights ||
    isKpisLoading;

  const handleDemoMode = async () => {
    setIsRebooting(true);
    setUploadStatus(null);
    try {
      await bootstrapDashboard({ mode: "demo" });
      setUploadStatus({
        tone: "success",
        message: "Demo territory loaded — 18 Klang Valley accounts.",
      });
    } catch (err) {
      setUploadStatus({
        tone: "error",
        message: err instanceof Error ? err.message : "Demo load failed.",
      });
    } finally {
      setIsRebooting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRebooting(true);
    setUploadStatus({ tone: "info", message: `Parsing ${file.name}…` });

    try {
      const text = await file.text();
      const { valid, errors } = parseCustomerCsv(text);

      if (valid.length === 0) {
        setUploadStatus({
          tone: "error",
          message: errors[0] ?? "No valid rows in CSV.",
        });
        return;
      }

      useCustomerStore.getState().setCustomers(valid);
      useCustomerStore.getState().setDemoMode(false);
      await bootstrapDashboard({ mode: "preserve" });

      setUploadStatus({
        tone: "success",
        message: `Imported ${valid.length} account${valid.length === 1 ? "" : "s"}${
          errors.length ? ` · ${errors.length} warnings` : ""
        }.`,
      });
    } catch (err) {
      setUploadStatus({
        tone: "error",
        message: err instanceof Error ? err.message : "CSV parse failed.",
      });
    } finally {
      setIsRebooting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-6 pt-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-xl">
        <PipelineStatusDot active={isPipelineRunning} />

        <span className="text-[11px] tabular-nums text-zinc-300">
          {isPipelineRunning
            ? "Rovr AI pipeline running…"
            : `${customersCount} accounts · ${demoMode ? "Demo Mode" : "Live"}`}
        </span>

        <span className="mx-1 h-4 w-px bg-white/10" />

        <DemoButton onClick={handleDemoMode} disabled={isPipelineRunning} />

        <label
          className={`
            inline-flex cursor-pointer items-center gap-1.5 rounded-full
            border border-white/10 bg-white/5 px-2.5 py-1
            text-[11px] text-zinc-200
            transition-colors hover:border-white/20 hover:bg-white/10
            ${isPipelineRunning ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <Upload className="h-3 w-3" strokeWidth={2.25} />
          Upload CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
            disabled={isPipelineRunning}
          />
        </label>

        <AnimatePresence>
          {uploadStatus ? (
            <StatusChip
              key={uploadStatus.message}
              status={uploadStatus}
              onDismiss={() => setUploadStatus(null)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PipelineStatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {active ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400/70" />
      ) : null}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          active ? "bg-blue-400" : "bg-emerald-400"
        }`}
      />
    </span>
  );
}

function DemoButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 rounded-full border border-blue-500/30
        bg-gradient-to-r from-blue-500/15 to-violet-500/15 px-2.5 py-1
        text-[11px] font-semibold text-blue-200
        transition-all hover:border-blue-500/50
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
      `}
    >
      <Sparkles className="h-3 w-3" strokeWidth={2.5} />
      Demo Mode
    </button>
  );
}

function StatusChip({
  status,
  onDismiss,
}: {
  status: { tone: "success" | "error" | "info"; message: string };
  onDismiss: () => void;
}) {
  const Icon =
    status.tone === "success"
      ? CheckCircle2
      : status.tone === "error"
        ? AlertCircle
        : Zap;
  const tone = {
    success: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    error: "text-red-300 border-red-500/30 bg-red-500/10",
    info: "text-blue-300 border-blue-500/30 bg-blue-500/10",
  }[status.tone];

  if (typeof window !== "undefined") {
    setTimeout(onDismiss, 5000);
  }

  return (
    <motion.span
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${tone}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {status.message}
    </motion.span>
  );
}

export default DashboardHydrator;
