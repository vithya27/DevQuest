import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
const resolvedConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;

if (
  typeof window !== "undefined" &&
  (!resolvedConfig.apiKey ||
    !resolvedConfig.authDomain ||
    !resolvedConfig.projectId ||
    !resolvedConfig.appId)
) {
  console.error(
    "Firebase env vars are missing. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID.",
  );
}

const app = initializeApp(resolvedConfig);
export const auth = getAuth(app);

// Initialize Firestore with the provided database ID
// If it fails or is missing, it might be the default database
let dbInstance;
try {
  if (firestoreDatabaseId && firestoreDatabaseId !== "(default)") {
    dbInstance = getFirestore(app, firestoreDatabaseId);
    console.log(`Firestore initialized with database: ${firestoreDatabaseId}`);
  } else {
    dbInstance = getFirestore(app);
    console.log("Firestore initialized with default database.");
  }
} catch (error) {
  console.error(
    "Failed to initialize Firestore with named database, falling back to default.",
    error,
  );
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Connection test
async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc from server to verify config
    await getDocFromServer(doc(db, "_connection_test_", "ping"));
    console.log("Firestore connection verified.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error(
        "Firestore configuration error: The client is offline. Please check firebase-applet-config.json and project provisioning.",
      );
    }
  }
}

const hasValidProjectId = !!resolvedConfig.projectId;

const hasValidApiKey = !!resolvedConfig.apiKey;

if (typeof window !== "undefined" && hasValidProjectId && hasValidApiKey) {
  void testConnection();
} else if (typeof window !== "undefined" && !hasValidApiKey) {
  console.error(
    "Firebase API key is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set and restart the Next.js dev server.",
  );
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
