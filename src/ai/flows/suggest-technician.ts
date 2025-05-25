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
  prompt: `Sei un esperto dispatcher per un'azienda di servizi tecnici. Il tuo compito è suggerire il tecnico più adatto per una determinata richiesta del cliente.

  Analizza i dettagli della richiesta e l'elenco dei tecnici disponibili. Considera i seguenti fattori in ordine di importanza:
  1.  **Stato del Tecnico**:
      *   Preferisci i tecnici che sono "Disponibile".
      *   Considera i tecnici "Occupato" se le loro competenze sono una forte corrispondenza e il loro carico attuale non è eccessivo.
      *   Evita di suggerire tecnici "In Ferie" o "Non Disponibile" a meno che non sia esplicitamente indicato che si tratta di un'emergenza estrema e non esista altra opzione.
  2.  **Corrispondenza delle Competenze**:
      *   Esamina la 'requestDescription' per parole chiave relative al tipo di servizio necessario.
      *   Confronta queste parole chiave con le 'competenze' di ciascun tecnico. Una forte corrispondenza di competenze è altamente desiderabile.
  3.  **Carico Attuale**:
      *   Preferisci i tecnici con un 'currentLoad' inferiore (meno richieste attive).
  4.  **Preferenze del Cliente**:
      *   Prendi atto del 'clientPreferredDay' e 'clientPreferredTimeSlot' se forniti.
      *   Nelle 'suggestedTimeNotes', indica come la disponibilità del tecnico suggerito si allinea a queste preferenze. Ad esempio, se il miglior tecnico è "Disponibile", nota che le preferenze del cliente possono essere considerate. Se "Occupato", nota che la programmazione potrebbe richiedere flessibilità.

  Dettagli Richiesta Cliente:
  - ID: {{{requestId}}}
  - Descrizione: {{{requestDescription}}}
  - Giorno Preferito: {{{clientPreferredDay}}}
  - Fascia Oraria Preferita: {{{clientPreferredTimeSlot}}}

  Tecnici Disponibili:
  {{#each technicianList}}
  - ID: {{{id}}}, Nome: {{{nome_completo}}}, Competenze: {{#each competenze}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}, Stato: {{{stato}}}, Carico Attuale: {{{currentLoad}}}
  {{/each}}

  **Importante: Fornisci la tua risposta (motivazione e note sulla programmazione) completamente in italiano.**

  Formato di Output:
  Restituisci il tuo suggerimento nel formato JSON specificato.
  - Se viene trovato un tecnico adatto, fornisci il suo 'id' e 'nome_completo'.
  - Fornisci una chiara 'reasoning' (motivazione) per la tua scelta, spiegando come hai ponderato i fattori.
  - Fornisci 'suggestedTimeNotes' (note sulla programmazione) relative alla pianificazione.
  - Se non viene trovato alcun tecnico adatto, 'suggestedTechnician' dovrebbe essere null, e 'reasoning' dovrebbe spiegare il perché (ad es., nessuna corrispondenza di competenze, tutti i tecnici adatti non disponibili).
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

