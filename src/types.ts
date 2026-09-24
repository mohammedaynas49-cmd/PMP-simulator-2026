export type PMPDomain = 'People' | 'Process' | 'Business Environment';

export type MethodologyType = 'Agile' | 'Hybrid' | 'Predictive' | 'Agile/Hybrid';

export interface PMPQuestion {
  question_id: string;
  eco_domain: PMPDomain;
  scenario: string;
  options: string[]; // Standard 4 choices, e.g., ["A. ...", "B. ...", "C. ...", "D. ..."] or just text
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  pmbok_8_reference: string;
  methodology: MethodologyType;
  tags: string[]; // e.g. ["AI Integration", "Sustainability", "Data-Drive PM"]
  grounded_book_name?: string;
  /** Set only on questions extracted verbatim from an uploaded book (see server.ts
   * extractQuestionsFromBook), pointing back at that book's id - distinct from
   * `grounded_book_name`-only questions, which are newly AI-drafted, not extracted. */
  source_book_id?: string;
  question_focus_type?: 'situational' | 'definition';
  case_study_id?: string;
  case_study_title?: string;
  case_study_scenario?: string;
  series_type?: 'case_study' | 'scenario' | 'final_series';
  series_label?: string;
  /** True while this exam slot still holds a locally-cycled placeholder awaiting a unique AI-generated replacement. */
  isPlaceholder?: boolean;
}

export interface MasteryMatrix {
  People: { answered: number; correct: number };
  Process: { answered: number; correct: number };
  'Business Environment': { answered: number; correct: number };
}

export interface UserSession {
  userId: string;
  email: string;
  totalAnswered: number;
  scorePercentage: number;
  incorrectIds: string[];
  answeredQuestions: { [questionId: string]: string }; // questionId -> selectedOption, e.g., 'A'
  mastery: {
    People: { answered: number; correct: number };
    Process: { answered: number; correct: number };
    'Business Environment': { answered: number; correct: number };
  };
  durationOfUtilization?: number; // active spent seconds
  // 'pending': new account, awaiting admin approval - blocked from the whole app.
  // 'granted': admin-approved, full access.
  // 'restricted': admin-revoked, blocked from the whole app (same as pending, but was
  // previously granted - kept as a distinct value so the admin's own history/intent is clear).
  accessStatus?: 'pending' | 'granted' | 'restricted';
  role?: 'candidate' | 'admin'; // application level role
  testsCount?: number; // count of exams/tests taken
  createdAt?: string; // ISO timestamp, set once at first sign-in
  lastLoginAt?: string; // ISO timestamp, updated on every sign-in
}
