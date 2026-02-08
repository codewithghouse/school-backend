# School Dashboard Backend

Lightweight Node.js server for handling email invitations using Resend.

## Setup

1. `cd server`
2. `npm install`
3. Create `.env` from the template
4. `npm start`

## Deployment (Render)

- Root directory: `/server`
- Build command: `npm install`
- Start command: `node index.js`
- Add Environment Variables in Render dashboard.

## API Endpoints

### POST /send-invite
Sends an invitation email.

**Body:**
```json
{
  "email": "string",
  "type": "teacher | parent",
  "schoolName": "string"
}
```
