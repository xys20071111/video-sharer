import { VideoList } from "@/define/VideoList.ts";
import { KuboRPCClient } from "kubo-rpc-client";
import Database from "@/Database.ts";

export async function importVideoFromList(
  client: KuboRPCClient,
  db: Database,
  list: VideoList,
) {
  for (const { cid, metadata } of list.videos) {
    if (!await db.isVideoExists(cid)) {
      await client.pin.add(cid);
      await db.addVideo(cid, metadata);
    } else {
      console.log(`${cid} already exists in database, skip...`);
    }
  }
}
