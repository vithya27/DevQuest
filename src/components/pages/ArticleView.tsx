'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Article, Quiz, UserProfile } from '../../types';
import { motion } from 'framer-motion';
import { useUser } from '../../contexts/UserContext';
import { 
  ChevronLeft, 
  BookOpen, 
  Trophy, 
  PlayCircle, 
  CheckCircle2,
  Clock,
  Share2
} from 'lucide-react';
import QuizModal from '../../components/QuizModal';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../contexts/ThemeContext';

export default function ArticleView() {
  const { profile } = useUser();
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const articleData = { id: docSnap.id, ...docSnap.data() } as Article;
          setArticle(articleData);

          // Fetch associated quiz
          const q = query(collection(db, 'quizzes'), where('articleId', '==', id));
          const quizSnap = await getDocs(q);
          if (!quizSnap.empty) {
            setQuiz({ id: quizSnap.docs[0].id, ...quizSnap.docs[0].data() } as Quiz);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'articles/' + id);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="py-20 text-center">Loading article...</div>;
  if (!article) return <div className="py-20 text-center">Article not found.</div>;

  const isCompleted = profile?.completedArticles.includes(article.id);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href={`/roadmap/${article.roadmapId}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Roadmap
        </Link>
        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <article className="space-y-12">
        <header className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-wider">
              Article
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Clock className="w-4 h-4" /> 15 min read
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border w-fit">
            <div className="flex items-center gap-2 text-emerald-500 font-mono font-bold">
              <Trophy className="w-5 h-5" /> {article.points} XP Reward
            </div>
            {isCompleted && (
              <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </div>
            )}
          </div>
        </header>

        <div className="prose prose-emerald max-w-none">
          <div className="markdown-body text-foreground/90 text-lg leading-relaxed space-y-6">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={theme === 'dark' ? atomDark : prism}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>
        </div>

        <section className="pt-12 border-t border-border">
          <div className="bg-card p-8 md:p-12 rounded-[2rem] border border-border text-center space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold">Ready for the Quiz?</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Test your knowledge and earn {article.points} XP to level up your profile.
              </p>
              <div className="pt-6">
                {quiz ? (
                  <button
                    onClick={() => setShowQuiz(true)}
                    className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-10 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
                  >
                    <PlayCircle className="w-6 h-6" /> Start Knowledge Check
                  </button>
                ) : (
                  <p className="text-muted-foreground italic">No quiz available for this article yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </article>

      {showQuiz && quiz && (
        <QuizModal
          quiz={quiz}
          articleId={article.id}
          points={article.points}
          profile={profile}
          onClose={() => setShowQuiz(false)}
          onComplete={() => {
            // Success handled in modal
          }}
        />
      )}
    </div>
  );
}
