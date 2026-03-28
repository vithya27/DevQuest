"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { Roadmap, Article, UserProfile } from "../../types";
import { motion } from "framer-motion";
import { useUser } from "../../contexts/UserContext";
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  Lock,
  PlayCircle,
  Trophy,
  Clock,
} from "lucide-react";

export default function RoadmapView() {
  const { profile, loading: authLoading } = useUser();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || profile || !id) return;
    router.replace(`/profile?redirect=${encodeURIComponent(`/roadmap/${id}`)}`);
  }, [authLoading, profile, id, router]);

  useEffect(() => {
    if (!id || authLoading || !profile) return;

    const fetchRoadmap = async () => {
      try {
        const docRef = doc(db, "roadmaps", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRoadmap({ id: docSnap.id, ...docSnap.data() } as Roadmap);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "roadmaps/" + id);
      }
    };

    const q = query(
      collection(db, "articles"),
      where("roadmapId", "==", id),
      orderBy("order", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Article,
        );
        setArticles(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "articles");
      },
    );

    fetchRoadmap();
    return () => unsubscribe();
  }, [id, authLoading, profile]);

  if (authLoading || !profile) {
    return <div className="py-20 text-center">Redirecting to sign in...</div>;
  }

  if (loading) return <div className="py-20 text-center">Loading quest...</div>;
  if (!roadmap)
    return <div className="py-20 text-center">Roadmap not found.</div>;

  const groupedArticles = articles.reduce(
    (acc, article) => {
      const level = article.level || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(article);
      return acc;
    },
    {} as Record<number, Article[]>,
  );

  const levels = Object.keys(groupedArticles)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Roadmaps
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{roadmap.title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {roadmap.description}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border">
          <div className="text-center px-4 border-r border-border">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">
              Progress
            </p>
            <p className="text-xl font-mono font-bold text-emerald-500">
              {
                articles.filter((a) =>
                  profile?.completedArticles.includes(a.id),
                ).length
              }{" "}
              / {articles.length}
            </p>
          </div>
          <div className="text-center px-4">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">
              Total XP
            </p>
            <p className="text-xl font-mono font-bold text-emerald-500">
              {articles.reduce((acc, a) => acc + a.points, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {levels.map((level) => (
          <div key={level} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] px-4 py-1 bg-card border border-border rounded-full">
                Level {level}
              </h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="relative space-y-4">
              {/* Connection Line */}
              <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-border hidden md:block" />

              {groupedArticles[level].map((article, index) => {
                const globalIndex = articles.findIndex(
                  (a) => a.id === article.id,
                );
                const isCompleted = profile?.completedArticles.includes(
                  article.id,
                );
                const isLocked =
                  globalIndex > 0 &&
                  !profile?.completedArticles.includes(
                    articles[globalIndex - 1].id,
                  ) &&
                  profile?.role !== "admin";

                return (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: globalIndex * 0.05 }}
                    className="relative pl-0 md:pl-16"
                  >
                    {/* Timeline Node */}
                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl border-4 border-background flex items-center justify-center z-10 hidden md:flex transition-colors ${
                        isCompleted
                          ? "bg-emerald-500 text-zinc-950"
                          : isLocked
                            ? "bg-card text-muted-foreground/30"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : isLocked ? (
                        <Lock className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </div>

                    <Link
                      href={isLocked ? "#" : `/article/${article.id}`}
                      className={`group block p-6 rounded-3xl border transition-all ${
                        isLocked
                          ? "bg-card/50 border-border opacity-60 cursor-not-allowed"
                          : "bg-card border-border hover:border-emerald-500/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                              Quest {globalIndex + 1}
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                                Completed
                              </span>
                            )}
                          </div>
                          <h3
                            className={`text-xl font-bold ${isLocked ? "text-muted-foreground/40" : "group-hover:text-emerald-500"} transition-colors`}
                          >
                            {article.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="hidden sm:flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-emerald-500 font-mono font-bold">
                              <Trophy className="w-4 h-4" /> {article.points} XP
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Clock className="w-3 h-3" /> 15 min
                            </div>
                          </div>
                          {!isLocked && (
                            <PlayCircle className="w-8 h-8 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" />
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {articles.length === 0 && (
          <div className="py-20 text-center bg-card rounded-3xl border border-border">
            <p className="text-muted-foreground">
              This roadmap is currently under construction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
