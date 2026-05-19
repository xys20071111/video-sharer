import { VideoEntry, VideoList } from "./define/VideoList.ts";
import { VideoMetadata } from "./define/VideoMetadata.ts";
import { join } from "@std/path";

class Database {
  public static async createInstance(dbPath: string) {
    const db = await Deno.openKv(join(dbPath, "store.db"));
    return new Database(db);
  }
  private database: Deno.Kv;
  private constructor(db: Deno.Kv) {
    this.database = db;
  }

  public async addVideo(cid: string, metadata: VideoMetadata) {
    await this.database.set(["video", cid], metadata);
  }

  public async delVideo(cid: string) {
    await this.database.delete(["video", cid]);
  }

  public async getVideoList(): Promise<VideoList> {
    const result: Array<VideoEntry> = [];
    for await (
      const item of this.database?.list<VideoMetadata>({ prefix: ["video"] })
    ) {
      result.push({
        cid: item.key[1] as string,
        metadata: item.value,
      });
    }
    return {
      timestamp: Date.now(),
      videos: result,
    };
  }
  public async isVideoExists(cid: string) {
    const result = await this.database.get(["video", cid]);
    return !(!result.value);
  }
  public close() {
    this.database.close();
  }
}

export default Database;
