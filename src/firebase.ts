import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCeRKErg9KvX48NtCWcgDrJbqIor7bf0bQ",
    authDomain: "ionicproject-74c01.firebaseapp.com",
    projectId: "ionicproject-74c01",
    storageBucket: "ionicproject-74c01.appspot.com", // <-- Fix the URL typo!
    messagingSenderId: "173722655502",
    appId: "1:173722655502:web:d9a3cbdee1a724bbda155f",
    measurementId: "G-K5E3WS491S"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);