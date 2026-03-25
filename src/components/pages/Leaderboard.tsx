'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { UserProfile } from '../../types';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Star, Zap } from 'lucide-react';

const getRankTitle = (points: number) => {
  if (points >= 5000) return 'Legend';
  if (points >= 2500) return 'Grand Master';
  if (points >= 1000) return 'Master';
  if (points >= 500) return 'Expert';
  if (points >= 250) return 'Adept';
  if (points >= 100) return 'Apprentice';
  return 'Novice';
};

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setTopUsers(users);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold uppercase tracking-widest">
          <Trophy className="w-4 h-4" /> Global Leaderboard
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Hall of Fame</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          The top developers leveling up their skills and mastering the roadmaps.
        </p>
      </header>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
        {topUsers.length >= 2 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="order-2 md:order-1 bg-card border border-border p-8 rounded-[2.5rem] text-center space-y-4 relative"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-zinc-400 rounded-2xl flex items-center justify-center shadow-lg border-4 border-background">
              <Medal className="w-6 h-6 text-zinc-950" />
            </div>
            <img 
              src={topUsers[1].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topUsers[1].uid}`}
              alt={topUsers[1].displayName}
              className="w-20 h-20 rounded-2xl mx-auto border-4 border-border"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-xl truncate">{topUsers[1].displayName}</h3>
              <p className="text-emerald-500 font-mono font-bold">{topUsers[1].points} XP</p>
            </div>
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{getRankTitle(topUsers[1].points)}</div>
          </motion.div>
        )}

        {topUsers.length >= 1 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="order-1 md:order-2 bg-card border-2 border-emerald-500/50 p-10 rounded-[3rem] text-center space-y-6 relative shadow-2xl shadow-emerald-500/10 scale-105 md:scale-110 z-10"
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl border-4 border-background">
              <Crown className="w-8 h-8 text-zinc-950" />
            </div>
            <img 
              src={topUsers[0].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topUsers[0].uid}`}
              alt={topUsers[0].displayName}
              className="w-24 h-24 rounded-3xl mx-auto border-4 border-emerald-500/20"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-2xl truncate">{topUsers[0].displayName}</h3>
              <p className="text-emerald-500 text-xl font-mono font-bold">{topUsers[0].points} XP</p>
            </div>
            <div className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">{getRankTitle(topUsers[0].points)}</div>
          </motion.div>
        )}

        {topUsers.length >= 3 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="order-3 bg-card border border-border p-8 rounded-[2.5rem] text-center space-y-4 relative"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-700 rounded-2xl flex items-center justify-center shadow-lg border-4 border-background">
              <Medal className="w-6 h-6 text-zinc-950" />
            </div>
            <img 
              src={topUsers[2].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topUsers[2].uid}`}
              alt={topUsers[2].displayName}
              className="w-20 h-20 rounded-2xl mx-auto border-4 border-border"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-bold text-xl truncate">{topUsers[2].displayName}</h3>
              <p className="text-emerald-500 font-mono font-bold">{topUsers[2].points} XP</p>
            </div>
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{getRankTitle(topUsers[2].points)}</div>
          </motion.div>
        )}
      </div>

      {/* List View */}
      <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-border bg-card/50 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-500" /> Rankings
          </h2>
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Top 20 Developers</span>
        </div>
        <div className="divide-y divide-border">
          {topUsers.slice(3).map((user, index) => (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 text-center font-mono font-bold text-muted-foreground">
                  {index + 4}
                </div>
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-xl border border-border"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-sm">{user.displayName}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{getRankTitle(user.points)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-500 font-mono font-bold">
                <Zap className="w-4 h-4" /> {user.points}
              </div>
            </motion.div>
          ))}
          {topUsers.length > 0 && topUsers.length <= 3 && (
            <div className="p-12 text-center text-muted-foreground italic">
              All top developers are featured on the podium above!
            </div>
          )}
          {topUsers.length === 0 && (
            <div className="p-12 text-center text-muted-foreground italic">
              No users found yet. Be the first to join!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
