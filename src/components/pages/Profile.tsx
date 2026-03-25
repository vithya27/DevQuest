'use client';

import React from 'react';
import { UserProfile } from '../../types';
import { motion } from 'framer-motion';
import { useUser } from '../../contexts/UserContext';
import { 
  Trophy, 
  Star, 
  Award, 
  BookOpen, 
  Zap, 
  Target,
  ChevronRight,
  Shield,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function Profile() {
  const { profile, loading: authLoading } = useUser();
  if (authLoading) return null;
  if (!profile) {
    return (
      <div className="py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center mx-auto border border-border">
          <Zap className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <h2 className="text-3xl font-bold">Sign in to track progress</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Join thousands of developers leveling up their skills and earning rewards.
        </p>
      </div>
    );
  }

  const level = Math.floor(profile.points / 100) + 1;
  const nextLevelXP = level * 100;
  const currentLevelXP = profile.points % 100;
  const progress = (currentLevelXP / 100) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Profile Header */}
      <section className="relative p-8 md:p-12 bg-card rounded-[2.5rem] border border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <img 
              src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
              alt={profile.displayName} 
              className="w-32 h-32 rounded-[2rem] border-4 border-border shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-zinc-950 font-bold text-xl border-4 border-background shadow-lg">
              {level}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-bold tracking-tight">{profile.displayName}</h1>
              {profile.role === 'admin' && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
            <p className="text-muted-foreground font-medium">{profile.email}</p>
            
            <div className="space-y-2 max-w-md">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-muted-foreground uppercase tracking-widest">Level {level} Progress</span>
                <span className="text-emerald-500 font-mono">{currentLevelXP} / 100 XP</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden border border-border/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <Link href="/leaderboard" className="p-6 bg-background/50 rounded-3xl border border-border text-center hover:border-emerald-500/50 transition-colors group">
              <Trophy className="w-6 h-6 text-emerald-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-bold font-mono">{profile.points}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total XP</div>
            </Link>
            <div className="p-6 bg-background/50 rounded-3xl border border-border text-center">
              <BookOpen className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-mono">{profile.completedArticles.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Quests</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-500" /> Achievements
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { title: 'First Quest', icon: Star, unlocked: profile.completedArticles.length > 0 },
              { title: 'XP Hunter', icon: Zap, unlocked: profile.points >= 100 },
              { title: 'Mastermind', icon: Target, unlocked: profile.points >= 500 },
              { title: 'Roadmap King', icon: Trophy, unlocked: profile.completedArticles.length >= 10 },
            ].map((badge, i) => (
              <div 
                key={i}
                className={`p-6 rounded-3xl border text-center space-y-3 transition-all ${
                  badge.unlocked 
                    ? 'bg-card border-emerald-500/30 text-foreground' 
                    : 'bg-card/30 border-border text-muted-foreground/50 grayscale opacity-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                  badge.unlocked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                }`}>
                  <badge.icon className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm">{badge.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Recent Quests</h2>
          <div className="space-y-4">
            {profile.completedArticles.length > 0 ? (
              profile.completedArticles.slice(-5).reverse().map((id, i) => (
                <div key={i} className="p-4 bg-card rounded-2xl border border-border flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="font-medium text-sm">Article Completed</span>
                  </div>
                  <Link href={`/article/${id}`} className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-card/30 border border-dashed border-border rounded-3xl">
                <p className="text-muted-foreground text-sm italic">No activity yet. Go start a quest!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
