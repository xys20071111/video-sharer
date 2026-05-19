import { VideoMetadata } from "@/define/VideoMetadata.ts";
import { create, KuboRPCClient } from "kubo-rpc-client";

const textdecoder = new TextDecoder();

export async function getVideoMetadata(
  client: KuboRPCClient,
  cid: string,
): Promise<VideoMetadata | null> {
  try {
    let rawdata = "";
    for await (const part of client.cat(`${cid}/metadata.json`)) {
      rawdata += textdecoder.decode(part);
    }
    return JSON.parse(rawdata);
  } catch {
    //Do nothing here.
  }
  return null;
}

if (import.meta.main) {
  const client = create();
  // Try a invalid string
  console.log(await getVideoMetadata(client, "abc123"));
  // Try a path that not a dir
  console.log(
    await getVideoMetadata(
      client,
      "QmVBGDxc5Knu5LHAf2Kq7waxNBghqpcquydqu3upJCZCds",
    ),
  );
  // Try test video
  console.log(
    await getVideoMetadata(
      client,
      "QmXzt7DWeD8uDcrgpajw6DZA6mECuZ4eTwjjyWBxzmLCRV",
    ),
  );
}
