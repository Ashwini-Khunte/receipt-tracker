import {
    openai,
    createNetwork,
    getDefaultRoutingAgent,
} from "@inngest/agent-kit"
import {createServer} from "@inngest/agent-kit/server"
import { Events } from "./contansts";
import { inngest } from "./client";
import { databaseAgent } from "./agents/databaseAgent";
import { receiptScanningAgent } from "./agents/receiptScanningAgent";

async function runWithRetry(prompt: string, maxAttempts = 5) {
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    try {
      return await agentNetwork.run(prompt);
    } catch (err) {
      lastError = err;
      attempt++;
      console.warn(`Agent run attempt ${attempt} failed:`, err);

      // Optional: backoff delay (exponential)
      const delay = 1000 * 2 ** attempt;
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError; // All attempts failed
}


const agentNetwork = createNetwork({
    name: "Agent Team",
    agents: [databaseAgent, receiptScanningAgent],
    defaultModel: openai({ 
        model: "gpt-3.5-turbo",  // fallback
        defaultParameters: {
            max_completion_tokens: 1000,
        },
    }),

    defaultRouter: ({network}) => {
        const savedToDatabase = network.state?.kv.get("saved-to-database");

        if(savedToDatabase !== undefined ){
            //terminate the agent process if the data has been saved to the database
            return undefined
        }

        return getDefaultRoutingAgent();
    }
})

export const server = createServer({
    agents: [databaseAgent, receiptScanningAgent],
    networks: [agentNetwork],
})

export const extractAndSavePDF = inngest.createFunction(
  { id: "Extract PDF and save in Database" },
  { event: Events.EXTRACT_DATA_FROM_PDF_AND_SAVE_TO_DATABASE },
  async ({ event }) => {
    const result = await runWithRetry(
      `Extract the key data from this PDF: ${event.data.url}. Once the data is extracted, save it to the database using receiptId: ${event.data.receiptId}. Once the receipt is successfully saved to the database, you can terminate the agent process. Start with the Supervisor agent.`,
      5 // maxAttempts
    );

    return result.state.kv.get("receipt");
  }
);
