import client from '../api/client';

/**
 * Fetch BATNA/WATNA data for the current party.
 * Party response returns only their own position — no scores, no other party data.
 * Mediator response returns full object (used by FE2).
 *
 * @param {string} caseId
 * @returns {Promise<{
 *   status: string,
 *   your_position: {
 *     batna_label: string,
 *     watna_label: string,
 *     batna_reasoning: string,
 *     watna_reasoning: string,
 *     negotiation_guidance: string,
 *     consult_solicitor_flag: boolean
 *   },
 *   disclaimer: string
 * }>}
 */
export const getBatnaWatna = async (caseId) => {
  const response = await client.get(`/api/v1/cases/${caseId}/analysis/batna-watna`);
  return response.data;
};