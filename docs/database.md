-- ============================================================
-- NLU Shimla — AI Mediation Platform
-- Complete Database Setup + RLS + Verification
-- Database Role | Week 1
-- ============================================================
-- HOW TO USE:
-- Run each SECTION separately in Supabase SQL Editor
-- Use one tab per section for clean results
-- ============================================================


-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- SECTION 2: CREATE ALL 9 TABLES
-- ============================================================

-- Table 1: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('requesting_party', 'against_party', 'mediator')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: cases
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'INTAKE_PENDING',
    created_by UUID REFERENCES users(id),
    negotiation_round INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    party_id UUID REFERENCES users(id),
    statement TEXT,
    desired_outcome TEXT,
    monetary_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: audit_logs (insert only — no updates/deletes ever)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    old_state TEXT,
    new_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: ai_analysis (append only)
CREATE TABLE IF NOT EXISTS ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    analysis_type TEXT NOT NULL,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 6: questionnaires
CREATE TABLE IF NOT EXISTS questionnaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    created_by UUID REFERENCES users(id),
    questions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: questionnaire_responses
CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionnaire_id UUID REFERENCES questionnaires(id),
    respondent_id UUID REFERENCES users(id),
    answers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(questionnaire_id, respondent_id)
);

-- Table 8: proposals
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    created_by UUID REFERENCES users(id),
    content TEXT,
    status TEXT DEFAULT 'draft',
    round INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 9: proposal_responses
CREATE TABLE IF NOT EXISTS proposal_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id),
    party_id UUID REFERENCES users(id),
    decision TEXT CHECK (decision IN ('accepted', 'rejected')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 3: ENABLE RLS ON ALL 9 TABLES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_responses ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 4: INDEXES FOR FAST LOOKUPS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_submissions_case ON submissions(case_id);
CREATE INDEX IF NOT EXISTS idx_submissions_party ON submissions(party_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_case ON ai_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_case ON questionnaires(case_id);
CREATE INDEX IF NOT EXISTS idx_proposals_case ON proposals(case_id);
CREATE INDEX IF NOT EXISTS idx_proposal_responses_proposal ON proposal_responses(proposal_id);


-- ============================================================
-- SECTION 5: VERIFICATION QUERIES
-- Run these one at a time to confirm everything is correct
-- ============================================================

-- 5A: Confirm all 9 tables exist
-- Expected: 9 rows
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'cases', 'submissions', 'audit_logs',
    'ai_analysis', 'questionnaires', 'questionnaire_responses',
    'proposals', 'proposal_responses'
  )
ORDER BY table_name;


-- 5B: Confirm RLS is enabled on all 9 tables (Milestone M1-06)
-- Expected: 9 rows
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
    'users', 'cases', 'submissions', 'audit_logs',
    'ai_analysis', 'questionnaires', 'questionnaire_responses',
    'proposals', 'proposal_responses'
)
AND relrowsecurity = true
ORDER BY relname;


-- 5C: Confirm no accidental open policies exist
-- Expected: 0 rows (default deny is active — no policies = safest state for this architecture)
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN (
    'users', 'cases', 'submissions', 'audit_logs',
    'ai_analysis', 'questionnaires', 'questionnaire_responses',
    'proposals', 'proposal_responses'
)
ORDER BY tablename;


-- 5D: Party isolation test (Milestone M1-07)
-- Expected: 0 rows for all — anon role cannot read any table
SET LOCAL ROLE anon;
SELECT * FROM submissions;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT * FROM cases;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT * FROM users;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT * FROM ai_analysis;
RESET ROLE;

SET LOCAL ROLE anon;
SELECT * FROM audit_logs;
RESET ROLE;


-- 5E: Confirm all FK relationships are intact
-- Expected: Multiple rows showing all FK constraints across tables
SELECT
    tc.table_name AS "Table",
    kcu.column_name AS "Column",
    ccu.table_name AS "References Table",
    ccu.column_name AS "References Column"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;


-- 5F: Confirm all indexes exist
-- Expected: 10 indexes listed
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename;


-- ============================================================
-- END OF FILE
-- All sections verified = Week 1 Database Role complete
-- ============================================================

-- ============================================================
-- Week 2 Updates
-- Database Role | Week 2
-- ============================================================

-- New Tables Added:

-- case_invitations
-- Purpose: Stores invitation tokens for against party to join a case
-- Columns: id, case_id, invited_email, token_hash, role,
--          expires_at, accepted_at, created_by, created_at
-- RLS: SELECT open for token lookup, mediator can INSERT, UPDATE open for acceptance

-- documents
-- Purpose: Stores metadata of documents uploaded by parties
-- Columns: id, case_id, uploaded_by, file_name, file_size,
--          file_type, storage_path, created_at
-- RLS: Party sees own, mediator sees all for their cases
-- Index: idx_documents_case_id

-- Updated Tables:

-- submissions
-- Added columns: timeline, relationship_type, prior_negotiation, submitted_at
-- RLS: Party sees only their own, mediator sees both

-- cases
-- Added RLS: UPDATE policy added for case status transitions

-- ai_analysis
-- Added columns: started_at, completed_at, failed

-- Storage:
-- case-documents bucket: INSERT and SELECT allowed for authenticated users

-- ============================================================
-- Week 3 Updates
-- Database Role | Week 3
-- ============================================================

-- New Tables Added:

-- application_requests
-- Purpose: Stores party-initiated mediation applications (Path 1)
-- Columns: id, applicant_id, dispute_type, brief_description,
--          against_party_name, against_party_phone, against_party_email,
--          monetary_value, status, rejection_reason, assigned_mediator, created_at
-- RLS: Party sees own, mediator sees all, mediator can update
-- Indexes: idx_application_requests_applicant, idx_application_requests_status

-- ai_analysis_flags
-- Purpose: Stores flagged claims from AI analysis
-- Columns: id, case_id, claim_text, reason, flagged_by, flagged_at
-- RLS: Enabled

-- Updated Tables:

-- cases
-- Status constraint updated with 16 new states:
-- BOTH_INVITED, FIRST_PARTY_SUBMITTED, BOTH_SUBMITTED,
-- AI_ANALYSIS_PENDING, AI_ANALYSIS_COMPLETE, QUESTIONNAIRE_SENT,
-- QUESTIONNAIRE_COMPLETE, PROPOSAL_DRAFTED, PROPOSAL_SENT,
-- NEGOTIATION, SETTLEMENT_REACHED, CLOSED

-- case_invitations
-- Added columns: accepted_by, invitation_role, accepted_at, created_by

-- users
-- Added column: full_name

-- audit_logs
-- Added column: metadata (jsonb)
-- ============================================================
-- Week 4 Updates
-- Database Role | Week 4
-- ============================================================

-- New Tables Added:

-- questionnaires
-- Purpose: Stores AI-generated questionnaire questions per case
-- Columns: id, case_id, created_by, questions (jsonb), created_at
-- RLS: anon full access (backend uses anon key)
-- Index: case_id

-- questionnaire_responses
-- Purpose: Stores party answers to questionnaire
-- Columns: id, questionnaire_id, respondent_id, answers (jsonb), submitted_at
-- RLS: anon full access
-- Index: questionnaire_id
-- Constraint: UNIQUE(questionnaire_id, respondent_id)

-- proposals
-- Purpose: Stores mediator proposal drafts and revisions
-- Columns: id, case_id, created_by, raw_text, structured_json,
--          revision_suggestions, is_published, round_number,
--          published_at, created_at, updated_at
-- RLS: anon full access
-- Index: case_id

-- proposal_responses
-- Purpose: Stores party accept/reject decisions on proposals
-- Columns: id, proposal_id, party_id, decision, rejection_reason, responded_at
-- RLS: anon full access
-- Index: proposal_id
-- Constraint: UNIQUE(proposal_id, party_id), decision CHECK (accept/reject)

-- settlement_confirmations
-- Purpose: Stores typed name + signature confirmation from each party
-- Columns: id, case_id, party_id, typed_name, signature_url, confirmed_at
-- RLS: anon full access
-- Index: case_id
-- Constraint: UNIQUE(case_id, party_id)

-- mediation_reports
-- Purpose: Stores generated settlement PDF metadata
-- Columns: id, case_id, pdf_url, generated_at, case_summary_json
-- RLS: anon full access
-- Index: case_id

-- Verification:
-- audit_logs confirmed INSERT-only (no UPDATE/DELETE policy exists)
-- Policies found: audit_logs_service_select (SELECT),
--                 audit_logs_anon_insert (INSERT),
--                 audit_logs_anon_select (SELECT)
