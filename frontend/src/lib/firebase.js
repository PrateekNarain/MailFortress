import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Mutable exports to hold the initialized instances
export let app;
export let auth;
export let db;
export let appId;
export let userId;

export const initializeFirebase = (config, id, token) => {
    try {
        app = initializeApp(config);
        auth = getAuth(app);
        db = getFirestore(app);
        appId = id;
        return auth; // Return auth to allow sign-in
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        throw error;
    }
};

export const setUserId = (id) => {
    userId = id;
};
