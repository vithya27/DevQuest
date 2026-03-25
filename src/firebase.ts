import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

type FirebaseAppletConfig = FirebaseOptions & {
  firestoreDatabaseId?: string;
};

const isPlaceholderValue = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("NEXT_PUBLIC_");

const resolveConfigValue = (value: unknown) => {
  if (isPlaceholderValue(value)) {
    return process.env[value] ?? value;
  }
  return value;
};

const resolvedConfig: FirebaseAppletConfig = {
  ...(firebaseConfig as FirebaseAppletConfig),
  projectId: resolveConfigValue(firebaseConfig.projectId) as string,
  appId: resolveConfigValue(firebaseConfig.appId) as string,
  apiKey: resolveConfigValue(firebaseConfig.apiKey) as string,
  authDomain: resolveConfigValue(firebaseConfig.authDomain) as string,
  storageBucket: resolveConfigValue(firebaseConfig.storageBucket) as string,
  messagingSenderId: resolveConfigValue(
    firebaseConfig.messagingSenderId,
  ) as string,
  measurementId: resolveConfigValue(firebaseConfig.measurementId) as string,
  firestoreDatabaseId: resolveConfigValue(
    firebaseConfig.firestoreDatabaseId,
  ) as string | undefined,
};

const app = initializeApp(resolvedConfig);
export const auth = getAuth(app);

// Initialize Firestore with the provided database ID
// If it fails or is missing, it might be the default database
let dbInstance;
try {
  if (
    resolvedConfig.firestoreDatabaseId &&
    resolvedConfig.firestoreDatabaseId !== "(default)" &&
    !isPlaceholderValue(resolvedConfig.firestoreDatabaseId)
  ) {
    dbInstance = getFirestore(app, resolvedConfig.firestoreDatabaseId);
    console.log(
      `Firestore initialized with database: ${resolvedConfig.firestoreDatabaseId}`,
    );
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

const hasValidProjectId =
  !!resolvedConfig.projectId && !isPlaceholderValue(resolvedConfig.projectId);

if (typeof window !== "undefined" && hasValidProjectId) {
  void testConnection();
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
