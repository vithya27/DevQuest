"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
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
import RoadmapIcon, { AVAILABLE_ROADMAP_ICONS } from "../RoadmapIcon";
import {
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  Copy,
  Check,
  Map,
  BookOpen,
  HelpCircle,
  Save,
  X,
  AlertCircle,
  Upload,
} from "lucide-react";

type ImportedQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type ImportedArticle = {
  title: string;
  content: string;
  points: number;
  order: number;
  level?: number;
  quiz?: {
    questions: ImportedQuizQuestion[];
  };
};

type ImportedRoadmap = {
  title: string;
  description: string;
  icon?: string;
  order: number;
  articles?: ImportedArticle[];
};

const SAMPLE_IMPORT_JSON = {
  roadmaps: [
    {
      title: "React Mastery",
      description: "Master React from fundamentals to advanced patterns.",
      icon: "FaReact",
      order: 1,
      articles: [
        {
          title: "Introduction to React",
          content:
            "# Welcome to React\n\nBuild UIs with **components**.\n\n## Why React?\n\n- Declarative syntax\n- Component-based architecture\n- Huge ecosystem\n\n```jsx\nfunction Hello() {\n  return <h1>Hello, world!</h1>;\n}\n```\n\n> Markdown is fully supported in article content.",
          points: 50,
          order: 1,
          level: 1,
          quiz: {
            questions: [
              {
                question: "Who maintains React?",
                options: ["Google", "Meta", "Microsoft", "Apple"],
                correctAnswer: 1,
              },
            ],
          },
        },
      ],
    },
  ],
};

const SAMPLE_IMPORT_JSON_TEXT = JSON.stringify(SAMPLE_IMPORT_JSON, null, 2);

const normalizeTitle = (value: string) => value.trim().toLowerCase();

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseImportRoadmaps = (input: unknown): ImportedRoadmap[] => {
  const source = Array.isArray(input)
    ? input
    : isObject(input) && Array.isArray(input.roadmaps)
      ? input.roadmaps
      : null;

  if (!source) {
    throw new Error(
      "Invalid JSON format. Use either an array of roadmaps or an object with a 'roadmaps' array.",
    );
  }

  return source.map((entry, roadmapIndex) => {
    if (!isObject(entry)) {
      throw new Error(`Roadmap at index ${roadmapIndex} is not an object.`);
    }

    const title = String(entry.title || "").trim();
    const description = String(entry.description || "").trim();
    const icon = String(entry.icon || "Map").trim();
    const order = Number(entry.order ?? roadmapIndex + 1);

    if (!title) {
      throw new Error(`Roadmap at index ${roadmapIndex} is missing 'title'.`);
    }

    if (!description) {
      throw new Error(`Roadmap '${title}' is missing 'description'.`);
    }

    const rawArticles = Array.isArray(entry.articles) ? entry.articles : [];
    const articles: ImportedArticle[] = rawArticles.map(
      (article, articleIdx) => {
        if (!isObject(article)) {
          throw new Error(
            `Article at index ${articleIdx} in roadmap '${title}' is not an object.`,
          );
        }

        const articleTitle = String(article.title || "").trim();
        const content = String(article.content || "").trim();
        const points = Number(article.points ?? 50);
        const articleOrder = Number(article.order ?? articleIdx + 1);
        const level = Number(article.level ?? 1);

        if (!articleTitle) {
          throw new Error(
            `Article at index ${articleIdx} in roadmap '${title}' is missing 'title'.`,
          );
        }

        if (!content) {
          throw new Error(
            `Article '${articleTitle}' in roadmap '${title}' is missing 'content'.`,
          );
        }

        const quiz =
          isObject(article.quiz) && Array.isArray(article.quiz.questions)
            ? {
                questions: article.quiz.questions.map(
                  (question, questionIdx) => {
                    if (!isObject(question)) {
                      throw new Error(
                        `Quiz question ${questionIdx + 1} in article '${articleTitle}' is invalid.`,
                      );
                    }

                    return {
                      question: String(question.question || "").trim(),
                      options: Array.isArray(question.options)
                        ? question.options.map((opt) => String(opt))
                        : ["", "", "", ""],
                      correctAnswer: Number(question.correctAnswer ?? 0),
                    } as ImportedQuizQuestion;
                  },
                ),
              }
            : undefined;

        return {
          title: articleTitle,
          content,
          points,
          order: articleOrder,
          level,
          quiz,
        };
      },
    );

    return {
      title,
      description,
      icon,
      order,
      articles,
    };
  });
};

export default function AdminPortal() {
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<
    "roadmaps" | "articles" | "quizzes"
  >("roadmaps");
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importRoadmaps, setImportRoadmaps] = useState<
    ImportedRoadmap[] | null
  >(null);
  const [importFileName, setImportFileName] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [duplicateRoadmapTitles, setDuplicateRoadmapTitles] = useState<
    string[]
  >([]);
  const [allowExistingRoadmapImport, setAllowExistingRoadmapImport] =
    useState(false);
  const [isSampleCopied, setIsSampleCopied] = useState(false);
  const [isIconMenuOpen, setIsIconMenuOpen] = useState(false);
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

  const resetImportState = () => {
    setImportRoadmaps(null);
    setImportFileName("");
    setImportStatus(null);
    setImportError(null);
    setDuplicateRoadmapTitles([]);
    setAllowExistingRoadmapImport(false);
    setIsSampleCopied(false);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    resetImportState();
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    setImportStatus(null);
    setImportError(null);

    if (!file) {
      setImportRoadmaps(null);
      setImportFileName("");
      setDuplicateRoadmapTitles([]);
      setAllowExistingRoadmapImport(false);
      return;
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      const imported = parseImportRoadmaps(parsed);

      const existingTitles = new Set(
        roadmaps.map((r) => normalizeTitle(r.title)),
      );
      const duplicates = imported
        .filter((r) => existingTitles.has(normalizeTitle(r.title)))
        .map((r) => r.title);

      setImportRoadmaps(imported);
      setImportFileName(file.name);
      setDuplicateRoadmapTitles(duplicates);
      setAllowExistingRoadmapImport(false);
      setImportStatus(
        `Loaded ${imported.length} roadmap${imported.length === 1 ? "" : "s"} from ${file.name}.`,
      );
    } catch (error) {
      setImportRoadmaps(null);
      setImportFileName(file.name);
      setDuplicateRoadmapTitles([]);
      setAllowExistingRoadmapImport(false);
      setImportError(
        error instanceof Error ? error.message : "Failed to parse import file.",
      );
    }
  };

  const handleImportData = async () => {
    if (!importRoadmaps || importRoadmaps.length === 0) {
      setImportError("Select a valid JSON file before importing.");
      return;
    }

    if (duplicateRoadmapTitles.length > 0 && !allowExistingRoadmapImport) {
      setImportError(
        "Some roadmap titles already exist. Confirm that you want to append content to existing roadmaps.",
      );
      return;
    }

    setImportError(null);
    setImportStatus(null);
    setIsImporting(true);

    try {
      const roadmapLookup = new globalThis.Map(
        roadmaps.map((r) => [normalizeTitle(r.title), r]),
      );

      let createdRoadmaps = 0;
      let reusedRoadmaps = 0;
      let createdArticles = 0;
      let createdQuizzes = 0;

      for (const roadmap of importRoadmaps) {
        const roadmapTitleKey = normalizeTitle(roadmap.title);
        const existingRoadmap = roadmapLookup.get(roadmapTitleKey);

        let roadmapId = existingRoadmap?.id;

        if (!roadmapId) {
          const roadmapDoc = await addDoc(collection(db, "roadmaps"), {
            title: roadmap.title,
            description: roadmap.description,
            icon: roadmap.icon || "Map",
            order: roadmap.order,
          });

          roadmapId = roadmapDoc.id;
          createdRoadmaps += 1;
        } else {
          reusedRoadmaps += 1;
        }

        for (const article of roadmap.articles || []) {
          const articleDoc = await addDoc(collection(db, "articles"), {
            roadmapId,
            title: article.title,
            content: article.content,
            points: article.points,
            order: article.order,
            level: article.level ?? 1,
          });
          createdArticles += 1;

          if (article.quiz?.questions?.length) {
            await addDoc(collection(db, "quizzes"), {
              articleId: articleDoc.id,
              questions: article.quiz.questions,
            });
            createdQuizzes += 1;
          }
        }
      }

      setImportStatus(
        `Import complete. Added ${createdRoadmaps} roadmap${createdRoadmaps === 1 ? "" : "s"}, reused ${reusedRoadmaps}, added ${createdArticles} article${createdArticles === 1 ? "" : "s"}, and ${createdQuizzes} quiz${createdQuizzes === 1 ? "" : "zes"}.`,
      );
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Import failed unexpectedly.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopySampleJson = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_IMPORT_JSON_TEXT);
      setIsSampleCopied(true);
      window.setTimeout(() => {
        setIsSampleCopied(false);
      }, 1800);
    } catch {
      setImportError("Could not copy sample JSON. Please copy it manually.");
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
        icon: item.icon || "Map",
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
            onClick={() => {
              resetImportState();
              setIsImportModalOpen(true);
            }}
            disabled={isImporting}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <Upload className="w-5 h-5" /> Import data
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Add new {activeTab.slice(0, -1)}
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
                      <RoadmapIcon name={r.icon} className="w-6 h-6" />
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
                No roadmaps found. Click "Import data" or "Add new roadmap" to
                get started.
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

      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-3xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-xl">Import data (JSON)</h3>
                <button
                  onClick={closeImportModal}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      Sample JSON format
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopySampleJson}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {isSampleCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-muted border border-border rounded-xl p-4 text-xs overflow-auto max-h-52">
                    {SAMPLE_IMPORT_JSON_TEXT}
                  </pre>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Choose JSON file
                  </label>
                  <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-3 py-2.5">
                    <label
                      htmlFor="import-json-file"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-semibold cursor-pointer hover:bg-card/80 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Choose File
                    </label>
                    <span className="text-sm text-muted-foreground truncate">
                      {importFileName || "No file chosen"}
                    </span>
                    <input
                      id="import-json-file"
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImportFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {importStatus && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-500">
                    {importStatus}
                  </div>
                )}

                {duplicateRoadmapTitles.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <p className="text-sm text-amber-400 font-semibold">
                      Warning: {duplicateRoadmapTitles.length} roadmap title
                      {duplicateRoadmapTitles.length === 1 ? "" : "s"} already
                      exist.
                    </p>
                    <p className="text-xs text-amber-300/90">
                      Importing will append articles/quizzes to the existing
                      roadmap instead of creating a new one.
                    </p>
                    <div className="text-xs text-amber-200/80">
                      Existing titles: {duplicateRoadmapTitles.join(", ")}
                    </div>
                    <label className="flex items-start gap-2 text-sm text-amber-100">
                      <input
                        type="checkbox"
                        checked={allowExistingRoadmapImport}
                        onChange={(e) =>
                          setAllowExistingRoadmapImport(e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 accent-emerald-500"
                      />
                      I understand and want to continue importing into existing
                      roadmaps.
                    </label>
                  </div>
                )}

                {importError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                    {importError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeImportModal}
                    className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportData}
                    disabled={
                      isImporting ||
                      !importRoadmaps ||
                      (duplicateRoadmapTitles.length > 0 &&
                        !allowExistingRoadmapImport)
                    }
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold disabled:opacity-50"
                  >
                    {isImporting ? "Importing..." : "Import data"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modals */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
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
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors min-h-25"
                        placeholder="Describe the learning path..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                          Icon
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsIconMenuOpen((prev) => !prev)}
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 flex items-center justify-between focus:outline-none focus:border-emerald-500 transition-colors"
                          >
                            <span className="flex items-center gap-2 text-sm">
                              <RoadmapIcon
                                name={roadmapForm.icon}
                                className="w-5 h-5"
                              />
                              <span>{roadmapForm.icon}</span>
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </button>

                          {isIconMenuOpen && (
                            <div className="absolute z-20 mt-2 w-full bg-card border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto p-2">
                              <div className="grid grid-cols-1 gap-1">
                                {AVAILABLE_ROADMAP_ICONS.map((iconName) => (
                                  <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => {
                                      setRoadmapForm({
                                        ...roadmapForm,
                                        icon: iconName,
                                      });
                                      setIsIconMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                      roadmapForm.icon === iconName
                                        ? "bg-emerald-500/15 text-emerald-500"
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    <RoadmapIcon
                                      name={iconName}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm">{iconName}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors min-h-50 font-mono text-sm"
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
                              className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors min-h-20 font-mono text-sm"
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
