import { useState, useEffect } from 'react';
import { getBatnaWatna } from '../../services/batnaWatna';

// Label → colour mapping (matches doc spec)
const LABEL_COLORS = {
  Strong:   { bg: 'bg-green-50',  border: 'border-green-400', text: 'text-green-700',  dot: 'bg-green-500'  },
  Moderate: { bg: 'bg-amber-50',  border: 'border-amber-400', text: 'text-amber-700',  dot: 'bg-amber-500'  },
  Weak:     { bg: 'bg-red-50',    border: 'border-red-400',   text: 'text-red-700',    dot: 'bg-red-500'    },
};

const getLabelStyle = (label) =>
  LABEL_COLORS[label] ?? { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', dot: 'bg-gray-400' };

// ── Sub-components ────────────────────────────────────────────────────────────

function LabelBadge({ label }) {
  const s = getLabelStyle(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold border ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

function PositionCard({ title, label, reasoning }) {
  const s = getLabelStyle(label);
  return (
    <div className={`rounded-xl border-l-4 ${s.border} bg-white p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <LabelBadge label={label} />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{reasoning}</p>
    </div>
  );
}

function SolicitorMessage() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 flex gap-3">
      <div className="mt-0.5 text-blue-500 shrink-0">
        {/* Counsellor icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-blue-800 mb-1">Consider Getting Legal Advice</p>
        <p className="text-sm text-blue-700 leading-relaxed">
          Some aspects of your case involve legal complexity that a qualified solicitor can help clarify.
          This is a routine recommendation for cases like yours and doesn't reflect on the mediation process itself.
        </p>
      </div>
    </div>
  );
}

function GuidanceBlock({ guidance }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
        Negotiation Guidance
      </p>
      <p className="text-sm text-indigo-800 leading-relaxed">{guidance}</p>
    </div>
  );
}

function DisclaimerBlock({ text }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex gap-2 items-start">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
      </svg>
      <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-1/3 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-20 bg-gray-100 rounded-xl" />
      <div className="h-12 bg-gray-100 rounded-lg" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * BatnaWatnaPartyDisplay
 *
 * Drop this inside CaseDetails.jsx, gated by:
 *   const BURST_2_STATUSES = [
 *     'BURST_2_COMPLETE', 'PROPOSAL_DRAFT', 'PROPOSAL_PUBLISHED',
 *     'MEDIATION_IN_PROGRESS', 'MEDIATION_COMPLETE', 'MEDIATION_FAILED'
 *   ];
 *   {BURST_2_STATUSES.includes(caseStatus) && <BatnaWatnaPartyDisplay caseId={caseId} />}
 *
 * Props:
 *   caseId  {string}  UUID of the active case
 */
export default function BatnaWatnaPartyDisplay({ caseId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!caseId) return;

    let cancelled = false;

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getBatnaWatna(caseId);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.response?.status === 404
              ? 'Analysis not ready yet. Check back shortly.'
              : err?.response?.data?.detail ?? 'Failed to load your analysis. Please refresh.';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [caseId]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="mt-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full bg-indigo-500" />
        <h2 className="text-base font-semibold text-gray-800">Your Case Analysis</h2>
        <span className="text-xs text-gray-400 font-medium">AI-generated · confidential</span>
      </div>

      {loading && <Skeleton />}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 flex gap-3 items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && data && (() => {
        const pos = data.your_position;

        // ── Solicitor flag: show message only, no labels ──────────────────
        if (pos.consult_solicitor_flag) {
          return (
            <div className="space-y-4">
              <SolicitorMessage />
              <DisclaimerBlock text={data.disclaimer} />
            </div>
          );
        }

        // ── Normal display ────────────────────────────────────────────────
        return (
          <div className="space-y-4">
            {/* BATNA + WATNA side by side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PositionCard
                title="Your Best Alternative (BATNA)"
                label={pos.batna_label}
                reasoning={pos.batna_reasoning}
              />
              <PositionCard
                title="Your Worst Alternative (WATNA)"
                label={pos.watna_label}
                reasoning={pos.watna_reasoning}
              />
            </div>

            {/* Negotiation guidance */}
            <GuidanceBlock guidance={pos.negotiation_guidance} />

            {/* Disclaimer */}
            <DisclaimerBlock text={data.disclaimer} />
          </div>
        );
      })()}
    </section>
  );
}