import { NextResponse, NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { milvus } from "../../../utils/milvus";
export const dynamic = "force-dynamic";

interface FileJson {
  title?: string;
  question?: number[][];
  question_text?: string[];
  reply?: number[][];
  reply_text?: string[];
  content?: number[][];
  content_text?: string[];
  metadata?: any;
}

interface DataItem {
  vector_id: string;
  title: string;
  vector: number[];
  vector_text: string;
}
let globalIdCounter = 0;
/**
 * Handles the GET request for loading data into Milvus.
 * @param req - The NextRequest object representing the incoming request.
 * @returns A NextResponse object containing the response data.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const onlyCsv = searchParams.get("onlyCsv") === "true";

  try {
    const data = await processAllData();

    if (onlyCsv) {
      return NextResponse.json(data);
    }

    if (process.env.SUPPORT_INSERT === "false") {
      return NextResponse.json({
        error: "Insert operation is not supported",
      });
    }

    await milvus.batchInsert(data, 0);
    return NextResponse.json({ status: "success", count: data.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error processing data" },
      { status: 500 }
    );
  }
}

async function processAllData(): Promise<DataItem[]> {
  let data: DataItem[] = [];

  // Legco QNA
  for (let year = 1998; year < 2024; year++) {
    const folderPath = path.join(
      process.cwd(),
      `public/embeddings/legcoqna/128embeddings/${year}`
    );
    await processFolder(folderPath, data, "legcoqna");
  }

  // Press Release
  for (let year = 1999; year < 2025; year++) {
    const folderPath = path.join(
      process.cwd(),
      `public/embeddings/pressrelease/128embeddings/${year}`
    );
    await processFolder(folderPath, data, "pressrelease");
  }

  // SFC QNA
  const sfcQnaFolderPath = path.join(
    process.cwd(),
    "public/embeddings/sfcqna/128embeddings/"
  );
  await processFolder(sfcQnaFolderPath, data, "sfcqna");

  // SFC Speaking Notes
  const sfcSpeakingNotesFolderPath = path.join(
    process.cwd(),
    "public/embeddings/sfcspeakingnotes/128embeddings"
  );
  await processFolder(sfcSpeakingNotesFolderPath, data, "sfcspeakingnotes");

  console.log(`Total data points with duplicates: ${data.length}`);

  // Remove duplicates
  const vectorText = new Set<string>();
  const newData: DataItem[] = [];

  data.forEach((item) => {
    if (!vectorText.has(item.vector_text)) {
      vectorText.add(item.vector_text);
      newData.push(item);
    }
  });

  data = newData;
  console.log(`Removed duplicates, new data points: ${data.length}`);

  return data;
}

async function processFolder(
  folderPath: string,
  data: DataItem[],
  source: string
): Promise<void> {
  try {
    const files = await fs.readdir(folderPath);
    for (const filename of files) {
      if (filename.endsWith(".json")) {
        const filePath = path.join(folderPath, filename);
        await processFile(filePath, (fileJson) => {
          const title = fileJson.title || "";
          console.log(source + String(globalIdCounter++));
          if (fileJson.question && fileJson.question_text) {
            const fileData = fileJson.question.map((vector, i) => ({
              vector_id: source + String(globalIdCounter++),
              title,
              vector,
              // vector_text: fileJson.question_text![i],
              vector_text: Array.isArray(fileJson.question_text)
                ? fileJson.question_text![i] || "" // Use empty string if undefined
                : typeof fileJson.question_text === "string"
                ? fileJson.question_text
                : "",
            }));
            // id0 += fileJson.question.length;
            data.push(...fileData);
          }
          if (fileJson.reply && fileJson.reply_text) {
            const fileData2 = fileJson.reply.map((vector, i) => ({
              vector_id: source + String(globalIdCounter++),
              title,
              vector,
              vector_text: Array.isArray(fileJson.reply_text)
                ? fileJson.reply_text![i] || "" // Use empty string if undefined
                : typeof fileJson.reply_text === "string"
                ? fileJson.reply_text
                : "",
            }));
            // id0 += fileJson.reply.length;
            data.push(...fileData2);
          }
          if (fileJson.content && fileJson.content_text) {
            const fileData = fileJson.content.map((vector, i) => ({
              vector_id: source + String(globalIdCounter++),
              title,
              vector,
              vector_text: Array.isArray(fileJson.content_text)
                ? fileJson.content_text![i] || "" // Use empty string if undefined
                : typeof fileJson.content_text === "string"
                ? fileJson.content_text
                : "",
            }));
            // id0 += fileJson.content.length;
            data.push(...fileData);
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error processing folder ${folderPath}:`, error);
  }
}

async function processFile(
  filePath: string,
  processFunction: (fileJson: FileJson) => void
): Promise<void> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const fileJson: FileJson = JSON.parse(fileContent);
    processFunction(fileJson);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}
