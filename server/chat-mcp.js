import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const chatMCP = async (query) => {
  const apiKey = process.env.OPENAI_API_KEY;

  // Create MCP client
  const client = new Client({
    name: "chat-client",
    version: "1.0.0",
  });

  // Get the path to the MCP server
  const serverPath = join(__dirname, "mcp-server.js");

  // Create transport to connect to the MCP server
  // Pass environment variables to the child process
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: {
      ...process.env, // Inherit all environment variables from parent process
    },
  });

  try {
    // Connect to the MCP server
    await client.connect(transport);

    // Always perform web search
    const toolResult = await client.callTool({
      name: "search_web",
      arguments: {
        query: query,
        num: 5,
      },
    });

    let searchResults = "";

    if (toolResult.content && toolResult.content.length > 0) {
      searchResults = toolResult.content[0].text;
    }

    // Use the LLM to answer the question based on search results
    const model = new ChatOpenAI({
      model: "gpt-5",
      apiKey,
    });

    const answerTemplate = `Summarize the search result.

Search Results:
{searchResults}

Helpful Answer:`;

    const prompt = PromptTemplate.fromTemplate(answerTemplate);
    const formattedPrompt = await prompt.format({
      searchResults: searchResults || "No search results available",
    });

    const response = await model.invoke(formattedPrompt);
    const finalAnswer = response.content;

    // Clean up
    await client.close();

    return { text: finalAnswer };
  } catch (error) {
    // Clean up on error
    try {
      await client.close();
    } catch (e) {
      // Ignore cleanup errors
    }

    throw error;
  }
};

export default chatMCP;
