"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile } from "../types";

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "Developer",
              photoURL: firebaseUser.photoURL || "",
              points: 0,
              role: "user",
              completedArticles: [],
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            // Listen for real-time updates to profile
            onSnapshot(
              userRef,
              (doc) => {
                setProfile(doc.data() as UserProfile);
              },
              (error) => {
                handleFirestoreError(
                  error,
                  OperationType.GET,
                  "users/" + firebaseUser.uid,
                );
              },
            );
          }
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.GET,
            "users/" + firebaseUser.uid,
          );
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, profile, loading }}>
      {children}
    </UserContext.Provider>
  );
};
