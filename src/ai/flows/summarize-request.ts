'use server';

/**
 * @fileOverview Summarizes client requests to provide a quick understanding of the issue.
 *
 * - summarizeRequest - A function that summarizes a client request.
 * - SummarizeRequestInput - The input type for the summarizeRequest function.
 * - SummarizeRequestOutput - The return type for the summarizeRequest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeRequestInputSchema = z.object({
  requestText: z
    .string()
    .describe('The text of the client request that needs to be summarized.'),
});

export type SummarizeRequestInput = z.infer<typeof SummarizeRequestInputSchema>;

const SummarizeRequestOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the client request.'),
});

export type SummarizeRequestOutput = z.infer<typeof SummarizeRequestOutputSchema>;

export async function summarizeRequest(input: SummarizeRequestInput): Promise<SummarizeRequestOutput> {
  return summarizeRequestFlow(input);
}

const summarizeRequestPrompt = ai.definePrompt({
  name: 'summarizeRequestPrompt',
  input: {schema: SummarizeRequestInputSchema},
  output: {schema: SummarizeRequestOutputSchema},
  prompt: `Summarize the following client request in a single sentence:\n\n{{{requestText}}}`,
});

const summarizeRequestFlow = ai.defineFlow(
  {
    name: 'summarizeRequestFlow',
    inputSchema: SummarizeRequestInputSchema,
    outputSchema: SummarizeRequestOutputSchema,
  },
  async input => {
    const {output} = await summarizeRequestPrompt(input);
    return output!;
  }
);
