"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { Roadmap, Article, Quiz, UserProfile } from "../../types";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "../../contexts/UserContext";
import {
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  LayoutDashboard,
  Map,
  BookOpen,
  HelpCircle,
  Save,
  X,
  AlertCircle,
  Database,
} from "lucide-react";

export default function AdminPortal() {
  const { profile, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<
    "roadmaps" | "articles" | "quizzes"
  >("roadmaps");
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  // Form States
  const [roadmapForm, setRoadmapForm] = useState({
    title: "",
    description: "",
    icon: "Map",
    order: 0,
  });
  const [articleForm, setArticleForm] = useState({
    roadmapId: "",
    title: "",
    content: "",
    points: 50,
    order: 0,
    level: 1,
  });
  const [quizForm, setQuizForm] = useState({
    articleId: "",
    questions: [{ question: "", options: ["", "", "", ""], correctAnswer: 0 }],
  });

  useEffect(() => {
    if (!isAdmin) return;

    const unsubRoadmaps = onSnapshot(
      query(collection(db, "roadmaps"), orderBy("order", "asc")),
      (snap) => {
        setRoadmaps(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Roadmap),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "roadmaps");
      },
    );

    const unsubArticles = onSnapshot(
      query(collection(db, "articles"), orderBy("order", "asc")),
      (snap) => {
        setArticles(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Article),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "articles");
      },
    );

    const unsubQuizzes = onSnapshot(
      collection(db, "quizzes"),
      (snap) => {
        setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quiz));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "quizzes");
      },
    );

    setLoading(false);
    return () => {
      unsubRoadmaps();
      unsubArticles();
      unsubQuizzes();
    };
  }, [profile, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">
          You must be an administrator to access this portal.
        </p>
      </div>
    );
  }

  const handleAddRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await setDoc(doc(db, "roadmaps", editingId), roadmapForm);
      } else {
        await addDoc(collection(db, "roadmaps"), roadmapForm);
      }
      setRoadmapForm({
        title: "",
        description: "",
        icon: "Map",
        order: roadmaps.length,
      });
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "roadmaps");
    }
  };

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await setDoc(doc(db, "articles", editingId), articleForm);
      } else {
        await addDoc(collection(db, "articles"), articleForm);
      }
      setArticleForm({
        roadmapId: "",
        title: "",
        content: "",
        points: 50,
        order: articles.length,
        level: 1,
      });
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "articles");
    }
  };

  const seedData = async () => {
    setIsSeeding(true);
    try {
      const roadmapsData = [
        {
          title: "React Mastery",
          description:
            "Master the most popular frontend library from basics to advanced patterns.",
          icon: "Atom",
          order: 1,
          articles: [
            {
              title: "Introduction to React",
              content:
                "# Welcome to React\nReact is a declarative, efficient, and flexible JavaScript library for building user interfaces.\n\nHere is a simple component:\n\n```jsx\nfunction Welcome() {\n  return <h1>Hello, World!</h1>;\n}\n```",
              points: 50,
              order: 1,
              level: 1,
              quiz: {
                questions: [
                  {
                    question:
                      "What is the correct way to define a component in React?\n\n```jsx\nfunction MyComp() { ... }\n```",
                    options: [
                      "Function component",
                      "Class component",
                      "Object component",
                      "Array component",
                    ],
                    correctAnswer: 0,
                  },
                  {
                    question: "Who developed React?",
                    options: [
                      "Google",
                      "Meta (Facebook)",
                      "Microsoft",
                      "Apple",
                    ],
                    correctAnswer: 1,
                  },
                ],
              },
            },
            {
              title: "JSX and Components",
              content:
                '# JSX & Components\nComponents are the building blocks of React applications.\n\nExample of JSX:\n\n```jsx\nconst element = <h1 className="greeting">Hello!</h1>;\n```',
              points: 100,
              order: 2,
              level: 1,
              quiz: {
                questions: [
                  {
                    question: "What does JSX stand for?",
                    options: [
                      "JavaScript XML",
                      "Java Syntax Extension",
                      "JSON X-platform",
                      "JavaScript X-ray",
                    ],
                    correctAnswer: 0,
                  },
                ],
              },
            },
          ],
        },
        {
          title: "TypeScript Essentials",
          description:
            "Learn how to write type-safe JavaScript and scale your applications.",
          icon: "Code",
          order: 2,
          articles: [
            {
              title: "Basic Types",
              content:
                "# Basic Types\nLearn about string, number, boolean, and arrays.",
              points: 50,
              order: 1,
              level: 1,
              quiz: {
                questions: [
                  {
                    question: "Which is NOT a basic TS type?",
                    options: ["string", "number", "float", "boolean"],
                    correctAnswer: 2,
                  },
                ],
              },
            },
          ],
        },
        {
          title: "Backend Engineering",
          description:
            "Explore server-side development, APIs, and database management.",
          icon: "Server",
          order: 3,
          articles: [
            {
              title: "Node.js Basics",
              content: "# Node.js\nJavaScript on the server.",
              points: 50,
              order: 1,
              level: 1,
              quiz: {
                questions: [
                  {
                    question: "What engine does Node.js use?",
                    options: ["V8", "SpiderMonkey", "Chakra", "Nitro"],
                    correctAnswer: 0,
                  },
                ],
              },
            },
          ],
        },
      ];

      for (const r of roadmapsData) {
        const { articles: roadmapArticles, ...roadmapInfo } = r;
        const rDoc = await addDoc(collection(db, "roadmaps"), roadmapInfo);

        if (roadmapArticles) {
          for (const a of roadmapArticles) {
            const { quiz, ...articleInfo } = a;
            const aDoc = await addDoc(collection(db, "articles"), {
              ...articleInfo,
              roadmapId: rDoc.id,
            });

            if (quiz) {
              await addDoc(collection(db, "quizzes"), {
                ...quiz,
                articleId: aDoc.id,
              });
            }
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "seed");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await setDoc(doc(db, "quizzes", editingId), quizForm);
      } else {
        await addDoc(collection(db, "quizzes"), quizForm);
      }
      setQuizForm({
        articleId: "",
        questions: [
          { question: "", options: ["", "", "", ""], correctAnswer: 0 },
        ],
      });
      setIsAdding(false);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "quizzes");
    }
  };

  const startEdit = (type: "roadmaps" | "articles" | "quizzes", item: any) => {
    setEditingId(item.id);
    if (type === "roadmaps") {
      setRoadmapForm({
        title: item.title,
        description: item.description,
        icon: item.icon,
        order: item.order,
      });
    } else if (type === "articles") {
      setArticleForm({
        roadmapId: item.roadmapId,
        title: item.title,
        content: item.content,
        points: item.points,
        order: item.order,
        level: item.level,
      });
    } else if (type === "quizzes") {
      setQuizForm({ articleId: item.articleId, questions: item.questions });
    }
    setActiveTab(type);
    setIsAdding(true);
  };

  const deleteItem = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-muted-foreground">
            Manage learning content and roadmaps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={seedData}
            disabled={isSeeding}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <Database className="w-5 h-5" />{" "}
            {isSeeding ? "Seeding..." : "Seed Data"}
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Add New {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border w-fit">
        {(["roadmaps", "articles", "quizzes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all capitalize ${
              activeTab === tab
                ? "bg-muted text-emerald-500 shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Lists */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border bg-card/50">
          <h2 className="font-bold flex items-center gap-2 capitalize">
            {activeTab === "roadmaps" && (
              <Map className="w-5 h-5 text-emerald-500" />
            )}
            {activeTab === "articles" && (
              <BookOpen className="w-5 h-5 text-emerald-500" />
            )}
            {activeTab === "quizzes" && (
              <HelpCircle className="w-5 h-5 text-emerald-500" />
            )}
            Manage {activeTab}
          </h2>
        </div>

        <div className="divide-y divide-border">
          {activeTab === "roadmaps" &&
            (roadmaps.length > 0 ? (
              roadmaps.map((r) => (
                <div
                  key={r.id}
                  className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-emerald-500">
                      <Map className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">{r.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {r.description.slice(0, 60)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit("roadmaps", r)}
                      className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteItem("roadmaps", r.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">
                No roadmaps found. Click "Seed Data" or "Add New" to get
                started.
              </div>
            ))}

          {activeTab === "articles" &&
            (articles.length > 0 ? (
              articles.map((a) => (
                <div
                  key={a.id}
                  className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-emerald-500">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">{a.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Roadmap:{" "}
                        {roadmaps.find((r) => r.id === a.roadmapId)?.title ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit("articles", a)}
                      className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteItem("articles", a.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">
                No articles found.
              </div>
            ))}

          {activeTab === "quizzes" &&
            (quizzes.length > 0 ? (
              quizzes.map((q) => (
                <div
                  key={q.id}
                  className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-emerald-500">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">
                        Quiz for{" "}
                        {articles.find((a) => a.id === q.articleId)?.title ||
                          "Unknown Article"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {q.questions.length} Questions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit("quizzes", q)}
                      className="p-2 text-muted-foreground hover:text-emerald-500 transition-colors"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteItem("quizzes", q.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">
                No quizzes found.
              </div>
            ))}
        </div>
      </div>

      {/* Add Modals */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-xl capitalize">
                  {editingId ? "Edit" : "Add New"} {activeTab.slice(0, -1)}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto">
                {activeTab === "roadmaps" && (
                  <form onSubmit={handleAddRoadmap} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Title
                      </label>
                      <input
                        required
                        value={roadmapForm.title}
                        onChange={(e) =>
                          setRoadmapForm({
                            ...roadmapForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="e.g. React Mastery"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Description
                      </label>
                      <textarea
                        required
                        value={roadmapForm.description}
                        onChange={(e) =>
                          setRoadmapForm({
                            ...roadmapForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors min-h-[100px]"
                        placeholder="Describe the learning path..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Order
                        </label>
                        <input
                          type="number"
                          value={roadmapForm.order}
                          onChange={(e) =>
                            setRoadmapForm({
                              ...roadmapForm,
                              order: parseInt(e.target.value),
                            })
                          }
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />{" "}
                      {editingId ? "Update" : "Save"} Roadmap
                    </button>
                  </form>
                )}

                {activeTab === "articles" && (
                  <form onSubmit={handleAddArticle} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Roadmap
                      </label>
                      <select
                        required
                        value={articleForm.roadmapId}
                        onChange={(e) =>
                          setArticleForm({
                            ...articleForm,
                            roadmapId: e.target.value,
                          })
                        }
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="">Select a Roadmap</option>
                        {roadmaps.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Title
                      </label>
                      <input
                        required
                        value={articleForm.title}
                        onChange={(e) =>
                          setArticleForm({
                            ...articleForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="e.g. Introduction to Hooks"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Content
                        </label>
                        <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">
                          Markdown Supported
                        </span>
                      </div>
                      <textarea
                        required
                        value={articleForm.content}
                        onChange={(e) =>
                          setArticleForm({
                            ...articleForm,
                            content: e.target.value,
                          })
                        }
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors min-h-[200px] font-mono text-sm"
                        placeholder="Write your article content here... Use ```lang for code blocks."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Points (XP)
                        </label>
                        <input
                          type="number"
                          value={articleForm.points}
                          onChange={(e) =>
                            setArticleForm({
                              ...articleForm,
                              points: parseInt(e.target.value),
                            })
                          }
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Level
                        </label>
                        <input
                          type="number"
                          value={articleForm.level}
                          onChange={(e) =>
                            setArticleForm({
                              ...articleForm,
                              level: parseInt(e.target.value),
                            })
                          }
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Order
                        </label>
                        <input
                          type="number"
                          value={articleForm.order}
                          onChange={(e) =>
                            setArticleForm({
                              ...articleForm,
                              order: parseInt(e.target.value),
                            })
                          }
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />{" "}
                      {editingId ? "Update" : "Save"} Article
                    </button>
                  </form>
                )}

                {activeTab === "quizzes" && (
                  <form onSubmit={handleAddQuiz} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Article
                      </label>
                      <select
                        required
                        value={quizForm.articleId}
                        onChange={(e) =>
                          setQuizForm({
                            ...quizForm,
                            articleId: e.target.value,
                          })
                        }
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="">Select an Article</option>
                        {articles.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-8 border-t border-border pt-6">
                      {quizForm.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="space-y-4 p-4 bg-muted/50 rounded-2xl border border-border relative group"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-emerald-500">
                              Question {qIdx + 1}
                            </h4>
                            {quizForm.questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const qs = [...quizForm.questions];
                                  qs.splice(qIdx, 1);
                                  setQuizForm({ ...quizForm, questions: qs });
                                }}
                                className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Question Text
                              </label>
                              <span className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest">
                                Markdown Supported
                              </span>
                            </div>
                            <textarea
                              required
                              value={q.question}
                              onChange={(e) => {
                                const qs = [...quizForm.questions];
                                qs[qIdx].question = e.target.value;
                                setQuizForm({ ...quizForm, questions: qs });
                              }}
                              className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors min-h-[80px] font-mono text-sm"
                              placeholder="e.g. What is the output of `console.log(typeof [])`?"
                            />
                          </div>
                          <div className="grid gap-3">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-3"
                              >
                                <input
                                  type="radio"
                                  name={`correct-${qIdx}`}
                                  checked={q.correctAnswer === optIdx}
                                  onChange={() => {
                                    const qs = [...quizForm.questions];
                                    qs[qIdx].correctAnswer = optIdx;
                                    setQuizForm({ ...quizForm, questions: qs });
                                  }}
                                  className="w-5 h-5 accent-emerald-500"
                                />
                                <input
                                  required
                                  value={opt}
                                  onChange={(e) => {
                                    const qs = [...quizForm.questions];
                                    qs[qIdx].options[optIdx] = e.target.value;
                                    setQuizForm({ ...quizForm, questions: qs });
                                  }}
                                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                                  placeholder={`Option ${optIdx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setQuizForm({
                          ...quizForm,
                          questions: [
                            ...quizForm.questions,
                            {
                              question: "",
                              options: ["", "", "", ""],
                              correctAnswer: 0,
                            },
                          ],
                        })
                      }
                      className="w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Add Another Question
                    </button>

                    <button
                      type="submit"
                      className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />{" "}
                      {editingId ? "Update" : "Save"} Quiz
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
