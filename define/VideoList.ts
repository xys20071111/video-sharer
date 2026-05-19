import { VideoMetadata } from "./VideoMetadata.ts";

export interface VideoEntry {
  cid: string;
  metadata: VideoMetadata;
}

export interface VideoList {
  timestamp: number;
  videos: Array<VideoEntry>;
}
