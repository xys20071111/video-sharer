import { KuboRPCClient } from "kubo-rpc-client";
import Database from "@/Database.ts";
import { getVideoMetadata } from "../utils/GetVideoMetadata.ts";

export async function addVideo(
  client: KuboRPCClient,
  db: Database,
  cid: string,
): Promise<boolean> {
  const metadata = await getVideoMetadata(client, cid);
  const item = db.isVideoExists(cid);
  if (metadata && !item) {
    db.addVideo(cid, metadata);
    await client.pin.add(cid, { recursive: true });
    return true;
  }
  return false;
}

export async function delVideo(
  client: KuboRPCClient,
  db: Database,
  cid: string,
) {
  await db.delVideo(cid);
  await client.pin.rm(cid);
}
