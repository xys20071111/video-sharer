export interface VideoMetadata {
  title: string;
  description: string;
  author: string;
  entry: string;
  tags: string[];
  thumbnail: string;
}

export interface VideoEntry {
  cid: string;
  metadata: VideoMetadata;
}

export interface VideoList {
  timestamp: number;
  videos: VideoEntry[];
}

export interface CatalogSlot {
  id: string;
  name: string;
  savedAt: number;
  timestamp: number;
  videoCount: number;
  source: string;
  data: VideoList;
}

export interface AppState {
  videoList: VideoList;
  activeTag: string;
  searchQuery: string;
  gatewayUrl: string;
  currentlyPlaying: VideoEntry | null;
  activeCatalogName: string;
  activeCatalogSource: string;
}
