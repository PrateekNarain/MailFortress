import React, { useEffect, useState } from 'react';
import { StructuredResponsePreview, normalizeResponseText } from './DraftPreview';

const EMAIL_TOPICS = [
  { id: 1, label: 'Schedule a Meeting (Internal/External)' },
  { id: 2, label: 'Request Project Status Update' },
  { id: 3, label: 'Follow Up on Action Item/Task' },
  { id: 4, label: 'Team Announcement: Upcoming Change' },
  { id: 5, label: 'Submit Leave/Time Off Request' },
  { id: 6, label: 'Seek Formal Approval (e.g., Budget, Plan)' },
  { id: 7, label: 'Share Information/Documents' },
  { id: 8, label: 'Job Application/Recruitment Inquiry' },
  { id: 9, label: 'Please Approve Invoice/Payment' },
  { id: 10, label: 'Request Invoice/Billing Details' },
  { id: 11, label: 'Report Payment Issue/Discrepancy' },
  { id: 12, label: 'Request Service/Subscription Cancellation' },
  { id: 13, label: 'Report Account/Technical Issue' },
  { id: 14, label: 'Confirm Order/Track Delivery Status' },
  { id: 15, label: 'Respond to Customer Complaint/Issue' },
  { id: 16, label: 'Send a Formal Thank You Note' },
  { id: 17, label: 'Request/Provide Vendor Quote' },
  { id: 18, label: 'Lodge a Formal Complaint/Feedback' },
  { id: 19, label: 'Quarterly Review Request' },
  { id: 20, label: 'Request Informal Catch-Up' },
];

export default function EmailAgentChat({ emails = [], onChat, onSendEmail }) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [chatInstruction, setChatInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [draftText, setDraftText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [subjectLine, setSubjectLine] = useState('');

  useEffect(() => {
    if (!draftText) {
      setSubjectLine(selectedTopic || '');
    }
  }, [selectedTopic]);

  const run = async () => {
    if (!selectedTopic) return alert('Please select an email topic');
    if (!userQuery.trim()) return alert('Please provide details for your email');
    
    setBusy(true);
    try {
      const syntheticContext = `Topic: ${selectedTopic}\n\nDetails: ${userQuery}`;
      const result = await onChat({ 
        emailId: null,
        chatInstruction: chatInstruction || `Draft an email regarding: ${selectedTopic}`, 
        userQuery: `${selectedTopic}\n\nDetails:\n${userQuery}`,
        contextBody: syntheticContext,
      });
      const cleaned = normalizeResponseText(result?.draft?.text || result?.text || '');
      setDraftText(cleaned);
      setSubjectLine(selectedTopic);
    } catch (err) {
      console.error('Chat failed', err);
      alert('Failed to generate draft — see console for details.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendDraft = async () => {
    if (!recipientEmail.trim()) {
      alert('Please add a recipient email.');
      return;
    }
    if (!draftText.trim()) {
      alert('Generate or write a draft first.');
      return;
    }
    setIsSending(true);
    try {
      await onSendEmail?.({
        toEmail: recipientEmail.trim(),
        subject: subjectLine || selectedTopic || 'MailFortress Draft',
        body: draftText,
      });
      alert('Draft sent and saved to Sent folder.');
      setDraftText('');
      setUserQuery('');
      setSelectedTopic('');
      setRecipientEmail('');
    } catch (err) {
      console.error('Failed to send draft', err);
      alert('Unable to send draft, please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Select Email Topic <span className="text-red-600">*</span>
        </label>
        <select 
          className="mt-1 block w-full p-2 border rounded hover:border-indigo-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600" 
          value={selectedTopic} 
          onChange={(e) => setSelectedTopic(e.target.value)}>
          <option value="">-- select an email topic --</option>
          {EMAIL_TOPICS.map((topic) => (
            <option key={topic.id} value={topic.label}>{topic.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Recipient Email</label>
        <input
          type="email"
          className="mt-1 block w-full p-2 border rounded hover:border-indigo-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          placeholder="recipient@example.com"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Instruction</label>
        <input 
          className="mt-1 block w-full p-2 border rounded hover:border-indigo-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600" 
          placeholder="e.g., Be concise and professional, Use formal tone, Keep it brief, etc."
          value={chatInstruction} 
          onChange={(e) => setChatInstruction(e.target.value)} 
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Details <span className="text-red-600">*</span>
        </label>
        <textarea
          className="mt-1 block w-full p-2 border rounded hover:border-indigo-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-y"
          placeholder="Provide more details about your email request...&#10;&#10;Example:&#10;- Meeting date: Next Tuesday at 2 PM&#10;- Attendees: John, Sarah&#10;- Agenda: Discuss Q4 goals&#10;- Duration: 1 hour"
          rows={6}
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-gray-500">
          {selectedTopic ? `Topic: "${selectedTopic.slice(0, 40)}${selectedTopic.length > 40 ? '...' : ''}"` : 'No topic selected'}
        </span>
        <button 
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed" 
          onClick={run} 
          disabled={busy || !selectedTopic || !userQuery.trim()}>
          {busy ? 'Generating...' : 'Generate Draft'}
        </button>
      </div>

      {draftText && (
        <div className="bg-white border-2 border-indigo-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-indigo-700">Generated Draft</h3>
            <span className="text-xs text-gray-500">{draftText.length} characters</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient Email</label>
              <input
                type="email"
                className="w-full p-3 border rounded focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                className="w-full p-3 border rounded focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                value={subjectLine}
                onChange={(e) => setSubjectLine(e.target.value)}
                placeholder="Subject line"
              />
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded p-3 overflow-auto max-h-60">
            <h4 className="text-xs font-semibold text-indigo-500 tracking-wide uppercase mb-2">Formatted Preview</h4>
            <StructuredResponsePreview text={draftText} />
          </div>

          <textarea
            className="w-full p-3 border rounded focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            rows={10}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setDraftText('')}
            >
              Clear
            </button>
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              onClick={handleSendDraft}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Send Draft'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
