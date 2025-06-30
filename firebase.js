// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcr65GXN-yDE10nRBHzrf0seo9yD1C8g4",
  authDomain: "events-68eeb.firebaseapp.com",
  projectId: "events-68eeb",
  storageBucket: "events-68eeb.firebasestorage.app",
  messagingSenderId: "229394824161",
  appId: "1:229394824161:web:e12e21ac171c5692fa70a0",
  measurementId: "G-M4XG127FET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);