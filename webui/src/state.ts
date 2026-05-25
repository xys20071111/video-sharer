import type { AppState, VideoList } from "./types.ts";
import { FALLBACK_DEMO_DATA } from "./fallback.ts";
import mockData from "../mock-data.json" with { type: "json" };

export const state: AppState = {
  videoList: { timestamp: Date.now(), videos: [] },
  activeTag: "all",
  searchQuery: "",
  gatewayUrl: "https://cloudflare-ipfs.com",
  currentlyPlaying: null,
  activeCatalogName: "Demo Catalog",
  activeCatalogSource: "",
};

export function initSettings(): void {
  const savedGateway = localStorage.getItem("ipfs_gateway_url");
  if (savedGateway) {
    state.gatewayUrl = savedGateway;
  }

  const input = document.getElementById("gatewayInput") as HTMLInputElement | null;
  if (input) input.value = state.gatewayUrl;

  const savedName = localStorage.getItem("ipfs_active_catalog_name");
  if (savedName) {
    state.activeCatalogName = savedName;
  }

  const savedSource = localStorage.getItem("ipfs_active_catalog_source");
  if (savedSource) {
    state.activeCatalogSource = savedSource;
  }
}

function validateVideoList(data: unknown): data is VideoList {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.timestamp !== "number") return false;
  if (!Array.isArray(obj.videos)) return false;

  for (const item of obj.videos) {
    if (!item || typeof item !== "object") return false;
    const v = item as Record<string, unknown>;
    if (typeof v.cid !== "string" || !v.cid.trim()) return false;
    if (!v.metadata || typeof v.metadata !== "object") return false;
    const m = v.metadata as Record<string, unknown>;
    if (typeof m.title !== "string" || !m.title.trim()) return false;
    if (typeof m.entry !== "string" || !m.entry.trim()) return false;
    if (typeof m.author !== "string") return false;
    if (typeof m.description !== "string") return false;
    if (!Array.isArray(m.tags)) return false;
  }
  return true;
}

export async function loadCatalogData(): Promise<void> {
  const savedCatalog = localStorage.getItem("ipfs_video_list");
  if (savedCatalog) {
    try {
      const parsed = JSON.parse(savedCatalog);
      if (validateVideoList(parsed)) {
        state.videoList = parsed;
        return;
      }
    } catch {
      localStorage.removeItem("ipfs_video_list");
    }
  }

  if (validateVideoList(mockData)) {
    state.videoList = mockData as VideoList;
    localStorage.setItem("ipfs_video_list", JSON.stringify(mockData));
    state.activeCatalogName = "Demo Catalog";
    localStorage.setItem("ipfs_active_catalog_name", "Demo Catalog");
    return;
  }
  console.warn("mock-data.json is invalid, falling back to embedded data");

  state.videoList = FALLBACK_DEMO_DATA;
  state.activeCatalogName = "Demo Catalog";
  localStorage.setItem("ipfs_active_catalog_name", "Demo Catalog");
}

export function importAndSaveCatalog(
  data: VideoList,
  name = "Imported Catalog",
  source = "",
): boolean {
  if (!validateVideoList(data)) return false;
  state.videoList = data;
  localStorage.setItem("ipfs_video_list", JSON.stringify(data));
  state.activeCatalogName = name;
  localStorage.setItem("ipfs_active_catalog_name", name);
  state.activeCatalogSource = source;
  localStorage.setItem("ipfs_active_catalog_source", source);
  return true;
}
