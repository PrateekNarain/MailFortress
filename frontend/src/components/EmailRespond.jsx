import React, { useEffect, useState } from 'react';
import { normalizeResponseText, StructuredResponsePreview } from './DraftPreview';

export default function EmailRespond({ emails = [], onGenerateResponse, onSendEmail }) {
  const [selectedEmailId, setSelectedEmailId] = useState('');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  useEffect(() => {
    if (selectedEmail) {
      setRecipientEmail(selectedEmail.from_email || '');
    } else {
      setRecipientEmail('');
    }
  }, [selectedEmailId, selectedEmail]);

  const handleGenerate = async () => {
    if (!selectedEmailId) {
      alert('Please select an email to respond to');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await onGenerateResponse(selectedEmailId);
      const cleaned = normalizeResponseText(response.text || response || '');
      setGeneratedResponse(cleaned);
    } catch (err) {
      console.error('Failed to generate response', err);
      alert('Failed to generate response. See console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!generatedResponse.trim()) {
      alert('Please generate or write a response before sending');
      return;
    }

    if (!recipientEmail.trim()) {
      alert('Please provide the recipient email');
      return;
    }

    setIsSending(true);
    try {
      await onSendEmail?.({
        toEmail: recipientEmail.trim(),
        subject: selectedEmail ? `Re: ${selectedEmail.subject}` : 'MailFortress Draft',
        body: generatedResponse,
      });
      alert('Email response sent successfully!');
      setGeneratedResponse('');
      setSelectedEmailId('');
    } catch (err) {
      console.error('Failed to log sent email', err);
      alert('Failed to send email. See console for details.');
    } finally {
      setIsSending(false);
    }
  };
          <div className="grid md:grid-cols-2 gap-3 mt-3">
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
                value={selectedEmail ? `Re: ${selectedEmail.subject || ''}` : selectedEmail?.subject || ''}
                disabled
              />
            </div>
          </div>

  const handleCopy = () => {
    if (!generatedResponse) return;
    navigator.clipboard.writeText(generatedResponse);
    alert('Response copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Email Selection */}
      <div className="bg-white border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">
          Select Email to Respond <span className="text-red-600">*</span>
        </label>
        <select
          className="w-full p-3 border rounded hover:border-indigo-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          value={selectedEmailId}
          onChange={(e) => setSelectedEmailId(e.target.value)}>
          <option value="">-- select an email to respond --</option>
          {emails.map((email) => (
            <option key={email.id} value={email.id}>
              {email.subject || '(no subject)'} - from {email.from_email || 'unknown'}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Email Preview */}
      {selectedEmail && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📧 Email Preview</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-600">From:</span> {selectedEmail.from_email}
            </div>
            <div>
              <span className="font-medium text-gray-600">Subject:</span> {selectedEmail.subject}
            </div>
            <div>
              <span className="font-medium text-gray-600">Category:</span>{' '}
              <span className={`px-2 py-0.5 rounded text-xs ${selectedEmail.category === 'Spam' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                {selectedEmail.category || 'unprocessed'}
              </span>
            </div>
            <div className="pt-2 border-t">
              <span className="font-medium text-gray-600">Message:</span>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap max-h-32 overflow-auto">
                {selectedEmail.body || '(no content)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={!selectedEmailId || isGenerating}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium">
          {isGenerating ? (
            <>
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Generating Response...
            </>
          ) : (
            <>🤖 Generate AI Response</>
          )}
        </button>
      </div>

      {/* Generated Response Editor */}
      {generatedResponse && (
        <div className="bg-white border-2 border-indigo-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-indigo-700">✍️ Generated Response (Editable)</h3>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition">
              📋 Copy
            </button>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded p-3 mb-4 overflow-auto max-h-72">
            <h4 className="text-xs font-semibold text-indigo-500 tracking-wide uppercase mb-2">Formatted Preview</h4>
            <StructuredResponsePreview text={generatedResponse} />
          </div>
          <textarea
            className="w-full p-3 border rounded focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            rows={12}
            value={generatedResponse}
            onChange={(e) => setGeneratedResponse(e.target.value)}
            placeholder="Your AI-generated response will appear here. You can edit it before sending."
          />
          <div className="mt-4 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {generatedResponse.length} characters • Feel free to edit before sending
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setGeneratedResponse('')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition">
                Clear
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition disabled:bg-gray-400 font-medium">
                {isSending ? 'Sending...' : '📤 Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedEmail && !generatedResponse && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">✉️</div>
          <p className="text-sm">Select an email above to generate an AI-powered response</p>
        </div>
      )}
    </div>
  );
}
