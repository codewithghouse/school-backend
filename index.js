require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Main endpoint
app.post('/send-invite', async (req, res) => {
    const { email, type, schoolName } = req.body;

    if (!email || !type || !schoolName) {
        return res.status(400).json({ error: 'Missing required fields (email, type, schoolName)' });
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    let subject = '';
    let body = '';

    if (type === 'teacher') {
        subject = `You’ve been added as a Teacher at ${schoolName}`;
        body = `You have been added as a Teacher at ${schoolName}.\nLogin here:\n${appBaseUrl}/login`;
    } else if (type === 'parent') {
        subject = `Your child has been added to ${schoolName}`;
        body = `Login to view your child’s academic progress:\n${appBaseUrl}/login`;
    } else {
        return res.status(400).json({ error: 'Invalid invitation type' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: subject,
            text: body, // Using text for MVP, can be HTML later
        });

        if (error) {
            console.error('Resend Error:', error);
            return res.status(400).json({ error });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Server error:', err);
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
