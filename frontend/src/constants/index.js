export const MOCK_INBOX_DATA = [
    { id: '1', from: 'newsletter@techweekly.com', subject: 'Tech Weekly: AI Revolution', snippet: 'This week in tech: How AI is changing the landscape of...', date: '10:00 AM', read: false, label: 'Newsletter' },
    { id: '2', from: 'boss@company.com', subject: 'Urgent: Q3 Report', snippet: 'Please review the attached Q3 report by EOD.', date: '9:45 AM', read: false, label: 'Work' },
    { id: '3', from: 'mom@family.com', subject: 'Sunday Dinner', snippet: 'Are you coming over for dinner this Sunday? We are making...', date: 'Yesterday', read: true, label: 'Personal' },
    { id: '4', from: 'billing@service.com', subject: 'Invoice #12345', snippet: 'Your monthly invoice is ready for view.', date: 'Yesterday', read: true, label: 'Finance' },
    { id: '5', from: 'team@project.com', subject: 'Standup Notes', snippet: 'Here are the notes from today\'s standup meeting.', date: 'Oct 24', read: true, label: 'Work' },
    { id: '6', from: 'promo@shop.com', subject: '50% Off Everything!', snippet: 'Don\'t miss out on our biggest sale of the year.', date: 'Oct 23', read: false, label: 'Promotions' },
    { id: '7', from: 'security@bank.com', subject: 'Login Alert', snippet: 'We detected a new login to your account.', date: 'Oct 22', read: false, label: 'Security' },
    { id: '8', from: 'recruiter@linkedin.com', subject: 'New Opportunity', snippet: 'I came across your profile and thought you would be a great fit...', date: 'Oct 21', read: true, label: 'Career' },
    { id: '9', from: 'support@software.com', subject: 'Ticket #999 Resolved', snippet: 'Your support ticket has been marked as resolved.', date: 'Oct 20', read: true, label: 'Support' },
    { id: '10', from: 'friend@gmail.com', subject: 'Trip Photos', snippet: 'Check out the photos from our hiking trip!', date: 'Oct 19', read: true, label: 'Personal' },
    { id: '11', from: 'webinar@edu.com', subject: 'Upcoming Webinar', snippet: 'Join us for a deep dive into React hooks.', date: 'Oct 18', read: false, label: 'Education' },
    { id: '12', from: 'updates@app.com', subject: 'Version 2.0 Released', snippet: 'We have updated our app with new features.', date: 'Oct 17', read: true, label: 'Updates' }
];

export const DEFAULT_PROMPTS_JSON = {
    summarize: {
        title: "Summarize Email",
        system: "You are a helpful assistant. Summarize the following email concisely.",
        schema: {
            type: "object",
            properties: {
                summary: { type: "string" },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] }
            }
        }
    },
    action_items: {
        title: "Extract Action Items",
        system: "Extract actionable tasks from the email.",
        schema: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            task: { type: "string" },
                            priority: { type: "string", enum: ["high", "medium", "low"] },
                            due_date: { type: "string", description: "ISO date string if mentioned" }
                        }
                    }
                }
            }
        }
    },
    reply_generate: {
        title: "Generate Reply",
        system: "Draft a professional reply to this email.",
        schema: {
            type: "object",
            properties: {
                draft_reply: { type: "string" },
                tone: { type: "string" }
            }
        }
    },
    categorize: {
        title: "Categorize Email",
        system: "Categorize this email based on its content.",
        schema: {
            type: "object",
            properties: {
                category: { type: "string", enum: ["Work", "Personal", "Finance", "Promotions", "Other"] },
                confidence: { type: "number" }
            }
        }
    }
};
