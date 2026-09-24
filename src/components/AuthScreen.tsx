import React, { useState } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { Award, ShieldCheck, Sparkles, Globe } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (guestUser?: any) => void;
  language: 'EN' | 'FR';
  setLanguage: (lang: 'EN' | 'FR') => void;
}

const t = {
  EN: {
    title: "PMP Exam Simulator 2026",
    subtitle: "Fully aligned with the ECO, PMBOK Guide 8th Edition, and current sustainability practices.",
    badge1Title: "Quality-Reviewed Questions: ",
    badge1Desc: "Every situational question goes through an independent review pass for accuracy.",
    badge2Title: "Compliance Coach: ",
    badge2Desc: "Active mentoring outlines exact servant-leadership logical fallacies.",
    popupBlocked: "The Google Authentication pop-up was blocked by your browser. Please allow pop-ups or use Candidate Guest mode.",
    signInFail: "Failed to authenticate with Google. Use the Sandbox Guest mode as immediate fallback.",
    googleBtn: "Sign in with Google",
    initializing: "Initializing...",
    or: "or",
    guestBtn: "Enter as Guest Simulator",
    footerHint: "Google Pop-ups are recommended. Guest mode skips account tracking profiles but offers full access to the exam."
  },
  FR: {
    title: "Simulateur d'Examen PMP 2026",
    subtitle: "Entièrement aligné avec l'ECO, le PMBOK Guide 8e Édition et les meilleures pratiques de durabilité.",
    badge1Title: "Questions Vérifiées : ",
    badge1Desc: "Chaque question situationnelle passe par une relecture indépendante garantissant sa qualité.",
    badge2Title: "Coach de Conformité : ",
    badge2Desc: "Un mentorat actif explique précisément les erreurs logiques de leadership serviteur.",
    popupBlocked: "Le pop-up d'authentification Google a été bloqué par votre navigateur. Veuillez autoriser les pop-ups ou utiliser le mode Candidat Invité.",
    signInFail: "Échec de l'authentification avec Google. Utilisez le mode Invité comme alternative immédiate.",
    googleBtn: "Se connecter avec Google",
    initializing: "Initialisation...",
    or: "ou",
    guestBtn: "Entrer en Mode Candidat Invité",
    footerHint: "Les pop-ups Google sont recommandés. Le mode invité évite le suivi de profil cloud mais offre un accès complet à la simulation."
  }
};

export default function AuthScreen({ onAuthSuccess, language, setLanguage }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texts = t[language];

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Use popup for sandbox environments as specified in OAuth/Firebase instructions
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      // Fallback hint for sandboxed iframes
      setError(
        err.code === "auth/popup-blocked"
          ? texts.popupBlocked
          : err.message || texts.signInFail
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create guest profile
      const result = await signInAnonymously(auth);
      localStorage.removeItem('pmp_guest_user');
      onAuthSuccess(result.user);
    } catch (err: any) {
      console.warn("Firebase Anonymous Auth failed, falling back to offline simulation:", err);
      // Fallback: create a custom mock guest user so the user is never blocked!
      localStorage.setItem('pmp_guest_user', 'true');
      const mockGuestUser = {
        uid: 'guest-simulator',
        displayName: 'Guest Candidate',
        email: 'guest@simulator.local',
        isAnonymous: true,
        photoURL: null,
      };
      onAuthSuccess(mockGuestUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-violet-100 via-rose-100 to-amber-100 flex flex-col items-center justify-center p-4 relative overflow-hidden" id="auth_portal">
      {/* Playful glowing backdrops */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-pink-350/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-amber-250/20 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f108_1px,transparent_1px),linear-gradient(to_bottom,#6366f108_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Language Switcher Float Banner bar */}
      <div className="absolute top-6 right-6 z-20 flex bg-white/90 backdrop-blur-md border border-indigo-100 p-1.5 rounded-2xl text-xs gap-1.5 shadow-md" id="auth_language_switcher">
        <button
          onClick={() => setLanguage('EN')}
          className={`px-3.5 py-2 rounded-xl font-extrabold font-mono transition-all duration-200 cursor-pointer ${
            language === 'EN' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('FR')}
          className={`px-3.5 py-2 rounded-xl font-extrabold font-mono transition-all duration-200 cursor-pointer ${
            language === 'FR' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Français
        </button>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-8 sm:p-9 shadow-2xl space-y-8 relative z-10 transition-all duration-300 hover:shadow-indigo-100/40">
        
        {/* Logo and Brand */}
        <div className="text-center space-y-4">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 text-white items-center justify-center shadow-lg animate-bounce">
            <Award className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-pink-600 to-amber-600 bg-clip-text text-transparent font-sans">
              {texts.title}
            </h1>
            <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto mt-2 leading-relaxed">
              {texts.subtitle}
            </p>
          </div>
        </div>

        {/* Info badges */}
        <div className="space-y-4 bg-gradient-to-br from-indigo-50/70 via-rose-50/50 to-amber-50/60 p-5 rounded-[2rem] border border-indigo-100/40 text-left">
          <div className="flex gap-3 items-start">
            <div className="bg-indigo-100 p-1 rounded-lg text-indigo-600 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-705 leading-relaxed">
              <strong className="text-indigo-950 font-extrabold">{texts.badge1Title}</strong>{texts.badge1Desc}
            </span>
          </div>
          <div className="flex gap-3 items-start">
            <div className="bg-pink-100 p-1 rounded-lg text-pink-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-705 leading-relaxed">
              <strong className="text-pink-950 font-extrabold">{texts.badge2Title}</strong>{texts.badge2Desc}
            </span>
          </div>
        </div>

        {/* Buttons and login triggers */}
        <div className="space-y-4 pt-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-750 text-xs rounded-2xl leading-relaxed text-center font-bold">
              {error}
            </div>
          )}

          <button
            id="google_signin_btn"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-100 py-4 px-4 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            {/* Standard Vector Google G Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.67 0 3.2.58 4.41 1.7l3.29-3.29C17.73 1.58 15.01 1 12 1 7.24 1 3.21 3.75 1.25 7.72l3.86 3C6.01 7.73 8.78 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.25c0-.82-.07-1.61-.21-2.38H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.86c2.16-1.99 3.73-4.92 3.73-8.57z"
              />
              <path
                fill="#FBBC05"
                d="M5.11 10.72c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3L1.25 3.12C.45 4.75 0 6.57 0 8.5s.45 3.75 1.25 5.38l3.86-3.16z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.86c-1.02.68-2.33 1.09-4.27 1.09-3.22 0-5.99-2.69-6.89-5.68l-3.86 3C3.21 20.25 7.24 23 12 23z"
              />
            </svg>
            <span className="font-extrabold text-slate-700">{loading ? texts.initializing : texts.googleBtn}</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t-2 border-dotted border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-mono uppercase tracking-widest font-black">{texts.or}</span>
            <div className="flex-grow border-t-2 border-dotted border-slate-200"></div>
          </div>

          <button
            id="guest_signin_btn"
            disabled={loading}
            onClick={handleCandidateGuestSignIn}
            className="w-full bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 hover:from-violet-750 hover:to-amber-600 text-white py-4 px-4 rounded-2xl font-black text-sm transition-all text-center block shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
          >
            {texts.guestBtn}
          </button>
        </div>

        <p className="text-[10px] font-mono text-slate-400 text-center leading-relaxed font-semibold">
          {texts.footerHint}
        </p>
      </div>
    </div>
  );
}
