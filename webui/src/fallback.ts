import type { VideoList } from "./types.ts";

export const FALLBACK_DEMO_DATA: VideoList = {
  timestamp: Date.now(),
  videos: [
    {
      cid: "/ipfs/QmdpAidwAsBGptFB3b6A9Pyi5coEbgjHrL3K2Qrsutmj9K",
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
      cid: "/ipfs/QmXzt7DWeD8uDcrgpajw6DZA6mECuZ4eTwjjyWBxzmLCRV",
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
      cid: "/ipfs/QmSintelCidPlaceholder",
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
      cid: "/ipfs/QmTearsOfSteelCidPlaceholder",
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
