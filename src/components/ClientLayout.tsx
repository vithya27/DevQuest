"use client";

import React, { useEffect, useState, Component } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import {
  auth,
  db,
  signInWithGoogle,
  logout,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { UserProfile } from "../types";
import {
  Trophy,
  BookOpen,
  ShieldCheck,
  LogOut,
  LogIn,
  LayoutDashboard,
  ChevronRight,
  Menu,
  X,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { UserProvider, useUser } from "../contexts/UserContext";

// Error Boundary Component
type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends Component<any, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse((error as Error | null)?.message || "{}");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = (error as Error | null)?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold">Application Error</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-emerald-500/30 transition-colors duration-300">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 text-zinc-950" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  DevQuest
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/leaderboard"
                  className={`text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-2 ${pathname === "/leaderboard" ? "text-emerald-500" : ""}`}
                >
                  <Trophy className="w-4 h-4" /> Leaderboard
                </Link>
                {(profile?.role === "admin" ||
                  ["vithyaa.shankarr@gmail.com", "jeffsy00@gmail.com"].includes(
                    profile?.email || "",
                  )) && (
                  <Link
                    href="/admin"
                    className={`text-muted-foreground hover:text-emerald-500 transition-colors flex items-center gap-2 ${pathname === "/admin" ? "text-emerald-500" : ""}`}
                  >
                    <ShieldCheck className="w-4 h-4" /> Admin
                  </Link>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-emerald-500 transition-all active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>

              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border border-border">
                    <Trophy className="w-4 h-4 text-emerald-500" />
                    <span className="font-mono text-sm font-bold text-emerald-500">
                      {profile?.points || 0} XP
                    </span>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 group"
                  >
                    <div className="text-right">
                      <p className="text-sm font-medium leading-none">
                        {profile?.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Level {Math.floor((profile?.points || 0) / 100) + 1}
                      </p>
                    </div>
                    <img
                      src={
                        profile?.photoURL ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
                      }
                      alt="Profile"
                      className="w-10 h-10 rounded-xl border border-border group-hover:border-emerald-500 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2 rounded-xl font-bold transition-all active:scale-95"
                >
                  <LogIn className="w-5 h-5" /> Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:flex items-center gap-2 md:hidden">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-emerald-500 transition-all"
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-muted-foreground hover:text-emerald-500"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                <Link
                  href="/leaderboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-lg font-medium text-muted-foreground hover:text-emerald-500"
                >
                  Leaderboard
                </Link>
                {(profile?.role === "admin" ||
                  ["vithyaa.shankarr@gmail.com", "jeffsy00@gmail.com"].includes(
                    profile?.email || "",
                  )) && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-lg font-medium text-muted-foreground hover:text-emerald-500"
                  >
                    Admin Portal
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-lg font-medium text-muted-foreground hover:text-emerald-500"
                >
                  Profile
                </Link>
                <div className="pt-4 border-t border-border">
                  {user ? (
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-card text-muted-foreground py-3 rounded-xl font-bold"
                    >
                      <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-zinc-950 py-3 rounded-xl font-bold"
                    >
                      <LogIn className="w-5 h-5" /> Sign In with Google
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Trophy className="w-5 h-5" />
            <span className="font-bold tracking-widest text-xs uppercase">
              DevQuest 2026
            </span>
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Level up your developer skills with interactive roadmaps and
            real-world challenges.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <AppContent>{children}</AppContent>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
