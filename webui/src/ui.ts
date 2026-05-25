import { state } from "./state.ts";
import { dom } from "./dom.ts";
import type { VideoEntry } from "./types.ts";
import { escapeHtml, copyTextToClipboard, flashBtnSuccess, resolveCid } from "./utils.ts";
import { getSavedCatalogs, saveCatalogSlot, deleteCatalogSlot, loadCatalogSlot, exportCatalogAsJson } from "./catalog.ts";
import { playVideo, stopVideo } from "./player.ts";

export function renderUI(): void {
  renderStats();
  renderTagFilterBar();
  renderVideoGrid();
}

function renderStats(): void {
  dom.catalogName.textContent = state.activeCatalogName || "Demo Catalog";
  dom.activeCatalogName.textContent = state.activeCatalogName || "Demo Catalog";

  dom.videoCount.textContent = `${state.videoList.videos.length} video${state.videoList.videos.length === 1 ? "" : "s"}`;

  if (state.videoList.timestamp) {
    const formattedDate = new Date(state.videoList.timestamp).toLocaleString();
    dom.catalogTimestamp.textContent = formattedDate;
    dom.timestampWrapper.style.display = "block";
  } else {
    dom.timestampWrapper.style.display = "none";
  }
}

function renderTagFilterBar(): void {
  const tagsSet = new Set<string>();
  state.videoList.videos.forEach((v) => {
    if (v.metadata.tags) {
      v.metadata.tags.forEach((t) => {
        if (t && t.trim()) tagsSet.add(t.trim().toLowerCase());
      });
    }
  });

  const uniqueTags = Array.from(tagsSet).sort();
  dom.tagsContainer.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = `tag-pill ${state.activeTag === "all" ? "active" : ""}`;
  allBtn.textContent = "All Videos";
  allBtn.setAttribute("data-tag", "all");
  allBtn.addEventListener("click", () => selectTagFilter("all"));
  dom.tagsContainer.appendChild(allBtn);

  uniqueTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = `tag-pill ${state.activeTag === tag ? "active" : ""}`;
    btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    btn.setAttribute("data-tag", tag);
    btn.addEventListener("click", () => selectTagFilter(tag));
    dom.tagsContainer.appendChild(btn);
  });
}

function selectTagFilter(tag: string): void {
  state.activeTag = tag;

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

function renderVideoGrid(): void {
  const filteredVideos = state.videoList.videos.filter((video) => {
    const meta = video.metadata;

    const matchesTag = state.activeTag === "all" ||
      (meta.tags && meta.tags.some((t) => t.toLowerCase() === state.activeTag));

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

    let thumbnailHtml = "";
    const thumbPath = video.metadata.thumbnail;
    if (thumbPath) {
      const resolvedThumb =
        (thumbPath.startsWith("http://") || thumbPath.startsWith("https://"))
          ? thumbPath
          : `${state.gatewayUrl.replace(/\/+$/, "")}${resolveCid(video.cid)}/${thumbPath}`;
      thumbnailHtml =
        `<img class="card-thumbnail" src="${resolvedThumb}" alt="${video.metadata.title} thumbnail" onerror="handleThumbError(this, '${video.metadata.title}')">`;
    } else {
      thumbnailHtml = createPlaceholderThumbnail(video.metadata.title);
    }

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

    card.addEventListener("click", (e) => {
      if (
        (e.target as HTMLElement).closest(".btn-card-copy") || (e.target as HTMLElement).closest(".cid-badge")
      ) {
        e.stopPropagation();
        const cidButton = card.querySelector(".btn-card-copy");
        copyTextToClipboard(video.cid, cidButton as HTMLElement);
        return;
      }
      globalThis.location.hash = `watch/${video.cid}`;
    });

    dom.videoGrid.appendChild(card);
  });
}

function createPlaceholderThumbnail(title: string): string {
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
    <div class="thumbnail-placeholder" style="background: ${selectedGradient}">
      <span>${initials}</span>
    </div>
  `;
}

(globalThis as unknown as Record<string, unknown>).handleThumbError = function (
  imgElement: HTMLImageElement,
  title: string,
) {
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

export function showWatchView(video: VideoEntry): void {
  state.currentlyPlaying = video;

  dom.browseView.style.display = "none";
  dom.watchView.style.display = "block";

  dom.playerTitle.textContent = video.metadata.title;
  dom.playerAuthor.textContent = video.metadata.author || "Anonymous";
  dom.playerVideoEntry.textContent = video.metadata.entry;
  dom.playerDescription.textContent = video.metadata.description ||
    "No description provided.";
  dom.playerCidValue.textContent = video.cid;

  const gw = state.gatewayUrl.replace(/\/+$/, "");
  const directUrl = `${gw}${resolveCid(video.cid)}/${video.metadata.entry}`;
  dom.playerGatewayLink.href = directUrl;
  dom.playerGatewayLink.textContent = directUrl;

  dom.playerTags.innerHTML = (video.metadata.tags || [])
    .map((tag) => `<span class="card-tag">${tag}</span>`)
    .join("");

  dom.playerErrorOverlay.style.display = "none";

  playVideo(video);

  globalThis.scrollTo({ top: 0, behavior: "smooth" });
}

export function showBrowseView(): void {
  state.currentlyPlaying = null;

  stopVideo();

  dom.watchView.style.display = "none";
  dom.browseView.style.display = "block";

  globalThis.scrollTo({ top: 0, behavior: "smooth" });
}

export function renderSavedCatalogsList(): void {
  const list = dom.savedCatalogsList;
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
      : "\u2014";
    const sourceMetaHtml = slot.source
      ? `<span class="saved-catalog-meta" title="${escapeHtml(slot.source)}">Source: ${escapeHtml(slot.source.substring(0, 20))}...</span>`
      : "";

    return `
      <div class="saved-catalog-item" data-id="${slot.id}">
        <div class="saved-catalog-info">
          <span class="saved-catalog-name">${escapeHtml(slot.name)}</span>
          <span class="saved-catalog-meta">${slot.videoCount} video${slot.videoCount === 1 ? "" : "s"} \u00B7 catalog date ${catalogDate}</span>
          ${sourceMetaHtml}
          <span class="saved-catalog-meta">Saved on ${savedDate}</span>
        </div>
        <div class="saved-catalog-actions">
          <button class="btn btn-sm btn-outline btn-load-slot" data-id="${slot.id}" title="Load this catalog">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 .49-3.28"></path></svg>
            Load
          </button>
          ${
            slot.source
              ? `<button class="btn btn-sm btn-outline btn-update-slot" data-id="${slot.id}" data-source="${escapeHtml(slot.source)}" title="Check for updates on IPFS">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  Update
                </button>`
              : ""
          }
          <button class="btn btn-sm btn-danger-outline btn-delete-slot" data-id="${slot.id}" title="Delete this saved catalog">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
            Delete
          </button>
        </div>
      </div>`;
  }).join("");

  list.querySelectorAll(".btn-load-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (id && loadCatalogSlot(id)) {
        dom.settingsDialog.close();
        flashBtnSuccess(btn as HTMLElement, "Loaded!");
        renderUI();
      } else {
        alert("Failed to load catalog: invalid data format.");
      }
    });
  });

  list.querySelectorAll(".btn-update-slot").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const source = btn.getAttribute("data-source");
      const catalogs = getSavedCatalogs();
      const slot = catalogs.find((c) => c.id === id);
      if (!slot || !source) return;

      (btn as HTMLButtonElement).disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-small"></span> Checking...`;

      try {
        const fetchUrl = `${state.gatewayUrl.replace(/\/+$/, "")}${resolveCid(source)}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Gateway returned HTTP ${response.status}`);
        const data = await response.json();

        const newTime = data.timestamp || 0;
        const oldTime = slot.timestamp || 0;

        if (newTime > oldTime) {
          const newDate = new Date(newTime).toLocaleString();
          const oldDate = oldTime ? new Date(oldTime).toLocaleString() : "N/A";
          if (confirm(`A newer version is available for "${slot.name}"!\n\nNew version date: ${newDate}\nSaved version date: ${oldDate}\n\nDo you want to update it?`)) {
            slot.data = data;
            slot.timestamp = newTime;
            slot.videoCount = data.videos.length;
            slot.savedAt = Date.now();

            localStorage.setItem("ipfs_saved_catalogs", JSON.stringify(catalogs));

            if (state.activeCatalogName === slot.name) {
              state.videoList = data;
              localStorage.setItem("ipfs_video_list", JSON.stringify(data));
              renderUI();
            }

            renderSavedCatalogsList();
            alert("Catalog updated successfully!");
          }
        } else {
          alert(`"${slot.name}" is already up to date.`);
        }
      } catch (err) {
        alert(`Failed to check updates: ${(err as Error).message}`);
      } finally {
        (btn as HTMLButtonElement).disabled = false;
        btn.innerHTML = originalText;
      }
    });
  });

  list.querySelectorAll(".btn-delete-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const slot = getSavedCatalogs().find((c) => c.id === id);
      if (slot && id && confirm(`Delete saved catalog "${slot.name}"?`)) {
        deleteCatalogSlot(id);
        renderSavedCatalogsList();
      }
    });
  });
}
