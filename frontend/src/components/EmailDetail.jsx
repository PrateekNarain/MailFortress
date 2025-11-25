import React from 'react';
import { normalizeResponseText } from './DraftPreview';

export default function EmailDetail({ email, refresh }) {
  if (!email) return <div className="text-sm text-gray-500">No email selected.</div>;

  const confidencePercent = email.spam_confidence ? Math.round(email.spam_confidence * 100) : null;
  const confidenceTheme = confidencePercent >= 75 ? 'bg-rose-100 text-rose-700' : confidencePercent >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  const messageBody = normalizeResponseText(email.body);
  const spamReason = normalizeResponseText(email.spam_reason);

  const formatDate = (value) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString();
    } catch (err) {
      return value;
    }
  };

  const receivedAt = formatDate(email.inserted_at || email.received_at || email.date);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="uppercase text-xs tracking-widest text-indigo-100 mb-2">{email.category || 'Inbox'}</p>
            <h2 className="text-2xl font-semibold leading-tight">{email.subject || '(no subject)'}</h2>
            <p className="text-sm text-indigo-100 mt-1">From {email.from_email || 'unknown sender'}</p>
            {email.to_email && <p className="text-xs text-indigo-100/80">To {email.to_email}</p>}
            {receivedAt && <p className="text-xs text-indigo-100/80 mt-1">Received {receivedAt}</p>}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            {confidencePercent !== null && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${confidenceTheme}`}>
                Spam confidence {confidencePercent}%
              </span>
            )}
            <button
              onClick={() => refresh && refresh()}
              className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{email.category || 'Unprocessed'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{email.processed ? 'Processed' : 'Pending review'}</p>
          {email.processed_at && <p className="text-xs text-slate-500">Processed {formatDate(email.processed_at)}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Spam Reason</p>
          <p className="mt-1 text-sm text-slate-700 min-h-[36px]">{spamReason || 'Not flagged as spam'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Message</h3>
        </div>
        <article className="prose prose-slate max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
          {messageBody || '(no body)'}
        </article>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Action Items</h3>
        </div>
        {Array.isArray(email.action_items) && email.action_items.length ? (
          <div className="space-y-2">
            {email.action_items.map((ai, i) => (
              <div key={i} className="flex items-start gap-3 bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <div className="text-sm text-slate-800">
                  {typeof ai === 'string' ? ai : ai.title || ai.task || JSON.stringify(ai)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No action items detected.</div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Draft Responses</h3>
        </div>
        {Array.isArray(email.drafts) && email.drafts.length ? (
          <div className="space-y-4">
            {email.drafts.map((d, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm text-slate-800 whitespace-pre-line">{d.text}</p>
                {d.suggestedFollowUps && d.suggestedFollowUps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Suggested follow-ups</p>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {d.suggestedFollowUps.map((fu, idx) => (
                        <li key={idx}>{fu}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.created_at && <p className="text-xs text-slate-400 mt-2">{formatDate(d.created_at)}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No drafts yet.</div>
        )}
      </div>
    </div>
  );
}
