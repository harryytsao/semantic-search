import {
  InsertReq,
  MilvusClient,
  MutationResult,
  QueryReq,
  SearchSimpleReq,
} from "@zilliz/milvus2-sdk-node";

const DIM = 384; // model Xenova/all-MiniLM-L6-v2 embedding dimension
export const COLLECTION_NAME = "main";
export const VECTOR_FIELD_NAME = "vector";
export const METRIC_TYPE = "COSINE";
export const INDEX_TYPE = "AUTOINDEX";
// export const INDEX_TYPE = ["AUTOINDEX", "HNSW"];

interface DataItem {
  vector_id: string;
  title: string;
  vector: number[];
  vector_text: string;
}

class Milvus {
  private _client: MilvusClient | undefined;
  private _MAX_INSERT_COUNT = 1000;
  private _insert_progress = 0;
  private _is_inserting = false;
  private _error_msg = "";

  constructor() {
    if (!this._client) {
      this.init();
    }
  }

  public getClient() {
    return this._client;
  }

  public async hasCollection() {
    return await this._client?.hasCollection({
      collection_name: COLLECTION_NAME,
    });
  }

  public async init() {
    if (!process.env.URI) {
      throw new Error("URI is required, please check your .env file.");
    }

    try {
      this._client = new MilvusClient({
        address: process.env.URI || "",
        token: process.env.TOKEN,
        channelOptions: {
          // starter cluster will throw rejected by server because of excess ping, so we need to adjust the ping interval
          "grpc.keepalive_time_ms": 40000, // Adjust the time interval between pings
          "grpc.keepalive_timeout_ms": 5000, // Adjust the time to wait for a response to a ping
        },
      });
      return await this.createCollection();
    } catch (error) {
      throw error;
    }
  }

  public async createCollection() {
    try {
      const res = await this.hasCollection();
      if (res?.value) {
        return res;
      }
      const collectionRes = await this._client?.createCollection({
        collection_name: COLLECTION_NAME,
        dimension: DIM,
        metric_type: METRIC_TYPE,
        auto_id: true,
      });

      return collectionRes;
    } catch (error) {
      throw error;
    }
  }

  public async listCollections() {
    const res = await this._client?.listCollections();
    return res;
  }

  public async query(data: QueryReq) {
    return await this._client?.query(data);
  }

  public async search(data: SearchSimpleReq) {
    return await this._client?.search({
      ...data,
    });
  }

  public async insert(data: InsertReq) {
    try {
      const res = await this._client?.insert(data);
      return res;
    } catch (error) {
      throw error;
    }
  }

  public async batchInsert(
    dataItems: DataItem[],
    startIndex: number
  ): Promise<MutationResult | undefined> {
    try {
      const total = dataItems.length;
      const endIndex = Math.min(startIndex + this._MAX_INSERT_COUNT, total);
      const insertDataItems = dataItems.slice(startIndex, endIndex);
      this._is_inserting = true;

      if (startIndex === 0) {
        this._insert_progress = 0;
      }
      const insertDatas = insertDataItems.map((item) => ({
        vector_id: item.vector_id,
        title: item.title,
        vector: item.vector,
        vector_text: item.vector_text,
      }));

      console.log(
        `--- ${startIndex} ~ ${endIndex} embedding done, begin to insert into milvus --- `
      );
      const res = await this.insert({
        fields_data: insertDatas,
        collection_name: COLLECTION_NAME,
      });
      this._insert_progress = Math.floor((endIndex / total) * 100);

      console.log(
        `--- ${startIndex} ~ ${endIndex} insert done, ${this._insert_progress}% now ---`
      );
      if (endIndex < total) {
        return await this.batchInsert(dataItems, endIndex);
      }
      this._insert_progress = 100;
      this._is_inserting = false;
      return res;
    } catch (error) {
      this._insert_progress = 0;
      this._is_inserting = false;
      this._error_msg = (error as any).message || "Insert failed";
    }
  }

  get insertProgress() {
    return this._insert_progress;
  }

  get isInserting() {
    return this._is_inserting;
  }

  get errorMsg() {
    return this._error_msg;
  }
}

const milvus = new Milvus();

export { milvus };
