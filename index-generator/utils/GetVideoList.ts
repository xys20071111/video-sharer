import { KuboRPCClient } from "kubo-rpc-client";
import { VideoList } from "@/define/VideoList.ts";

const textdecoder = new TextDecoder();

export async function getVideoList(
  client: KuboRPCClient,
  cid: string,
): Promise<VideoList> {
  let rawdata = "";
  for await (const part of client.cat(cid)) {
    rawdata += textdecoder.decode(part);
  }
  return JSON.parse(rawdata);
}
