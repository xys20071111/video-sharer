import { create } from "kubo-rpc-client";
import { Command } from "@cliffy/command";
import Database from "./Database.ts";
import Config from "./define/Config.ts";
import { addVideo, delVideo } from "./controller/VideoController.ts";
import { importVideoFromList } from "./controller/ImportFromList.ts";
import { getVideoList } from "./utils/GetVideoList.ts";

await new Command()
  .name("Video Share Site Admin Utils")
  .description("A simple tool for share video through a IPFS-based site")
  .globalOption("-c --config <config:string>", "Path to configure file.", {
    default: "./config.json",
  })
  .command("add", "Add a new video")
  .arguments("<cid:string>")
  .action(async (arg, ...options) => {
    const config: Config = JSON.parse(await Deno.readTextFile(arg.config));
    const ipfsClient = create(config.kuboUrl);
    const database = await Database.createInstance(config.dbPath);

    if (await addVideo(ipfsClient, database, options[0])) {
      console.log("Video added successfully!");
    } else {
      console.error(
        "Cannot add current video. Is CID not point to a dir or video already exists?",
      );
    }
  })
  .command("del", "Delete a video")
  .arguments("<cid:string>")
  .action(async (arg, ...options) => {
    const config: Config = JSON.parse(await Deno.readTextFile(arg.config));
    const ipfsClient = create(config.kuboUrl);
    const database = await Database.createInstance(config.dbPath);

    await delVideo(ipfsClient, database, options[0]);
    console.log("Video added successfully!");
  })
  .command("getVideoList", "Get stored video.")
  .action(async (arg) => {
    const config: Config = JSON.parse(await Deno.readTextFile(arg.config));
    const database = await Database.createInstance(config.dbPath);

    const result = JSON.stringify(await database.getVideoList(), null, 4);
    console.log(result);
  })
  .command("publish", "Publish video list to IPFS.")
  .action(async (arg) => {
    const config: Config = JSON.parse(await Deno.readTextFile(arg.config));
    const ipfsClient = create(config.kuboUrl);
    const database = await Database.createInstance(config.dbPath);

    const videoList = JSON.stringify(await database.getVideoList());
    const { cid } = await ipfsClient.add(videoList);
    await ipfsClient.name.publish(`/ipfs/${cid}`, {
      key: config.ipnsKeyName ?? "self",
    });
    console.log(
      `Video list CID: ${cid}, published to key: ${
        config.ipnsKeyName ?? "self"
      }`,
    );
  })
  .command("import", "Import videos from a video list.")
  .arguments("<cid:string>")
  .action(async (arg, ...options) => {
    const config: Config = JSON.parse(await Deno.readTextFile(arg.config));
    const ipfsClient = create(config.kuboUrl);
    const database = await Database.createInstance(config.dbPath);

    const list = await getVideoList(ipfsClient, options[0]);
    await importVideoFromList(ipfsClient, database, list);
    console.log("Import successfully!");

    // await delVideo(ipfsClient, database, options[0]);
    // console.log("Video added successfully!");
  })
  .parse();

// const config: Config = JSON.parse(await Deno.readTextFile(Deno.args[0]));
// const ipfsClient = create(config.kuboUrl);
