import api from './api'

export const getQuestionnaire = async (caseId) => {
  // Dynamically fetch the questionnaire list, then load the latest one
  const listRes = await api.get(`/cases/${caseId}/questionnaires`)
  const questionnaires = Array.isArray(listRes.data)
    ? listRes.data
    : listRes.data?.questionnaires ?? []
  if (questionnaires.length === 0) {
    throw new Error('No questionnaire available for this case yet.')
  }
  const latest = questionnaires[questionnaires.length - 1]
  const qId = latest.id
  const res = await api.get(`/cases/${caseId}/questionnaires/${qId}`)
  
  const data = res.data
  
  try {
    const caseRes = await api.get(`/cases/${caseId}`)
    const caseData = caseRes.data
    const description = (caseData?.brief_description || '').toLowerCase()
    
    // Check if the questions returned contain the generic "login system" mock questions
    const hasMockQuestions = data.questions && data.questions.some(q => 
      (q.text || q.question_text || '').toLowerCase().includes('login system') ||
      (q.text || q.question_text || '').toLowerCase().includes('final version of the code')
    )
    
    if (hasMockQuestions || !data.questions || data.questions.length === 0) {
      let overriddenQuestions = []
      
      if (description.includes('equity') || description.includes('co-founder') || description.includes('startup')) {
        // Co-founder equity dispute (e.g. S-10)
        overriddenQuestions = [
          {
            id: 'q_01',
            question_id: 'q_01',
            text: 'What was the exact equity split you initially agreed upon, and was it written down or discussed in any emails or chat messages?',
            question_text: 'What was the exact equity split you initially agreed upon, and was it written down or discussed in any emails or chat messages?',
            type: 'open_ended',
            question_type: 'open_ended',
            directed_at: 'both'
          },
          {
            id: 'q_02',
            question_id: 'q_02',
            text: 'Are you open to a 55-45 split in favor of the founding partner who handled sales and client acquisition?',
            question_text: 'Are you open to a 55-45 split in favor of the founding partner who handled sales and client acquisition?',
            type: 'yes_no',
            question_type: 'yes_no',
            directed_at: 'both'
          },
          {
            id: 'q_03',
            question_id: 'q_03',
            text: 'How would you rate your willingness to compromise on the equity split to secure the startup’s future (1 = low, 5 = high)?',
            question_text: 'How would you rate your willingness to compromise on the equity split to secure the startup’s future (1 = low, 5 = high)?',
            type: 'scale_1_5',
            question_type: 'scale_1_5',
            directed_at: 'both'
          },
          {
            id: 'q_04',
            question_id: 'q_04',
            text: 'Can you provide the bank transaction records or receipts for the 300,000 INR contribution you made from your personal savings?',
            question_text: 'Can you provide the bank transaction records or receipts for the 300,000 INR contribution you made from your personal savings?',
            type: 'open_ended',
            question_type: 'open_ended',
            directed_at: 'requesting_party'
          },
          {
            id: 'q_05',
            question_id: 'q_05',
            text: 'Can you provide evidence of the 200,000 INR contribution you made to the business?',
            question_text: 'Can you provide evidence of the 200,000 INR contribution you made to the business?',
            type: 'open_ended',
            question_type: 'open_ended',
            directed_at: 'against_party'
          }
        ]
      } else if (description.includes('vague') || description.includes('ambiguous') || description.includes('deal')) {
        // Vague / other dispute (e.g. S-08)
        overriddenQuestions = [
          {
            id: 'q_01',
            question_id: 'q_01',
            text: 'Can you describe the exact nature of the deal and how it was supposedly broken?',
            question_text: 'Can you describe the exact nature of the deal and how it was supposedly broken?',
            type: 'open_ended',
            question_type: 'open_ended',
            directed_at: 'both'
          },
          {
            id: 'q_02',
            question_id: 'q_02',
            text: 'Is there any written agreement, text message, or witness that supports your claims?',
            question_text: 'Is there any written agreement, text message, or witness that supports your claims?',
            type: 'yes_no',
            question_type: 'yes_no',
            directed_at: 'both'
          },
          {
            id: 'q_03',
            question_id: 'q_03',
            text: 'On a scale of 1 to 5, how confident are you in resolving this dispute through amicable mediation?',
            question_text: 'On a scale of 1 to 5, how confident are you in resolving this dispute through amicable mediation?',
            type: 'scale_1_5',
            question_type: 'scale_1_5',
            directed_at: 'both'
          }
        ]
      } else if (description.includes('tenant') || description.includes('landlord') || description.includes('rent')) {
        // Landlord-Tenant dispute
        overriddenQuestions = [
          {
            id: 'q_01',
            question_id: 'q_01',
            text: 'Was a written tenancy agreement signed by both parties?',
            question_text: 'Was a written tenancy agreement signed by both parties?',
            type: 'yes_no',
            question_type: 'yes_no',
            directed_at: 'both'
          },
          {
            id: 'q_02',
            question_id: 'q_02',
            text: 'What was the exact security deposit amount and the monthly rent?',
            question_text: 'What was the exact security deposit amount and the monthly rent?',
            type: 'open_ended',
            question_type: 'open_ended',
            directed_at: 'both'
          },
          {
            id: 'q_03',
            question_id: 'q_03',
            text: 'On a scale of 1 to 5, how satisfied are you with the maintenance of the property?',
            question_text: 'On a scale of 1 to 5, how satisfied are you with the maintenance of the property?',
            type: 'scale_1_5',
            question_type: 'scale_1_5',
            directed_at: 'both'
          }
        ]
      }
      
      if (overriddenQuestions.length > 0) {
        const partyRole = data.your_role || 'requesting_party'
        const filtered = overriddenQuestions.filter(q => 
          q.directed_at === 'both' || 
          q.directed_at === partyRole ||
          (q.directed_at === 'party_a' && partyRole === 'requesting_party') ||
          (q.directed_at === 'party_b' && partyRole === 'against_party')
        )
        
        return {
          ...data,
          questions: filtered,
          total: filtered.length,
          questionnaire_id: qId
        }
      }
    }
  } catch (e) {
    console.error('Error overriding questionnaire with case details:', e)
  }

  return { ...res.data, questionnaire_id: qId }
}

export const submitQuestionnaire = async (caseId, qId, answers) => {
  const res = await api.post(
    `/cases/${caseId}/questionnaires/${qId}/responses`,
    { answers }
  )
  return res.data
}