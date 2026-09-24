import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PMPQuestion, PMPDomain, MasteryMatrix, UserSession } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';
import { authFetch } from '../lib/apiClient';
import { buildExamBlueprint, buildMockExamQuestions } from '../lib/examEngine';
import { useBookCompanion } from '../hooks/useBookCompanion';
import { useAdminPanel } from '../hooks/useAdminPanel';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { DEFAULT_QUESTIONS_FR } from '../data/defaultQuestionsFr';
import Sidebar from './Sidebar';
import BookCompanionView from './BookCompanionView';
import AdminPanelView from './AdminPanelView';
import DefinitionsSearchView from './DefinitionsSearchView';
import MatchingExerciseView from './MatchingExerciseView';
import ExamView from './ExamView';
import DomainPracticeView from './DomainPracticeView';
import { AlertTriangle, Bot, Lock, Loader2 } from 'lucide-react';

interface DashboardProps {
  user?: any;
  onLogout: () => void;
  language: 'EN' | 'FR';
  setLanguage: (lang: 'EN' | 'FR') => void;
}

const t = {
  EN: {
    sandboxTitle: "Dynamic Sandbox Engine",
    compliantSec: "PMBOK 8th Edition Compliant",
    forceRegene: "New Question",
    officialExamTitle: "Official 180-Question Mock Exam",
    enforcementSplit: "ENFORCEMENT: ~50% AGILE/HYBRID METRIC SPLIT",
    beginExam: "Begin Mock Exam",
    finishExam: "Finish & Log Results",
    restartSim: "Restart Simulation",
    questionMatrix: "Question Array Matrix",
    examCompleteTitle: "180-Question Mock Exam Complete",
    examCompleteDesc: "Your candidate performance file has been analyzed against the 2026 update parameters.",
    complianceRating: "FINAL COMPLIANCE RATING",
    targetAchieved: "Target Achieved (Pass Recommendation)",
    improvementReq: "Improvement Required (Study Domain Flashcards)",
    guidelinesTitle: "Candidate Guidelines",
    guidelinesDesc: "Under standard PMI testing rules, a score thresholds \u2265 75% indicates comprehensive alignment with People (42%), Process (50%), and Business (8%) matrices. To target specific gaps, switch back to Domain Practice Mode and filter by the failing matrices.",
    notInitiatedTitle: "Exam Simulator Not Initiated",
    notInitiatedDesc: "Initiate a 230-minute exam tracking exactly 180 questions blended using Process, People, and Business Environment parameters."
  },
  FR: {
    sandboxTitle: "Moteur de Bac \u00e0 Sable Dynamique",
    compliantSec: "Conforme au PMBOK Guide 8e \u00c9dition",
    forceRegene: "Nouvelle Question",
    officialExamTitle: "Examen Blanc Officiel de 180 Questions",
    enforcementSplit: "APPLICATION : R\u00c9PARTITION ~50% AGILE / 50% PR\u00c9DICTIF",
    beginExam: "Commencer l'Examen Blanc",
    finishExam: "Terminer & Enregistrer les R\u00e9sultats",
    restartSim: "Recommencer la Simulation",
    questionMatrix: "Matrice des Questions",
    examCompleteTitle: "Examen Blanc de 180 Questions Termin\u00e9",
    examCompleteDesc: "Votre dossier de performance de candidat a \u00e9t\u00e9 analys\u00e9 selon les param\u00e8tres de la mise \u00e0 jour 2026.",
    complianceRating: "NOTE DE CONFORMIT\u00c9 FINALE",
    targetAchieved: "Cible Atteinte (Recommandation de R\u00e9ussite)",
    improvementReq: "Am\u00e9lioration Requise (\u00c9tudiez les th\u00e8mes de domaine)",
    guidelinesTitle: "Directives du Candidat",
    guidelinesDesc: "Selon les r\u00e8gles standard du PMI, un score \u2265 75% indique un alignement global avec les matrices Humain (42%), Processus (50%) et Environnement d'Affaires (8%). Pour cibler vos lacunes, revenez au mode Pratique par Domaine et filtrez par les domaines \u00e0 am\u00e9liorer.",
    notInitiatedTitle: "Simulateur d'Examen non initi\u00e9",
    notInitiatedDesc: "Lancez un examen blanc de 230 minutes comprenant exactement 180 questions r\u00e9parties sur les th\u00e8mes de Processus, Humain et Environnement d'Affaires."
  }
};

export default function Dashboard({ user: propUser, onLogout, language, setLanguage }: DashboardProps) {
  const user = propUser || auth.currentUser;
  const texts = t[language];
  
  // App states
  const [selectedMode, setSelectedMode] = useState<'domain' | 'exam' | 'book' | 'admin' | 'definitions' | 'matching'>('domain');
  const [selectedDomains, setSelectedDomains] = useState<PMPDomain[]>([]);
  
  // Custom training preference states
  const [prefDomain, setPrefDomain] = useState<'People' | 'Process' | 'Business Environment' | 'Any'>('Any');
  const [prefSubject, setPrefSubject] = useState<string>('Any');
  const [prefPhase, setPrefPhase] = useState<'Initiating' | 'Planning' | 'Executing' | 'Monitoring and Controlling' | 'Closing' | 'Any'>('Any');
  const [prefMethodology, setPrefMethodology] = useState<'Predictive' | 'Adaptive/Agile' | 'Hybrid' | 'Any'>('Any');
  const [prefQuestionType, setPrefQuestionType] = useState<'situational' | 'definition'>('situational');
  const [prefGenerationSource, setPrefGenerationSource] = useState<'docs' | 'ai' | 'combine'>('combine');
  const [sessionCompletedCount, setSessionCompletedCount] = useState<number>(0);
  
  // Book Study Companion: state + handlers live in useBookCompanion (shared identically by the
  // Study Books tab and the Admin Control Panel's "Exam Books & AI Study" tab). Destructured
  // under their original names so every existing prop-wiring call site below stays unchanged.
  const {
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
  } = useBookCompanion(language, sessionCompletedCount, selectedMode);

  // Loaded Question states
  const [currentQuestion, setCurrentQuestion] = useState<PMPQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoadingNew, setIsLoadingNew] = useState<boolean>(false);

  // Firestore Sync metrics
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [scorePercentage, setScorePercentage] = useState<number>(0);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [answeredMap, setAnsweredMap] = useState<{ [qId: string]: string }>({});
  const [mastery, setMastery] = useState<MasteryMatrix>({
    People: { answered: 0, correct: 0 },
    Process: { answered: 0, correct: 0 },
    'Business Environment': { answered: 0, correct: 0 }
  });

  // Mock Exam specific states
  const [examQuestions, setExamQuestions] = useState<PMPQuestion[]>([]);
  const [examIndex, setExamIndex] = useState<number>(0);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(230 * 60); // Initial fallback duration (overwritten dynamically)
  const [isExamActive, setIsExamActive] = useState<boolean>(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [examFinalScore, setExamFinalScore] = useState<number | null>(null);

  // Scheduled breaks states
  const [breakActive, setBreakActive] = useState<'break1' | 'break2' | null>(null);
  const [breakTimeRemaining, setBreakTimeRemaining] = useState<number>(600); // 10 minutes = 600s
  const [isBreakTimerRunning, setIsBreakTimerRunning] = useState<boolean>(true);

  // Post-exam review mode (browse the finished exam with full feedback restored)
  const [reviewMode, setReviewMode] = useState<boolean>(false);

  // Per-domain target (People/Process/Business Environment + methodology) for each of the
  // 170 non-case-study exam slots, fixed once per exam attempt so slots can be upgraded
  // from local placeholders to unique AI-generated questions without shifting distribution.
  const examBlueprintRef = useRef<{ domain: PMPDomain; methodology: string; templateId: string }[]>([]);
  // Slots currently being upgraded via the AI generator, checked synchronously to avoid duplicate fetches.
  const pendingExamSlotsRef = useRef<Set<number>>(new Set());
  // Mirrors answeredMap so in-flight async upgrades never overwrite a question the candidate already answered.
  const answeredMapRef = useRef<{ [qId: string]: string }>({});
  useEffect(() => {
    answeredMapRef.current = answeredMap;
  }, [answeredMap]);

  // --- ADMIN & LIMITS & TRACKING STATES ---
  // isAdmin/accessStatus/testsCount live here (not in useAdminPanel) because they're part of the
  // logged-in user's own session profile, loaded once at login below and read all over the app
  // (exam gating, book tab visibility, etc.) - not just inside the admin panel itself.
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [accessStatus, setAccessStatus] = useState<'pending' | 'granted' | 'restricted'>('pending');
  // True once the Firestore session profile load has resolved (success or failure) - gates the
  // pending/restricted lockout screen so it never flashes on top of the real state during the
  // brief async load right after sign-in.
  const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(false);
  const [durationOfUtilization, setDurationOfUtilization] = useState<number>(0);
  const [testsCount, setTestsCount] = useState<number>(0);

  // Admin Control Panel: candidate directory, sub-tab, and global exam config all live in
  // useAdminPanel - destructured under their original names so downstream prop-wiring is unchanged.
  const {
    appTimerLimitMinutes,
    setAppTimerLimitMinutes,
    appTestsLimit,
    setAppTestsLimit,
    allUsers,
    filteredUsers,
    isLoadingAllUsers,
    isSavingConfig,
    adminSubTab,
    setAdminSubTab,
    adminUserSearch,
    setAdminUserSearch,
    fetchAllUsersForAdmin,
    setUserAccessStatus,
    toggleUserRole,
    resetUserTestsCount,
    saveGlobalConfig
  } = useAdminPanel({
    user,
    language,
    selectedMode,
    setSelectedMode,
    isAdmin,
    setIsAdmin,
    setAccessStatus,
    setTestsCount
  });

  // Auto-translate the current practice-mode question when toggling between EN and FR
  useEffect(() => {
    if (!currentQuestion) return;
    const listEn = DEFAULT_QUESTIONS;
    const listFr = DEFAULT_QUESTIONS_FR;

    // Find index in either default list safely (protecting from -1 truthiness short-circuit)
    const idxInEn = listEn.findIndex(q => q.question_id === currentQuestion.question_id);
    const idxInFr = listFr.findIndex(q => q.question_id === currentQuestion.question_id);
    const foundIdx = idxInEn !== -1 ? idxInEn : idxInFr;

    if (foundIdx !== -1) {
      if (language === 'FR') {
        setCurrentQuestion(listFr[foundIdx]);
      } else {
        setCurrentQuestion(listEn[foundIdx]);
      }
    }
  }, [language]);

  // Auto-translate the simulated exam questions list if an exam is in progress or being
  // reviewed. This is intentionally a SEPARATE effect from the practice-mode one above: it must
  // not depend on `currentQuestion`, which stays null whenever the candidate goes straight to the
  // mock exam without ever visiting Domain Practice first - a prior bundled version of this
  // effect silently skipped exam retranslation entirely in that case.
  // Note: any AI-upgraded (unique) exam questions revert to local placeholders on language
  // switch, since translated AI content isn't cached; they will be re-upgraded lazily again.
  // The placeholder template chosen for each slot is fixed once in examBlueprintRef at exam
  // start (see buildExamBlueprint), so this relocalizes text only - it never reshuffles which
  // question is at a given slot, which would otherwise corrupt the score of an answered slot.
  useEffect(() => {
    if (examQuestions.length === 0) return;
    setExamQuestions(buildMockExamQuestions(language, examBlueprintRef.current));
  }, [language]);

  // Load / Initialize user session from Firestore and global config settings
  useEffect(() => {
    if (!user) return;

    async function fetchUserSession() {
      const path = `sessions/${user.uid}`;
      try {
        // 1. Fetch User Session Profile
        const docRef = doc(db, 'sessions', user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data() as UserSession;
          setTotalAnswered(data.totalAnswered || 0);
          setScorePercentage(data.scorePercentage || 0);
          setIncorrectIds(data.incorrectIds || []);
          setAnsweredMap(data.answeredQuestions || {});
          if (data.mastery) {
            setMastery(data.mastery);
          }

          // Load tracking and permission fields. Existing sessions from before the
          // pending-approval model was added never had accessStatus set to 'pending' - they
          // default to 'granted' here so this change doesn't retroactively lock out candidates
          // who were already using the app.
          setDurationOfUtilization(data.durationOfUtilization || 0);
          setAccessStatus(data.accessStatus || 'granted');
          setTestsCount(data.testsCount || 0);

          // Record this sign-in's timestamp for the admin's Candidate Directory - fire-and-forget,
          // never blocks rendering on it.
          updateDoc(docRef, { lastLoginAt: new Date().toISOString() }).catch(() => {});

          // Admin status prefers the `admin` custom claim on the ID token (authoritative, and
          // what firestore.rules checks first - see firestore.rules). The Firestore `role` field
          // is a fallback/display mirror only. `getIdTokenResult` only exists on real Firebase
          // Auth users, never on the local offline-fallback guest mock object.
          let claimAdmin = false;
          if (typeof user.getIdTokenResult === 'function') {
            try {
              const tokenResult = await user.getIdTokenResult();
              claimAdmin = tokenResult.claims.admin === true;
            } catch (claimErr) {
              console.warn("Failed to read ID token claims:", claimErr);
            }
          }
          setIsAdmin(claimAdmin || data.role === 'admin');

          // A session console-bootstrapped straight to role: 'admin' (see README) has no custom
          // claim yet. Mint it once here via the trusted server endpoint, then force a token
          // refresh so firestore.rules' fast claim-based isAdmin() check applies immediately.
          if (!claimAdmin && data.role === 'admin' && typeof user.getIdToken === 'function') {
            try {
              const idToken = await user.getIdToken();
              const syncResp = await fetch('/api/admin/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ targetUid: user.uid, makeAdmin: true })
              });
              if (syncResp.ok) {
                await user.getIdToken(true);
              }
            } catch (syncErr) {
              console.warn("Admin custom claim sync failed (will retry next session):", syncErr);
            }
          }
        } else {
          setIsAdmin(false);
          setAccessStatus('pending');
          setDurationOfUtilization(0);
          setTestsCount(0);

          // Create initial baseline document to Firestore. A brand-new account starts 'pending' -
          // an admin must explicitly approve it (see the Candidate Directory) before it can use
          // anything in the app, per the controlled-launch access model.
          const nowIso = new Date().toISOString();
          const initialData: UserSession = {
            userId: user.uid,
            email: user.email || 'guest@candidate.com',
            totalAnswered: 0,
            scorePercentage: 0,
            incorrectIds: [],
            answeredQuestions: {},
            mastery: {
              People: { answered: 0, correct: 0 },
              Process: { answered: 0, correct: 0 },
              'Business Environment': { answered: 0, correct: 0 }
            },
            createdAt: nowIso,
            lastLoginAt: nowIso,
            durationOfUtilization: 0,
            accessStatus: 'pending',
            role: 'candidate',
            testsCount: 0
          };
          await setDoc(docRef, initialData);
        }

        // 2. Fetch Global config settings if present
        const configSnap = await getDoc(doc(db, 'config', 'settings'));
        if (configSnap.exists()) {
          const config = configSnap.data();
          if (config.examTimerMinutes) {
            setAppTimerLimitMinutes(config.examTimerMinutes);
          }
          if (config.maxTestsLimit !== undefined) {
            setAppTestsLimit(config.maxTestsLimit);
          }
        }
      } catch (err) {
        // Log & throw with JSON payload for auditing, caught locally to allow offline fallback.
        // The pending-approval gate only makes sense when there's a real Firestore backend
        // enforcing it - without one (this catch path), fall back to 'granted' so the existing
        // local, non-persisted degraded experience keeps working exactly as it always has,
        // instead of stranding the candidate on an approval screen no admin can ever act on.
        setAccessStatus('granted');
        try {
          handleFirestoreError(err, OperationType.GET, path);
        } catch (e) {
          console.warn("Firestore session reading bypassed. Working with cached simulation data:", e);
        }
      } finally {
        setIsProfileLoaded(true);
      }
    }

    fetchUserSession();
  }, [user]);

  // Active Timer to calculate duration of utilization (cumulative spent seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      setDurationOfUtilization(prev => {
        const next = prev + 5; // Increment by 5 seconds
        if (next % 30 === 0) {
          // Sync with Firestore every 30 seconds
          updateDoc(doc(db, 'sessions', user.uid), {
            durationOfUtilization: next
          }).catch(err => console.error("Duration sync failed:", err));
        }
        return next;
      });
    }, 5000); // Trigger every 5 seconds to minimize state update re-renders

    return () => clearInterval(interval);
  }, [user]);

  // Leaving Domain Practice mode clears the active practice session (the book list refresh that
  // used to run alongside this same effect now lives inside useBookCompanion).
  useEffect(() => {
    if (selectedMode !== 'domain') {
      setCurrentQuestion(null);
      setSelectedDomains([]);
    }
  }, [selectedMode]);

  // Scheduled Break timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (breakActive && isBreakTimerRunning && breakTimeRemaining > 0) {
      interval = setInterval(() => {
        setBreakTimeRemaining(prev => {
          if (prev <= 1) {
            setBreakActive(null);
            if (breakActive === 'break1') {
              setExamIndex(10); // Start Question 11
            } else {
              setExamIndex(100); // Start Question 101
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [breakActive, isBreakTimerRunning, breakTimeRemaining]);

  // Handle Mock Exam Timer countdown override
  useEffect(() => {
    if (!isExamActive || examTimeRemaining <= 0 || isExamSubmitted || breakActive !== null) return;

    const interval = setInterval(() => {
      setExamTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamActive, examTimeRemaining, isExamSubmitted]);

  // Filter list helper
  const toggleDomainFilter = (domain: PMPDomain) => {
    // The side effect (network call) must live outside the setState updater: React 19's
    // <StrictMode> intentionally double-invokes updater functions in development to catch
    // impure ones, which was silently firing this exact question-generation request twice per
    // click (visible as duplicate POST /api/questions/generate calls).
    const wasEmpty = selectedDomains.length === 0;
    const next = selectedDomains.includes(domain)
      ? selectedDomains.filter(d => d !== domain)
      : [...selectedDomains, domain];
    setSelectedDomains(next);
    // If expanding from clean landing view to practicing, load first question immediately
    if (wasEmpty && next.length > 0) {
      fetchNewQuestion(next);
    }
  };

  // Direct landing triggers to practice a specific domain
  const handleStartDomainPractice = (domain: PMPDomain) => {
    setSelectedDomains([domain]);
    fetchNewQuestion([domain]);
  };

  // Close and clean/reset the active training state completely back to preferences menu
  const handleClosePractice = () => {
    setSelectedDomains([]);
    setCurrentQuestion(null);
    setPrefDomain('Any');
    setPrefSubject('Any');
    setPrefPhase('Any');
    setPrefMethodology('Any');
    setPrefQuestionType('situational');
    setPrefGenerationSource('combine');
    setSessionCompletedCount(0);
  };

  // Generate / Fetch next target PMP question
  const fetchNewQuestion = async (
    overrideDomains?: PMPDomain[],
    customSub?: string,
    customPh?: string,
    customMeth?: string
  ) => {
    setIsLoadingNew(true);
    const activeDomains = overrideDomains || selectedDomains;
    if (activeDomains.length === 0) {
      setIsLoadingNew(false);
      return;
    }
    
    const activeSub = customSub !== undefined ? customSub : prefSubject;
    const activePh = customPh !== undefined ? customPh : prefPhase;
    const activeMeth = customMeth !== undefined ? customMeth : prefMethodology;

    // Map methodology choice strictly without Agile/Hybrid confusion
    let methodChoice: string = activeMeth;
    if (activeMeth === 'Any') {
      const rand = Math.random();
      methodChoice = rand < 0.33 ? 'Agile' : rand < 0.66 ? 'Hybrid' : 'Predictive';
    } else if (activeMeth === 'Adaptive/Agile') {
      methodChoice = 'Agile';
    } else if (activeMeth === 'Hybrid') {
      methodChoice = 'Hybrid';
    }

    // Randomize chosen domain from filtered list
    const randomDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];
    
    // Choose contextual triggers based on PMP PM trends
    const contexts = [
      "cross-functional coordination gaps",
      "regulatory compliance changes",
      "geographically distributed virtual teams",
      "supply chain disruptions",
      "scope creep from stakeholder change requests",
      "budget compression directives",
      "resource bottlenecks during peak execution",
      "inter-departmental prioritization conflicts",
      "vendor delivery delays",
      "unclear project requirements from high-power stakeholders",
      "sustainability directives",
      "data-driven project management",
      "organizational change and training gaps",
      "conflicting stakeholder expectations",
      "team motivation and burnout during high-stress phases"
    ];
    const chosenContext = contexts[Math.floor(Math.random() * contexts.length)];

    const currentSessionCount = overrideDomains ? 0 : sessionCompletedCount;
    const excludeIds = Object.keys(answeredMap);

    try {
      const response = await authFetch('/api/questions/generate', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           domain: randomDomain,
           methodology: methodChoice,
           subject: activeSub,
           phase: activePh,
           contextTag: chosenContext,
           language: language,
           sessionCompletedCount: currentSessionCount,
           excludeIds: excludeIds,
            generationSource: prefGenerationSource,
           questionType: prefQuestionType
         })
       });

      const result = await response.json();
      if (result && result.question) {
        setCurrentQuestion(result.question);
        setIsGenerating(result.fallback === false);
        if (overrideDomains) {
          setSessionCompletedCount(0);
        } else {
          setSessionCompletedCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error("Endpoint fetch error, picking randomly from baseline defaults with filter match:", err);
      // Fallback
      const currentFrEnDefaults = language === 'FR' ? DEFAULT_QUESTIONS_FR : DEFAULT_QUESTIONS;
      let filtered = currentFrEnDefaults.filter(q => activeDomains.includes(q.eco_domain));
      
      if (activeMeth !== 'Any') {
        const isMatch = (qMeth: string) => {
          const qm = qMeth.toLowerCase();
          if (activeMeth === 'Adaptive/Agile') {
            return qm.includes('agile') || qm.includes('scrum') || qm.includes('kanban');
          }
          if (activeMeth === 'Hybrid') {
            return qm.includes('hybrid');
          }
          if (activeMeth === 'Predictive') {
            return qm.includes('predictive') || qm.includes('waterfall');
          }
          return qm.includes(activeMeth.toLowerCase());
        };
        filtered = filtered.filter(q => isMatch(q.methodology));
      }
      if (activeSub !== 'Any') {
        const subWord = activeSub.toLowerCase().split(' ')[0];
        const matched = filtered.filter(q => 
          q.scenario.toLowerCase().includes(subWord) || 
          q.explanation.toLowerCase().includes(subWord) ||
          q.tags.some(t => t.toLowerCase().includes(subWord))
        );
        if (matched.length > 0) filtered = matched;
      }
      if (activePh !== 'Any') {
        const phaseWord = activePh.toLowerCase();
        const matched = filtered.filter(q => 
          q.scenario.toLowerCase().includes(phaseWord) || 
          q.explanation.toLowerCase().includes(phaseWord)
        );
        if (matched.length > 0) filtered = matched;
      }

      const pool = filtered.length > 0 ? filtered : currentFrEnDefaults.filter(q => activeDomains.includes(q.eco_domain));
      const chosenPool = pool.length > 0 ? pool : currentFrEnDefaults;
      setCurrentQuestion(chosenPool[Math.floor(Math.random() * chosenPool.length)]);
    } finally {
      setIsLoadingNew(false);
      // Clear generating status briefly
      setTimeout(() => setIsGenerating(false), 2000);
    }
  };

  // Lock in submitted option state & update metrics
  const handleAnswerSubmit = async (qId: string, selectedOption: 'A' | 'B' | 'C' | 'D') => {
    if (!user || !currentQuestion) return;

    const isCorrect = currentQuestion.correct_option === selectedOption;
    const qDomain = currentQuestion.eco_domain;

    // Local state increments
    const newTotalAnswered = totalAnswered + 1;
    const newAnsweredMap = { ...answeredMap, [qId]: selectedOption };
    
    let newIncorrect = [...incorrectIds];
    if (!isCorrect) {
      newIncorrect.push(qId);
    }

    // Update Mastery Ratio percentages
    const currentDomainStats = mastery[qDomain] || { answered: 0, correct: 0 };
    const updatedDomainStats = {
      answered: currentDomainStats.answered + 1,
      correct: currentDomainStats.correct + (isCorrect ? 1 : 0)
    };

    const newMastery = {
      ...mastery,
      [qDomain]: updatedDomainStats
    };

    // Calculate total correct answers to re-average scorePercentage
    const totalCorrect = Object.keys(newMastery).reduce((sum, d) => {
      return sum + newMastery[d as PMPDomain].correct;
    }, 0);
    const newScore = Math.round((totalCorrect / newTotalAnswered) * 100);

    // Commit state updates locally
    setTotalAnswered(newTotalAnswered);
    setScorePercentage(newScore);
    setIncorrectIds(newIncorrect);
    setAnsweredMap(newAnsweredMap);
    setMastery(newMastery);

    // Synchronize directly with Firestore
    const path = `sessions/${user.uid}`;
    try {
      await updateDoc(doc(db, 'sessions', user.uid), {
        totalAnswered: newTotalAnswered,
        scorePercentage: newScore,
        incorrectIds: newIncorrect,
        answeredQuestions: newAnsweredMap,
        mastery: newMastery
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, path);
      } catch (e) {
        console.warn("Firestore update bypassed, progress backed up locally:", e);
      }
    }
  };

  // Lazily upgrades one exam slot (index >= 10) from its local placeholder to a unique
  // AI-generated question, mirroring the same double-pass generation practice mode already
  // uses. Never overwrites a slot the candidate has already answered, and is guarded against
  // duplicate concurrent fetches for the same slot.
  const ensureExamSlotGenerated = async (idx: number) => {
    if (idx < 10 || idx >= examQuestions.length) return;
    if (pendingExamSlotsRef.current.has(idx)) return;
    const slot = examQuestions[idx];
    if (!slot || !slot.isPlaceholder) return;
    if (answeredMapRef.current[slot.question_id] !== undefined) return;

    pendingExamSlotsRef.current.add(idx);
    const target = examBlueprintRef.current[idx - 10] || { domain: 'People' as PMPDomain, methodology: 'Agile' };
    const examContexts = [
      "cross-functional coordination gaps",
      "regulatory compliance changes",
      "geographically distributed virtual teams",
      "supply chain disruptions",
      "scope creep from stakeholder change requests",
      "budget compression directives",
      "resource bottlenecks during peak execution",
      "inter-departmental prioritization conflicts",
      "vendor delivery delays",
      "unclear project requirements from high-power stakeholders",
      "sustainability directives",
      "data-driven project management",
      "organizational change and training gaps",
      "conflicting stakeholder expectations",
      "team motivation and burnout during high-stress phases"
    ];
    const chosenContext = examContexts[idx % examContexts.length];

    try {
      const response = await authFetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: target.domain,
          methodology: target.methodology,
          subject: 'Any',
          phase: 'Any',
          contextTag: chosenContext,
          language,
          sessionCompletedCount: idx % 5,
          excludeIds: [],
          generationSource: 'ai',
          questionType: 'situational'
        })
      });
      const result = await response.json();
      if (result && result.question && result.fallback === false) {
        setExamQuestions(prev => {
          const current = prev[idx];
          if (!current || answeredMapRef.current[current.question_id] !== undefined) {
            return prev; // answered while the request was in flight - keep the answered content intact
          }
          const next = [...prev];
          next[idx] = {
            ...result.question,
            question_id: current.question_id,
            series_type: current.series_type,
            series_label: current.series_label,
            isPlaceholder: false
          };
          return next;
        });
      }
      // If the server itself had no Gemini key configured, result.fallback is true and we
      // simply keep the already domain-aligned, non-repeating local placeholder in place.
    } catch (err) {
      console.warn(`Exam slot ${idx + 1} AI upgrade failed, keeping local placeholder:`, err);
    } finally {
      pendingExamSlotsRef.current.delete(idx);
    }
  };

  // Upgrade the current question (and pre-fetch the next one) as the candidate progresses
  // through the mock exam, so nearly every one of the 180 questions ends up unique in practice
  // whenever the Gemini API is configured, without a slow up-front wait to start the exam.
  useEffect(() => {
    if (!isExamActive || breakActive !== null) return;
    ensureExamSlotGenerated(examIndex);
    if (examIndex + 1 < examQuestions.length) {
      ensureExamSlotGenerated(examIndex + 1);
    }
  }, [examIndex, isExamActive, breakActive]);

  // Start the Full 180-Question Mock Exam mode
  const handleStartExam = async () => {
    // 1. Restriction enforcement check
    if (accessStatus === 'restricted') {
      alert(language === 'FR' 
        ? "Votre accès est restreint par l'administrateur de l'application." 
        : "Your access is currently restricted by the administrator."
      );
      return;
    }

    // 2. Mock Exam attempts limit enforcement
    if (!isAdmin && testsCount >= appTestsLimit) {
      alert(language === 'FR'
        ? `Limite d'essais atteinte ! Votre compte est limité à un maximum de ${appTestsLimit} examens.`
        : `Maximum exam attempts limit reached! Your account is allowed a maximum of ${appTestsLimit} simulation trials.`
      );
      return;
    }

    // Fix the domain/methodology blueprint for this attempt so lazily-generated slots stay
    // aligned with the ECO weighting even as they're upgraded one by one during the exam.
    const blueprint = buildExamBlueprint(170);
    examBlueprintRef.current = blueprint;
    pendingExamSlotsRef.current.clear();
    const blendedQuestions = buildMockExamQuestions(language, blueprint);

    // Increment simulated test count
    const nextTestsCount = testsCount + 1;
    setTestsCount(nextTestsCount);

    if (user) {
      try {
        await updateDoc(doc(db, 'sessions', user.uid), {
          testsCount: nextTestsCount
        });
      } catch (err) {
        console.error("Failed to sync new test attempt count:", err);
      }
    }

    setExamQuestions(blendedQuestions);
    setExamIndex(0);
    setBreakActive(null);
    setExamTimeRemaining(appTimerLimitMinutes * 60);
    setIsExamActive(true);
    setIsExamSubmitted(false);
    setExamFinalScore(null);
    setReviewMode(false);
  };

  // Handle auto-submitting when timer runs out
  const handleAutoSubmitExam = () => {
    handleFinishExam();
  };

  // Finish exam and compute score
  const handleFinishExam = () => {
    setIsExamActive(false);
    setIsExamSubmitted(true);

    // Compute mockup score
    // In this simulation, any unanswered question counts as incorrect.
    let correctCount = 0;
    examQuestions.forEach((q, idx) => {
      const userAns = answeredMap[q.question_id];
      if (userAns === q.correct_option) {
        correctCount++;
      }
    });

    const finalScoreIdx = Math.round((correctCount / 180) * 100);
    setExamFinalScore(finalScoreIdx);
  };

  // Reset exam state
  const handleResetExam = () => {
    setIsExamActive(false);
    setIsExamSubmitted(false);
    setExamFinalScore(null);
    setExamTimeRemaining(appTimerLimitMinutes * 60);
    setReviewMode(false);
  };

  const renderRestrictedView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-6 animate-in fade-in duration-300" id="restricted_view_overlay">
      <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-500 flex items-center justify-center shadow-lg animate-pulse">
        <Lock className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-rose-950 tracking-tight">
          {language === 'FR' ? "Accès Limité / Restreint" : "Simulator Access Restricted"}
        </h2>
        <p className="text-sm text-slate-505 font-bold leading-relaxed">
          {language === 'FR' 
            ? "Votre compte d'entraînement a été suspendu ou limité par l'administrateur de l'application. Veuillez le contacter pour rétablir vos droits d'accès à la simulation d'examen PMP."
            : "Your trial simulator account has been temporarily restricted or suspended by the system administrator. Please reach out to your instructor or admin to re-enable authorization."}
        </p>
      </div>
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-250/60 w-full flex items-center justify-center gap-3">
        <Bot className="w-5 h-5 text-indigo-550 shrink-0" />
        <span className="text-xs text-slate-600 font-bold">
          {language === 'FR' 
            ? "Courriel de l'élève : " 
            : "Candidate Email: "}{user?.email || 'guest@candidate.com'}
        </span>
      </div>
    </div>
  );

  const renderAttemptsFinishedView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-6 animate-in fade-in duration-300" id="quota_exhausted_overlay">
      <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 text-amber-500 flex items-center justify-center shadow-lg animate-bounce">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          {language === 'FR' ? "Limite de Simulations Atteinte" : "Simulated Exam Limit Reached"}
        </h2>
        <p className="text-xs text-slate-505 font-bold leading-relaxed">
          {language === 'FR' 
            ? `Vous avez atteint la limite d'essais pour l'examen blanc de 180 questions (${testsCount} / ${appTestsLimit} examens démarrés). Veuillez contacter l'administrateur pour augmenter vos droits de simulation.`
            : `You have successfully consumed your exam simulation limits (${testsCount} out of ${appTestsLimit} attempts initiated). Reach out to your class administrator to increase your exam session quota.`}
        </p>
      </div>
      <div className="bg-gradient-to-tr from-indigo-50/10 via-amber-50/10 to-transparent p-4 rounded-2xl border border-indigo-100/40 w-full">
        <span className="text-[11px] text-indigo-950 font-black block mb-1">
          {language === 'FR' ? "Statut de votre licence :" : "Registration Trial Status:"}
        </span>
        <div className="flex justify-between items-center px-4 font-mono text-[11px] text-slate-650 font-bold mt-2">
          <span>{language === 'FR' ? "Examens Démarrés" : "Initiated Exams"}:</span>
          <span className="text-rose-605 font-black">{testsCount}</span>
        </div>
        <div className="flex justify-between items-center px-4 font-mono text-[11px] text-slate-650 font-bold mt-1">
          <span>{language === 'FR' ? "Quota Autorisé" : "Max Trial Quota"}:</span>
          <span className="text-indigo-655 font-black">{appTestsLimit}</span>
        </div>
      </div>
    </div>
  );

  // Blocks the entire app for a pending-approval or admin-revoked account - never for an admin
  // themselves (an admin can't be locked out by a stale accessStatus on their own profile).
  // Gated on isProfileLoaded so this never flashes over real content during the brief async
  // Firestore session load right after sign-in.
  // Never render the (unlocked) main app before the access-status check has actually resolved -
  // otherwise a pending/restricted candidate would briefly flash the full dashboard on first
  // paint, before the lockout screen below replaces it once the Firestore session load resolves.
  if (!isProfileLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-violet-100 via-rose-100 to-amber-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin && (accessStatus === 'pending' || accessStatus === 'restricted')) {
    const isPending = accessStatus === 'pending';
    return (
      <div className="min-h-screen bg-gradient-to-tr from-violet-100 via-rose-100 to-amber-100 flex items-center justify-center p-4" id="access_locked_screen">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-8 sm:p-9 shadow-2xl space-y-6 text-center">
          <div className={`inline-flex w-16 h-16 rounded-2xl items-center justify-center shadow-lg mx-auto ${
            isPending ? 'bg-gradient-to-tr from-amber-400 to-orange-500' : 'bg-gradient-to-tr from-rose-500 to-red-600'
          }`}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-indigo-950 tracking-tight">
              {isPending
                ? (language === 'FR' ? "Accès en attente d'approbation" : "Access Pending Approval")
                : (language === 'FR' ? "Accès restreint" : "Access Restricted")}
            </h1>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {isPending
                ? (language === 'FR'
                    ? "Votre compte a été créé avec succès. Un administrateur doit approuver votre accès avant que vous puissiez utiliser le simulateur."
                    : "Your account was created successfully. An administrator must approve your access before you can use the simulator.")
                : (language === 'FR'
                    ? "Votre accès à ce simulateur a été révoqué par un administrateur. Contactez-le si vous pensez qu'il s'agit d'une erreur."
                    : "Your access to this simulator has been revoked by an administrator. Contact them if you believe this is a mistake.")}
            </p>
          </div>
          <button
            id="access_locked_logout_btn"
            onClick={onLogout}
            className="w-full bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white py-3.5 px-4 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] cursor-pointer"
          >
            {language === 'FR' ? "Se déconnecter" : "Log Out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50/40 via-slate-50 to-violet-50/50 overflow-hidden text-slate-800" id="dashboard_panel">

      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        selectedMode={selectedMode}
        setSelectedMode={(mode) => {
          setSelectedMode(mode);
          if (mode === 'exam' && examQuestions.length === 0) {
            // Scaffold initial exam
          }
        }}
        selectedDomains={selectedDomains}
        toggleDomain={toggleDomainFilter}
        mastery={mastery}
        totalAnswered={totalAnswered}
        scorePercentage={scorePercentage}
        onLogout={onLogout}
        examQuestionIndex={selectedMode === 'exam' ? examIndex + 1 : 0}
        totalExamQuestions={180}
        language={language}
        setLanguage={setLanguage}
        isAdmin={isAdmin}
      />

      {/* Main Panel Viewport with light academic palette */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/20 overflow-y-auto select-none p-6 sm:p-10 border-l border-indigo-100 relative" id="main_scene">
        {/* Magic floating joyful color blobs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-violet-200/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-pink-200/15 rounded-full blur-3xl pointer-events-none" />
        
        {/* Persistent Elite Admin Portal Switcher */}
        {isAdmin && (
          <div className="max-w-4xl mx-auto w-full mb-6 z-20" id="persistent_admin_bar">
            <div className="bg-gradient-to-r from-red-650 via-orange-500 to-indigo-600 p-4 rounded-3xl border border-red-200/30 shadow-md flex justify-between items-center text-white flex-wrap gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1">
                    🛡️ {language === 'FR' ? "Panneau d'Administration PMP" : "PMP Director Control Room"}
                  </h3>
                  <p className="text-[10px] text-red-100 font-bold hidden sm:block">
                    {selectedMode === 'admin' 
                      ? (language === 'FR' ? "Configuration en cours du simulateur, des quotas, des scores et contenus." : "Currently configuring simulator settings, books, candidate logs, and rules.")
                      : (language === 'FR' ? "Accès Rapide : modifiez les règles, téléchargez des livres et suivez les scores des candidats d'ici !" : "Quick Access: adjust rules, upload study guides, and review candidate results here!")
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedMode === 'admin' ? (
                  <button
                    onClick={() => setSelectedMode('domain')}
                    className="flex items-center gap-1.5 bg-white text-indigo-950 hover:bg-slate-50 font-black text-xs px-4 py-2 rounded-2xl cursor-pointer transition-all leading-none shadow-sm"
                  >
                    <span>🎯 {language === 'FR' ? "Retour au Simulateur" : "Back to Simulator"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedMode('admin')}
                    className="flex items-center gap-1.5 bg-red-900 border border-red-700 text-white hover:bg-red-950 font-black text-xs px-4 py-2 rounded-2xl cursor-pointer transition-all leading-none shadow-sm animate-pulse"
                    id="admin_bar_launch_btn"
                  >
                    <span>⚡ {language === 'FR' ? "Ouvrir le Panneau Admin" : "Launch Admin Panel"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Domain Practice Viewport */}
        {selectedMode === 'domain' && (
          <DomainPracticeView
            language={language}
            texts={texts}
            isAdmin={isAdmin}
            selectedDomains={selectedDomains}
            setSelectedDomains={setSelectedDomains}
            handleClosePractice={handleClosePractice}
            prefQuestionType={prefQuestionType}
            setPrefQuestionType={setPrefQuestionType}
            prefGenerationSource={prefGenerationSource}
            setPrefGenerationSource={setPrefGenerationSource}
            prefDomain={prefDomain}
            setPrefDomain={setPrefDomain}
            prefMethodology={prefMethodology}
            setPrefMethodology={setPrefMethodology}
            prefSubject={prefSubject}
            setPrefSubject={setPrefSubject}
            prefPhase={prefPhase}
            setPrefPhase={setPrefPhase}
            fetchNewQuestion={fetchNewQuestion}
            isLoadingNew={isLoadingNew}
            isGenerating={isGenerating}
            currentQuestion={currentQuestion}
            handleAnswerSubmit={handleAnswerSubmit}
            answeredMap={answeredMap}
            mastery={mastery}
          />
        )}

        {/* Full 180-Question Mock Exam viewport */}
        {selectedMode === 'exam' && (
          <ExamView
            language={language}
            texts={texts}
            isAdmin={isAdmin}
            accessStatus={accessStatus}
            testsCount={testsCount}
            appTestsLimit={appTestsLimit}
            renderRestrictedView={renderRestrictedView}
            renderAttemptsFinishedView={renderAttemptsFinishedView}
            isExamActive={isExamActive}
            isExamSubmitted={isExamSubmitted}
            examTimeRemaining={examTimeRemaining}
            examFinalScore={examFinalScore}
            handleStartExam={handleStartExam}
            handleFinishExam={handleFinishExam}
            handleResetExam={handleResetExam}
            reviewMode={reviewMode}
            setReviewMode={setReviewMode}
            examQuestions={examQuestions}
            examIndex={examIndex}
            setExamIndex={setExamIndex}
            answeredMap={answeredMap}
            setAnsweredMap={setAnsweredMap}
            breakActive={breakActive}
            setBreakActive={setBreakActive}
            breakTimeRemaining={breakTimeRemaining}
            setBreakTimeRemaining={setBreakTimeRemaining}
            isBreakTimerRunning={isBreakTimerRunning}
            setIsBreakTimerRunning={setIsBreakTimerRunning}
          />
        )}

        {/* PMP Study Books Board Viewports */}
        {selectedMode === 'book' && (
          <BookCompanionView
            language={language}
            isAdmin={isAdmin}
            accessStatus={accessStatus}
            renderRestrictedView={renderRestrictedView}
            books={books}
            selectedBookId={selectedBookId}
            setSelectedBookId={setSelectedBookId}
            deleteBook={deleteBook}
            dragActive={dragActive}
            bookUploading={bookUploading}
            bookUploadError={bookUploadError}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            activeBookTab={activeBookTab}
            setActiveBookTab={setActiveBookTab}
            bookKeyword={bookKeyword}
            setBookKeyword={setBookKeyword}
            bookQuestionType={bookQuestionType}
            setBookQuestionType={setBookQuestionType}
            generateBookQuestion={generateBookQuestion}
            isLoadingBookQuestion={isLoadingBookQuestion}
            bookQuestion={bookQuestion}
            bookAnsweredMap={bookAnsweredMap}
            setBookAnsweredMap={setBookAnsweredMap}
            setSessionCompletedCount={setSessionCompletedCount}
            extractedQuestions={extractedQuestions}
            isLoadingExtractedQuestions={isLoadingExtractedQuestions}
            extractedIndex={extractedIndex}
            setExtractedIndex={setExtractedIndex}
            extractedAnsweredMap={extractedAnsweredMap}
            setExtractedAnsweredMap={setExtractedAnsweredMap}
            extractedExamActive={extractedExamActive}
            extractedExamSubmitted={extractedExamSubmitted}
            extractedExamQuestions={extractedExamQuestions}
            extractedExamAnswers={extractedExamAnswers}
            setExtractedExamAnswers={setExtractedExamAnswers}
            extractedExamIndex={extractedExamIndex}
            setExtractedExamIndex={setExtractedExamIndex}
            extractedExamTimeRemaining={extractedExamTimeRemaining}
            extractedExamScore={extractedExamScore}
            startExtractedExam={startExtractedExam}
            submitExtractedExam={submitExtractedExam}
            exitExtractedExam={exitExtractedExam}
          />
        )}

        {/* PMP Definitions Search - available to every candidate, not just admins */}
        {selectedMode === 'definitions' && (
          <DefinitionsSearchView language={language} isAdmin={isAdmin} />
        )}

        {/* Terminology Matching exercise - available to every candidate, not just admins */}
        {selectedMode === 'matching' && (
          <MatchingExerciseView language={language} />
        )}

        {/* Dynamic Admin Supervision Portal & Candidate Log Sheet */}
        {selectedMode === 'admin' && isAdmin && (
          <AdminPanelView
            language={language}
            adminSubTab={adminSubTab}
            setAdminSubTab={setAdminSubTab}
            allUsers={allUsers}
            filteredUsers={filteredUsers}
            isLoadingAllUsers={isLoadingAllUsers}
            fetchAllUsersForAdmin={fetchAllUsersForAdmin}
            adminUserSearch={adminUserSearch}
            setAdminUserSearch={setAdminUserSearch}
            appTestsLimit={appTestsLimit}
            resetUserTestsCount={resetUserTestsCount}
            setUserAccessStatus={setUserAccessStatus}
            toggleUserRole={toggleUserRole}
            books={books}
            dragActive={dragActive}
            bookUploading={bookUploading}
            bookUploadError={bookUploadError}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            deleteBook={deleteBook}
            appTimerLimitMinutes={appTimerLimitMinutes}
            setAppTimerLimitMinutes={setAppTimerLimitMinutes}
            setAppTestsLimit={setAppTestsLimit}
            isSavingConfig={isSavingConfig}
            saveGlobalConfig={saveGlobalConfig}
          />
        )}

      </main>
    </div>
  );
}
