require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Firebase Admin Initialization ---
// For Render deployment, you must add FIREBASE_SERVICE_ACCOUNT (JSON string) to your Env Vars
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin Initialized');
    } catch (e) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
    }
} else {
    // Fallback for local dev if you have the ADC or already logged in via CLI
    admin.initializeApp();
}

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3002;

// --- CORS POLICY ---
// Strictly allow only your Vercel frontend
const allowedOrigins = [
    'https://schooldashboard-1bqa-f94356e3.vercel.app', // Update this to your PRODUCTION domain
    'http://localhost:5173'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

// --- 1️⃣ Route: Invite Teacher (Atomic) ---
app.post('/invite-teacher', async (req, res) => {
    const { email, name, schoolId, subjects, classIds, schoolName } = req.body;
    console.log('--- Teacher Invite Request ---');
    console.log(`Email: ${email}, School: ${schoolName}`);

    if (!email || !schoolId || !schoolName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const resendApiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

        // 1. Create Firestore Document
        // We do this on the backend to ensure it's recorded BEFORE the email is sent
        const inviteRef = await db.collection('invites').add({
            email: email.toLowerCase().trim(),
            name: name || 'Teacher',
            role: 'teacher',
            schoolId,
            subjects: subjects || [],
            classIds: classIds || [],
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Invite doc created: ${inviteRef.id}`);

        // 2. Call Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromEmail,
                to: email,
                subject: `You’ve been invited as a Teacher at ${schoolName}`,
                html: `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #4F46E5;">Welcome to the Team!</h2>
                        <p>You have been added as a Teacher at <strong>${schoolName}</strong>.</p>
                        <p>Please login using this email to activate your account and access your dashboard:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${appBaseUrl}/login" style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Activate & Login</a>
                        </div>
                        <p style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">If you didn't expect this invitation, please ignore this email.</p>
                    </div>
                `
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));

        console.log('✅ Email sent via Resend');
        res.status(200).json({ success: true, inviteId: inviteRef.id });

    } catch (err) {
        console.error('❌ Teacher Invite Failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- 2️⃣ Generic Invite (Parent/Other) ---
app.post('/send-invite', async (req, res) => {
    const { email, type, schoolName, studentName } = req.body;

    try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

        let subject = type === 'parent' ? `Child added to ${schoolName}` : `Invitation from ${schoolName}`;
        let body = `Hello, your child ${studentName || ''} has been added. Login at: ${appBaseUrl}/login`;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
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
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'server is running' }));

app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
