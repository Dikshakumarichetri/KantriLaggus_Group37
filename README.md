# KantriLaggus

A modern cross-platform app for recording, storing, transcribing, and translating spoken phrases—built with 
**Ionic React**, **Express.js**, and **MongoDB**.

## ✨ Features

- **Beautiful UI**: Glassmorphism, custom gradients, fully responsive for web & mobile.
- **Audio Recording**: Record phrases directly in-browser or in-app.
- **Library Management**: View, trim, rename, delete, and download your audio.
- **Transcription & Translation**: AI-powered speech-to-text and multilingual translation.
- **User Authentication**: Secure login & signup using JWT.
- **Profile & Settings**: Edit your name, phone, and preferred language.
- **REST API Backend**: Express.js, MongoDB for user/recording storage, file upload, and token verification.
- **Mobile Ready**: Deployable as a web app or native app (using Capacitor for iOS/Android).

---

## 1. Tech Stack

- **Frontend:** [Ionic React](https://ionicframework.com/), TypeScript, Custom CSS Modules
- **Backend:** [Express.js](https://expressjs.com/), [Node.js](https://nodejs.org/)
- **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas) or local MongoDB
- **Authentication:** JWT (JSON Web Token)
- **Media:** HTML5 MediaRecorder API, REST file uploads
- **Mobile Builds:** Capacitor (`npx cap add ios` / `android`)

---



### 2. Setting Up the Backend

This application uses Express.js (a Node.js framework) on the backend with MongoDB (a NoSQL database) and connects them through Mongoose. It deals with checking user login, adding audio, saving and getting user files and becoming the main API source for the frontend part of the app.

```bash
cd backend
npm install
```

Create a .env file with your MongoDB URI 
```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/yourdb
PORT=3001
```
Start the backend:

```bash
npm start
```

### 3. Setup the Frontend

```bash
cd ../frontend
npm install
ionic serve
```
	•	To run on a physical device:
	•	Install Capacitor & add platform:

```bash
ionic build
npx cap add ios
npx cap add android
npx cap open ios  
```

Update API URL in code if running mobile emulator (API_URL in frontend).
---


## 4. Folder Structure


All backend code is placed in a backend/ folder in the project. In this directory, you keep route handlers, database models, JWT middleware and uploaded audio files in separate files and subfolders.

Models determine how user, recording and phrase information is organized and kept in MongoDB.

The frontend use routes to make requests like logging in, creating an account, uploading audio files and dealing with recordings and phrases.



```
repo-root/
│
├── backend/           # Express.js API (routes, models, controllers)
│   ├── models/        # Mongoose schemas for User, Recording, Phrase
│   ├── routes/        # API route handlers
│   ├── uploads/       # Audio file storage
│   └── ...            
│
├── frontend/          # Ionic React app
│   ├── src/pages/     # All screens (Login, Signup, Dashboard, Library, etc.)
│   ├── src/components/
│   └── ...
│
└── README.md

```
---
## 5. Uploading Audio Files

On the frontend, audio files are passed into the server by multipart form data. Temporary uploaded files are handled by Multer and they are then moved into an uploads/ folder specified in the code. 

Standard or random naming is usually done for filenames to prevent any conflicts.

Saving important information is another role of MongoDB – it has access to the file’s name, upload time and the user behind the file.


Using API calls, it is safe to download or stream these files from the server.
---
## 6. Phrases and Recording management

Many API endpoints can be found in the backend for developers to use.

•	After transcribing or translating audio into text, store the data with the filename, transcript, new language and when each part of the text begins (timestamp).

•	Showing a list of all the recordings or phrases created by the authenticated user.

•	Eliminating a recording or phrase by deleting both its sound file and its metadata.

•	Saving your edits when working on recordings (such as after removing part of the audio).

An action looks at the JWT and confirms ownership to stop access by unauthorized users.

Reading readings aloud and have them transcribed and translated by H.

If transcription or translation is requested through the frontend, the backend can handle it (when local or external APIs are set up) or safely route it to a third-party service. The frontend gets the transcript and/or translation as a new phrase after the ASR (Automatic Speech Recognition) process.