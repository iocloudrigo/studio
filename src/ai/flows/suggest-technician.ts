// 'use server';
/**
 * @fileOverview An AI agent to suggest the most suitable technician for a client request.
 *
 * - suggestTechnician - A function that handles the technician suggestion process.
 * - SuggestTechnicianInput - The input type for the suggestTechnician function.
 * - SuggestTechnicianOutput - The return type for the suggestTechnician function.
 */

'use server';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTechnicianInputSchema = z.object({
  requestDescription: z
    .string()
    .describe('The description of the client request.'),
  technicianList: z
    .array(z.string())
    .describe('A list of available technicians.'),
});
export type SuggestTechnicianInput = z.infer<typeof SuggestTechnicianInputSchema>;

const SuggestTechnicianOutputSchema = z.object({
  suggestedTechnician: z
    .string()
    .describe('The name of the most suitable technician for the request.'),
  reason: z
    .string()
    .describe('The reasoning behind the technician suggestion.'),
});
export type SuggestTechnicianOutput = z.infer<typeof SuggestTechnicianOutputSchema>;

export async function suggestTechnician(input: SuggestTechnicianInput): Promise<SuggestTechnicianOutput> {
  return suggestTechnicianFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTechnicianPrompt',
  input: {schema: SuggestTechnicianInputSchema},
  output: {schema: SuggestTechnicianOutputSchema},
  prompt: `You are an expert at assigning technicians to client requests.

  Given the following client request description and a list of available technicians, determine the most suitable technician for the request.
  Explain your reasoning for the suggestion.

  Client Request Description: {{{requestDescription}}}
  Available Technicians: {{#each technicianList}}{{{this}}}, {{/each}}
  \n  Output the suggested technician's name and the reasoning behind the suggestion.
  `,
});

const suggestTechnicianFlow = ai.defineFlow(
  {
    name: 'suggestTechnicianFlow',
    inputSchema: SuggestTechnicianInputSchema,
    outputSchema: SuggestTechnicianOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
