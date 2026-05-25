import type { CatalogSlot } from "./types.ts";
import { state } from "./state.ts";

const SAVED_CATALOGS_KEY = "ipfs_saved_catalogs";

function getSavedCatalogs(): CatalogSlot[] {
  try {
    const raw = localStorage.getItem(SAVED_CATALOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCatalogSlot(name: string): boolean {
  if (!name || !name.trim()) return false;
  const catalogs = getSavedCatalogs();
  const id = `catalog_${Date.now()}`;
  const slot: CatalogSlot = {
    id,
    name: name.trim(),
    savedAt: Date.now(),
    timestamp: state.videoList.timestamp,
    videoCount: state.videoList.videos.length,
    source: state.activeCatalogSource || "",
    data: state.videoList,
  };
  const existingIdx = catalogs.findIndex((c) => c.name === name.trim());
  if (existingIdx >= 0) {
    catalogs[existingIdx] = { ...slot, id: catalogs[existingIdx].id };
  } else {
    catalogs.unshift(slot);
  }
  localStorage.setItem(SAVED_CATALOGS_KEY, JSON.stringify(catalogs));
  return true;
}

function deleteCatalogSlot(id: string): void {
  const catalogs = getSavedCatalogs().filter((c) => c.id !== id);
  localStorage.setItem(SAVED_CATALOGS_KEY, JSON.stringify(catalogs));
}

function loadCatalogSlot(id: string): boolean {
  const catalogs = getSavedCatalogs();
  const slot = catalogs.find((c) => c.id === id);
  if (!slot) return false;

  state.videoList = slot.data;
  localStorage.setItem("ipfs_video_list", JSON.stringify(slot.data));
  state.activeCatalogName = slot.name;
  localStorage.setItem("ipfs_active_catalog_name", slot.name);
  state.activeCatalogSource = slot.source || "";
  localStorage.setItem("ipfs_active_catalog_source", slot.source || "");
  return true;
}

function exportCatalogAsJson(): void {
  const json = JSON.stringify(state.videoList, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = `videocatalog_${new Date().toISOString().slice(0, 10)}.json`;
  a.href = url;
  a.download = safeTitle;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export {
  getSavedCatalogs,
  saveCatalogSlot,
  deleteCatalogSlot,
  loadCatalogSlot,
  exportCatalogAsJson,
};
