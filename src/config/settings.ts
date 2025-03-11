import { DiscussionSettings } from "@/types/discussion";

export const DEFAULT_SETTINGS: DiscussionSettings = {
  maxRounds: 5,
  temperature: 0.7,
  interval: 3000,
  moderationStyle: "relaxed",
  focusTopics: [],
  allowConflict: true,
  conciseMode: false,
  conciseLimit: 100,
} as const;

export const SETTING_KYES = {
  AI: {
    PROVIDER: {
      API_KEY: "ai.provider.apiKey",
      API_URL: "ai.provider.apiUrl",
      MODEL: "ai.provider.model",
      ID: "ai.provider.id",
    },
  },
};