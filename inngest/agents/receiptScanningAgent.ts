import { createAgent, createTool, } from "@inngest/agent-kit";
import { openai } from "inngest";
import z from "zod";

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  backoffMs = 1000
): Promise<T> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt === retries) throw error;

      const delay = backoffMs * 2 ** (attempt - 1); // 1s, 2s, 4s...
      console.warn(`Retry attempt ${attempt} after error:`, error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Retry failed after maximum attempts");
}

const parsePdfTool = createTool({
  name: "parse-pdf",
  description: "Analyzes the given PDF",
  parameters: z.object({
    pdfUrl: z.string(),
  }),
  handler: async ({ pdfUrl }, { step }) => {
  if (!step) throw new Error("Missing step context.");

  return await retryWithBackoff(async () => {
    return await step.ai.infer("parse-pdf", {
      model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
          max_completion_tokens: 3094,
        },
      }),
      body: {
        messages: [
          {
            role: "user",
            content: `The following is a publicly accessible PDF receipt: ${pdfUrl}

Extract the data from the receipt and return the structured output as structured JSON.`,
          },
        ],
      },
    });
  });
}
});


export const receiptScanningAgent = createAgent({
    name: "Receipt Scanning Agent",
    description: "Process receipt images and PDFs to extract key information such as vendor names, amounts, and line items",
    system: `You are an AI-powered receipt scanning assistant. Your primary role is to accurately extract and structure relevant information from scanned receipts. Your task includes recognizing and parsing details such as:
        . Merchant Information: Store name, address, contact details
        · Transaction Details: Date, time, receipt number, payment method
        · Itemized Purchases: Product names, quantities, individual prices, discounts
        . Total Amounts: Subtotal, taxes, total paid, and any applied discounts
        . Ensure high accuracy by detecting OCR errors and correcting misread text when possible.
        . Normalize dates, currency values, and formatting for consistency.
        . If any key details are missing or unclear, return a structured response indicating incomplete data.
        . Handle multiple formats, languages, and varying receipt layouts efficiently.
        . Maintain a structured JSON output for easy integration with databases or expense tracking systems.
    `,
    model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 3094,
        }
    }),
    tools: [parsePdfTool],
})