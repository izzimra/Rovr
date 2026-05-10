/**
 * AI insights + copilot store.
 *
 * Holds:
 *  - The business insights rendered in the insights panel.
 *  - The daily brief narrative.
 *  - The copilot chat history (session-only per Requirement 9.4).
 *
 * This store is the single source of truth for all AI-generated surfaces
 * so loading, success, and failure states stay consistent across panels.
 */

import { create } from "zustand";
import type { AIInsight, ChatMessage, DailyBrief } from "../types/ai";

export interface AIStoreState {
  insights: AIInsight[];
  dailyBrief: DailyBrief | null;
  chatHistory: ChatMessage[];
  isGeneratingInsights: boolean;
  isChatting: boolean;
  insightsError: string | null;
  chatError: string | null;

  setInsights: (insights: AIInsight[]) => void;
  setDailyBrief: (brief: DailyBrief | null) => void;
  appendMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setGeneratingInsights: (flag: boolean) => void;
  setChatting: (flag: boolean) => void;
  setInsightsError: (error: string | null) => void;
  setChatError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL: Pick<
  AIStoreState,
  | "insights"
  | "dailyBrief"
  | "chatHistory"
  | "isGeneratingInsights"
  | "isChatting"
  | "insightsError"
  | "chatError"
> = {
  insights: [],
  dailyBrief: null,
  chatHistory: [],
  isGeneratingInsights: false,
  isChatting: false,
  insightsError: null,
  chatError: null,
};

export const useAIStore = create<AIStoreState>()((set) => ({
  ...INITIAL,

  setInsights: (insights) => set({ insights }),
  setDailyBrief: (dailyBrief) => set({ dailyBrief }),
  appendMessage: (message) =>
    set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  clearChat: () => set({ chatHistory: [] }),
  setGeneratingInsights: (isGeneratingInsights) => set({ isGeneratingInsights }),
  setChatting: (isChatting) => set({ isChatting }),
  setInsightsError: (insightsError) => set({ insightsError }),
  setChatError: (chatError) => set({ chatError }),

  reset: () => set({ ...INITIAL }),
}));
