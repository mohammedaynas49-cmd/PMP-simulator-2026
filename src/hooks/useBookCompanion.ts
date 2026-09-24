import React, { useState, useEffect } from 'react';
import { PMPQuestion } from '../types';
import { BookMeta } from '../components/BookCompanionView';
import { authFetch } from '../lib/apiClient';

// Owns every piece of state and every handler for the "Study Books & AI Companion" feature -
// shared identically by the Study Books tab (BookCompanionView) and the Admin Control Panel's
// "Exam Books & AI Study" tab (AdminPanelView), which is why this lives in its own hook rather
// than inside either view component.
export function useBookCompanion(language: 'EN' | 'FR', sessionCompletedCount: number, selectedMode: string) {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [activeBookTab, setActiveBookTab] = useState<'quiz' | 'extracted'>('quiz');
  const [bookKeyword, setBookKeyword] = useState<string>('');
  const [bookQuestionType, setBookQuestionType] = useState<'situational' | 'definition'>('situational');
  const [bookQuestion, setBookQuestion] = useState<PMPQuestion | null>(null);
  const [isLoadingBookQuestion, setIsLoadingBookQuestion] = useState<boolean>(false);
  const [bookAnsweredMap, setBookAnsweredMap] = useState<{ [qId: string]: string }>({});

  // Questions extracted VERBATIM from the uploaded document itself (see extractQuestionsFromBook
  // in server.ts) - distinct from bookQuestion above, which is always a brand-new AI draft.
  const [extractedQuestions, setExtractedQuestions] = useState<PMPQuestion[]>([]);
  const [isLoadingExtractedQuestions, setIsLoadingExtractedQuestions] = useState<boolean>(false);
  const [extractedIndex, setExtractedIndex] = useState<number>(0);
  const [extractedAnsweredMap, setExtractedAnsweredMap] = useState<{ [qId: string]: string }>({});

  // Timed mock-exam session built purely from a book's extracted questions (a real, book-scoped
  // exam attempt - not the AI-generated 180Q mock exam, and not persisted to the candidate's
  // Firestore session/mastery, which stays reserved for the main exam/practice modes).
  const [extractedExamActive, setExtractedExamActive] = useState<boolean>(false);
  const [extractedExamSubmitted, setExtractedExamSubmitted] = useState<boolean>(false);
  const [extractedExamQuestions, setExtractedExamQuestions] = useState<PMPQuestion[]>([]);
  const [extractedExamAnswers, setExtractedExamAnswers] = useState<{ [qId: string]: string }>({});
  const [extractedExamIndex, setExtractedExamIndex] = useState<number>(0);
  const [extractedExamTimeRemaining, setExtractedExamTimeRemaining] = useState<number>(0);
  const [extractedExamScore, setExtractedExamScore] = useState<number | null>(null);

  const SECONDS_PER_EXTRACTED_EXAM_QUESTION = 90;

  const startExtractedExam = () => {
    if (extractedQuestions.length === 0) return;
    const shuffled = [...extractedQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setExtractedExamQuestions(shuffled);
    setExtractedExamAnswers({});
    setExtractedExamIndex(0);
    setExtractedExamSubmitted(false);
    setExtractedExamScore(null);
    setExtractedExamTimeRemaining(shuffled.length * SECONDS_PER_EXTRACTED_EXAM_QUESTION);
    setExtractedExamActive(true);
  };

  const submitExtractedExam = () => {
    setExtractedExamAnswers(currentAnswers => {
      const correctCount = extractedExamQuestions.filter(
        q => currentAnswers[q.question_id] === q.correct_option
      ).length;
      setExtractedExamScore(
        extractedExamQuestions.length > 0
          ? Math.round((correctCount / extractedExamQuestions.length) * 100)
          : 0
      );
      return currentAnswers;
    });
    setExtractedExamSubmitted(true);
    setExtractedExamIndex(0);
  };

  const exitExtractedExam = () => {
    setExtractedExamActive(false);
    setExtractedExamSubmitted(false);
    setExtractedExamQuestions([]);
    setExtractedExamAnswers({});
    setExtractedExamIndex(0);
    setExtractedExamScore(null);
  };

  // Countdown ticks once per second while the exam is live; auto-submits at zero, matching the
  // real PMP exam's hard time cutoff.
  useEffect(() => {
    if (!extractedExamActive || extractedExamSubmitted) return;
    if (extractedExamTimeRemaining <= 0) {
      submitExtractedExam();
      return;
    }
    const timeout = setTimeout(() => setExtractedExamTimeRemaining(t => t - 1), 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedExamActive, extractedExamSubmitted, extractedExamTimeRemaining]);

  const [booksLoading, setBooksLoading] = useState<boolean>(false);
  const [bookUploading, setBookUploading] = useState<boolean>(false);
  const [bookUploadError, setBookUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fetchBooksList = async () => {
    setBooksLoading(true);
    try {
      const res = await authFetch('/api/books/list');
      const data = await res.json();
      if (data.books) {
        setBooks(data.books);
        if (data.books.length > 0 && !selectedBookId) {
          setSelectedBookId(data.books[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading books:", err);
    } finally {
      setBooksLoading(false);
    }
  };

  // Refreshes the book list on every mode switch (not just when entering the Study Books tab),
  // matching the app's pre-refactor behavior exactly.
  useEffect(() => {
    fetchBooksList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode]);

  // While any book's background extraction scan hasn't finished yet, keep refreshing the list so
  // its status/count picks up as soon as the server-side scan completes - stops on its own once
  // nothing is left pending.
  useEffect(() => {
    const anyPending = books.some(b => b.extractionStatus === 'pending');
    if (!anyPending) return;
    const interval = setInterval(() => { fetchBooksList(); }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);

  const fetchExtractedQuestions = async (bookId: string) => {
    setIsLoadingExtractedQuestions(true);
    try {
      const res = await authFetch(`/api/books/${bookId}/extracted-questions`);
      const data = await res.json();
      setExtractedQuestions(Array.isArray(data.questions) ? data.questions : []);
      setExtractedIndex(0);
    } catch (err) {
      console.error("Error fetching extracted questions:", err);
      setExtractedQuestions([]);
    } finally {
      setIsLoadingExtractedQuestions(false);
    }
  };

  const selectedBookExtractionStatus = books.find(b => b.id === selectedBookId)?.extractionStatus;
  // Loads (and reloads once the background scan finishes) extracted questions for whichever book
  // is selected, whenever the candidate is looking at that tab.
  useEffect(() => {
    if (activeBookTab === 'extracted' && selectedBookId) {
      fetchExtractedQuestions(selectedBookId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookTab, selectedBookId, selectedBookExtractionStatus]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setBookUploading(true);
    setBookUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authFetch('/api/books/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBooks(prev => [...prev, data.book]);
        setSelectedBookId(data.book.id);
        setBookQuestion(null);
      } else {
        setBookUploadError(data.error || "Failed to parse file.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setBookUploadError(err.message || "Network upload failed.");
    } finally {
      setBookUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const generateBookQuestion = async () => {
    if (!selectedBookId) return;
    setIsLoadingBookQuestion(true);
    setBookQuestion(null);

    try {
      const res = await authFetch('/api/books/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBookId,
          keyword: bookKeyword,
          questionType: bookQuestionType,
          language: language,
          sessionCompletedCount: sessionCompletedCount,
          excludeIds: Object.keys(bookAnsweredMap)
        })
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setBookQuestion(data.question);
      } else {
        console.error("Failed to generate book question:", data.error);
      }
    } catch (err) {
      console.error("Error generating question from book:", err);
    } finally {
      setIsLoadingBookQuestion(false);
    }
  };

  const deleteBook = async (bookId: string) => {
    if (!window.confirm(language === 'FR' ? "Voulez-vous vraiment supprimer ce guide d'étude ?" : "Are you sure you want to delete this study guide?")) return;
    try {
      const res = await authFetch(`/api/books/delete/${bookId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBooks(prev => prev.filter(b => b.id !== bookId));
        if (selectedBookId === bookId) {
          setSelectedBookId(null);
          setBookQuestion(null);
        }
      }
    } catch (err) {
      console.error("Error deleting book:", err);
    }
  };

  return {
    books,
    selectedBookId,
    setSelectedBookId,
    activeBookTab,
    setActiveBookTab,
    bookKeyword,
    setBookKeyword,
    bookQuestionType,
    setBookQuestionType,
    bookQuestion,
    isLoadingBookQuestion,
    bookAnsweredMap,
    setBookAnsweredMap,
    booksLoading,
    bookUploading,
    bookUploadError,
    dragActive,
    fetchBooksList,
    handleFileUpload,
    handleDrag,
    handleDrop,
    handleFileChange,
    generateBookQuestion,
    deleteBook,
    extractedQuestions,
    isLoadingExtractedQuestions,
    extractedIndex,
    setExtractedIndex,
    extractedAnsweredMap,
    setExtractedAnsweredMap,
    fetchExtractedQuestions,
    extractedExamActive,
    extractedExamSubmitted,
    extractedExamQuestions,
    extractedExamAnswers,
    setExtractedExamAnswers,
    extractedExamIndex,
    setExtractedExamIndex,
    extractedExamTimeRemaining,
    extractedExamScore,
    startExtractedExam,
    submitExtractedExam,
    exitExtractedExam
  };
}
