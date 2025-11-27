import fs from "fs";
import path from "path";

import { computePHash } from "../utils/pHash.ts";

async function generateHashes(folderPath: string) {
  const files = fs.readdirSync(folderPath);
  const results: { file: string; phash: string }[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".bmp"].includes(ext)) continue;

    const fullPath = path.join(folderPath, file);
    try {
      const phash = await computePHash(fullPath);
      results.push({ file, phash });
      console.log(`${file} => ${phash}`);
    } catch (error) {
      console.error(`Failed to process ${file}`, error);
    }
  }

  // Save to JSON
  fs.writeFileSync(path.join(folderPath, "phashes.json"), JSON.stringify(results, null, 2));
  console.log("Saved phashes.json");
}

const folder = "./public/Graphically Violent Images";
generateHashes(folder).catch(console.error);