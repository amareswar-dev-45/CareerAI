import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA3zteJcD1dIQ5BaQxBeXDSrD_NUifo2sU",
  authDomain: "gcek-4e666.firebaseapp.com",
  projectId: "gcek-4e666",
  storageBucket: "gcek-4e666.firebasestorage.app",
  messagingSenderId: "344781800932",
  appId: "1:344781800932:web:3a3521316c58264b47f3f1",
  measurementId: "G-J3MGXCQGCH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signupWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logoutUser = () => signOut(auth);
