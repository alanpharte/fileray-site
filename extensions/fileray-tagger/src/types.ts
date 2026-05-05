export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

export type Msg =
  | { type: "GET_TOKEN"; interactive?: boolean }
  | { type: "SIGN_OUT" }
  | { type: "GET_PROFILE" }
  | { type: "LIST_RECENT"; afterIso: string }
  | { type: "LIST_UNTAGGED"; days: number }
  | { type: "DOWNLOAD_FILE"; fileId: string }
  | { type: "AUTO_TAG"; fileName: string; mimeType: string; base64Data?: string }
  | { type: "PATCH_TAGS"; fileId: string; tags: string[] }
  | { type: "GET_SETTINGS" }
  | { type: "SET_SETTINGS"; apiBase: string };

export interface Settings {
  apiBase: string;
}

export const DEFAULT_API_BASE = "https://driveiq.replit.app";
