import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
// import { scanImage, comparePHashes } from "@/lib/scanner/imageHashScanner";
import { revalidatePath } from "next/cache";
import { scanBlindedHash } from "@/lib/scanner/imageHashScanner";
import { Fk } from "@/lib/utils/serverKeyedTransform";
import { evaluateBlindedPoint } from "@/lib/server/oprfServer";

// v1
// export async function POST(req: Request) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json(
//         { error: "No file uploaded" },
//         { status: 400 }
//       );
//     }

//     // Ensure uploads directory exists (inside public/uploads)
//     const uploadDir = path.join(process.cwd(), "public", "uploads");
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     // convert file to buffer
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = new Uint8Array(arrayBuffer);

//     // full file path
//     const filepath = path.join(uploadDir, file.name);

//     // write file
//     await fs.promises.writeFile(filepath, buffer);

//     // revalidate homepage after upload
//     revalidatePath("/");

//     // scan image
//     const scanResult = await scanImage(filepath);

//     // return scan result
//     return NextResponse.json(scanResult);
//   } catch (err) {
//     console.error("Error in upload/scan:", err);
//     return NextResponse.json(
//       { error: "Server error during scan" },
//       { status: 500 }
//     );
//   }
// }

// v2

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const blindedPoint = formData.get("blindedPoint") as string;

    if (!blindedPoint) {
      return NextResponse.json(
        { error: "No hash provided" },
        { status: 400 }
      );
    }

    console.log("Blinded Point in server: ", blindedPoint);
    // const scanResult = scanBlindedHash(blindedHash);
    // const transformedToken = Fk(blindedHash);
    const evaluated = evaluateBlindedPoint(blindedPoint);
    console.log("Evaluated Point: ", evaluated);

    return NextResponse.json({ evaluatedPoint: evaluated });
  } catch (err) {
    console.error("Error in scan:", err);
    return NextResponse.json(
      { error: "Server error during scan" },
      { status: 500 }
    );
  }
}
