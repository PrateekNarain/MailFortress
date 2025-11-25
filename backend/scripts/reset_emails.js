require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const seedEmails = [
  {
    id: 'e1',
    sender: 'ceo.globaldynamics@gmail.com',
    subject: 'URGENT: Finalize Q4 Budget Presentation Data',
    timestamp: 1709280000000,
    body: 'Team, I need the consolidated Q4 spending report and projections for Q1/Q2 next year. Please submit your final, signed budget reports directly to my assistant by 10 AM TUESDAY. This is critical for the board meeting. We must not be late.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e2',
    sender: 'marketing.weeklybrief@gmail.com',
    subject: '10 Hidden SEO Secrets to Boost Traffic in 2024',
    timestamp: 1709280600000,
    body: 'Welcome to our weekly insights! This edition dives deep into leveraging semantic search for higher rankings. No immediate action required, but this is excellent professional development reading. Happy analyzing!',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e3',
    sender: 'scheduling.assistant@gmail.com',
    subject: 'Request to book 1:1 meeting: Project Gemini Onboarding',
    timestamp: 1709281200000,
    body: 'Hi, I am scheduling a 30-minute introductory meeting for you with the new Project Gemini team lead, Jane Smith. Are you available next Thursday or Friday afternoon? Please confirm your availability by the end of the day.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e4',
    sender: 'hr.payroll.system@gmail.com',
    subject: 'ACTION REQUIRED: Update W-4 Tax Information',
    timestamp: 1709281800000,
    body: 'Our records indicate that your W-4 form is outdated. To avoid incorrect tax withholding, please log into the HR portal and update your submission by March 15th. This is an administrative necessity.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e5',
    sender: 'thebankofcommerce.security@gmail.com',
    subject: 'Security Alert: Unusual Login Detected',
    timestamp: 1709282400000,
    body: 'We detected a login attempt from an unrecognized location (Vietnam). If this was not you, click the link below IMMEDIATELY to verify your account credentials and prevent account suspension. Failure to act will result in account closure.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e6',
    sender: 'team.lead.rnd@gmail.com',
    subject: 'Follow-up: Database Migration Issue',
    timestamp: 1709283000000,
    body: 'I looked into the legacy database export you ran last week. There were errors in the `user_preferences` table. Can you please re-run the export script, making sure to include the `--no-locks` flag? It needs to be completed by the end of the day today, 5 PM.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e7',
    sender: 'alice.johnson.colleague@gmail.com',
    subject: 'Quick question about the Q3 report format',
    timestamp: 1709283600000,
    body: 'Hey, I saw your section on the Q3 report. Do you happen to have a clean version of the final graphics file in PNG format? I need it to finalize my slide deck for the marketing review presentation.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e8',
    sender: 'security.update.team@gmail.com',
    subject: 'Patch Tuesday: Mandatory System Restart Tonight',
    timestamp: 1709284200000,
    body: 'All internal systems will undergo a mandatory security patch update and restart tonight at 2:00 AM local time. Please make sure your computer is plugged in and connected to the corporate network before leaving the office today.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e9',
    sender: 'yourfavoriteonlinestore@gmail.com',
    subject: 'Your Cart is Waiting! 20% Off Inside',
    timestamp: 1709284800000,
    body: "You left items in your cart! Don't miss out on this limited-time offer. Use code CART20 at checkout for 20% off. Sale ends tomorrow. Unsubscribe here if you wish.",
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e10',
    sender: 'event.coordinator.team@gmail.com',
    subject: 'Lunch & Learn: Introduction to Serverless Architecture',
    timestamp: 1709285400000,
    body: 'We are hosting a Lunch & Learn session next Wednesday at noon in Conference Room 3. We will cover AWS Lambda and Azure Functions. Reply to this email to RSVP so we can get a headcount for lunch.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e11',
    sender: 'the.accounting.department@gmail.com',
    subject: 'Re: Overdue Expense Report for November',
    timestamp: 1709286000000,
    body: 'This is a final reminder that your November expense report is 45 days overdue. Please submit it within 24 hours to avoid escalation. The system will lock you out of submitting future reports if this is not resolved.',
    category: null,
    action_item: null,
    drafts: []
  },
  {
    id: 'e12',
    sender: 'sarah.connor.pm@gmail.com',
    subject: 'Follow-up question on the new API endpoint specs',
    timestamp: 1709286600000,
    body: 'Hi, I saw your proposal for the new `/v2/users` endpoint. Before we greenlight development, I need to know the estimated time required for integrating OAuth 2.0 authentication into this endpoint. Could you provide a time estimate (in developer days) by Friday?',
    category: null,
    action_item: null,
    drafts: []
  }
];

function transformEmail(email) {
  const timestamp = Number(email.timestamp);
  const iso = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();

  const actionItems = [];
  if (email.action_item) {
    actionItems.push(typeof email.action_item === 'string' ? email.action_item : JSON.stringify(email.action_item));
  }

  return {
    from_email: email.sender,
    subject: email.subject,
    body: email.body,
    category: email.category,
    action_items: actionItems,
    drafts: Array.isArray(email.drafts) ? email.drafts : [],
    processed: false,
    inserted_at: iso,
  };
}

async function resetEmails() {
  console.log('Deleting existing rows from `emails` table...');
  const { error: deleteError } = await supabase.from('emails').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deleteError) {
    console.error('Failed to delete rows:', deleteError.message || deleteError);
    process.exit(1);
  }
  console.log('Existing rows deleted.');

  const payload = seedEmails.map(transformEmail);
  console.log('Inserting', payload.length, 'emails...');

  const { error: insertError } = await supabase.from('emails').insert(payload);
  if (insertError) {
    console.error('Failed to insert seed emails:', insertError.message || insertError);
    process.exit(1);
  }

  console.log('Seed data inserted successfully.');
  process.exit(0);
}

resetEmails();
