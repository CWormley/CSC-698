import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "@langchain/openai";
import { VectorStore } from "@langchain/core/vectorstores";

const client = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY!,
});

// Wrap texts into Qdrant vector store
const vectorStore = await VectorStore.fromTexts(
  ["Hello world", "LangChain + Qdrant"],
  [{ id: "1" }, { id: "2" }],
  embeddings,
  { client, collectionName: "user_memories" }
);

// Example retrieval
const results = await vectorStore.similaritySearch("Hello", 2);
console.log(results);
