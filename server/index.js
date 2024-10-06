const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');

// Load environment variables
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error("Twilio credentials are missing from .env file.");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// Endpoint to trigger a phone call
app.post('/api/call-caregiver', (req, res) => {
  const { toPhoneNumber } = req.body;

  if (!toPhoneNumber) {
    return res.status(400).send('Phone number is required');
  }

  client.calls
    .create({
      url: 'http://twimlets.com/message?Message%5B0%5D=Fall+Detected%21+Please+check+immediately.', // TwiML message
      to: toPhoneNumber, // Phone number to call (from the request)
      from: twilioPhoneNumber // Your Twilio number
    })
    .then((call) => {
      console.log('Call initiated:', call.sid);
      res.status(200).send('Call initiated');
    })
    .catch((error) => {
      console.error('Error initiating call:', error);
      res.status(500).send('Error initiating call');
    });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
