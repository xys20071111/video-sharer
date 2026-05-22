/**
 * IPFS Video Share Web UI Controller
 * Manages states, handles HTML5 / HLS video playback, loads databases, and processes search/filtering.
 */

// --- Global States ---
const state = {
  videoList: { timestamp: Date.now(), videos: [] },
  activeTag: "all",
  searchQuery: "",
  gatewayUrl: "https://cloudflare-ipfs.com/ipfs/",
  currentlyPlaying: null,
};

// --- Saved Catalog Slots Management (localStorage key: 'ipfs_saved_catalogs') ---
// Format: Array<{ id: string, name: string, savedAt: number, timestamp: number, videoCount: number, data: VideoList }>
const SAVED_CATALOGS_KEY = "ipfs_saved_catalogs";

function getSavedCatalogs() {
  try {
    const raw = localStorage.getItem(SAVED_CATALOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCatalogSlot(name) {
  if (!name || !name.trim()) return false;
  const catalogs = getSavedCatalogs();
  const id = `catalog_${Date.now()}`;
  const slot = {
    id,
    name: name.trim(),
    savedAt: Date.now(),
    timestamp: state.videoList.timestamp,
    videoCount: state.videoList.videos.length,
    data: state.videoList,
  };
  // Check for duplicate name, overwrite if exists
  const existingIdx = catalogs.findIndex((c) => c.name === name.trim());
  if (existingIdx >= 0) {
    catalogs[existingIdx] = { ...slot, id: catalogs[existingIdx].id };
  } else {
    catalogs.unshift(slot);
  }
  localStorage.setItem(SAVED_CATALOGS_KEY, JSON.stringify(catalogs));
  return true;
}

function deleteCatalogSlot(id) {
  const catalogs = getSavedCatalogs().filter((c) => c.id !== id);
  localStorage.setItem(SAVED_CATALOGS_KEY, JSON.stringify(catalogs));
}

function loadCatalogSlot(id) {
  const catalogs = getSavedCatalogs();
  const slot = catalogs.find((c) => c.id === id);
  if (!slot) return false;
  if (validateVideoList(slot.data)) {
    state.videoList = slot.data;
    localStorage.setItem("ipfs_video_list", JSON.stringify(slot.data));
    renderUI();
    return true;
  }
  return false;
}

function exportCatalogAsJson() {
  const json = JSON.stringify(state.videoList, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = `videocatalog_${
    new Date().toISOString().slice(0, 10)
  }.json`;
  a.href = url;
  a.download = safeTitle;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Global Hls.js instance reference
let hlsInstance = null;

// Built-in fallback demo data in case mock-data.json fails to load or runs on file:// scheme
const FALLBACK_DEMO_DATA = {
  timestamp: Date.now(),
  videos: [
    {
      cid: "QmdpAidwAsBGptFB3b6A9Pyi5coEbgjHrL3K2Qrsutmj9K",
      metadata: {
        title: "Big Buck Bunny (HLS Stream)",
        description:
          "A large and lovable rabbit deals with three bullying rodents in this classic open-source animated film by the Blender Foundation. Served as an HLS playlist folder from IPFS.",
        author: "Blender Foundation",
        entry: "master.m3u8",
        tags: ["animation", "hls", "open-source", "bunny"],
        thumbnail:
          "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_Buck_Bunny_Screen_Shot.jpg",
      },
    },
    {
      cid: "QmXzt7DWeD8uDcrgpajw6DZA6mECuZ4eTwjjyWBxzmLCRV",
      metadata: {
        title: "IPFS Community Test Video",
        description:
          "A short sample HLS video playlist containing several segment chunks. Ideal for verifying gateway connections and node pin performance.",
        author: "IPFS Community",
        entry: "index.m3u8",
        tags: ["test", "hls", "dev", "sample"],
        thumbnail: "",
      },
    },
    {
      cid: "QmSintelCidPlaceholder",
      metadata: {
        title: "Sintel (CGI Short Film)",
        description:
          "Sintel is an independent CGI-animated short film by the Blender Foundation. The story follows Sintel as she searches for a baby dragon.",
        author: "Blender Foundation",
        entry: "sintel.mp4",
        tags: ["animation", "fantasy", "cgi", "open-source"],
        thumbnail:
          "https://upload.wikimedia.org/wikipedia/commons/f/fc/Sintel_poster_v2_small.jpg",
      },
    },
    {
      cid: "QmTearsOfSteelCidPlaceholder",
      metadata: {
        title: "Tears of Steel (Sci-Fi VFX)",
        description:
          "A sci-fi short film featuring a dystopian futuristic Amsterdam, showcasing advanced open-source VFX pipelines and tools.",
        author: "Blender Foundation",
        entry: "tears_of_steel.mp4",
        tags: ["sci-fi", "open-source", "vfx", "live-action"],
        thumbnail:
          "https://upload.wikimedia.org/wikipedia/commons/e/ec/Tears_of_Steel_poster.jpg",
      },
    },
  ],
};

// --- DOM Element Selectors ---
const dom = {
  searchInput: document.getElementById("searchInput"),
  btnOpenSettings: document.getElementById("btnOpenSettings"),
  tagsContainer: document.getElementById("tagsContainer"),
  videoGrid: document.getElementById("videoGrid"),
  videoCount: document.getElementById("videoCount"),
  timestampWrapper: document.getElementById("timestampWrapper"),
  catalogTimestamp: document.getElementById("catalogTimestamp"),

  // Views
  browseView: document.getElementById("browseView"),
  watchView: document.getElementById("watchView"),
  recommendationsContainer: document.getElementById("recommendationsContainer"),
  logoLink: document.getElementById("logoLink"),

  // Settings Dialog
  settingsDialog: document.getElementById("settingsDialog"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
  gatewaySelect: document.getElementById("gatewaySelect"),
  gatewayInput: document.getElementById("gatewayInput"),
  jsonPasteArea: document.getElementById("jsonPasteArea"),
  btnLoadPaste: document.getElementById("btnLoadPaste"),
  uploadZone: document.getElementById("uploadZone"),
  fileUploadInput: document.getElementById("fileUploadInput"),
  selectedFileInfo: document.getElementById("selectedFileInfo"),
  importCidInput: document.getElementById("importCidInput"),
  btnLoadCid: document.getElementById("btnLoadCid"),
  btnResetMock: document.getElementById("btnResetMock"),

  // Saved Catalogs Section
  savedCatalogNameInput: document.getElementById("savedCatalogNameInput"),
  btnSaveCatalog: document.getElementById("btnSaveCatalog"),
  btnExportCatalog: document.getElementById("btnExportCatalog"),
  savedCatalogsList: document.getElementById("savedCatalogsList"),

  // Player Elements
  videoPlayer: document.getElementById("videoPlayer"),
  playerErrorOverlay: document.getElementById("playerErrorOverlay"),
  playerErrorMessage: document.getElementById("playerErrorMessage"),
  btnRetryVideo: document.getElementById("btnRetryVideo"),
  playerTitle: document.getElementById("playerTitle"),
  playerAuthor: document.getElementById("playerAuthor"),
  playerVideoEntry: document.getElementById("playerVideoEntry"),
  playerDescription: document.getElementById("playerDescription"),
  playerTags: document.getElementById("playerTags"),
  playerCidValue: document.getElementById("playerCidValue"),
  playerGatewayLink: document.getElementById("playerGatewayLink"),
  btnCopyCid: document.getElementById("btnCopyCid"),
  btnCopyLink: document.getElementById("btnCopyLink"),
};

// --- Initializing App ---
globalThis.addEventListener("DOMContentLoaded", () => {
  initSettings();
  setupEventListeners();
  loadCatalogData().then(() => {
    handleRouting();
  });
});

// Load configuration from LocalStorage
function initSettings() {
  const savedGateway = localStorage.getItem("ipfs_gateway_url");
  if (savedGateway) {
    state.gatewayUrl = savedGateway;
    dom.gatewayInput.value = savedGateway;

    // Set select to "custom" if not matching presets
    let matched = false;
    Array.from(dom.gatewaySelect.options).forEach((opt) => {
      if (opt.value === savedGateway) {
        dom.gatewaySelect.value = savedGateway;
        matched = true;
      }
    });
    if (!matched) {
      dom.gatewaySelect.value = "custom";
    }
  }
}

// Fetch database JSON
async function loadCatalogData() {
  // Check localStorage for saved catalog
  const savedCatalog = localStorage.getItem("ipfs_video_list");
  if (savedCatalog) {
    try {
      const parsed = JSON.parse(savedCatalog);
      if (validateVideoList(parsed)) {
        state.videoList = parsed;
        renderUI();
        return;
      }
    } catch {
      localStorage.removeItem("ipfs_video_list");
    }
  }

  // Fetch relative mock-data.json
  try {
    const response = await fetch("mock-data.json");
    if (!response.ok) throw new Error("Failed to fetch local mock database");
    const data = await response.json();
    if (validateVideoList(data)) {
      state.videoList = data;
      localStorage.setItem("ipfs_video_list", JSON.stringify(data));
      renderUI();
      return;
    }
  } catch (err) {
    console.warn(
      "Could not fetch mock-data.json, falling back to embedded data:",
      err,
    );
  }

  // Fallback
  state.videoList = FALLBACK_DEMO_DATA;
  renderUI();
}

// --- Setup Event Handlers ---
function setupEventListeners() {
  // Search
  dom.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderVideoGrid();
  });

  // Open Settings Dialog
  dom.btnOpenSettings.addEventListener("click", () => {
    renderSavedCatalogsList();
    dom.settingsDialog.showModal();
  });

  // Close Settings Dialog
  dom.btnCloseSettings.addEventListener("click", () => {
    dom.settingsDialog.close();
  });

  // Gateway Presets Select
  dom.gatewaySelect.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val !== "custom") {
      dom.gatewayInput.value = val;
      updateGateway(val);
    }
  });

  // Custom Gateway input edit
  dom.gatewayInput.addEventListener("input", (e) => {
    dom.gatewaySelect.value = "custom";
    updateGateway(e.target.value);
  });

  // Import tabs switching
  const tabs = document.querySelectorAll(".tab-header");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Deactivate all
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-content").forEach((c) =>
        c.style.display = "none"
      );

      // Activate clicked
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      const contentId = tab.getAttribute("data-tab");
      document.getElementById(contentId).style.display = "block";
    });
  });

  // Load Pasted JSON
  dom.btnLoadPaste.addEventListener("click", () => {
    const text = dom.jsonPasteArea.value.trim();
    if (!text) {
      alert("Please paste some JSON text first.");
      return;
    }
    try {
      const data = JSON.parse(text);
      importAndSaveCatalog(data);
      dom.jsonPasteArea.value = "";
    } catch (err) {
      alert("Invalid JSON format: " + err.message);
    }
  });

  // Drag & Drop Upload Handlers
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
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });

  // Fetch JSON from IPFS CID
  dom.btnLoadCid.addEventListener("click", async () => {
    const cid = dom.importCidInput.value.trim();
    if (!cid) {
      alert("Please enter a CID or IPNS key.");
      return;
    }

    dom.btnLoadCid.disabled = true;
    dom.btnLoadCid.textContent = "Fetching...";

    try {
      const fetchUrl = resolveIpfsOrIpnsUrl(cid);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Gateway returned HTTP ${response.status}`);
      }
      const data = await response.json();

      importAndSaveCatalog(data);
      dom.importCidInput.value = "";
    } catch (err) {
      alert(
        `Failed to fetch catalog from IPFS: ${err.message}\nMake sure your gateway is running and the CID is correct.`,
      );
    } finally {
      dom.btnLoadCid.disabled = false;
      dom.btnLoadCid.textContent = "Fetch & Load";
    }
  });

  // Reset to Demo Data
  dom.btnResetMock.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to discard your imported lists and load the demo database?",
      )
    ) {
      localStorage.removeItem("ipfs_video_list");
      state.videoList = FALLBACK_DEMO_DATA;
      renderUI();
      dom.settingsDialog.close();
    }
  });

  // Save current catalog to a named slot
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
    dom.savedCatalogNameInput.value = "";
    renderSavedCatalogsList();
    flashBtnSuccess(dom.btnSaveCatalog, "Saved!");
  });

  // Export current catalog as JSON file
  dom.btnExportCatalog.addEventListener("click", () => {
    exportCatalogAsJson();
  });

  // Hash routing
  globalThis.addEventListener("hashchange", () => {
    handleRouting();
  });

  // Copy Clipboard Listeners
  dom.btnCopyCid.addEventListener("click", () => {
    if (state.currentlyPlaying) {
      copyTextToClipboard(state.currentlyPlaying.cid, dom.btnCopyCid);
    }
  });

  dom.btnCopyLink.addEventListener("click", () => {
    if (state.currentlyPlaying) {
      const directUrl = resolveIpfsOrIpnsUrl(
        state.currentlyPlaying.cid,
        state.currentlyPlaying.metadata.entry,
      );
      copyTextToClipboard(directUrl, dom.btnCopyLink);
    }
  });

  // Retry Video Button
  dom.btnRetryVideo.addEventListener("click", () => {
    if (state.currentlyPlaying) {
      playVideo(state.currentlyPlaying);
    }
  });

  // Backdrop click manual dismiss fallback for older Safari browsers without closedby support
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

// Update gateway settings
function updateGateway(url) {
  let normalizedUrl = url.trim();
  if (normalizedUrl && !normalizedUrl.endsWith("/")) {
    normalizedUrl += "/";
  }
  state.gatewayUrl = normalizedUrl;
  localStorage.setItem("ipfs_gateway_url", normalizedUrl);
}

// --- Import Processing ---
function handleUploadedFile(file) {
  dom.selectedFileInfo.textContent = `Selected: ${file.name} (${
    Math.round(file.size / 1024)
  } KB)`;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      importAndSaveCatalog(data);
    } catch (err) {
      alert("Invalid JSON file: " + err.message);
    }
  };
  reader.readAsText(file);
}

function importAndSaveCatalog(data) {
  if (validateVideoList(data)) {
    state.videoList = data;
    localStorage.setItem("ipfs_video_list", JSON.stringify(data));
    renderUI();
    dom.settingsDialog.close();
    alert("Video library imported successfully!");
  } else {
    alert(
      "Import failed. The JSON does not match the required VideoList structure.\nRequired fields: { timestamp: number, videos: Array<{ cid: string, metadata: { title, entry, author, description, tags } }> }",
    );
  }
}

// Strictly validates the VideoList interface
function validateVideoList(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.timestamp !== "number") return false;
  if (!Array.isArray(data.videos)) return false;

  for (const item of data.videos) {
    if (!item || typeof item !== "object") return false;
    if (typeof item.cid !== "string" || !item.cid.trim()) return false;
    if (!item.metadata || typeof item.metadata !== "object") return false;
    if (
      typeof item.metadata.title !== "string" || !item.metadata.title.trim()
    ) return false;
    if (
      typeof item.metadata.entry !== "string" || !item.metadata.entry.trim()
    ) return false;
    if (typeof item.metadata.author !== "string") return false;
    if (typeof item.metadata.description !== "string") return false;
    if (!Array.isArray(item.metadata.tags)) return false;
  }
  return true;
}

// --- Saved Catalogs UI ---
function renderSavedCatalogsList() {
  const list = dom.savedCatalogsList;
  if (!list) return;
  const catalogs = getSavedCatalogs();

  if (catalogs.length === 0) {
    list.innerHTML = `
      <div class="saved-catalog-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);flex-shrink:0">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <span>No saved catalogs yet. Save the current library above.</span>
      </div>`;
    return;
  }

  list.innerHTML = catalogs.map((slot) => {
    const savedDate = new Date(slot.savedAt).toLocaleString();
    const catalogDate = slot.timestamp
      ? new Date(slot.timestamp).toLocaleDateString()
      : "—";
    return `
      <div class="saved-catalog-item" data-id="${slot.id}">
        <div class="saved-catalog-info">
          <span class="saved-catalog-name">${escapeHtml(slot.name)}</span>
          <span class="saved-catalog-meta">${slot.videoCount} video${
      slot.videoCount === 1 ? "" : "s"
    } · catalog date ${catalogDate}</span>
          <span class="saved-catalog-meta">Saved on ${savedDate}</span>
        </div>
        <div class="saved-catalog-actions">
          <button class="btn btn-sm btn-outline btn-load-slot" data-id="${slot.id}" title="Load this catalog">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 .49-3.28"></path></svg>
            Load
          </button>
          <button class="btn btn-sm btn-danger-outline btn-delete-slot" data-id="${slot.id}" title="Delete this saved catalog">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
            Delete
          </button>
        </div>
      </div>`;
  }).join("");

  // Attach action buttons
  list.querySelectorAll(".btn-load-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (loadCatalogSlot(id)) {
        dom.settingsDialog.close();
        flashBtnSuccess(btn, "Loaded!");
      } else {
        alert("Failed to load catalog: invalid data format.");
      }
    });
  });

  list.querySelectorAll(".btn-delete-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const slot = getSavedCatalogs().find((c) => c.id === id);
      if (slot && confirm(`Delete saved catalog "${slot.name}"?`)) {
        deleteCatalogSlot(id);
        renderSavedCatalogsList();
      }
    });
  });
}

function flashBtnSuccess(btn, label) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${label}`;
  btn.style.borderColor = "var(--success-color)";
  btn.style.color = "var(--success-color)";
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.borderColor = "";
    btn.style.color = "";
  }, 1800);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Rendering Logic ---
function renderUI() {
  renderStats();
  renderTagFilterBar();
  renderVideoGrid();
}

function renderStats() {
  dom.videoCount.textContent = `${state.videoList.videos.length} video${
    state.videoList.videos.length === 1 ? "" : "s"
  }`;
  if (state.videoList.timestamp) {
    const formattedDate = new Date(state.videoList.timestamp).toLocaleString();
    dom.catalogTimestamp.textContent = formattedDate;
    dom.timestampWrapper.style.display = "block";
  } else {
    dom.timestampWrapper.style.display = "none";
  }
}

// Render dynamic tag filters based on data
function renderTagFilterBar() {
  // Collect all unique tags
  const tagsSet = new Set();
  state.videoList.videos.forEach((v) => {
    if (v.metadata.tags) {
      v.metadata.tags.forEach((t) => {
        if (t && t.trim()) tagsSet.add(t.trim().toLowerCase());
      });
    }
  });

  const uniqueTags = Array.from(tagsSet).sort();

  // Create tag buttons HTML
  dom.tagsContainer.innerHTML = "";

  // "All" button
  const allBtn = document.createElement("button");
  allBtn.className = `tag-pill ${state.activeTag === "all" ? "active" : ""}`;
  allBtn.textContent = "All Videos";
  allBtn.setAttribute("data-tag", "all");
  allBtn.addEventListener("click", () => selectTagFilter("all"));
  dom.tagsContainer.appendChild(allBtn);

  // Dynamic tags
  uniqueTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = `tag-pill ${state.activeTag === tag ? "active" : ""}`;
    btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    btn.setAttribute("data-tag", tag);
    btn.addEventListener("click", () => selectTagFilter(tag));
    dom.tagsContainer.appendChild(btn);
  });
}

function selectTagFilter(tag) {
  state.activeTag = tag;

  // Update active states
  const pills = dom.tagsContainer.querySelectorAll(".tag-pill");
  pills.forEach((pill) => {
    if (pill.getAttribute("data-tag") === tag) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });

  renderVideoGrid();
}

// Render the grid of cards
function renderVideoGrid() {
  const filteredVideos = state.videoList.videos.filter((video) => {
    const meta = video.metadata;

    // Tag filter matching
    const matchesTag = state.activeTag === "all" ||
      (meta.tags && meta.tags.some((t) => t.toLowerCase() === state.activeTag));

    // Search query matching
    const matchesSearch = !state.searchQuery ||
      meta.title.toLowerCase().includes(state.searchQuery) ||
      meta.description.toLowerCase().includes(state.searchQuery) ||
      meta.author.toLowerCase().includes(state.searchQuery) ||
      (meta.tags &&
        meta.tags.some((t) => t.toLowerCase().includes(state.searchQuery)));

    return matchesTag && matchesSearch;
  });

  dom.videoGrid.innerHTML = "";

  if (filteredVideos.length === 0) {
    dom.videoGrid.innerHTML = `
      <div class="grid-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted)">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <p>No videos matches current search filters.</p>
      </div>
    `;
    return;
  }

  filteredVideos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.setAttribute("role", "listitem");

    // Resolve thumbnail
    let thumbnailHtml = "";
    const thumbPath = video.metadata.thumbnail;
    if (thumbPath) {
      const resolvedThumb =
        (thumbPath.startsWith("http://") || thumbPath.startsWith("https://"))
          ? thumbPath
          : resolveIpfsOrIpnsUrl(video.cid, thumbPath);
      thumbnailHtml =
        `<img class="card-thumbnail" src="${resolvedThumb}" alt="${video.metadata.title} thumbnail" onerror="handleThumbError(this, '${video.metadata.title}')">`;
    } else {
      thumbnailHtml = createPlaceholderThumbnail(video.metadata.title);
    }

    // Render tags
    const tagsHtml = (video.metadata.tags || [])
      .map((tag) => `<span class="card-tag">${tag}</span>`)
      .join("");

    card.innerHTML = `
      <div class="card-thumbnail-wrapper">
        ${thumbnailHtml}
        <div class="play-overlay">
          <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="card-content">
        <div class="card-title-row">
          <h3 class="card-title" title="${video.metadata.title}">${video.metadata.title}</h3>
        </div>
        <span class="card-author">${video.metadata.author || "Anonymous"}</span>
        <p class="card-description">${
      video.metadata.description || "No description provided."
    }</p>
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-footer">
          <div class="cid-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted)">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span title="${video.cid}">${video.cid}</span>
          </div>
          <button class="btn-card-copy" aria-label="Copy IPFS CID" data-cid="${video.cid}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Click handler for opening the player
    card.addEventListener("click", (e) => {
      // If user clicked the copy CID button inside card, don't play
      if (
        e.target.closest(".btn-card-copy") || e.target.closest(".cid-badge")
      ) {
        e.stopPropagation();
        const cidButton = card.querySelector(".btn-card-copy");
        copyTextToClipboard(video.cid, cidButton);
        return;
      }
      globalThis.location.hash = `watch/${video.cid}`;
    });

    dom.videoGrid.appendChild(card);
  });
}

// Fallback image generator
function createPlaceholderThumbnail(title) {
  const initials = title ? title.trim().substring(0, 2).toUpperCase() : "V";
  // Pick a gradient index based on title characters
  const charCode = title.charCodeAt(0) || 0;
  const gradientIndex = charCode % 4;
  const gradients = [
    "linear-gradient(135deg, #7c4dff 0%, #161224 100%)",
    "linear-gradient(135deg, #00c853 0%, #0c1a11 100%)",
    "linear-gradient(135deg, #00b0ff 0%, #0a1724 100%)",
    "linear-gradient(135deg, #ff3d00 0%, #240f0a 100%)",
  ];
  const selectedGradient = gradients[gradientIndex];

  return `
    <div class="thumbnail-placeholder" style="background: ${selectedGradient}">
      <span>${initials}</span>
    </div>
  `;
}

// Global scope onerror callback for thumbnails
globalThis.handleThumbError = function (imgElement, title) {
  const wrapper = imgElement.parentElement;
  if (wrapper) {
    wrapper.innerHTML = createPlaceholderThumbnail(title) + `
      <div class="play-overlay">
        <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    `;
  }
};

// --- Hash Routing & Watch View Logic ---
function handleRouting() {
  const hash = globalThis.location.hash;
  if (hash.startsWith("#watch/")) {
    const cid = hash.substring(7); // characters after '#watch/'
    const video = state.videoList.videos.find((v) => v.cid === cid);
    if (video) {
      showWatchView(video);
    } else {
      // If video not found in catalog, go back to browse view
      showBrowseView();
    }
  } else {
    showBrowseView();
  }
}

function showWatchView(video) {
  state.currentlyPlaying = video;

  // Hide browse view, show watch view
  dom.browseView.style.display = "none";
  dom.watchView.style.display = "block";

  // Update watch page details
  dom.playerTitle.textContent = video.metadata.title;
  dom.playerAuthor.textContent = video.metadata.author || "Anonymous";
  dom.playerVideoEntry.textContent = video.metadata.entry;
  dom.playerDescription.textContent = video.metadata.description ||
    "No description provided.";
  dom.playerCidValue.textContent = video.cid;

  const directUrl = resolveIpfsOrIpnsUrl(video.cid, video.metadata.entry);
  dom.playerGatewayLink.href = directUrl;
  dom.playerGatewayLink.textContent = directUrl;

  // Render tags
  dom.playerTags.innerHTML = (video.metadata.tags || [])
    .map((tag) => `<span class="card-tag">${tag}</span>`)
    .join("");

  dom.playerErrorOverlay.style.display = "none";

  // Build recommended list
  renderRecommendations(video.cid);

  // Start Playing
  playVideo(video);

  // Scroll to top
  globalThis.scrollTo({ top: 0, behavior: "smooth" });
}

function showBrowseView() {
  state.currentlyPlaying = null;

  // Stop playback
  stopVideo();

  // Hide watch view, show browse view
  dom.watchView.style.display = "none";
  dom.browseView.style.display = "block";

  // Scroll to top
  globalThis.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRecommendations(currentCid) {
  dom.recommendationsContainer.innerHTML = "";
  const otherVideos = state.videoList.videos.filter((v) =>
    v.cid !== currentCid
  );

  if (otherVideos.length === 0) {
    dom.recommendationsContainer.innerHTML =
      '<p class="text-muted" style="font-size: 0.85rem; color: var(--text-muted);">No other videos available.</p>';
    return;
  }

  otherVideos.forEach((video) => {
    const card = document.createElement("a");
    card.href = `#watch/${video.cid}`;
    card.className = "rec-card";

    let thumbnailHtml = "";
    const thumbPath = video.metadata.thumbnail;
    if (thumbPath) {
      const resolvedThumb =
        (thumbPath.startsWith("http://") || thumbPath.startsWith("https://"))
          ? thumbPath
          : resolveIpfsOrIpnsUrl(video.cid, thumbPath);
      thumbnailHtml =
        `<img class="rec-thumbnail" src="${resolvedThumb}" alt="${video.metadata.title} thumbnail" onerror="handleRecThumbError(this, '${video.metadata.title}')">`;
    } else {
      thumbnailHtml = createPlaceholderRecThumbnail(video.metadata.title);
    }

    card.innerHTML = `
      <div class="rec-thumbnail-wrapper">
        ${thumbnailHtml}
      </div>
      <div class="rec-details">
        <h4 class="rec-title" title="${video.metadata.title}">${video.metadata.title}</h4>
        <span class="rec-author">${video.metadata.author || "Anonymous"}</span>
      </div>
    `;

    dom.recommendationsContainer.appendChild(card);
  });
}

function createPlaceholderRecThumbnail(title) {
  const initials = title ? title.trim().substring(0, 2).toUpperCase() : "V";
  const charCode = title.charCodeAt(0) || 0;
  const gradientIndex = charCode % 4;
  const gradients = [
    "linear-gradient(135deg, #7c4dff 0%, #161224 100%)",
    "linear-gradient(135deg, #00c853 0%, #0c1a11 100%)",
    "linear-gradient(135deg, #00b0ff 0%, #0a1724 100%)",
    "linear-gradient(135deg, #ff3d00 0%, #240f0a 100%)",
  ];
  const selectedGradient = gradients[gradientIndex];
  return `
    <div class="rec-thumbnail-placeholder" style="background: ${selectedGradient}">
      <span>${initials}</span>
    </div>
  `;
}

globalThis.handleRecThumbError = function (imgElement, title) {
  const wrapper = imgElement.parentElement;
  if (wrapper) {
    wrapper.innerHTML = createPlaceholderRecThumbnail(title);
  }
};

function playVideo(video) {
  stopVideo(); // Ensure previous builds are clean

  const videoUrl = resolveIpfsOrIpnsUrl(video.cid, video.metadata.entry);
  const videoElement = dom.videoPlayer;

  // Determine if content is HLS stream
  const isHls = video.metadata.entry.endsWith(".m3u8") ||
    videoUrl.includes(".m3u8");

  if (isHls) {
    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsInstance.loadSource(videoUrl);
      hlsInstance.attachMedia(videoElement);

      // Events
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch((e) =>
          console.log("Auto playback prevented:", e)
        );
      });

      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              showPlayerError(
                "Network error: Could not fetch video segments from IPFS gateway. Please check gateway connection or verify CID exists.",
              );
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              showPlayerError("Fatal video decoding error.");
              stopVideo();
              break;
          }
        }
      });
    } // Check for native Safari HLS support
    else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = videoUrl;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play().catch((e) =>
          console.log("Auto playback prevented:", e)
        );
      });
      videoElement.addEventListener("error", () => {
        showPlayerError("Native playback error: Failed to fetch HLS stream.");
      });
    } else {
      showPlayerError(
        "Your browser does not support HLS streaming (HTTP Live Streaming).",
      );
    }
  } else {
    // Normal video formats (.mp4, .webm) played natively
    videoElement.src = videoUrl;
    videoElement.play().catch((e) =>
      console.log("Auto playback prevented:", e)
    );
    videoElement.addEventListener("error", () => {
      showPlayerError(
        "Failed to play video file. Please check if file exists on gateway.",
      );
    });
  }
}

function showPlayerError(message) {
  dom.playerErrorMessage.textContent = message;
  dom.playerErrorOverlay.style.display = "flex";
}

function stopVideo() {
  const videoElement = dom.videoPlayer;
  videoElement.pause();
  videoElement.src = "";

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
}

// --- Utilities ---
function resolveIpfsOrIpnsUrl(cidOrKey, subpath = "") {
  if (!cidOrKey) return "";

  if (cidOrKey.startsWith("http://") || cidOrKey.startsWith("https://")) {
    return cidOrKey;
  }

  const cleanCid = cidOrKey.trim();

  // Detect if it looks like an IPNS key:
  // - Starts with k51... (IPNS CIDv1 base36)
  // - Starts with k1...
  // - Contains a dot '.' (domain name / DNSLink)
  const isIpns = cleanCid.startsWith("k51") ||
    cleanCid.startsWith("k1") ||
    cleanCid.includes(".");

  let baseGateway = state.gatewayUrl;

  if (isIpns) {
    if (baseGateway.endsWith("/ipfs/")) {
      baseGateway = baseGateway.slice(0, -6) + "/ipns/";
    } else if (baseGateway.endsWith("/ipfs")) {
      baseGateway = baseGateway.slice(0, -5) + "/ipns/";
    } else if (!baseGateway.includes("/ipns/")) {
      baseGateway = baseGateway.endsWith("/")
        ? `${baseGateway}ipns/`
        : `${baseGateway}/ipns/`;
    }
  } else {
    // Standard IPFS
    if (!baseGateway.includes("/ipfs/") && !baseGateway.includes("/ipns/")) {
      baseGateway = baseGateway.endsWith("/")
        ? `${baseGateway}ipfs/`
        : `${baseGateway}/ipfs/`;
    }
  }

  let finalUrl = `${baseGateway}${cleanCid}`;
  if (subpath) {
    const cleanSubpath = subpath.trim().startsWith("/")
      ? subpath.trim().substring(1)
      : subpath.trim();
    finalUrl = finalUrl.endsWith("/")
      ? `${finalUrl}${cleanSubpath}`
      : `${finalUrl}/${cleanSubpath}`;
  }

  return finalUrl;
}

function copyTextToClipboard(text, triggerButton) {
  if (!navigator.clipboard) {
    // Fallback copy
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      animateCopySuccess(triggerButton);
    } catch (err) {
      console.error("Failed to copy fallback:", err);
    }
    document.body.removeChild(textarea);
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    animateCopySuccess(triggerButton);
  }).catch((err) => {
    console.error("Could not copy text: ", err);
  });
}

function animateCopySuccess(button) {
  if (!button) return;
  const originalHtml = button.innerHTML;

  // Set success tick icon
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  button.style.borderColor = "var(--success-color)";

  setTimeout(() => {
    button.innerHTML = originalHtml;
    button.style.borderColor = "";
  }, 1500);
}
