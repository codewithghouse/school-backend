require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// --- STEP 1: Verify Env Loading ---
console.log('--- Backend Configuration ---');
console.log('PORT:', PORT);
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Present (Hidden)' : 'MISSING');
console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'MISSING');
console.log('APP_BASE_URL:', process.env.APP_BASE_URL || 'MISSING');
console.log('-----------------------------');

// Middleware
app.use(cors());
app.use(express.json());

// --- STEP 4: Hard-coded Test Route ---
app.get('/test-mail', async (req, res) => {
    console.log('GET /test-mail hit');
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!resendApiKey) {
        return res.status(500).json({ error: 'RESEND_API_KEY is missing' });
    }

    try {
        console.log('Attempting to send test email via direct fetch...');
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromEmail,
                to: fromEmail, // Send to yourself for testing (onboarding@resend.dev usually goes to the registered email)
                subject: 'Local Test Email',
                text: 'This is a test email from your local Node.js backend.'
            })
        });

        const data = await response.json();
        console.log('Resend Response Status:', response.status);
        console.log('Resend Response Data:', data);

        if (!response.ok) {
            return res.status(response.status).json({ error: data });
        }

        res.status(200).json({ success: true, message: 'Test email sent! Check Resend Dashboard.', data });
    } catch (err) {
        console.error('Test Mail Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Main endpoint
app.post('/send-invite', async (req, res) => {
    const { email, type, schoolName } = req.body;
    console.log('--- POST /send-invite ---');
    console.log('Request Body:', { email, type, schoolName });

    if (!email || !type || !schoolName) {
        console.error('Validation Failed: Missing fields');
        return res.status(400).json({ error: 'Missing required fields (email, type, schoolName)' });
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        console.error('Configuration Error: RESEND_API_KEY is missing');
        return res.status(500).json({ error: 'Resend API Key is not configured' });
    }

    let subject = '';
    let body = '';

    if (type === 'teacher') {
        subject = `You’ve been added as a Teacher at ${schoolName}`;
        body = `You have been added as a Teacher at ${schoolName}.\nLogin here: ${appBaseUrl}/login`;
    } else if (type === 'parent') {
        subject = `Your child has been added to ${schoolName}`;
        body = `Your child has been added to ${schoolName}.\nLogin here: ${appBaseUrl}/login`;
    } else {
        console.error('Validation Failed: Invalid type', type);
        return res.status(400).json({ error: 'Invalid invitation type' });
    }

    try {
        console.log('Sending email via Resend API...');
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromEmail,
                to: email,
                subject: subject,
                text: body
            })
        });

        const data = await response.json();
        console.log('Resend API Result:', { status: response.status, data });

        if (!response.ok) {
            console.error('Resend API Error Detail:', data);
            return res.status(response.status).json({ error: data });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Unexpected Backend Server Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
