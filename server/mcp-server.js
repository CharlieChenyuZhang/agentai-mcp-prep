import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getJson } from "serpapi";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables from .env file
// Try loading from current directory and parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Create MCP server instance
const server = new McpServer({
  name: "serpapi-search",
  version: "1.0.0",
});

// Register the search tool
server.registerTool(
  "search_web",
  {
    description:
      "Search the web using SerpAPI. Returns search results including organic results, snippets, and related information.",
    inputSchema: {
      query: z.string().describe("The search query to execute"),
      num: z
        .number()
        .optional()
        .describe("Number of results to return (default: 10)"),
    },
  },
  async ({ query, num = 10 }) => {
    try {
      if (!SERPAPI_KEY) {
        return {
          content: [
            {
              type: "text",
              text: "Error: SERPAPI_KEY environment variable is not set",
            },
          ],
        };
      }

      const results = await getJson({
        engine: "google",
        q: query,
        num: num,
        api_key: SERPAPI_KEY,
      });

      // Format the search results
      const organicResults = results.organic_results || [];
      const formattedResults = organicResults
        .map((result, index) => {
          return `${index + 1}. ${result.title || "No title"}\n   URL: ${
            result.link || "No URL"
          }\n   ${result.snippet || "No snippet"}`;
        })
        .join("\n\n");

      const answerBox = results.answer_box
        ? `\n\nAnswer Box:\n${
            results.answer_box.answer || results.answer_box.snippet || ""
          }`
        : "";

      const knowledgeGraph = results.knowledge_graph
        ? `\n\nKnowledge Graph:\n${results.knowledge_graph.description || ""}`
        : "";

      const searchInfo = results.search_information
        ? `\n\nSearch Info: Found approximately ${
            results.search_information.total_results || "unknown"
          } results`
        : "";

      const fullResults = `Search Results for "${query}":${searchInfo}${answerBox}${knowledgeGraph}\n\nOrganic Results:\n${formattedResults}`;

      return {
        content: [
          {
            type: "text",
            text: fullResults,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error performing web search: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SerpAPI MCP Server running on stdio");
}

// Always run the server when this file is executed
// This is needed when spawned as a child process
main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});

export default server;
