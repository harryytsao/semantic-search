import { NextResponse, NextRequest } from "next/server";
import { milvus, COLLECTION_NAME } from "../../../utils/milvus";
import { embedder } from "../../../utils/embedder";
export const dynamic = "force-dynamic";

/**
 * Handles the POST request for searching in Milvus.
 * @param req - The NextRequest object containing the request data.
 * @returns A NextResponse object with the search result in JSON format.
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    // embed
    const data = await embedder.embed(text);
    const result = await milvus.search({
      vector: data.values as number[],
      collection_name: COLLECTION_NAME,
      output_fields: ["vector_id", "title", "vector_text"],
      limit: 100,
    });
    console.log("result-----:", result);
    if (!result || !result.results) {
      throw new Error("No results found");
    }

    const formattedResults = result.results.map((item) => ({
      vector_id: item.vector_id,
      score: item.score,
      title: item.title,
      vector_text: item.vector_text,
    }));

    console.log("Formatted results:", formattedResults);
    return NextResponse.json(result || {});
  } catch (error) {
    console.log("---error", error);
    return NextResponse.json(error || {});
  }
}
