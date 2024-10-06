# FallSafe

**FallSafe** is a real-time fall detection system designed to enhance the safety of patients. By leveraging AI-powered pose detection, FallSafe instantly alerts nurses and caregivers when a fall is detected, ensuring timely assistance and improving patient monitoring efficiency.

<img width="400" alt="Screenshot 2024-10-06 at 10 09 43 AM" src="https://github.com/user-attachments/assets/5b8ef91c-1218-484f-9a01-d118061f5ce7">
<img width="400" alt="Screenshot 2024-10-06 at 10 10 07 AM" src="https://github.com/user-attachments/assets/52611bbf-6fc9-4950-a106-b543ffacbc8c">
<img width="400" alt="Screenshot 2024-10-06 at 10 10 46 AM" src="https://github.com/user-attachments/assets/2ba32b52-942b-4c28-823b-0be3b2e59d0c">
<img width="400" alt="Screenshot 2024-10-06 at 10 13 36 AM" src="https://github.com/user-attachments/assets/32e85998-9940-42f6-9e6a-55b263782337">






## 🩺 The Problem

Falls are a major concern for the elderly and patients in medical facilities. They can lead to serious injuries, prolonged hospital stays, and decreased quality of life. Traditional monitoring methods often rely on manual checks, which can be insufficient for timely detection and response.

## 💡 The Solution

FallSafe utilizes advanced AI technology to continuously monitor individuals through a camera. When a fall is detected, the system immediately sends alerts to nurses and designated caregivers, enabling swift intervention and reducing the risk of severe injuries.

## 🚀 Features

- **Real-Time Monitoring**: Continuously observes individuals for fall detection.
- **AI-Powered Detection**: Employs the Human library for accurate and reliable pose analysis.
- **Instant Alerts**: Automatically notifies nurses and caregivers via phone calls when a fall is detected.
- **Efficient Patient Monitoring**: Helps nurses manage and monitor multiple patients more effectively.
- **User-Friendly Interface**: Simple setup and intuitive controls for ease of use.

## 🛠 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/khamitov527/fallsafe.git
cd fallsafe
```

### 2. Frontend Setup

```
cd frontend
npm install
npm start
```

### 3. Backend Setup
```
cd backend
npm install
node index.js
```

## 📋 Usage

1. Open the Application: Navigate to http://localhost:3000 in your browser.
2. Enter Caregiver's Phone Number: Input the caregiver's phone number and click "Save Number".
3. Start Monitoring: Click "Start Monitoring" to begin real-time fall detection.
4. Stop Monitoring: Click "Stop Monitoring" to end the session.
5. Fall Detected: If a fall is detected, a red overlay will cover the screen, and an automatic call will be made to the caregiver.


## 🧰 Technologies Used

### Frontend:
- React
- Styled-Components
- React-Typed
- React-Icons

### Backend:
- Express.js
- Twilio API
- libphonenumber-js
- AI & Detection:
- Human Library

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## 📄 License

This project is licensed under the MIT License.

## 📞 Contact

For any questions or support, please contact 
- khamitov527@gmail.com
- aliaslanbayli@gmail.com
