import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const chat = async (filePath = "./uploads/hbs-lean-startup.pdf", query) => {
  const apiKey = process.env.OPENAI_API_KEY;

  const loader = new PDFLoader(filePath);
  const data = await loader.load();

  const textsplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 0,
  });

  const splitDocs = await textsplitter.splitDocuments(data);

  const embeddings = new OpenAIEmbeddings({
    apiKey,
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  );

  const model = new ChatOpenAI({
    model: "gpt-5",
    apiKey,
  });

  const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.

{context}
Question: {question}
Helpful Answer:`;

  const prompt = PromptTemplate.fromTemplate(template);

  const retriever = vectorStore.asRetriever();

  const relevantDocs = await retriever.invoke(query);

  const context = relevantDocs
    .map((doc) => {
      return doc.pageContent;
    })
    .join("\n\n");

  const formattedPrompt = await prompt.format({
    context,
    question: query,
  });

  const response = await model.invoke(formattedPrompt);

  return { text: response.content };
};

export default chat;
