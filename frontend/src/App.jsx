import React, { useEffect, useState } from 'react';
import useStore from './store';
import Loading from './components/Loading';
import PromptConfig from './components/PromptConfig';
import EmailDetail from './components/EmailDetail';
import EmailAgentChat from './components/EmailAgentChat';
import EmailRespond from './components/EmailRespond';

export default function App() {
  const { 
    emails, 
    prompts, 
    loading, 
    selectedEmails,
    fetchData, 
    initializeData, 
    updatePrompt, 
    processInbox, 
    chatWithAgent, 
    loadMockLocally, 
    setEmailsLocal, 
    persistEmailCategory,
    detectSpam,
    toggleEmailSelection,
    selectAllEmails,
    deselectAllEmails,
    bulkMarkSpam,
    bulkProcess,
    logSentEmail,
    importEmailsToDatabase,
  } = useStore();

  const [activeTab, setActiveTab] = useState('inbox'); // inbox | prompts | chat | respond
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [mailboxFilter, setMailboxFilter] = useState('inbox'); // all | inbox | spam
  const [uploadPreview, setUploadPreview] = useState(null); // {emails: [], fileName: ''}

  useEffect(() => {
    // Initialize DB (inserts defaults when needed) and refresh data
    initializeData().catch((e) => console.error('initializeData failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If there are emails and no selection, pick the first
    if (!selectedEmailId && emails && emails.length) setSelectedEmailId(emails[0].id);
  }, [emails, selectedEmailId]);

  // Filter emails based on mailbox selection
  const filteredEmails = emails.filter(em => {
    if (mailboxFilter === 'all') return true;
    if (mailboxFilter === 'spam') return em.category === 'Spam';
    if (mailboxFilter === 'sent') return em.category === 'Sent';
    if (mailboxFilter === 'inbox') return em.category !== 'Spam' && em.category !== 'Sent';
    return true;
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;
  const allMailCount = emails.length;
  const inboxCount = emails.filter(e => e.category !== 'Spam' && e.category !== 'Sent').length;
  const spamCount = emails.filter(e => e.category === 'Spam').length;
  const sentCount = emails.filter(e => e.category === 'Sent').length;
  const allSelected = filteredEmails.length > 0 && filteredEmails.every(e => selectedEmails.includes(e.id));

  const onReRunProcessing = async () => {
    try {
      await processInbox(null, { forceAll: true });
      await fetchData();
    } catch (err) {
      console.error('Re-run processing failed', err);
    }
  };

  const onDetectSpam = async () => {
    try {
      await detectSpam();
      alert('Spam detection completed');
    } catch (err) {
      console.error('Spam detection failed', err);
      alert('Spam detection failed - see console');
    }
  };

  const onUpdatePrompt = async (id, updates) => {
    try {
      await updatePrompt(id, updates);
    } catch (err) {
      console.error('updatePrompt failed', err);
    }
  };

  const onLoadMock = async () => {
    try {
      await loadMockLocally();
    } catch (err) {
      console.error('loadMockLocally failed', err);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const emailsArray = Array.isArray(data) ? data : [data];
      setUploadPreview({ emails: emailsArray, fileName: file.name });
    } catch (err) {
      console.error('Failed to parse JSON file', err);
      alert('Failed to parse JSON file. Please check the format.');
    }
  };

  const handleImportToDatabase = async () => {
    if (!uploadPreview?.emails?.length) return;
    try {
      await importEmailsToDatabase(uploadPreview.emails);
      alert(`Successfully imported ${uploadPreview.emails.length} email(s) to database.`);
      setUploadPreview(null);
      setActiveTab('inbox');
      setMailboxFilter('all');
    } catch (err) {
      console.error('Import failed', err);
      alert('Failed to import emails to database.');
    }
  };

  const onChat = async ({ emailId, chatInstruction, userQuery, contextBody }) => {
    try {
      const result = await chatWithAgent({ emailId, chatInstruction, userQuery, contextBody });
      if (result?.email) await fetchData();
      return result;
    } catch (err) {
      console.error('chatWithAgent failed', err);
      throw err;
    }
  };

  const onSendEmail = async ({ toEmail, subject, body }) => {
    try {
      await logSentEmail({ toEmail, subject, body });
    } catch (err) {
      console.error('logSentEmail failed', err);
      throw err;
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      deselectAllEmails();
    } else {
      filteredEmails.forEach(e => {
        if (!selectedEmails.includes(e.id)) toggleEmailSelection(e.id);
      });
    }
  };

  const onBulkMarkSpam = async () => {
    try {
      await bulkMarkSpam();
      alert('Marked as spam');
    } catch (err) {
      console.error('Bulk mark spam failed', err);
      alert('Failed to mark as spam');
    }
  };

  const onBulkProcess = async () => {
    try {
      await bulkProcess();
      alert('Bulk processing completed');
    } catch (err) {
      console.error('Bulk process failed', err);
      alert('Bulk process failed');
    }
  };

  const onGenerateResponse = async (emailId) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) throw new Error('Email not found');

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      // Call dedicated LLM endpoint to generate response
      const response = await fetch(`${BACKEND_URL}/llm/generate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: email.from_email || 'unknown',
          subject: email.subject || '(no subject)',
          emailBody: email.body || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate response');
      }
      
      const data = await response.json();
      return { text: data.responseText || data.text || 'No response generated' };
    } catch (err) {
      console.error('Generate response failed', err);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="app-container flex items-center justify-between py-4">
          <h1 className="text-2xl font-semibold text-indigo-600">📧 MailFortress</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => { setActiveTab('inbox'); }}
              className={`px-4 py-2 rounded-md transition ${activeTab === 'inbox' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>
              Inbox
            </button>
            <button
              onClick={() => { setActiveTab('prompts'); }}
              className={`px-4 py-2 rounded-md transition ${activeTab === 'prompts' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>
              Prompts
            </button>
            <button
              onClick={() => { setActiveTab('chat'); }}
              className={`px-4 py-2 rounded-md transition ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>
              Chat
            </button>
            <button
              onClick={() => { setActiveTab('respond'); }}
              className={`px-4 py-2 rounded-md transition ${activeTab === 'respond' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>
              Respond
            </button>
          </div>
        </div>
      </header>

      <main className="app-container px-0 py-6">
        {loading && <div className="mb-4 flex justify-center"><Loading /></div>}

        {/* Upload Preview Modal */}
        {uploadPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">📥 Import Emails Preview</h2>
                <button onClick={() => setUploadPreview(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <div className="p-6 overflow-auto flex-1">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">File: <span className="font-semibold">{uploadPreview.fileName}</span></p>
                  <p className="text-sm text-gray-600">Found: <span className="font-semibold">{uploadPreview.emails.length}</span> email(s)</p>
                </div>
                <div className="space-y-3 max-h-96 overflow-auto">
                  {uploadPreview.emails.slice(0, 10).map((email, idx) => (
                    <div key={idx} className="border rounded p-3 bg-gray-50">
                      <div className="font-medium text-sm">{email.subject || email.title || '(no subject)'}</div>
                      <div className="text-xs text-gray-600">From: {email.from_email || email.from || email.sender || 'unknown'}</div>
                      {email.category && <div className="text-xs text-indigo-600 mt-1">Category: {email.category}</div>}
                    </div>
                  ))}
                  {uploadPreview.emails.length > 10 && (
                    <div className="text-xs text-gray-500 text-center">...and {uploadPreview.emails.length - 10} more</div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end space-x-3">
                <button onClick={() => setUploadPreview(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                  Cancel
                </button>
                <button onClick={handleImportToDatabase} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Import to Database
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card overflow-hidden shadow-lg">
          <div className="md:flex main-panel" style={{ minHeight: '75vh' }}>
            {/* LEFT SIDEBAR */}
            <aside className="w-80 border-r left-sidebar bg-white">
              {/* Actions */}
              <div className="p-4 border-b">
                <button onClick={onLoadMock} className="w-full btn-primary mb-2">
                  📥 Load Mock Inbox
                </button>
                <label className="w-full btn-ghost cursor-pointer block text-center mb-2">
                  📤 Upload JSON
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </label>
                <button onClick={onReRunProcessing} className="w-full btn-ghost mb-2">
                  ⚙️ Re-run LLM Processing
                </button>
                <button onClick={onDetectSpam} className="w-full btn-primary">
                  🛡️ Detect Spam (AI)
                </button>
              </div>

              {/* Mailbox Filters */}
              <div className="p-4 border-b space-y-1">
                <div 
                  onClick={() => setMailboxFilter('all')}
                  className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${mailboxFilter === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-gray-100'}`}>
                  <span>📬 All Mail</span>
                  <span className="text-sm">{allMailCount}</span>
                </div>
                <div 
                  onClick={() => setMailboxFilter('inbox')}
                  className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${mailboxFilter === 'inbox' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-gray-100'}`}>
                  <span>📨 Inbox</span>
                  <span className="text-sm">{inboxCount}</span>
                </div>
                <div 
                  onClick={() => setMailboxFilter('spam')}
                  className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${mailboxFilter === 'spam' ? 'bg-red-50 text-red-700 font-semibold' : 'hover:bg-gray-100'}`}>
                  <span>🚫 Spam</span>
                  <span className="text-sm">{spamCount}</span>
                </div>
                <div 
                  onClick={() => setMailboxFilter('sent')}
                  className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition ${mailboxFilter === 'sent' ? 'bg-green-50 text-green-700 font-semibold' : 'hover:bg-gray-100'}`}>
                  <span>📤 Sent</span>
                  <span className="text-sm">{sentCount}</span>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedEmails.length > 0 && (
                <div className="p-4 bg-indigo-50 border-b">
                  <div className="text-sm font-medium mb-2">{selectedEmails.length} selected</div>
                  <div className="flex space-x-2">
                    <button onClick={onBulkMarkSpam} className="px-2 py-1 text-xs btn-ghost">Mark Spam</button>
                    <button onClick={onBulkProcess} className="px-2 py-1 text-xs btn-ghost">Process</button>
                    <button onClick={deselectAllEmails} className="px-2 py-1 text-xs btn-ghost">Clear</button>
                  </div>
                </div>
              )}

              {/* Email List */}
              <div className="divide-y max-h-[60vh] overflow-auto">
                {/* Select All */}
                {filteredEmails.length > 0 && (
                  <div className="p-3 bg-gray-50 flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                    <span className="text-xs text-gray-600">Select All</span>
                  </div>
                )}

                {filteredEmails && filteredEmails.length ? (
                  filteredEmails.map((em) => {
                    const confidencePercent = em.spam_confidence ? Math.round(em.spam_confidence * 100) : null;
                    const isSelected = selectedEmails.includes(em.id);
                    const isActive = selectedEmailId === em.id;

                    return (
                      <div
                        key={em.id}
                        className={`p-3 cursor-pointer mail-list-item transition ${isActive ? 'bg-blue-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50'} ${isSelected ? 'bg-indigo-50' : ''}`}>
                        <div className="flex items-start space-x-2">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleEmailSelection(em.id);
                            }}
                            className="mt-1 cursor-pointer"
                          />
                          <div 
                            className="flex-1"
                            onClick={() => { setSelectedEmailId(em.id); setActiveTab('inbox'); }}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{em.subject || '(no subject)'}</div>
                                <div className="text-xs text-gray-500 truncate">{em.from_email || 'unknown'}</div>
                              </div>
                              <div className="flex flex-col items-end text-right ml-2">
                                {confidencePercent !== null && (
                                  <div className={`text-xs font-semibold px-1 rounded ${confidencePercent >= 75 ? 'bg-red-100 text-red-700' : confidencePercent >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                    {confidencePercent}%
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  {em.inserted_at ? new Date(em.inserted_at).toLocaleDateString() : (em.date || '')}
                                </div>
                              </div>
                            </div>
                            {em.category && (
                              <div className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${em.category === 'Spam' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                {em.category}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {mailboxFilter === 'spam' ? 'No spam emails' : mailboxFilter === 'inbox' ? 'Inbox is empty' : 'No emails yet'}
                  </div>
                )}
              </div>
            </aside>
            {/* RIGHT PANEL */}
            <section className="md:flex-1 p-6 bg-white overflow-auto">
              {activeTab === 'prompts' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">🧠 Prompt Configuration (Prompt Brain)</h3>
                  <PromptConfig prompts={prompts} onUpdatePrompt={onUpdatePrompt} initializePrompts={initializeData} />
                </div>
              )}

              {activeTab === 'chat' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">💬 Agent Chat</h3>
                  <EmailAgentChat emails={emails} onChat={onChat} onSendEmail={onSendEmail} />
                </div>
              )}

              {activeTab === 'inbox' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">📄 Email Detail</h3>
                  {selectedEmail ? (
                    <EmailDetail email={selectedEmail} refresh={() => fetchData()} />
                  ) : (
                    <div className="text-sm text-gray-500">Select an email to view details.</div>
                  )}
                </div>
              )}

              {activeTab === 'respond' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">📨 Generate Email Response</h3>
                  <EmailRespond emails={emails} onGenerateResponse={onGenerateResponse} onSendEmail={onSendEmail} />
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

