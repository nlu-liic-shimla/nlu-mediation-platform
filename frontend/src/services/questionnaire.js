import api from './api'

export const getQuestionnaire = async (caseId) => {
  // TODO: replace with dynamic discovery once BE1 adds GET /questionnaires list endpoint
  const qId = 'e77eec9f-1694-4ea3-bcad-77aa3f13669b'
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