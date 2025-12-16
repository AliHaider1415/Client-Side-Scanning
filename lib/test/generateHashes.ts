import fs from "fs";
import path from "path";

import { computePHash } from "../utils/pHash.ts";
import { hashToCurve } from "../crypto/hashToCurve.ts";
import { SERVER_OPRF_KEY } from "../server/oprfServer.ts";

async function generateHashes(folderPath: string) {
  const files = fs.readdirSync(folderPath);
  const results: { file: string; phash: string }[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".bmp"].includes(ext)) continue;

    const fullPath = path.join(folderPath, file);
    try {
      const phash = await computePHash(fullPath);
      // const keyedHash = Fk(phash);
      const point = hashToCurve(phash);
      const evaluatedPoint = point.multiply(SERVER_OPRF_KEY);
      const evaluatedToken = evaluatedPoint.toHex();

      results.push({ file, phash: evaluatedToken });
      console.log(`${file} => ${evaluatedToken}`);
    } catch (error) {
      console.error(`Failed to process ${file}`, error);
    }
  }

  // Save to JSON
  fs.writeFileSync(path.join(folderPath, "evaluated_phashes.json"), JSON.stringify(results, null, 2));
  console.log("Saved Evaluated phashes.json");
}

const folder = "./public/Graphically Violent Images";
generateHashes(folder).catch(console.error);