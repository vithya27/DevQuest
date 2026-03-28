"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { Roadmap, UserProfile, Article } from "../../types";
import Link from "next/link";
import { motion } from "framer-motion";
import { useUser } from "../../contexts/UserContext";
import {
  ChevronRight,
  Map as MapIcon,
  BookOpen,
  Trophy,
  Star,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  const { profile } = useUser();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubRoadmaps = onSnapshot(
      query(collection(db, "roadmaps"), orderBy("order", "asc")),
      (snapshot) => {
        setRoadmaps(
          snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Roadmap,
          ),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "roadmaps");
      },
    );

    const unsubArticles = onSnapshot(
      collection(db, "articles"),
      (snapshot) => {
        setArticles(
          snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Article,
          ),
        );
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "articles");
      },
    );

    return () => {
      unsubRoadmaps();
      unsubArticles();
    };
  }, []);

  const getRoadmapStats = (roadmapId: string) => {
    const roadmapArticles = articles.filter((a) => a.roadmapId === roadmapId);
    const totalXP = roadmapArticles.reduce((acc, a) => acc + a.points, 0);
    return { count: roadmapArticles.length, xp: totalXP };
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden rounded-3xl bg-card border border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
        <div className="relative z-10 px-8 md:px-12 text-center md:text-left max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6"
          >
            <Star className="w-3 h-3" /> Gamified Learning
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
          >
            Master Software{" "}
            <span className="text-emerald-500">Development</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground mb-8 leading-relaxed"
          >
            Follow expert-curated roadmaps, complete interactive quizzes, and
            earn XP as you build your career in tech.
          </motion.p>
          {!profile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
              >
                Start Your Journey <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Roadmaps Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Learning Paths</h2>
            <p className="text-muted-foreground">
              Choose a roadmap to begin your quest
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-card rounded-3xl animate-pulse border border-border"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap, index) => {
              const stats = getRoadmapStats(roadmap.id);
              return (
                <motion.div
                  key={roadmap.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={`/roadmap/${roadmap.id}`}
                    className="group block h-full p-8 bg-card hover:bg-muted/50 border border-border hover:border-emerald-500/50 rounded-3xl transition-all hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 bg-muted border border-border rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-colors">
                      <MapIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-500 transition-colors">
                      {roadmap.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                      {roadmap.description}
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <BookOpen className="w-4 h-4" /> {stats.count} Quests
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                        <Trophy className="w-4 h-4" /> {stats.xp} XP
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {roadmaps.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl space-y-6">
                <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto">
                  <MapIcon className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">
                    No roadmaps available yet.
                  </p>
                  {profile?.role === "admin" ||
                  profile?.email === "vithyaa.shankarr@gmail.com" ? (
                    <div className="mt-6">
                      <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 bg-muted hover:bg-border text-emerald-500 px-6 py-3 rounded-xl font-bold transition-all"
                      >
                        <ShieldCheck className="w-5 h-5" /> Go to Admin Portal
                        to Seed Data
                      </Link>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Check back soon for new learning paths!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-card border border-border rounded-3xl">
          <div className="text-3xl font-bold text-emerald-500 mb-1">10k+</div>
          <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Active Quests
          </div>
        </div>
        <div className="p-8 bg-card border border-border rounded-3xl">
          <div className="text-3xl font-bold text-emerald-500 mb-1">500+</div>
          <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Articles
          </div>
        </div>
        <div className="p-8 bg-card border border-border rounded-3xl">
          <div className="text-3xl font-bold text-emerald-500 mb-1">1M+</div>
          <div className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            XP Earned
          </div>
        </div>
      </section>
    </div>
  );
}
