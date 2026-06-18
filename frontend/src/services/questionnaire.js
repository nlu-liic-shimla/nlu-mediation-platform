import api from './api'  // services/api — has /api/v1 base already

export const getQuestionnaire = async (caseId) => {
  const listRes = await api.get(`/cases/${caseId}/questionnaires`)
  const qId = listRes.data?.questionnaire_id || listRes.data?.[0]?.id
  if (!qId) throw new Error('No questionnaire found for this case.')
  const res = await api.get(`/cases/${caseId}/questionnaires/${qId}`)
  return { ...res.data, questionnaire_id: qId }
}

export const submitQuestionnaire = async (caseId, qId, answers) => {
  const res = await api.post(
    `/cases/${caseId}/questionnaires/${qId}/responses`,
    { answers }
  )
  return res.data
}