import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Trophy, Star, ArrowRight } from 'lucide-react';
import { Quiz, UserProfile } from '../types';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/ThemeContext';

interface QuizModalProps {
  quiz: Quiz;
  articleId: string;
  points: number;
  profile: UserProfile | null;
  onClose: () => void;
  onComplete: () => void;
}

export default function QuizModal({ quiz, articleId, points, profile, onClose, onComplete }: QuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const { theme } = useTheme();

  const handleAnswer = () => {
    if (selectedOption === null) return;

    const correct = selectedOption === quiz.questions[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(c => c + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setIsFinished(true);
        handleCompletion();
      }
    }, 1500);
  };

  const handleCompletion = async () => {
    if (!profile) return;
    
    const isAlreadyCompleted = profile.completedArticles.includes(articleId);
    if (!isAlreadyCompleted) {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        completedArticles: arrayUnion(articleId),
        points: increment(points)
      });
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold">Knowledge Check</h3>
              <p className="text-xs text-muted-foreground">Question {currentQuestion + 1} of {quiz.questions.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!isFinished ? (
              <motion.div 
                key={currentQuestion}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="markdown-body text-2xl font-bold leading-tight">
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
                    {quiz.questions[currentQuestion].question}
                  </ReactMarkdown>
                </div>

                <div className="grid gap-3">
                  {quiz.questions[currentQuestion].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => !isCorrect && setSelectedOption(idx)}
                      className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        selectedOption === idx 
                          ? isCorrect === true ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                          : isCorrect === false ? 'bg-red-500/10 border-red-500 text-red-500'
                          : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                          : 'bg-muted/50 border-border hover:border-muted-foreground/30 text-muted-foreground'
                      }`}
                    >
                      <span className="font-medium">{option}</span>
                      {selectedOption === idx && (
                        isCorrect === true ? <CheckCircle2 className="w-5 h-5" /> :
                        isCorrect === false ? <AlertCircle className="w-5 h-5" /> :
                        <div className="w-5 h-5 rounded-full border-2 border-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  disabled={selectedOption === null || isCorrect !== null}
                  onClick={handleAnswer}
                  className="w-full py-4 bg-emerald-500 disabled:bg-muted disabled:text-muted-foreground text-zinc-950 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Confirm Answer <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                  <Trophy className="w-12 h-12 text-zinc-950" />
                </div>
                <div>
                  <h4 className="text-3xl font-bold mb-2">Quest Complete!</h4>
                  <p className="text-muted-foreground">You've mastered this topic and earned</p>
                  <div className="text-4xl font-mono font-bold text-emerald-500 mt-2">+{points} XP</div>
                </div>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-colors"
                >
                  Continue Journey
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
