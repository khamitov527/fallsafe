const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

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

// In-memory store to keep track of last call times per phone number
const lastCallTimes = {};

// Endpoint to trigger a phone call
app.post('/api/call-caregiver', (req, res) => {
  const { toPhoneNumber } = req.body;

  if (!toPhoneNumber) {
    return res.status(400).send('Phone number is required');
  }

  const phoneNumber = parsePhoneNumberFromString(toPhoneNumber, 'US');

  if (!phoneNumber || !phoneNumber.isValid()) {
    return res.status(400).send('Invalid phone number');
  }

  const formattedNumber = phoneNumber.number;

  const now = Date.now();
  const lastCallTime = lastCallTimes[formattedNumber];

  // Check if a call was made to this number in the last minute
  if (lastCallTime && now - lastCallTime < 4500) {
    console.log(`Call already made to ${formattedNumber} in the last minute. Skipping...`);
    return res.status(200).send('Call already made recently. Please wait 2 minutes before trying again.');
  }

  // Update the last call time
  lastCallTimes[formattedNumber] = now;

  client.calls
    .create({
      url: 'http://twimlets.com/message?Message%5B0%5D=Fall+Detected%21+Please+check+immediately.',
      to: formattedNumber,
      from: twilioPhoneNumber
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
