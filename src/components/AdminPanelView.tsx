import React from 'react';
import { UserSession } from '../types';
import { BookMeta } from './BookCompanionView';
import {
  Shield,
  Users,
  BookOpen,
  Settings,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lock,
  Check,
  Clock,
  UploadCloud,
  Trash2
} from 'lucide-react';

interface AdminPanelViewProps {
  language: 'EN' | 'FR';

  adminSubTab: 'users' | 'knowledge' | 'settings';
  setAdminSubTab: (tab: 'users' | 'knowledge' | 'settings') => void;

  // Candidate Tracker tab
  allUsers: UserSession[];
  filteredUsers: UserSession[];
  isLoadingAllUsers: boolean;
  fetchAllUsersForAdmin: () => void;
  adminUserSearch: string;
  setAdminUserSearch: (v: string) => void;
  appTestsLimit: number;
  resetUserTestsCount: (targetUserId: string) => void;
  setUserAccessStatus: (targetUserId: string, nextAccess: 'granted' | 'restricted') => void;
  toggleUserRole: (targetUserId: string, currentRole: 'candidate' | 'admin' | undefined) => void;

  // Exam Books & AI Study (knowledge) tab
  books: BookMeta[];
  dragActive: boolean;
  bookUploading: boolean;
  bookUploadError: string | null;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deleteBook: (bookId: string) => void;

  // Simulator Rules (settings) tab
  appTimerLimitMinutes: number;
  setAppTimerLimitMinutes: (v: number) => void;
  setAppTestsLimit: (v: number) => void;
  isSavingConfig: boolean;
  saveGlobalConfig: (timerMins: number, testsLimit: number) => void;
}

export default function AdminPanelView({
  language,
  adminSubTab,
  setAdminSubTab,
  allUsers,
  filteredUsers,
  isLoadingAllUsers,
  fetchAllUsersForAdmin,
  adminUserSearch,
  setAdminUserSearch,
  appTestsLimit,
  resetUserTestsCount,
  setUserAccessStatus,
  toggleUserRole,
  books,
  dragActive,
  bookUploading,
  bookUploadError,
  handleDrag,
  handleDrop,
  handleFileChange,
  deleteBook,
  appTimerLimitMinutes,
  setAppTimerLimitMinutes,
  setAppTestsLimit,
  isSavingConfig,
  saveGlobalConfig
}: AdminPanelViewProps) {
  return (
    <div className="space-y-6 flex-1 flex flex-col h-full animate-in fade-in duration-300 text-left" id="view_admin_portal">

      {/* Header Admin Bar */}
      <div className="bg-gradient-to-r from-red-500 via-orange-500 to-indigo-600 p-6 rounded-[2rem] flex flex-wrap justify-between items-center gap-4 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-inner">
            <Shield className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              {language === 'FR' ? "Portail d'Administration PMP" : "PMP Director Admin Control Room"}
            </h2>
            <p className="text-xs text-red-50 mt-0.5 font-bold animate-pulse">
              {language === 'FR' ? "Paramétrez le simulateur, gérez les droits de sécurité, suivez les candidats et enrichissez l'IA." : "Configure exam sessions, security requirements, track candidates, and train the AI."}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start gap-1 flex-wrap">
        <button
          onClick={() => setAdminSubTab('users')}
          className={`py-2 px-4 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            adminSubTab === 'users'
              ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-bold'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{language === 'FR' ? "Suivi des Candidats" : "Candidate Tracker"}</span>
        </button>
        <button
          onClick={() => setAdminSubTab('knowledge')}
          className={`py-2 px-4 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            adminSubTab === 'knowledge'
              ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-bold'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{language === 'FR' ? "Matériels d'Examen (IA)" : "Exam Books & AI Study"}</span>
        </button>
        <button
          onClick={() => setAdminSubTab('settings')}
          className={`py-2 px-4 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            adminSubTab === 'settings'
              ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-bold'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{language === 'FR' ? "Règles & Quotas" : "Simulator Rules"}</span>
        </button>
      </div>

      {/* TAB CONTAINER CONTENT */}
      {adminSubTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Visual Overview metrics cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">{language === 'FR' ? "Candidats inscrits" : "Total Enrolled Candidates"}</span>
              <span className="text-2xl font-black text-indigo-950 block mt-1">{allUsers.length}</span>
              <span className="text-[10px] text-slate-450 block mt-1 font-bold">{language === 'FR' ? "Comptes candidats synchronisés" : "Synced candidate accounts"}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">{language === 'FR' ? "En Attente d'Approbation" : "Pending Approval"}</span>
              <span className="text-2xl font-black text-amber-600 block mt-1">{allUsers.filter(u => u.accessStatus === 'pending').length}</span>
              <span className="text-[10px] text-slate-450 block mt-1 font-bold">{language === 'FR' ? "Nouveaux comptes à valider" : "New accounts awaiting review"}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">{language === 'FR' ? "Accès Interdits / Suspendus" : "Suspended Accounts"}</span>
              <span className="text-2xl font-black text-rose-600 block mt-1">{allUsers.filter(u => u.accessStatus === 'restricted').length}</span>
              <span className="text-[10px] text-slate-450 block mt-1 font-bold">{language === 'FR' ? "Candidats restreints" : "Restricted from playground"}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">{language === 'FR' ? "Examens Démarrés" : "Exam Simulation Index"}</span>
              <span className="text-2xl font-black text-amber-500 block mt-1">{allUsers.reduce((sum, u) => sum + (u.testsCount || 0), 0)}</span>
              <span className="text-[10px] text-slate-450 block mt-1 font-bold">{language === 'FR' ? "Toutes tentatives cumulées" : "All cumulative initiations"}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">{language === 'FR' ? "Précision de la Classe" : "Cohort Average Score"}</span>
              <span className="text-2xl font-black text-emerald-650 block mt-1 text-emerald-600">
                {allUsers.length > 0 ? Math.round(allUsers.reduce((sum, u) => sum + (u.scorePercentage || 0), 0) / allUsers.length) : 0}%
              </span>
              <span className="text-[10px] text-slate-450 block mt-1 font-bold">{language === 'FR' ? "Moyenne tous candidats" : "Average accuracy index"}</span>
            </div>
          </div>

          {/* Candidate Supervision Directory Grid */}
          <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-sm flex flex-col space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-indigo-55 pb-4 border-indigo-50">
              <div>
                <h3 className="text-xs font-black text-indigo-950 uppercase tracking-widest leading-none">
                  {language === 'FR' ? "Registre des Candidats & Supervision de Sécurité" : "Candidate Directory & Access Control"}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold mt-1 block">
                  {language === 'FR' ? "Analysez en temps réel la progression des élèves et changez leurs droits de simulation." : "Inspect candidates stats, toggle authorization and promote roles on the fly."}
                </span>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder={language === 'FR' ? "Filtrer par courriel..." : "Filter profile email..."}
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                    className="text-[11px] pl-8 pr-4 py-1.5 w-48 sm:w-64 bg-slate-50 border border-slate-200 rounded-lg text-indigo-950 outline-hidden font-bold focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  />
                </div>

                <button
                  onClick={fetchAllUsersForAdmin}
                  disabled={isLoadingAllUsers}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-indigo-950 transition-all cursor-pointer"
                  title={language === 'FR' ? "Rafraîchir" : "Refresh logs"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAllUsers ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {isLoadingAllUsers ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500 font-bold">{language === 'FR' ? "Chargement des dossiers candidats..." : "Reading candidate profiles..."}</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 space-y-2">
                <AlertTriangle className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-black text-indigo-950 block">{language === 'FR' ? "Aucun profil candidat correspondant" : "No profiles matching"}</span>
                <span className="text-[10px] text-slate-500 max-w-sm block font-bold">
                  {language === 'FR' ? "Essayez une autre recherche ou patientez." : "Check spelling or wait until candidates login and sync."}
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 text-[10px] uppercase font-mono tracking-wider text-slate-500 font-black border-b border-indigo-50">
                      <th className="p-3 text-left font-black">{language === 'FR' ? "Candidat" : "Candidate Email & ID"}</th>
                      <th className="p-3 text-left font-black">{language === 'FR' ? "Dernier Accès" : "Last Access"}</th>
                      <th className="p-3 text-left font-black">{language === 'FR' ? "Temps Travaillé" : "Study Tracker"}</th>
                      <th className="p-3 text-left font-black">{language === 'FR' ? "Examens Blancs" : "Mock Count"}</th>
                      <th className="p-3 text-center font-black">{language === 'FR' ? "Moyenne" : "Avg Score"}</th>
                      <th className="p-3 text-center font-black">{language === 'FR' ? "Droits Système" : "Authorization"}</th>
                      <th className="p-3 text-right font-black">{language === 'FR' ? "Actions Administrateur" : "Admin Operations"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isUserAdmin = u.role === 'admin';
                      const isUserRestricted = u.accessStatus === 'restricted';
                      const isUserPending = u.accessStatus === 'pending';
                      const formatAccessDate = (iso?: string) => {
                        if (!iso) return language === 'FR' ? 'Jamais' : 'Never';
                        const d = new Date(iso);
                        if (isNaN(d.getTime())) return language === 'FR' ? 'Jamais' : 'Never';
                        return d.toLocaleString(language === 'FR' ? 'fr-FR' : 'en-US', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                      };
                      const answered = u.totalAnswered || 0;
                      // Defensive fallback only - scorePercentage is always populated in
                      // practice, so this branch is normally unreachable. Derives from the real
                      // `mastery` breakdown rather than a `totalCorrect` field that was never
                      // actually part of the UserSession schema.
                      const masteryCorrect = u.mastery
                        ? u.mastery.People.correct + u.mastery.Process.correct + u.mastery['Business Environment'].correct
                        : 0;
                      const userScore = u.scorePercentage ?? (answered > 0 ? Math.round((masteryCorrect / answered) * 100) : 0);

                      const studySecs = u.durationOfUtilization || 0;
                      const h = Math.floor(studySecs / 3600);
                      const m = Math.floor((studySecs % 3600) / 60);
                      const s = studySecs % 60;
                      const durationStr = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;

                      return (
                        <tr key={u.userId} className="hover:bg-slate-50/50 transition-colors font-bold text-slate-700">
                          <td className="p-4 text-left">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-900 text-[11px] leading-tight block truncate max-w-[150px] font-black" title={u.email}>
                                  {u.email}
                                </span>
                                {isUserAdmin && (
                                  <span className="px-1.5 py-0.2 text-[8px] rounded-sm font-black font-mono bg-amber-50 border border-amber-200 text-amber-600 block shadow-inner">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono font-bold text-slate-400 block shrink-0">ID: {u.userId.substring(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="p-4 text-left font-mono text-[10px] text-slate-600">
                            <div className="space-y-0.5">
                              <span className="font-black text-slate-800 block">{formatAccessDate(u.lastLoginAt)}</span>
                              <span className="text-[9px] text-slate-400 block">
                                {language === 'FR' ? 'Créé : ' : 'Created: '}{formatAccessDate(u.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-left font-mono text-[10px] text-indigo-900">
                            <div className="space-y-0.5">
                              <span className="font-black">{durationStr}</span>
                              <span className="text-[9px] text-slate-400 block">{answered} solved</span>
                            </div>
                          </td>
                          <td className="p-4 text-left font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              (u.testsCount || 0) >= appTestsLimit ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.testsCount || 0} / {appTestsLimit}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black ${
                              userScore >= 75 ? 'bg-emerald-55 text-emerald-700 border border-emerald-250 bg-emerald-50' :
                              userScore >= 50 ? 'bg-amber-55 text-amber-700 border border-amber-250 bg-amber-50' :
                              'bg-rose-55 text-rose-700 border border-rose-250 bg-rose-50'
                            }`}>
                              {userScore}%
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                              isUserRestricted
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                : isUserPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            }`}>
                              {isUserRestricted ? (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-rose-500" />
                                  <span>RESTRICT</span>
                                </>
                              ) : isUserPending ? (
                                <>
                                  <Clock className="w-2.5 h-2.5 text-amber-500" />
                                  <span>PENDING</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                                  <span>GRANTED</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              {/* Reset count */}
                              <button
                                onClick={() => resetUserTestsCount(u.userId)}
                                className="px-1.5 py-0.5 bg-slate-50 border border-slate-250 hover:bg-slate-100 text-slate-600 rounded-md text-[10px] font-black cursor-pointer transition-all border-slate-200"
                                title={language === 'FR' ? "Réinitialiser les quotas d'essais" : "Reset mock exam quota to zero"}
                              >
                                {language === 'FR' ? "Réinit. Essais" : "Reset Quota"}
                              </button>

                              {/* Access status actions: a pending or restricted account only
                                  ever gets one actionable button ("Approve"/"Grant" moves it to
                                  granted); an already-granted account only gets "Restrict". */}
                              {(isUserPending || isUserRestricted) && (
                                <button
                                  onClick={() => setUserAccessStatus(u.userId, 'granted')}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all border shrink-0 cursor-pointer bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-800"
                                >
                                  {isUserPending
                                    ? (language === 'FR' ? "Approuver" : "Approve")
                                    : (language === 'FR' ? "Accorder" : "Grant")
                                  }
                                </button>
                              )}
                              {!isUserRestricted && (
                                <button
                                  onClick={() => setUserAccessStatus(u.userId, 'restricted')}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all border shrink-0 cursor-pointer bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-800"
                                >
                                  {language === 'FR' ? "Suspendre" : "Restrict"}
                                </button>
                              )}
                              {/* Toggle Admin Role */}
                              <button
                                onClick={() => toggleUserRole(u.userId, u.role)}
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold transition-all border shrink-0 cursor-pointer ${
                                  isUserAdmin
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-805 border-indigo-200'
                                }`}
                              >
                                {isUserAdmin
                                  ? (language === 'FR' ? "Candidat" : "Candidate")
                                  : "Admin"
                                }
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {adminSubTab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">

          {/* Left side upload zone */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-sm space-y-4">
            <div className="border-b border-indigo-50 pb-3">
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                {language === 'FR' ? "Charger un Manuel ou Livre de Questions" : "Upload PMP Study Guides & Exams"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-relaxed">
                {language === 'FR'
                  ? "Importez des fichiers PDF ou TXT contenant des résumés officiels (PMBOK) ou des examens d'entraînement. L'IA assimilera ces connaissances immédiatement !"
                  : "Upload PMBOK guidelines, study books, or sample exam folders. The AI agent will parse and familiarize itself with this content."}
              </p>
            </div>

            {/* Dropzone component */}
            <div
              id="admin_book_dropzone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-[2rem] p-8 text-center transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 scale-101 shadow-md'
                  : 'border-indigo-100 bg-slate-50 hover:bg-slate-50/80 hover:border-indigo-200'
              } relative`}
            >
              <input
                type="file"
                id="admin_book_file_input"
                onChange={handleFileChange}
                accept=".pdf,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer select-none"
              />

              <div className="space-y-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center mx-auto shadow-sm">
                  {bookUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-white" />
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-black text-indigo-950">
                    {bookUploading
                      ? (language === 'FR' ? "Analyse du document..." : "AI Familiarization in progress...")
                      : (language === 'FR' ? "Sélectionnez votre PDF / TXT" : "Upload your PMP Exam file")}
                  </h4>
                  <p className="text-[9px] text-slate-500 leading-normal max-w-xs mx-auto font-bold">
                    {bookUploading
                      ? (language === 'FR' ? "Découpage intelligent en zones d'entraînement RAG pour l'évaluation. Veuillez patienter." : "Parsing and indexing the PDF layout recursively. This enables fully grounded scenario QA.")
                      : (language === 'FR' ? "Gros livres supportés jusqu'à 150 Mo. Cliquez pour naviguer." : "Support booklets or guides up to 150MB. Drag and drop file or click browse.")
                    }
                  </p>
                </div>

                {bookUploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-black rounded-xl max-w-sm mx-auto flex items-center gap-1.5 text-left">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>{bookUploadError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side books tracking and AI status */}
          <div className="lg:col-span-7 space-y-6">

            {/* AI familiarization summary index banner */}
            <div className="bg-gradient-to-tr from-indigo-900 via-indigo-950 to-violet-900 p-5 rounded-[2rem] text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] uppercase font-mono font-black tracking-wider text-emerald-400">
                    {language === 'FR' ? "Indice de Connaissance de l'Agent IA" : "AI Agent Learning Sync Status"}
                  </span>
                </div>

                <h4 className="text-sm font-black tracking-tight text-white leading-normal">
                  {books.length > 0
                    ? (language === 'FR'
                        ? `Agent IA Familiarisé (${books.reduce((acc, b) => acc + (b.pageCount || 0), 0)} pages d'études compilées)`
                        : `High-Fidelity RAG active (${books.reduce((acc, b) => acc + (b.pageCount || 0), 0)} Study Pages parsed into RAG memory)`)
                    : (language === 'FR' ? "Vecteurs IA sur Manuel par Défaut (Vide)" : "Active on standard default exam syllabus")}
                </h4>
                <p className="text-[10px] text-indigo-200 leading-relaxed font-bold">
                  {books.length > 0
                    ? (language === 'FR'
                        ? "L'agent examine les concepts, processus et fiches de gérance pour concevoir de nouvelles questions d'examen basées et coacher les décisions."
                        : "The agent checks critical path, stakeholder management risk factors, and steward patterns to construct dynamic bespoke exams and tutor candidates.")
                    : (language === 'FR'
                        ? "Chargez au moins un livre ci-contre pour que les candidats puissent s'entraîner sur votre propre matériel pédagogique et questions d'examens."
                        : "Upload a book on the left to equip candidates with personalized study books chat capabilities and mock preparation questions.")
                  }
                </p>
              </div>
            </div>

            {/* Active books files table */}
            <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest border-b border-indigo-50 pb-2">
                {language === 'FR' ? "Ouvrages Académiques & Répertoires d'Examens" : "Academic Books & Active Exam Directories"}
              </h4>

              {books.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-[11px] space-y-2">
                  <div className="text-xl">📚</div>
                  <p>{language === 'FR' ? "Aucun livre personnalisé n'est encore hébergé." : "No custom booklets are active in this workspace."}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {books.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 text-left transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-slate-800 block truncate" title={b.name}>{b.name}</span>
                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-slate-400 font-mono font-bold">
                          <span className="text-indigo-650 font-black">{b.pageCount} pages</span>
                          <span>•</span>
                          <span>{b.chunkCount} RAG segments</span>
                          <span>•</span>
                          <span>{new Date(b.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteBook(b.id)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200"
                        title={language === 'FR' ? "Supprimer le livre" : "Delete study file"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {adminSubTab === 'settings' && (
        <div className="max-w-2xl bg-white/95 backdrop-blur-md p-6 rounded-[2rem] border border-indigo-100 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-indigo-50 pb-3">
            <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
              {language === 'FR' ? "Limites de la Simulation" : "Global Simulator Quotas"}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
              {language === 'FR' ? "Ces valeurs s'appliquent de manière obligatoire à tous les candidats." : "Enforced system-wide constraints for all candidate profiles."}
            </p>
          </div>

          <div className="space-y-5">
            {/* Timer limit minutes */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-black text-indigo-400 block">
                {language === 'FR' ? "Durée Max de l'Examen (minutes)" : "Default Exam Timer (Minutes)"}
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={appTimerLimitMinutes}
                onChange={(e) => setAppTimerLimitMinutes(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-indigo-950 outline-hidden focus:ring-2 focus:ring-indigo-400 focus:bg-white font-bold"
              />
              <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                {language === 'FR' ? "Le temps réglementaire de l'examen standard PMP de 180 questions est défini à 230 minutes." : "Standard certified PMP duration is 230 minutes."}
              </p>
            </div>

            {/* Maximum tests limit */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-black text-indigo-400 block">
                {language === 'FR' ? "Nombre Limite d'Essais d'Examens" : "Allowed Mock Exam Attempts"}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={appTestsLimit}
                onChange={(e) => setAppTestsLimit(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-indigo-950 outline-hidden focus:ring-2 focus:ring-indigo-400 focus:bg-white font-bold"
              />
              <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                {language === 'FR' ? "Une fois ce quota dépassé, le candidat ne pourra plus lancer de nouvel simulacre à moins d'un reset de l'administrateur." : "Exceeding candidates cannot trigger new formal mock simulator rooms."}
              </p>
            </div>

            <button
              onClick={() => saveGlobalConfig(appTimerLimitMinutes, appTestsLimit)}
              disabled={isSavingConfig}
              className="w-full bg-gradient-to-tr from-indigo-600 to-violet-600 hover:opacity-90 hover:scale-101 hover:shadow-md text-white font-black text-xs py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSavingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 text-white" />
              )}
              <span>{language === 'FR' ? "Enregistrer les Paramètres" : "Update Simulator Constraints"}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
