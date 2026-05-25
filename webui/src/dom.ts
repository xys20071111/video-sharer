export interface DomElements {
  searchInput: HTMLInputElement;
  btnOpenSettings: HTMLButtonElement;
  tagsContainer: HTMLElement;
  videoGrid: HTMLElement;
  videoCount: HTMLElement;
  timestampWrapper: HTMLElement;
  catalogTimestamp: HTMLElement;
  catalogName: HTMLElement;
  activeCatalogName: HTMLElement;

  browseView: HTMLElement;
  watchView: HTMLElement;

  settingsDialog: HTMLDialogElement;
  btnCloseSettings: HTMLButtonElement;
  gatewaySelect: HTMLSelectElement;
  gatewayInput: HTMLInputElement;
  jsonPasteArea: HTMLTextAreaElement;
  btnLoadPaste: HTMLButtonElement;
  uploadZone: HTMLElement;
  fileUploadInput: HTMLInputElement;
  selectedFileInfo: HTMLElement;
  importCidInput: HTMLInputElement;
  btnLoadCid: HTMLButtonElement;
  btnResetMock: HTMLButtonElement;

  savedCatalogNameInput: HTMLInputElement;
  btnSaveCatalog: HTMLButtonElement;
  btnExportCatalog: HTMLButtonElement;
  savedCatalogsList: HTMLElement;

  videoPlayer: HTMLVideoElement;
  playerErrorOverlay: HTMLElement;
  playerErrorMessage: HTMLElement;
  btnRetryVideo: HTMLButtonElement;
  playerTitle: HTMLElement;
  playerAuthor: HTMLElement;
  playerVideoEntry: HTMLElement;
  playerDescription: HTMLElement;
  playerTags: HTMLElement;
  playerCidValue: HTMLElement;
  playerGatewayLink: HTMLAnchorElement;
  btnCopyCid: HTMLButtonElement;
  btnCopyLink: HTMLButtonElement;
}

export const dom: DomElements = {
  searchInput: document.getElementById("searchInput") as HTMLInputElement,
  btnOpenSettings: document.getElementById("btnOpenSettings") as HTMLButtonElement,
  tagsContainer: document.getElementById("tagsContainer") as HTMLElement,
  videoGrid: document.getElementById("videoGrid") as HTMLElement,
  videoCount: document.getElementById("videoCount") as HTMLElement,
  timestampWrapper: document.getElementById("timestampWrapper") as HTMLElement,
  catalogTimestamp: document.getElementById("catalogTimestamp") as HTMLElement,
  catalogName: document.getElementById("catalogName") as HTMLElement,
  activeCatalogName: document.getElementById("activeCatalogName") as HTMLElement,

  browseView: document.getElementById("browseView") as HTMLElement,
  watchView: document.getElementById("watchView") as HTMLElement,

  settingsDialog: document.getElementById("settingsDialog") as HTMLDialogElement,
  btnCloseSettings: document.getElementById("btnCloseSettings") as HTMLButtonElement,
  gatewaySelect: document.getElementById("gatewaySelect") as HTMLSelectElement,
  gatewayInput: document.getElementById("gatewayInput") as HTMLInputElement,
  jsonPasteArea: document.getElementById("jsonPasteArea") as HTMLTextAreaElement,
  btnLoadPaste: document.getElementById("btnLoadPaste") as HTMLButtonElement,
  uploadZone: document.getElementById("uploadZone") as HTMLElement,
  fileUploadInput: document.getElementById("fileUploadInput") as HTMLInputElement,
  selectedFileInfo: document.getElementById("selectedFileInfo") as HTMLElement,
  importCidInput: document.getElementById("importCidInput") as HTMLInputElement,
  btnLoadCid: document.getElementById("btnLoadCid") as HTMLButtonElement,
  btnResetMock: document.getElementById("btnResetMock") as HTMLButtonElement,

  savedCatalogNameInput: document.getElementById("savedCatalogNameInput") as HTMLInputElement,
  btnSaveCatalog: document.getElementById("btnSaveCatalog") as HTMLButtonElement,
  btnExportCatalog: document.getElementById("btnExportCatalog") as HTMLButtonElement,
  savedCatalogsList: document.getElementById("savedCatalogsList") as HTMLElement,

  videoPlayer: document.getElementById("videoPlayer") as HTMLVideoElement,
  playerErrorOverlay: document.getElementById("playerErrorOverlay") as HTMLElement,
  playerErrorMessage: document.getElementById("playerErrorMessage") as HTMLElement,
  btnRetryVideo: document.getElementById("btnRetryVideo") as HTMLButtonElement,
  playerTitle: document.getElementById("playerTitle") as HTMLElement,
  playerAuthor: document.getElementById("playerAuthor") as HTMLElement,
  playerVideoEntry: document.getElementById("playerVideoEntry") as HTMLElement,
  playerDescription: document.getElementById("playerDescription") as HTMLElement,
  playerTags: document.getElementById("playerTags") as HTMLElement,
  playerCidValue: document.getElementById("playerCidValue") as HTMLElement,
  playerGatewayLink: document.getElementById("playerGatewayLink") as HTMLAnchorElement,
  btnCopyCid: document.getElementById("btnCopyCid") as HTMLButtonElement,
  btnCopyLink: document.getElementById("btnCopyLink") as HTMLButtonElement,
};
