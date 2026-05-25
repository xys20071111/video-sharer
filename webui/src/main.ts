import {
  importAndSaveCatalog,
  initSettings,
  loadCatalogData,
  state,
} from "./state.ts";
import { dom } from "./dom.ts";
import { copyTextToClipboard, flashBtnSuccess, resolveCid } from "./utils.ts";
import {
  renderSavedCatalogsList,
  renderUI,
  showBrowseView,
  showWatchView,
} from "./ui.ts";
import { playVideo } from "./player.ts";
import {
  exportCatalogAsJson,
  getSavedCatalogs,
  saveCatalogSlot,
} from "./catalog.ts";
import type { VideoEntry } from "./types.ts";
import "../style.css";

// --- Hash Routing ---
function handleRouting(): void {
  const hash = globalThis.location.hash;
  if (hash.startsWith("#watch/")) {
    const cid = hash.substring(7);
    const video = state.videoList.videos.find((v) => v.cid === cid);
    if (video) {
      showWatchView(video);
    } else {
      showBrowseView();
    }
  } else {
    showBrowseView();
  }
}

// --- Event Handlers Setup ---
function setupEventListeners(): void {
  dom.searchInput.addEventListener("input", (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value.trim()
      .toLowerCase();
    renderUI();
  });

  dom.btnOpenSettings.addEventListener("click", () => {
    renderSavedCatalogsList();
    dom.settingsDialog.showModal();
  });

  dom.btnCloseSettings.addEventListener("click", () => {
    dom.settingsDialog.close();
  });

  dom.gatewaySelect.addEventListener("change", (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val !== "custom") {
      dom.gatewayInput.value = val;
      updateGateway(val);
    }
  });

  dom.gatewayInput.addEventListener("input", (e) => {
    dom.gatewaySelect.value = "custom";
    updateGateway((e.target as HTMLInputElement).value);
  });

  // Import tabs
  const tabs = document.querySelectorAll(".tab-header");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-content").forEach((c) =>
        (c as HTMLElement).style.display = "none"
      );

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      const contentId = tab.getAttribute("data-tab");
      if (contentId) {
        const el = document.getElementById(contentId);
        if (el) el.style.display = "block";
      }
    });
  });

  dom.btnLoadPaste.addEventListener("click", () => {
    const text = dom.jsonPasteArea.value.trim();
    if (!text) {
      alert("Please paste some JSON text first.");
      return;
    }
    try {
      const data = JSON.parse(text);
      if (importAndSaveCatalog(data, "Pasted Catalog")) {
        dom.jsonPasteArea.value = "";
        renderUI();
        dom.settingsDialog.close();
        alert("Video library imported successfully!");
      } else {
        alert(
          "Import failed. The JSON does not match the required VideoList structure.",
        );
      }
    } catch (err) {
      alert("Invalid JSON format: " + (err as Error).message);
    }
  });

  dom.uploadZone.addEventListener("click", () => dom.fileUploadInput.click());
  dom.uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dom.uploadZone.style.borderColor = "var(--primary-color)";
    dom.uploadZone.style.background = "rgba(124, 77, 255, 0.08)";
  });
  dom.uploadZone.addEventListener("dragleave", () => {
    dom.uploadZone.style.borderColor = "";
    dom.uploadZone.style.background = "";
  });
  dom.uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dom.uploadZone.style.borderColor = "";
    dom.uploadZone.style.background = "";
    if (e.dataTransfer.files.length > 0) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  });
  dom.fileUploadInput.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      handleUploadedFile(files[0]);
    }
  });

  dom.btnLoadCid.addEventListener("click", async () => {
    const cid = dom.importCidInput.value.trim();
    if (!cid) {
      alert("Please enter a CID or IPNS key.");
      return;
    }

    dom.btnLoadCid.disabled = true;
    dom.btnLoadCid.textContent = "Fetching...";

    try {
      const gw = state.gatewayUrl.replace(/\/+$/, "");
      const response = await fetch(`${gw}${resolveCid(cid)}`);
      if (!response.ok) {
        throw new Error(`Gateway returned HTTP ${response.status}`);
      }
      const data = await response.json();

      if (
        importAndSaveCatalog(data, `IPFS CID: ${cid.substring(0, 8)}...`, cid)
      ) {
        dom.importCidInput.value = "";
        renderUI();
        dom.settingsDialog.close();
        alert("Video library imported successfully!");
      } else {
        alert("Fetched catalog JSON is not valid.");
      }
    } catch (err) {
      alert(
        `Failed to fetch catalog from IPFS: ${
          (err as Error).message
        }\nMake sure your gateway is running and the CID is correct.`,
      );
    } finally {
      dom.btnLoadCid.disabled = false;
      dom.btnLoadCid.textContent = "Fetch & Load";
    }
  });

  dom.btnResetMock.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to discard your imported lists and load the demo database?",
      )
    ) {
      localStorage.removeItem("ipfs_video_list");
      localStorage.removeItem("ipfs_active_catalog_name");
      localStorage.removeItem("ipfs_active_catalog_source");
      location.reload();
    }
  });

  dom.btnSaveCatalog.addEventListener("click", () => {
    const name = dom.savedCatalogNameInput.value.trim();
    if (!name) {
      dom.savedCatalogNameInput.focus();
      dom.savedCatalogNameInput.classList.add("input-error");
      setTimeout(
        () => dom.savedCatalogNameInput.classList.remove("input-error"),
        1200,
      );
      return;
    }
    const existed = getSavedCatalogs().some((c) => c.name === name);
    if (
      existed &&
      !confirm(`A catalog named "${name}" already exists. Overwrite it?`)
    ) return;
    saveCatalogSlot(name);
    state.activeCatalogName = name;
    localStorage.setItem("ipfs_active_catalog_name", name);
    dom.savedCatalogNameInput.value = "";
    renderSavedCatalogsList();
    renderUI();
    flashBtnSuccess(dom.btnSaveCatalog, "Saved!");
  });

  dom.btnExportCatalog.addEventListener("click", () => {
    exportCatalogAsJson();
  });

  globalThis.addEventListener("hashchange", () => {
    handleRouting();
  });

  dom.btnCopyCid.addEventListener("click", () => {
    if (state.currentlyPlaying) {
      copyTextToClipboard(state.currentlyPlaying.cid, dom.btnCopyCid);
    }
  });

  dom.btnCopyLink.addEventListener("click", () => {
    if (state.currentlyPlaying) {
      const gw = state.gatewayUrl.replace(/\/+$/, "");
      const directUrl = `${gw}${resolveCid(state.currentlyPlaying.cid)}/${state.currentlyPlaying.metadata.entry}`;
      copyTextToClipboard(directUrl, dom.btnCopyLink);
    }
  });

  dom.btnRetryVideo.addEventListener("click", () => {
    if (state.currentlyPlaying) {
      playVideo(state.currentlyPlaying);
    }
  });

  if (dom.settingsDialog) {
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      dom.settingsDialog.addEventListener("click", (event) => {
        if (event.target !== dom.settingsDialog) return;
        const rect = dom.settingsDialog.getBoundingClientRect();
        const isDialogContent = rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dom.settingsDialog.close();
        }
      });
    }
  }
}

function updateGateway(url: string): void {
  let normalizedUrl = url.trim();
  if (normalizedUrl && !normalizedUrl.endsWith("/")) {
    normalizedUrl += "/";
  }
  state.gatewayUrl = normalizedUrl;
  localStorage.setItem("ipfs_gateway_url", normalizedUrl);
}

function handleUploadedFile(file: File): void {
  dom.selectedFileInfo.textContent = `Selected: ${file.name} (${
    Math.round(file.size / 1024)
  } KB)`;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      const name = file.name.replace(/\.[^/.]+$/, "");
      if (importAndSaveCatalog(data, name)) {
        renderUI();
        dom.settingsDialog.close();
        alert("Video library imported successfully!");
      } else {
        alert(
          "Import failed. The JSON does not match the required VideoList structure.",
        );
      }
    } catch (err) {
      alert("Invalid JSON file: " + (err as Error).message);
    }
  };
  reader.readAsText(file);
}

// --- Init ---
globalThis.addEventListener("DOMContentLoaded", () => {
  initSettings();
  setupEventListeners();
  loadCatalogData().then(() => {
    renderUI();
    handleRouting();
  });
});
