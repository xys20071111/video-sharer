import Hls from "hls.js";
import type { VideoEntry } from "./types.ts";
import { state } from "./state.ts";
import { dom } from "./dom.ts";
import { resolveCid } from "./utils.ts";
import { state } from "./state.ts";

let hlsInstance: Hls | null = null;

export function playVideo(video: VideoEntry): void {
  stopVideo();

  const gw = state.gatewayUrl.replace(/\/+$/, "");
  const videoUrl = `${gw}${resolveCid(video.cid)}/${video.metadata.entry}`;
  const videoElement = dom.videoPlayer;

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
              hlsInstance?.recoverMediaError();
              break;
            default:
              showPlayerError("Fatal video decoding error.");
              stopVideo();
              break;
          }
        }
      });
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
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

export function stopVideo(): void {
  const videoElement = dom.videoPlayer;
  videoElement.pause();
  videoElement.src = "";

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
}

export function showPlayerError(message: string): void {
  dom.playerErrorMessage.textContent = message;
  dom.playerErrorOverlay.style.display = "flex";
}

export { hlsInstance };
