import React from 'react';
import { PMPDomain, MasteryMatrix } from '../types';
import {
  Compass,
  FileText,
  Users,
  Settings,
  Award,
  Zap,
  BookOpen,
  LogOut,
  User as UserIcon,
  Filter,
  Search,
  Shuffle
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SidebarProps {
  user: User | null;
  selectedMode: 'domain' | 'exam' | 'book' | 'admin' | 'definitions' | 'matching';
  setSelectedMode: (mode: 'domain' | 'exam' | 'book' | 'admin' | 'definitions' | 'matching') => void;
  selectedDomains: PMPDomain[];
  toggleDomain: (domain: PMPDomain) => void;
  mastery: MasteryMatrix;
  totalAnswered: number;
  scorePercentage: number;
  onLogout: () => void;
  examQuestionIndex?: number;
  totalExamQuestions?: number;
  language?: 'EN' | 'FR';
  setLanguage?: (lang: 'EN' | 'FR') => void;
  isAdmin?: boolean;
}

const t = {
  EN: {
    candidateLogin: "Candidate Login",
    pmpCandidate: "PMP Candidate",
    simulationMode: "Simulation Mode",
    domainPractice: "Domain Practice",
    fullMock: "Full 180 Mock Exam",
    matchingExercise: "Terminology Matching",
    definitionsSearch: "PMP Definitions",
    bookCompanion: "PMP Study Books",
    adminControl: "Admin Control Panel",
    filterDomain: "Filter by Target Domain",
    examProgress: "Exam Progress",
    questions: "Questions",
    analytics: "Performance Analytics",
    answered: "Answered",
    avgScore: "Avg Score",
    masteryLevels: "ECO Domain Mastery Status",
    logout: "Profile Logout",
    people: "People",
    process: "Process",
    businessEnv: "Business Env",
    badgeAbove: "Above Target 👑",
    badgeDeveloping: "Developing 📈",
    badgeNeedsWork: "Needs Work 🎯",
    badgeNotStarted: "Not Started"
  },
  FR: {
    candidateLogin: "Profil Candidat",
    pmpCandidate: "Candidat PMP",
    simulationMode: "Mode de Simulation",
    domainPractice: "Pratique par Domaine",
    fullMock: "Examen Blanc (180 Q)",
    matchingExercise: "Association de Termes",
    definitionsSearch: "Définitions PMP",
    bookCompanion: "Livres d'Étude PMP",
    adminControl: "Gestion Admin",
    filterDomain: "Filtrer par Domaine Éco",
    examProgress: "Statut de l'Examen",
    questions: "Questions",
    analytics: "Analyses de Performance",
    answered: "Répondues",
    avgScore: "Score Moyen",
    masteryLevels: "Maîtrise des Domaines ECO",
    logout: "Déconnexion",
    people: "Humain (People)",
    process: "Processus (Process)",
    businessEnv: "Env. d\'Affaires",
    badgeAbove: "Cible Atteinte 👑",
    badgeDeveloping: "En Progression 📈",
    badgeNeedsWork: "À Travailler 🎯",
    badgeNotStarted: "Non Initié"
  }
};

export default function Sidebar({
  user,
  selectedMode,
  setSelectedMode,
  selectedDomains,
  toggleDomain,
  mastery,
  totalAnswered,
  scorePercentage,
  onLogout,
  examQuestionIndex = 0,
  totalExamQuestions = 180,
  language = 'EN',
  setLanguage,
  isAdmin = false
}: SidebarProps) {
  
  // Calculate specific totals
  const domains: PMPDomain[] = ['People', 'Process', 'Business Environment'];
  const texts = t[language];

  const getDomainDisplayName = (domain: PMPDomain) => {
    if (language === 'FR') {
      if (domain === 'People') return 'Humain (People)';
      if (domain === 'Process') return 'Processus (Process)';
      if (domain === 'Business Environment') return 'Env. d\'Affaires';
    } else {
      if (domain === 'Business Environment') return 'Business Env';
    }
    return domain;
  };

  const getMasteryPill = (ratio: number, count: number) => {
    if (count === 0) {
      return (
        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200">
          {texts.badgeNotStarted}
        </span>
      );
    }
    if (ratio >= 75) {
      return (
        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
          {texts.badgeAbove}
        </span>
      );
    }
    if (ratio >= 50) {
      return (
        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
          {texts.badgeDeveloping}
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
        {texts.badgeNeedsWork}
      </span>
    );
  };
  
  return (
    <aside className="w-80 bg-gradient-to-b from-white via-indigo-50/10 to-violet-50/20 border-r border-indigo-100 text-slate-800 flex flex-col h-full shrink-0 outline-none shadow-sm" id="sidebar_main">
      {/* Header Profile Info */}
      <div className="p-6 border-b border-indigo-50 flex flex-col gap-4" id="sidebar_profile">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black ring-4 ring-indigo-550/10 shadow-md overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-indigo-950 truncate leading-tight">{user?.displayName || user?.email?.split('@')[0] || texts.candidateLogin}</h3>
            <span className="text-[11px] text-violet-600 font-mono tracking-wider flex items-center gap-1.5 mt-1 font-extrabold bg-violet-50 px-2 py-0.5 rounded-md inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
              {texts.pmpCandidate}
            </span>
          </div>
        </div>

        {/* Small in-sidebar Language Switches */}
        {setLanguage && (
          <div className="flex bg-slate-100/80 border border-slate-200 p-1 rounded-xl text-[11px] font-mono justify-between">
            <button
              onClick={() => setLanguage('EN')}
              className={`flex-1 text-center py-1 rounded-lg transition-all cursor-pointer ${
                language === 'EN' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('FR')}
              className={`flex-1 text-center py-1 rounded-lg transition-all cursor-pointer ${
                language === 'FR' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              FR
            </button>
          </div>
        )}
      </div>

      {/* Navigation Options - Mode Slection */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6" id="sidebar_nav">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-indigo-400" /> {texts.simulationMode}
          </h4>
          <div className="space-y-2">
            <button
              id="mode_domain_btn"
              onClick={() => setSelectedMode('domain')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                selectedMode === 'domain'
                  ? 'bg-gradient-to-r from-violet-50 to-indigo-50/80 text-violet-950 border-2 border-violet-300 font-extrabold shadow-md'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className={`w-4 h-4 ${selectedMode === 'domain' ? 'text-violet-650' : 'text-slate-400'}`} />
                <span className="text-sm">{texts.domainPractice}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-violet-200 text-violet-600 font-mono font-black shadow-xxs">ECO</span>
            </button>
            <button
              id="mode_exam_btn"
              onClick={() => setSelectedMode('exam')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                selectedMode === 'exam'
                  ? 'bg-gradient-to-r from-amber-50 to-rose-50/80 text-rose-950 border-2 border-amber-300 font-extrabold shadow-md'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className={`w-4 h-4 ${selectedMode === 'exam' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="text-sm">{texts.fullMock}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-550 font-mono font-black shadow-xxs">230m</span>
            </button>
            <button
              id="mode_matching_btn"
              onClick={() => setSelectedMode('matching')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                selectedMode === 'matching'
                  ? 'bg-gradient-to-r from-violet-50 to-indigo-50/80 text-indigo-950 border-2 border-violet-300 font-extrabold shadow-md'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shuffle className={`w-4 h-4 ${selectedMode === 'matching' ? 'text-violet-600' : 'text-slate-400'}`} />
                <span className="text-sm">{texts.matchingExercise}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-violet-200 text-violet-550 font-mono font-black shadow-xxs">4-5</span>
            </button>
            <button
              id="mode_definitions_btn"
              onClick={() => setSelectedMode('definitions')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                selectedMode === 'definitions'
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50/80 text-emerald-950 border-2 border-teal-300 font-extrabold shadow-md'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Search className={`w-4 h-4 ${selectedMode === 'definitions' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="text-sm">{texts.definitionsSearch}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-teal-200 text-teal-600 font-mono font-black shadow-xxs">📖</span>
            </button>
            {isAdmin && (
              <button
                id="mode_book_btn"
                onClick={() => setSelectedMode('book')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  selectedMode === 'book'
                    ? 'bg-gradient-to-r from-violet-50 to-indigo-50/80 text-indigo-950 border-2 border-violet-300 font-extrabold shadow-md'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className={`w-4 h-4 ${selectedMode === 'book' ? 'text-violet-600' : 'text-slate-400'}`} />
                  <span className="text-sm">{texts.bookCompanion}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-violet-200 text-violet-550 font-mono font-black shadow-xxs">PDF</span>
              </button>
            )}
            {isAdmin && (
              <button
                id="mode_admin_btn"
                onClick={() => setSelectedMode('admin')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  selectedMode === 'admin'
                    ? 'bg-gradient-to-r from-red-50 to-orange-50/80 text-red-950 border-2 border-red-300 font-extrabold shadow-md'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className={`w-4 h-4 ${selectedMode === 'admin' ? 'text-red-500' : 'text-slate-400'}`} />
                  <span className="text-sm">{texts.adminControl}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-red-200 text-red-550 font-mono font-black shadow-xxs">CTRL</span>
              </button>
            )}
          </div>
        </div>

        {/* Domain Checklist Filtering */}
        {selectedMode === 'domain' && (
          <div>
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> {texts.filterDomain}
            </h4>
            <div className="space-y-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/40">
              {domains.map((domain) => {
                const isSelected = selectedDomains.includes(domain);
                return (
                  <label
                    key={domain}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/80 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDomain(domain)}
                      className="accent-violet-600 rounded border-slate-350 bg-white h-4 w-4"
                    />
                    <span className="text-sm text-slate-700 font-bold">{getDomainDisplayName(domain)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Exam Progress indicator */}
        {selectedMode === 'exam' && (
          <div className="p-4 bg-gradient-to-br from-amber-50 to-rose-50/60 border border-amber-200/40 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-rose-700 font-black uppercase tracking-wider">{texts.examProgress}</span>
              <span className="text-xs font-mono font-black text-rose-800">
                {examQuestionIndex} / {totalExamQuestions} Q
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (examQuestionIndex / totalExamQuestions) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress Tracker / Domain Analytics */}
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-violet-500" /> {texts.analytics}
          </h4>
          <div className="bg-gradient-to-tr from-indigo-50/30 to-violet-50/20 p-4 rounded-xl border border-indigo-150/40 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-sm">
                <div className="text-xl font-extrabold font-mono text-violet-600">{totalAnswered}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{texts.answered}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-sm">
                <div className="text-xl font-extrabold font-mono text-indigo-700">{scorePercentage.toFixed(0)}%</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{texts.avgScore}</div>
              </div>
            </div>

            {/* Mastery Ratios Chart with dynamic colorful indicators */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-black text-slate-600 block">{texts.masteryLevels}</span>
              {domains.map((domain) => {
                const stats = mastery[domain] || { answered: 0, correct: 0 };
                const ratio = stats.answered > 0 ? (stats.correct / stats.answered) * 100 : 0;
                return (
                  <div key={domain} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-mono leading-none">
                      <span className="text-slate-750 font-bold truncate w-24">
                        {getDomainDisplayName(domain)}
                      </span>
                      <span className="text-slate-400 font-semibold">
                        {stats.correct}/{stats.answered}
                      </span>
                    </div>

                    {/* Progress tracking line row */}
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300/30">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            ratio >= 75 ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm' : ratio >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : stats.answered > 0 ? 'bg-gradient-to-r from-rose-450 to-pink-500' : 'bg-slate-200'
                          }`}
                          style={{ width: `${stats.answered > 0 ? ratio : 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-black font-mono text-slate-700 leading-none">
                        {ratio.toFixed(0)}%
                      </span>
                    </div>

                    {/* Color Status alignment tag representing Candidate Improvement! */}
                    <div className="flex justify-end !mt-1">
                      {getMasteryPill(ratio, stats.answered)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Profile logout actions */}
      <div className="p-4 border-t border-indigo-50/80 flex items-center justify-between" id="sidebar_footer">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-rose-600 text-xs font-extrabold py-1 px-3 rounded-lg hover:bg-slate-100/50 transition-colors cursor-pointer group"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
          <span>{texts.logout}</span>
        </button>
        <span className="text-[10px] font-mono font-bold text-slate-400">v2.1 (FR-EN)</span>
      </div>
    </aside>
  );
}
