import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scale, ChevronRight, AlertCircle, Clock, CheckCircle, Shield, UserCheck, UserPlus } from 'lucide-react'
import { getInvitation, acceptInvitation, declineInvitation} from '../../services/invitationService'

const CONSENT_TEXT = `SULAH AI: TERMS AND CONDITIONS OF USE

Effective Date: [Insert Date]
Last Updated: [Insert Date]

IMPORTANT NOTICE: PLEASE READ THESE TERMS CAREFULLY BEFORE ACCESSING OR USING SULAH AI. THESE TERMS GOVERN YOUR ACCESS TO AND USE OF THE PLATFORM. BY ACCESSING, REGISTERING FOR, OR USING SULAH AI, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THESE TERMS AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE, YOU MUST NOT USE THE PLATFORM.


1. INTRODUCTION AND ACCEPTANCE

1.1. These Terms and Conditions of Use ("Terms") govern access to and use of Sulah AI ("Platform"), including its website, applications, software, artificial intelligence features, dispute-intake tools, mediation-support functions, analytical outputs, document-generation features and associated services.

1.2. The Platform is owned, developed, operated or made available by Himachal pradesh national Law University, having its registered or principal office at 16 Miles, Shimla-Mandi National Highway Ghandal,District Shimla, HP-171014 ("Operator", "we", "us" or "our").

1.3. These Terms constitute a legally binding agreement between the Operator and the individual or entity accessing or using the Platform ("User", "you" or "your").

1.4. By clicking an acceptance button, creating an account, or otherwise using a feature that requires acceptance, you consent to these Terms. Where required by applicable law, separate and explicit consent shall be obtained for personal-data processing, sensitive disclosures, AI-assisted processing, or participation in an online mediation process.

1.5. If you use the Platform on behalf of a company, institution, law firm, mediation centre or other organisation, you represent that you are authorised to bind that organisation to these Terms. In that case, "you" may refer to both the individual user and the organisation, as applicable.

1.6. If you do not agree to these Terms, do not access or use the Platform.


2. DEFINITIONS

For these Terms:

a. "AI Output" means any response, summary, analysis, recommendation, classification, score, draft or other content generated or assisted by an artificial intelligence system through the Platform.

b. "Dispute Information" means facts, allegations, documents, communications, settlement proposals, personal information and other materials supplied in connection with a dispute.

c. "Mediation" means a voluntary dispute-resolution process in which a neutral human mediator assists parties in attempting to reach a mutually acceptable resolution.

d. "Mediation Support Features" means features intended to assist with dispute intake, issue identification, interest mapping, communication structuring, preliminary suitability assessments, negotiation preparation or settlement drafting.

e. "User Content" means all text, documents, images, audio, data, facts, prompts, files and other materials submitted, uploaded or otherwise supplied by a User.

f. "Third-Party Services" means external AI models, hosting providers, cloud infrastructure, analytics tools, communication systems, payment gateways and other third-party products integrated into or used to operate the Platform.

g. "Applicable Law" means all laws, regulations, rules, binding orders and legally applicable directions governing the relevant activity.


3. NATURE AND SCOPE OF SULAH AI

3.1. Sulah AI is designed as an AI-powered mediation assistant, intended to support users, mediators and dispute-resolution processes through information organisation, analytical assistance and related technological functions.

3.2. Depending on the features enabled, the Platform may assist with:
• Receiving and structuring descriptions of disputes;
• Summarising facts supplied by users;
• Identifying possible issues and interests;
• Reframing adversarial language into more neutral language;
• Organising negotiation priorities;
• Exploring possible alternatives to negotiated settlement;
• Generating preliminary dispute-suitability indicators;
• Preparing draft communications or settlement documents; and
• Assisting mediators with organising information and preparing for mediation.

3.3. The availability of any feature is subject to the Platform's current technical capabilities, subscription plan, configuration and applicable law. No particular feature or outcome is guaranteed.

3.4. Sulah AI is an assistive technology and not an autonomous adjudicator, arbitrator, judge, lawyer or human mediator. It does not independently determine legal rights, impose a settlement, issue a binding decision or compel a party to accept a proposal.

3.5. Unless expressly stated in a separate written agreement, the Operator does not act as a mediation service provider, appointing authority, legal representative, law firm, advocate, fiduciary or agent for any User.

3.6. Use of the Platform alone does not establish that a legally recognised mediation has commenced, that a mediator has been appointed, or that any statutory or contractual mediation requirements have been satisfied.

3.7. A User seeking formal mediation must independently verify the applicable procedure, the eligibility and appointment of the mediator, the parties' consent, and any institutional or statutory requirements.


4. NO LEGAL ADVICE OR PROFESSIONAL RELATIONSHIP

4.1. The Platform provides technological assistance and general information. Unless expressly agreed under a separate, valid professional engagement, the Platform does not provide legal advice, legal representation, medical advice, financial advice or other regulated professional services.

4.2. AI Outputs are not a substitute for advice from a qualified advocate, registered mediator, accountant, financial adviser or other appropriately qualified professional.

4.3. No advocate-client, mediator-party, fiduciary, agency, partnership, employment or other professional relationship is created merely by accessing or using Sulah AI.

4.4. Users must independently verify any legal provision, limitation period, procedural requirement, jurisdictional rule, legal remedy or settlement term before relying on it.

4.5. The Platform may not reflect the most recent statutory amendments, rules, notifications, judgments, local practices or facts specific to a User's situation. Legal outputs may be incomplete, inaccurate, outdated or inapplicable.

4.6. Where the consequences of a decision may be significant, including matters involving property, employment, family relationships, financial liability, criminal allegations or statutory deadlines, Users should obtain appropriate professional advice before acting.

4.7. Nothing in these Terms excludes any duty or liability that cannot lawfully be excluded under Applicable Law.


5. AI LIMITATIONS AND HUMAN OVERSIGHT

5.1. Users acknowledge that artificial intelligence systems may produce inaccurate, incomplete, misleading, inconsistent or fabricated information, including incorrect legal references, summaries, factual inferences and proposed settlement terms.

5.2. AI Outputs may reflect biases or limitations in training data, prompts, source material, system configuration or the information supplied by Users.

5.3. Any score, including a "Mediatability Score" or other dispute-suitability indicator, is an indicative analytical aid only. It is not a validated prediction of settlement, a determination of legal merit, a finding of credibility, or a substitute for professional assessment.

5.4. The Platform does not guarantee neutrality, fairness, accuracy, completeness, suitability or fitness for a particular dispute. The Operator shall take reasonable steps to develop and maintain the Platform but does not warrant that every output will be free from error.

5.5. Users must exercise independent judgment and must not treat an AI Output as the sole basis for making a legal, financial, procedural or settlement decision.

5.6. A human mediator or other qualified professional, where involved, remains responsible for exercising their own professional judgment. The Platform does not relieve any mediator of applicable ethical, legal or professional obligations.

5.7. Users must not represent an AI-generated statement as having been independently verified by a lawyer, mediator, court or public authority unless that is true.


6. VOLUNTARY PARTICIPATION AND PARTY AUTONOMY

6.1. Participation in mediation or negotiation must remain voluntary wherever required by Applicable Law or the governing mediation arrangement.

6.2. No User is required to accept an AI-generated proposal, disclose information, make an admission, waive a legal right or enter into a settlement merely because the Platform suggests doing so.

6.3. Users remain responsible for determining their objectives, deciding whether to negotiate, obtaining independent advice and accepting or rejecting settlement proposals.

6.4. The Platform must not be used to mislead, coerce, intimidate, manipulate or improperly pressure another party into settlement.

6.5. Where a User indicates that a dispute involves threats, coercion, domestic abuse, serious power imbalance, incapacity, fraud, immediate danger or another circumstance requiring specialist assistance, the User should seek appropriate human or emergency assistance. The Platform may restrict or discontinue certain features where continued use would be inappropriate or unsafe.

6.6. The Platform may not be suitable for every dispute. Users must independently assess whether the dispute is legally and practically suitable for mediation and whether any exclusion, mandatory procedure or safeguarding requirement applies.


7. MEDIATION, CONFIDENTIALITY AND SETTLEMENTS

7.1. The Operator intends that the Platform support responsible dispute resolution. However, the confidentiality protections applicable to a formal mediation do not automatically extend to every conversation entered into an AI tool. Their application depends on the circumstances, the governing law, the role of the parties and the nature of the communication.

7.2. Where the Platform is used in a formal mediation, Users must comply with applicable mediation agreements, institutional rules, mediator instructions and confidentiality obligations under Applicable Law, including relevant provisions of the Mediation Act, 2023 to the extent applicable and in force.

7.3. Users must not upload mediation communications, confidential documents, settlement offers or another person's private information unless they are authorised to do so and the disclosure is consistent with the applicable confidentiality obligations.

7.4. The Operator shall handle User Content in accordance with the applicable Privacy Policy and any separate written confidentiality agreement. Access by authorised personnel or processing by Third-Party Services may occur as described in those documents.

7.5. The Operator does not warrant that the Platform's technical environment qualifies as a legally privileged, legally protected or institutionally confidential mediation environment in every circumstance.

7.6. Users must not assume that entering a communication into the Platform makes it inadmissible, privileged, immune from disclosure, or protected against lawful requests by courts, regulators or authorities.

7.7. The Platform may generate draft settlement agreements, memoranda, proposals or related documents. Such drafts are preliminary and must be reviewed by the parties and, where appropriate, qualified legal counsel and the human mediator.

7.8. An AI-generated draft is not, by itself, a concluded, authenticated, enforceable or legally binding settlement agreement. The parties must independently satisfy all applicable requirements relating to consent, capacity, writing, signatures, authentication, stamping, registration, enforcement and any other formality required by law.

7.9. The Operator does not guarantee that a settlement will be reached, that a settlement will be enforceable, or that any dispute will be resolved within a particular period.

7.10. Nothing in this section overrides a mandatory statutory confidentiality obligation or permits the Operator or a User to disclose information where such disclosure is prohibited by law.


8. USER ELIGIBILITY AND CAPACITY

8.1. Users must be legally competent to enter into a binding agreement under Applicable Law.

8.2. Unless the Operator expressly enables a compliant process for minors, the Platform is intended for persons aged eighteen years or older. A person lacking legal capacity must not use the Platform independently.

8.3. A User must not impersonate another person, falsely claim authority to act for an organisation or party, or misrepresent their identity or capacity.

8.4. Users acting for a company, client, family member or other person must ensure that they have the necessary authority to provide the relevant information and use the Platform for that purpose.


9. USER OBLIGATIONS AND PROHIBITED USE

9.1. Users agree to use the Platform lawfully, honestly and in accordance with these Terms.

9.2. Users must not:
a. Use the Platform for an unlawful purpose, fraud, harassment, threats, intimidation or deception;
b. Upload information obtained unlawfully or in breach of another person's rights;
c. Upload privileged, confidential or personal information without appropriate authority and lawful basis;
d. Use the Platform to fabricate evidence, manufacture admissions, create false records or misrepresent another person's position;
e. Use AI Outputs to impersonate a lawyer, mediator, court, government authority or another individual;
f. Attempt to bypass security controls, gain unauthorised access, reverse engineer protected components, introduce malware or disrupt the Platform;
g. Scrape, harvest, extract or systematically copy Platform content except as expressly permitted by law or authorised in writing;
h. Use the Platform to develop or train a competing system through unauthorised extraction or use of its protected materials;
i. Circumvent usage limits, access controls, subscription requirements or authentication measures;
j. Submit content that infringes intellectual property, privacy, confidentiality or other legal rights; or
k. Use the Platform in a manner that violates Applicable Law or creates a material risk to other Users.

9.3. Users are responsible for the accuracy, legality and appropriateness of the User Content they submit.

9.4. The Operator may investigate reasonably suspected misuse, restrict access, suspend accounts or take other proportionate measures permitted by law.


10. USER CONTENT AND DATA SUBMISSION

10.1. Users retain ownership of User Content to the extent they own it under Applicable Law. Submission of User Content does not automatically transfer ownership to the Operator.

10.2. Users represent and warrant that they own, control or have obtained all rights, permissions, consents and lawful authority necessary to submit User Content and permit its processing for the purposes described in these Terms and the Privacy Policy.

10.3. Users must not upload another person's confidential business information, personal data, photographs, recordings, correspondence, contracts or mediation communications unless they have a lawful basis and any necessary permission.

10.4. Users should minimise the personal and confidential information they submit. Where feasible, they should remove unnecessary names, addresses, account numbers, contact details, identity documents and other identifying particulars.

10.5. Users acknowledge that the Platform may require processing of User Content by AI systems, hosting providers or other Third-Party Services to deliver the requested functionality. The relevant providers, purposes, retention practices, security measures and any use for model improvement must be described accurately in the Privacy Policy.

10.6. The Operator shall not claim a right to use User Content for advertising, unrelated commercial exploitation or AI model training unless that use is disclosed and supported by an appropriate lawful basis, consent where required, and any applicable contractual commitments.

10.7. Nothing in this section authorises the Operator to disregard applicable data-protection law, mediation confidentiality obligations, legal professional privilege or a valid confidentiality agreement.


11. INTELLECTUAL PROPERTY RIGHTS

11.1. Unless expressly stated otherwise in a written agreement, all rights, title and interest in the Platform's software, source code, object code, architecture, interface, design, databases, documentation, workflows, logos, trademarks, brand elements, proprietary prompts, system configurations, original content and other Operator-owned materials remain with their respective owners.

11.2. Nothing in these Terms transfers ownership of the Platform or its intellectual property to a User.

11.3. Subject to compliance with these Terms, the Operator grants the User a limited, non-exclusive, non-transferable, non-sublicensable and revocable licence to access and use the Platform for its intended lawful purpose during the period of authorised access.

11.4. Except to the extent permitted by Applicable Law or expressly authorised in writing, Users must not copy, modify, distribute, sell, sublicense, commercially exploit, reverse engineer, decompile or create derivative works from protected components of the Platform.

11.5. The names "Sulah AI", associated logos, marks, visual identity and branding may not be used without prior written permission, except for lawful nominative or descriptive references.

11.6. The Operator does not claim ownership of third-party materials merely because they are processed by the Platform. Users remain responsible for ensuring that their submissions do not infringe copyright, trademark, patent, design, confidentiality, publicity or other rights.

11.7. AI-generated outputs may not be eligible for copyright protection in every jurisdiction or circumstance, and their legal status may depend on the nature of the human contribution and Applicable Law. The Operator makes no blanket representation that an AI Output is original, exclusive, registrable or free of third-party rights.

11.8. Users must independently verify the originality and legal suitability of any AI Output before publishing, commercialising, filing, distributing or otherwise relying on it.

11.9. If the Operator permits feedback, suggestions or feature requests, the User grants the Operator permission to use that feedback to improve the Platform without compensation, provided that this does not authorise the disclosure or exploitation of confidential User Content or personal data contrary to Applicable Law or an applicable agreement.

11.10. Ownership of inventions, code, product improvements, datasets, prototypes or other work created jointly with HPNLU, LIIC, students, employees, contractors or collaborators shall be determined by the relevant employment, internship, collaboration, funding, institutional IP or other written agreements. These Terms alone do not determine or transfer such ownership.


12. PRIVACY AND PERSONAL DATA

12.1. The Operator shall maintain a separate Privacy Policy describing the categories of personal data processed, purposes of processing, applicable lawful bases, disclosures, retention periods, security practices, grievance mechanism and relevant User rights.

12.2. Users must review the Privacy Policy before submitting personal information or using features that process dispute-related data.

12.3. The Operator shall process personal data in accordance with Applicable Law, including applicable provisions of the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025 as and when they apply to the relevant processing.

12.4. The Platform shall seek consent where legally required and shall not treat acceptance of these Terms as a substitute for any separate consent required by law.

12.5. Users must not provide personal data concerning another individual unless they have the authority and lawful basis to do so.

12.6. The Operator shall implement reasonable and appropriate security safeguards, access controls and organisational measures proportionate to the nature of the data and risks involved.

12.7. The Operator shall maintain a process for receiving and addressing privacy requests, complaints and reports of suspected personal-data breaches, as required by Applicable Law.

12.8. Data may be processed or stored through Third-Party Services, including providers located outside India, where applicable and lawful. Any relevant cross-border processing and safeguards shall be described in the Privacy Policy and related contractual arrangements.

12.9. The Operator shall not promise absolute security or confidentiality. No internet-connected system can be guaranteed to be entirely free from unauthorised access, technical failure or security incidents.

12.10. Retention and deletion of User Content shall follow the Privacy Policy, applicable legal requirements, legitimate operational needs and any relevant contractual or mediation obligations.


13. THIRD-PARTY SERVICES AND LINKS

13.1. The Platform may rely on or integrate Third-Party Services. Their availability, accuracy, security and continued operation may be outside the Operator's direct control.

13.2. Third-party providers may be subject to their own terms, privacy policies and processing practices. Users must review those terms where relevant.

13.3. The Operator shall use appropriate contractual and technical measures for third-party processing where required, but does not warrant that every third-party service will operate without interruption or error.

13.4. The inclusion of a third-party service or link does not constitute an endorsement, guarantee or representation regarding that provider.

13.5. The Operator shall not be responsible for a third-party provider's independent acts or omissions except to the extent liability arises under Applicable Law or from the Operator's own legally attributable conduct.


14. AVAILABILITY, CHANGES AND SECURITY

14.1. The Platform is provided on an evolving basis. Features may be added, modified, suspended, restricted or discontinued to address technical, operational, legal, security or business requirements.

14.2. The Operator does not guarantee uninterrupted access, compatibility with every device, error-free performance, availability at all times or preservation of every item of User Content.

14.3. Users are responsible for maintaining the security of their devices, credentials and accounts, and for notifying the Operator promptly of suspected unauthorised access.

14.4. The Operator may implement maintenance windows, rate limits, access controls or other measures reasonably necessary to maintain the Platform.

14.5. Where reasonably practicable, the Operator shall provide notice of material changes that significantly affect Users' access or rights.


15. FEES, SUBSCRIPTIONS AND REFUNDS

15.1. If the Platform offers paid features, the applicable price, billing period, taxes, usage limits, renewal terms and cancellation conditions shall be disclosed before purchase.

15.2. Users authorise the applicable payment provider to process charges they expressly agree to incur.

15.3. Unless otherwise stated, subscriptions renew only in accordance with the terms disclosed at the time of purchase and may be cancelled through the specified process.

15.4. Refunds shall be governed by the disclosed refund policy and Applicable Law. Nothing in these Terms excludes a mandatory consumer right or remedy.

15.5. The Operator may suspend paid features for overdue payments, suspected fraud or a material breach, subject to applicable law and any required notice.


16. DISCLAIMER OF WARRANTIES

16.1. To the maximum extent permitted by Applicable Law, the Platform is provided on an "as available" basis and without any representation or warranty that it will be suitable for every User, dispute, legal system or intended use.

16.2. The Operator does not warrant that:
a. AI Outputs will be accurate, complete, current, unbiased or error-free;
b. The Platform will identify every relevant issue, legal provision, risk or settlement option;
c. Any proposed settlement will be fair, lawful, enforceable or acceptable to all parties;
d. A particular outcome, agreement, financial benefit or dispute resolution will be achieved;
e. The Platform will satisfy the specific requirements of every court, tribunal, mediator, institution or regulator; or
f. The Platform will always be available, secure or compatible with all systems.

16.3. No statement in marketing material, demonstrations, presentations or informal communications shall be interpreted as a guarantee of legal outcomes or professional results unless expressly set out in a valid written agreement.

16.4. Nothing in these Terms excludes a warranty, representation or statutory obligation that cannot lawfully be excluded.


17. LIMITATION OF LIABILITY

17.1. To the maximum extent permitted by Applicable Law, the Operator shall not be liable for indirect, incidental, special, exemplary or consequential losses, including loss of profits, business opportunities, anticipated savings, goodwill or data, arising from use of the Platform.

17.2. Subject to Clause 17.4, the Operator shall not be responsible for losses arising solely from:
a. A User's reliance on an unverified AI Output;
b. A User's failure to obtain appropriate professional advice;
c. Incorrect, incomplete or misleading information supplied by a User;
d. A User's independent decision to accept, reject or act upon a settlement proposal;
e. A User's failure to comply with a statutory deadline or procedural requirement; or
f. A third-party service failure outside the Operator's reasonable control.

17.3. Nothing in these Terms excludes or limits liability to the extent such exclusion or limitation is prohibited by Applicable Law, including liability for fraud, wilful misconduct, gross negligence where it cannot lawfully be excluded, or any other liability that cannot legally be restricted by contract. Nothing in these Terms restricts mandatory consumer rights or remedies.

17.4. The limitations in this section apply only to the extent permitted by law and shall be interpreted narrowly where necessary to preserve their validity.

17.5. Users acknowledge that AI-assisted dispute resolution involves inherent uncertainty and that the Operator cannot guarantee any legal, commercial, relational or settlement outcome.


18. INDEMNITY

18.1. To the extent permitted by Applicable Law, a User shall indemnify and hold harmless the Operator and its officers, employees, contractors and authorised representatives against third-party claims, losses, damages, liabilities and reasonable legal costs arising directly from:
a. The User's material breach of these Terms;
b. The User's unlawful use of the Platform;
c. The User's infringement of a third party's intellectual property, privacy or confidentiality rights;
d. User Content submitted without the necessary authority or lawful basis; or
e. The User's fraud, intentional misconduct or knowing violation of Applicable Law.

18.2. This indemnity shall not apply to the extent a claim results from the Operator's own breach of law, wilful misconduct or other conduct for which liability cannot lawfully be shifted to the User.

18.3. The Operator shall provide reasonable notice of an indemnified claim where practicable and may require the User to cooperate in its defence. No settlement may impose an admission, payment obligation or continuing duty on the Operator without the Operator's consent.


19. SUSPENSION AND TERMINATION

19.1. The Operator may suspend, restrict or terminate access where reasonably necessary because of a material breach of these Terms, unlawful activity, security risks, misuse, non-payment, a legal requirement or a threat to the Platform or other Users.

19.2. Where appropriate and legally permissible, the Operator shall provide notice and a reasonable opportunity to remedy the breach.

19.3. Users may stop using the Platform at any time and may close their account through the available process.

19.4. Termination does not automatically erase records that must lawfully be retained, and does not affect accrued rights, valid payment obligations or provisions intended to survive termination.

19.5. Clauses concerning intellectual property, confidentiality, disclaimers, limitation of liability, indemnity, dispute resolution and other provisions that by their nature should survive shall continue to apply after termination.


20. COMPLAINTS AND GRIEVANCE REDRESSAL

20.1. Users may raise complaints, report misuse, request account assistance or communicate concerns about privacy, security or AI Outputs through the contact details below.

Grievance Officer / Contact Person: Sambhav Chhabra
Email: liic@hpnlu.ac.in

20.2. The Operator shall address complaints in accordance with its published grievance process and applicable legal requirements.

20.3. Users should avoid sending unnecessary personal or confidential dispute information when submitting a complaint.

20.4. Nothing in this section prevents a User from approaching a competent court, regulator, consumer forum or statutory authority where permitted by law.


21. GOVERNING LAW AND DISPUTE RESOLUTION

21.1. These Terms shall be governed by the laws of India.

21.2. The parties shall first attempt in good faith to resolve disputes arising directly out of these Terms through written communication.

21.3. Where a dispute cannot be resolved amicably, it may be submitted to the competent courts, subject to applicable law, mandatory jurisdictional rules and consumer protections.

21.4. Nothing in this clause requires a User to waive a non-waivable statutory right, prevents a competent authority from exercising its jurisdiction, or compels mediation or arbitration where such a requirement would be unlawful.

21.5. Any separate agreement to conduct mediation or arbitration must satisfy the applicable legal requirements and shall not be inferred merely from use of the Platform.


22. CHANGES TO THESE TERMS

22.1. The Operator may revise these Terms to reflect changes in the Platform, law, security requirements or business practices.

22.2. The updated Terms shall display a revised "Last Updated" date. Where required by law, or where a material change affects existing Users' rights, the Operator shall provide notice and obtain renewed acceptance or consent where legally necessary.

22.3. Continued use after an effective change may constitute acceptance only where permitted by Applicable Law and where the User has received any notice and opportunity required by law.


23. GENERAL PROVISIONS

23.1. Severability: If a provision is held invalid or unenforceable, it shall be modified to the minimum extent necessary, where legally permissible, and the remaining provisions shall continue in effect.

23.2. No waiver: Failure to enforce a provision shall not constitute a waiver unless expressly agreed in writing.

23.3. Assignment: Users may not assign their rights or obligations without the Operator's prior written consent. The Operator may transfer its rights and obligations as part of a lawful restructuring or transfer of the Platform, subject to Applicable Law and appropriate safeguards.

23.4. No partnership or agency: Use of the Platform does not create a partnership, joint venture, employment relationship, agency or fiduciary relationship between the User and the Operator.

23.5. Entire agreement: These Terms, together with the applicable Privacy Policy and any separately accepted service-specific agreement, constitute the agreement governing the relevant use of the Platform, without overriding mandatory law or any expressly controlling written agreement.

23.6. Language: If these Terms are translated, the governing version shall be identified at the time of acceptance. Any translation shall be prepared accurately and consistently with Applicable Law.

23.7. Electronic acceptance: To the extent permitted by Applicable Law, electronic acceptance and electronic records may be used to evidence agreement to these Terms.

23.8. Force majeure: The Operator shall not be liable for delay or interruption caused by circumstances beyond its reasonable control, subject to obligations that cannot lawfully be excluded.


USER ACKNOWLEDGEMENT

By selecting "I Agree", creating an account where acceptance is required, or otherwise accepting these Terms through the Platform, I confirm that:

1. I have read and understood these Terms;
2. I understand that Sulah AI is an AI-powered mediation assistant and not a substitute for a qualified lawyer or human mediator;
3. I understand that AI Outputs may be inaccurate and require independent verification;
4. I will not upload information I am not authorised to disclose;
5. I understand that the Platform's Privacy Policy governs the processing of personal data; and
6. I understand that use of the Platform alone does not guarantee confidentiality, commencement of formal mediation, or the enforceability of a settlement.

END OF TERMS AND CONDITIONS`

export default function InvitationAccept() {
  const navigate = useNavigate()
  const { token } = useParams()

  // Screens: loading | valid | expired | not_found | already_used | declined | accepted
  const [screen, setScreen] = useState('loading')
  const [caseInfo, setCaseInfo] = useState(null)

  // Consent screen
  const [consentChecked, setConsentChecked] = useState(false)

  // Account check screen: null | 'has_account' | 'no_account'
  const [accountChoice, setAccountChoice] = useState(null)

  // Login/Register form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Step: invitation | consent | account_check | login_form | register_form
  const [step, setStep] = useState('invitation')

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getInvitation(token)
        if (data.status === 'expired') { setScreen('expired'); return }
        if (data.status === 'accepted') { setScreen('already_used'); return }
        setCaseInfo(data)
        setScreen('valid')
      } catch (err) {
        if (err.response?.status === 410) setScreen('expired')
        else if (err.response?.status === 404) setScreen('not_found')
        else setScreen('not_found')
      }
    }
    fetch()
  }, [token])

  const validateLogin = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.'
    if (!password) e.password = 'Password is required.'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const validateRegister = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.'
    if (!password) e.password = 'Password is required.'
    else if (password.length < 8) e.password = 'Min. 8 characters.'
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

const handleAccept = async () => {
  const isValid = accountChoice === 'has_account' ? validateLogin() : validateRegister()
  if (!isValid) return
  setLoading(true)
  setApiError('')
  try {
   const isLogin = accountChoice === 'has_account'
const data = isLogin
  ? await acceptInvitation(token, email, password)
  : await acceptInvitation(token, email, password, email.split('@')[0])
    localStorage.setItem('nlu_token', data.access_token)
    localStorage.setItem('nlu_role', 'party_user')
    localStorage.setItem('nlu_user', JSON.stringify({
  email,
  full_name: data.full_name || null,
  role: 'party_user',
  case_id: data.case_id,
}))
    localStorage.setItem('nlu_case_role', data.role_in_this_case)
    navigate(`/party/cases/${data.case_id}/intake`)
  } catch (err) {
    if (err.response?.status === 410) {
      setApiError('This invitation has expired.')
    } else if (err.response?.status === 409) {
      setApiError('This invitation has already been accepted.')
    } else if (err.response?.status === 401) {
      // 401 means wrong password — account exists
      if (accountChoice === 'no_account') {
        // They said no account but email already exists
        setApiError(
          'This email already has an account. Please go back and select "Yes, I have an account" instead.'
        )
      } else {
        setApiError('Incorrect password. Please try again.')
      }
    } else if (err.response?.status === 400) {
      // Backend says email already registered — on register path
      if (accountChoice === 'no_account') {
        setApiError(
          'This email is already registered. Please go back and select "Yes, I have an account".'
        )
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } else {
      setApiError('Something went wrong. Please try again.')
    }
  } finally {
    setLoading(false)
  }
}

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }

        .ia { min-height: 100vh; background: var(--bg-page); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.25rem; font-family: 'DM Sans', sans-serif; }
        .ia-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .ia-logo-text { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }
        .ia-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2.5rem; width: 100%; max-width: 500px; box-shadow: var(--shadow); }

        /* Tag + title */
        .ia-tag { font-size: 12px; font-weight: 500; color: var(--brand); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .ia-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 4vw, 24px); font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .ia-sub { font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 1.5rem; }

        /* Status icon screens */
        .ia-icon-wrap { width: 68px; height: 68px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .ia-icon-wrap.expired { background: #fef3c7; }
        .ia-icon-wrap.error { background: var(--error-bg); }
        .ia-icon-wrap.success { background: #f0fdf4; }
        .ia-icon-wrap.loading { background: var(--bg-muted); animation: ia-pulse 1.5s ease-in-out infinite; }
        @keyframes ia-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Case info box */
        .ia-case-box { background: var(--bg-muted); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .ia-case-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border); }
        .ia-case-row:last-child { border-bottom: none; }
        .ia-case-label { font-size: 12px; color: var(--text-muted); }
        .ia-case-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }

        /* Consent box */
        .ia-consent-box { background: var(--bg-muted); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; max-height: 180px; overflow-y: auto; }
        .ia-consent-text { font-size: 13px; color: var(--text-secondary); line-height: 1.7; white-space: pre-line; }
        .ia-checkbox-row { display: flex; align-items: flex-start; gap: 12px; padding: 1rem; background: var(--bg-muted); border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; margin-bottom: 1.5rem; transition: border-color 0.15s; }
        .ia-checkbox-row.checked { border-color: var(--brand); background: var(--brand-light); }
        .ia-checkbox { width: 20px; height: 20px; border-radius: 4px; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all 0.15s; background: var(--bg-card); }
        .ia-checkbox.checked { background: var(--brand); border-color: var(--brand); }
        .ia-checkbox-label { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        .ia-checkbox-label strong { color: var(--text-primary); }

        /* Account choice cards */
        .ia-choice-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.5rem; }
        .ia-choice-card { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; background: var(--bg-card); }
        .ia-choice-card:hover { border-color: var(--brand); background: var(--brand-light); }
        .ia-choice-card.selected { border-color: var(--brand); background: var(--brand-light); }
        .ia-choice-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ia-choice-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .ia-choice-sub { font-size: 12px; color: var(--text-muted); }

        /* Form fields */
        .ia-field { margin-bottom: 1.1rem; }
        .ia-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 7px; }
        .ia-input { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .ia-input:focus { border-color: var(--brand); }
        .ia-input.err { border-color: var(--error); }
        .ia-err-text { font-size: 12px; color: var(--error); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

        .ia-api-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 1rem; display: flex; gap: 8px; line-height: 1.5; }

        /* Buttons */
        .ia-primary-btn { width: 100%; padding: 14px; background: var(--brand); color: #fff; border: none; border-radius: 11px; font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
        .ia-primary-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .ia-primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .ia-secondary-btn { width: 100%; padding: 12px; background: none; border: 1.5px solid var(--border); border-radius: 11px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; margin-top: 10px; }
        .ia-secondary-btn:hover { border-color: var(--brand); color: var(--brand); }
        .ia-decline-btn { width: 100%; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; text-align: center; margin-top: 12px; font-family: 'DM Sans', sans-serif; text-decoration: underline; }
        .ia-decline-btn:hover { color: var(--error); }
        .ia-back-link { display: flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: 'DM Sans', sans-serif; margin-bottom: 1.25rem; padding: 0; }
        .ia-back-link:hover { color: var(--brand); }
        .ia-divider { display: flex; align-items: center; gap: 12px; margin: 1.25rem 0; }
        .ia-divider-line { flex: 1; height: 1px; background: var(--border); }
        .ia-divider-text { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

        @media (max-width: 520px) {
          .ia-card { padding: 1.75rem 1.25rem; border-radius: 16px; }
        }
      `}</style>

      <div className="ia">
        <div className="ia-logo">
          <Scale size={28} color="var(--brand)" strokeWidth={1.8} />
          <span className="ia-logo-text">SULAH</span>
        </div>

        <div className="ia-card">

          {/* ── Loading ── */}
          {screen === 'loading' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap loading" style={{ margin: '0 auto 1.5rem' }} />
              <p className="ia-title" style={{ textAlign: 'center' }}>Checking invitation…</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>Please wait while we verify your link.</p>
            </div>
          )}

          {/* ── Expired ── */}
          {screen === 'expired' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap expired" style={{ margin: '0 auto 1.5rem' }}>
                <Clock size={30} color="#d97706" />
              </div>
              <p className="ia-title" style={{ textAlign: 'center' }}>Invitation expired</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>This invitation link has expired. Links are valid for 72 hours. Please ask the mediator to send a new one.</p>
              <button className="ia-secondary-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            </div>
          )}

          {/* ── Not found ── */}
          {screen === 'not_found' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap error" style={{ margin: '0 auto 1.5rem' }}>
                <AlertCircle size={30} color="var(--error)" />
              </div>
              <p className="ia-title" style={{ textAlign: 'center' }}>Invitation not found</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>This link is invalid or has already been used. Please contact your mediator.</p>
              <button className="ia-secondary-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            </div>
          )}

          {/* ── Already used ── */}
          {screen === 'already_used' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap success" style={{ margin: '0 auto 1.5rem' }}>
                <CheckCircle size={30} color="#16a34a" />
              </div>
              <p className="ia-title" style={{ textAlign: 'center' }}>Already accepted</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>This invitation has already been accepted. Please log in to access your case.</p>
              <button className="ia-primary-btn" onClick={() => navigate('/auth/login')}>
                Go to Login <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Declined ── */}
{screen === 'declined' && (
  <div style={{ textAlign: 'center' }}>
    <div className="ia-icon-wrap error" style={{ margin: '0 auto 1.5rem' }}>
      <AlertCircle size={30} color="var(--error)" />
    </div>
    <p className="ia-title" style={{ textAlign: 'center' }}>Invitation declined</p>
    <p className="ia-sub" style={{ textAlign: 'center' }}>
      You have declined to participate in this mediation. If this was a mistake, you can still accept within the 72-hour window.
    </p>
    <button className="ia-secondary-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
    <button
      className="ia-decline-btn"
      style={{ marginTop: '10px', display: 'block', width: '100%' }}
      onClick={() => { setScreen('valid'); setStep('invitation') }}
    >
      Changed your mind? Go back
    </button>
  </div>
)}

          {/* ── Valid invitation ── */}
          {screen === 'valid' && caseInfo && (
            <>
              {/* Step 1 — Case preview */}
              {step === 'invitation' && (
                <>
                  <p className="ia-tag">You've been invited</p>
                  <h2 className="ia-title">Join this mediation case</h2>
                  <p className="ia-sub">You have been invited to participate as a party in the following mediation case on the SULAH platform.</p>

                  <div className="ia-case-box">
                    <div className="ia-case-row">
                      <span className="ia-case-label">Dispute Type</span>
                      <span className="ia-case-value">{caseInfo.dispute_type || '—'}</span>
                    </div>
                    <div className="ia-case-row">
                      <span className="ia-case-label">Mediator</span>
                      <span className="ia-case-value">{caseInfo.mediator_name || '—'}</span>
                    </div>
                    <div className="ia-case-row">
                      <span className="ia-case-label">Status</span>
                      <span className="ia-case-value" style={{ color: 'var(--brand)' }}>Pending your acceptance</span>
                    </div>
                  </div>

                  <button className="ia-primary-btn" onClick={() => setStep('consent')}>
                    View Consent Form <ChevronRight size={16} />
                  </button>
                 <button
  className="ia-decline-btn"
  onClick={async () => {
    try {
      await declineInvitation(token)
    } catch (err) {
      // Even if the API call fails, still show the declined screen —
      // don't trap the user. Log for debugging.
      console.error('Decline API call failed:', err)
    }
    setScreen('declined')
  }}
>
  Decline invitation
</button>
                </>
              )}

              {/* Step 2 — Consent */}
              {step === 'consent' && (
                <>
                  <button className="ia-back-link" onClick={() => setStep('invitation')}>
                    ← Back
                  </button>
                  <p className="ia-tag">Consent required</p>
                  <h2 className="ia-title">Read and accept</h2>
                  <p className="ia-sub">Please read the consent form carefully before proceeding.</p>

                  <div className="ia-consent-box">
                    <p className="ia-consent-text">{CONSENT_TEXT}</p>
                  </div>

                  <div
                    className={`ia-checkbox-row${consentChecked ? ' checked' : ''}`}
                    onClick={() => setConsentChecked(p => !p)}
                  >
                    <div className={`ia-checkbox${consentChecked ? ' checked' : ''}`}>
                      {consentChecked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <p className="ia-checkbox-label">
                      I have read and agree to the consent terms above. I understand this is a <strong>voluntary mediation process</strong> under the Mediation Act, 2023.
                    </p>
                  </div>

                  <button
                    className="ia-primary-btn"
                    onClick={() => setStep('account_check')}
                    disabled={!consentChecked}
                  >
                    Proceed <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Step 3 — Account check */}
              {step === 'account_check' && (
                <>
                  <button className="ia-back-link" onClick={() => setStep('consent')}>
                    ← Back
                  </button>
                  <p className="ia-tag">Almost there</p>
                  <h2 className="ia-title">Do you have an account?</h2>
                  <p className="ia-sub">Choose one of the options below to continue.</p>

                  <div className="ia-choice-grid">
                    <div
                      className={`ia-choice-card${accountChoice === 'has_account' ? ' selected' : ''}`}
                      onClick={() => setAccountChoice('has_account')}
                    >
                      <div className="ia-choice-icon">
                        <UserCheck size={20} color="var(--brand)" />
                      </div>
                      <div>
                        <p className="ia-choice-title">Yes, I have an account</p>
                        <p className="ia-choice-sub">Sign in with your existing credentials</p>
                      </div>
                    </div>

                    <div
                      className={`ia-choice-card${accountChoice === 'no_account' ? ' selected' : ''}`}
                      onClick={() => setAccountChoice('no_account')}
                    >
                      <div className="ia-choice-icon">
                        <UserPlus size={20} color="var(--brand)" />
                      </div>
                      <div>
                        <p className="ia-choice-title">No, create an account</p>
                        <p className="ia-choice-sub">Register with your email and a new password</p>
                      </div>
                    </div>
                  </div>

                  <button
                    className="ia-primary-btn"
                    onClick={() => setStep(accountChoice === 'has_account' ? 'login_form' : 'register_form')}
                    disabled={!accountChoice}
                  >
                    Continue <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Step 4a — Login form */}
              {step === 'login_form' && (
                <>
                  <button className="ia-back-link" onClick={() => { setStep('account_check'); setFormErrors({}); setApiError('') }}>
                    ← Back
                  </button>
                  <p className="ia-tag">Sign in</p>
                  <h2 className="ia-title">Welcome back</h2>
                  <p className="ia-sub">Sign in to accept this invitation and join the case.</p>

                  <div className="ia-field">
                    <label className="ia-label">Email</label>
                    <input className={`ia-input${formErrors.email ? ' err' : ''}`} type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })) }} />
                    {formErrors.email && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.email}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Password</label>
                    <input className={`ia-input${formErrors.password ? ' err' : ''}`} type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setFormErrors(p => ({ ...p, password: '' })) }} />
                    {formErrors.password && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.password}</p>}
                  </div>

                  {apiError && (
  <div>
    <div className="ia-api-error"><AlertCircle size={16} />{apiError}</div>
    <button
      className="ia-back-link"
      style={{ marginTop: '8px', justifyContent: 'center' }}
      onClick={() => { setStep('account_check'); setApiError(''); setFormErrors({}) }}
    >
      ← Change my selection
    </button>
  </div>
)}
                  <button className="ia-primary-btn" onClick={handleAccept} disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in & Accept'} <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Step 4b — Register form */}
              {step === 'register_form' && (
                <>
                  <button className="ia-back-link" onClick={() => { setStep('account_check'); setFormErrors({}); setApiError('') }}>
                    ← Back
                  </button>
                  <p className="ia-tag">Create account</p>
                  <h2 className="ia-title">Register to accept</h2>
                  <p className="ia-sub">Create your account to accept this invitation and join the case.</p>

                  <div className="ia-field">
                    <label className="ia-label">Email</label>
                    <input className={`ia-input${formErrors.email ? ' err' : ''}`} type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })) }} />
                    {formErrors.email && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.email}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Password</label>
                    <input className={`ia-input${formErrors.password ? ' err' : ''}`} type="password" placeholder="Min. 8 characters" value={password} onChange={e => { setPassword(e.target.value); setFormErrors(p => ({ ...p, password: '' })) }} />
                    {formErrors.password && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.password}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Confirm Password</label>
                    <input className={`ia-input${formErrors.confirmPassword ? ' err' : ''}`} type="password" placeholder="Repeat password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFormErrors(p => ({ ...p, confirmPassword: '' })) }} />
                    {formErrors.confirmPassword && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.confirmPassword}</p>}
                  </div>

                  {apiError && <div className="ia-api-error"><AlertCircle size={16} />{apiError}</div>}

                  <button className="ia-primary-btn" onClick={handleAccept} disabled={loading}>
                    {loading ? 'Creating account…' : 'Create account & Accept'} <ChevronRight size={16} />
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}