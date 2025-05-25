
'use server';
/**
 * @fileOverview An AI agent to suggest the most suitable technician for a client request.
 *
 * - suggestTechnician - A function that handles the technician suggestion process.
 * - SuggestTechnicianInput - The input type for the suggestTechnician function.
 * - SuggestTechnicianOutput - The return type for the suggestTechnician function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TechnicianSchema = z.object({
  id: z.string(),
  nome_completo: z.string(),
  competenze: z.array(z.string()).describe("List of skills for the technician, e.g., ['Idraulica', 'Elettricità']"),
  stato: z.enum(["Disponibile", "Occupato", "In Ferie", "Non Disponibile"]).describe("Current availability status of the technician"),
  currentLoad: z.number().describe("Number of active requests currently assigned to the technician"),
});
export type Technician = z.infer<typeof TechnicianSchema>;

const SuggestTechnicianInputSchema = z.object({
  requestId: z.string().describe("The ID of the client request."),
  requestDescription: z
    .string()
    .describe('The description of the client request, including type of service and notes. Example: "Riparazione perdita rubinetto cucina, urgente."'),
  clientPreferredDay: z.string().optional().describe("Client's preferred day for the service, e.g., 'Lunedì'"),
  clientPreferredTimeSlot: z.string().optional().describe("Client's preferred time slot, e.g., 'Mattina (9-13)'"),
  technicianList: z
    .array(TechnicianSchema)
    .describe('A list of available technicians with their details (id, name, skills, status, current load).'),
});
export type SuggestTechnicianInput = z.infer<typeof SuggestTechnicianInputSchema>;

const SuggestTechnicianOutputSchema = z.object({
  suggestedTechnician: z.object({
    id: z.string(),
    nome_completo: z.string(),
  }).nullable().describe('The suggested technician (id and name) or null if no suitable technician is found.'),
  reasoning: z
    .string()
    .describe('The reasoning behind the technician suggestion or why no technician was suggested.'),
  suggestedTimeNotes: z
    .string()
    .optional()
    .describe("Qualitative notes about scheduling, considering the technician's availability and client's preferences, e.g., 'Tecnico Disponibile, considerare preferenze cliente.' or 'Tecnico Occupato, disponibilità limitata.'"),
});
export type SuggestTechnicianOutput = z.infer<typeof SuggestTechnicianOutputSchema>;

export async function suggestTechnician(input: SuggestTechnicianInput): Promise<SuggestTechnicianOutput> {
  return suggestTechnicianFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTechnicianPrompt',
  input: {schema: SuggestTechnicianInputSchema},
  output: {schema: SuggestTechnicianOutputSchema},
  prompt: `You are an expert dispatcher for a technical services company. Your task is to suggest the most suitable technician for a given client request.

  Analyze the request details and the list of available technicians. Consider the following factors in order of importance:
  1.  **Technician Status**:
      *   Prefer technicians who are "Disponibile".
      *   Consider "Occupato" technicians if their skills are a strong match and their current load is not excessive.
      *   Avoid suggesting technicians who are "In Ferie" or "Non Disponibile" unless explicitly stated it's an extreme emergency and no other option exists.
  2.  **Skill Match**:
      *   Examine the 'requestDescription' for keywords related to the type of service needed.
      *   Match these keywords against the 'competenze' of each technician. A strong skill match is highly desirable.
  3.  **Current Load**:
      *   Prefer technicians with a lower 'currentLoad' (fewer active requests).
  4.  **Client Preferences**:
      *   Acknowledge the 'clientPreferredDay' and 'clientPreferredTimeSlot' if provided.
      *   In 'suggestedTimeNotes', indicate how the suggested technician's availability aligns with these preferences. For example, if the best technician is "Disponibile", note that client preferences can be considered. If "Occupato", note that scheduling might need flexibility.

  Client Request Details:
  - ID: {{{requestId}}}
  - Description: {{{requestDescription}}}
  - Preferred Day: {{{clientPreferredDay}}}
  - Preferred Time Slot: {{{clientPreferredTimeSlot}}}

  Available Technicians:
  {{#each technicianList}}
  - ID: {{{id}}}, Name: {{{nome_completo}}}, Skills: {{#each competenze}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}, Status: {{{stato}}}, Current Load: {{{currentLoad}}}
  {{/each}}

  Output Format:
  Return your suggestion in the specified JSON format.
  - If a suitable technician is found, provide their 'id' and 'nome_completo'.
  - Provide a clear 'reasoning' for your choice, explaining how you weighed the factors.
  - Provide 'suggestedTimeNotes' regarding scheduling.
  - If no suitable technician is found, 'suggestedTechnician' should be null, and 'reasoning' should explain why (e.g., no skill match, all suitable technicians unavailable).
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
