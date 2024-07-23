// import { NextResponse, NextRequest } from "next/server";
// import { milvus, COLLECTION_NAME } from "../../../utils/milvus";

// // This variable is used to force dynamic routing in Next.js
// export const dynamic = "force-dynamic";

// export async function POST(req: NextRequest) {
//   try {
//     if (process.env.SUPPORT_INSERT === "false") {
//       return NextResponse.json({ error: "Insert operation is not supported" });
//     }

//     // Prepare the data to be inserted into the Milvus collection
//     // const insertData = {
//     //   vector: data.values,
//     //   /**
//     //    * The question and answer are stored as dynamic JSON.
//     //    * They won't appear in the schema, but can be retrieved during a similarity search.
//     //    * */
//     //   question,
//     //   answer,
//     // };

//     // Insert the data into the Milvus collection
//     const result = await milvus.insert({
//       fields_data: [data],
//       collection_name: COLLECTION_NAME,
//     });

//     // Return the result of the insert operation
//     return NextResponse.json(result || {});
//   } catch (error) {
//     // Log any errors that occur during the process
//     console.log("---error", error);

//     // Return the error as a JSON response
//     return NextResponse.json(error || {});
//   }
// }
