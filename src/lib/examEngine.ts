import { PMPDomain, PMPQuestion } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { DEFAULT_QUESTIONS_FR } from '../data/defaultQuestionsFr';

export interface ExamBlueprintSlot {
  domain: PMPDomain;
  methodology: string;
  templateId: string;
}

// Builds a fair, non-repeating draw order over a pool: every item is used once before any item
// repeats (a fresh shuffled "lap" of the pool each time it is exhausted), instead of a plain
// modulo cycle which would repeat the same 8-18 items in lockstep every N slots.
export function buildNonRepeatingDraw<T>(pool: T[], count: number): T[] {
  if (pool.length === 0) return [];
  const draw: T[] = [];
  while (draw.length < count) {
    const lap = [...pool];
    for (let i = lap.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lap[i], lap[j]] = [lap[j], lap[i]];
    }
    draw.push(...lap);
  }
  return draw.slice(0, count);
}

// Fixes the target ECO domain + methodology + local-fallback template for each of the 170
// non-case-study exam slots, matching the ECO weighting communicated in the UI (~42% People,
// ~50% Process, ~8% Business Environment) and an even Agile/Hybrid vs. Predictive split.
// Computed ONCE per exam attempt (not re-randomized on every render/rebuild) specifically so
// that switching the UI language mid-exam - which rebuilds the question array via
// buildMockExamQuestions to relocalize text - reproduces the exact same placeholder questions
// instead of silently reshuffling them, which would otherwise corrupt scoring for any slot the
// candidate had already answered (the previously recorded answer would end up graded against a
// different question's correct_option). question_id is stable across DEFAULT_QUESTIONS and
// DEFAULT_QUESTIONS_FR (both files are index-for-index translations of each other), so picking
// it once from the language-independent EN list is enough to localize consistently later.
export function buildExamBlueprint(count: number): ExamBlueprintSlot[] {
  const templatesByDomain: Record<PMPDomain, string[]> = {
    People: DEFAULT_QUESTIONS.filter(q => q.eco_domain === 'People').map(q => q.question_id),
    Process: DEFAULT_QUESTIONS.filter(q => q.eco_domain === 'Process').map(q => q.question_id),
    'Business Environment': DEFAULT_QUESTIONS.filter(q => q.eco_domain === 'Business Environment').map(q => q.question_id)
  };
  const drawByDomain: Record<PMPDomain, string[]> = {
    People: buildNonRepeatingDraw(templatesByDomain.People, count),
    Process: buildNonRepeatingDraw(templatesByDomain.Process, count),
    'Business Environment': buildNonRepeatingDraw(templatesByDomain['Business Environment'], count)
  };
  const domainCursor: Record<PMPDomain, number> = { People: 0, Process: 0, 'Business Environment': 0 };

  const blueprint: ExamBlueprintSlot[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const domain: PMPDomain = r < 0.42 ? 'People' : r < 0.92 ? 'Process' : 'Business Environment';
    const methodology = i % 6 === 5 ? 'Hybrid' : i % 2 === 0 ? 'Agile' : 'Predictive';
    const draw = drawByDomain[domain];
    const templateId = draw.length > 0
      ? draw[domainCursor[domain]++ % draw.length]
      : DEFAULT_QUESTIONS[i % DEFAULT_QUESTIONS.length].question_id;
    blueprint.push({ domain, methodology, templateId });
  }
  return blueprint;
}

// Generator for 180-question mock exam:
// Section 1 (Q1-Q10): Case Study based questions (Case Study 1: Q1-Q5, Case Study 2: Q6-Q10)
// Break 1 (10 Min) after Q10
// Section 2 (Q11-Q100): Scenario-based questions series
// Break 2 (10 Min) after Q100
// Section 3 (Q101-Q180): Strategic & process knowledge series
export function buildMockExamQuestions(
  lang: 'EN' | 'FR',
  blueprint: ExamBlueprintSlot[]
): PMPQuestion[] {
  const isFr = lang === 'FR';

  const cs1Title = isFr
    ? "Étude de Cas 1 : Transformation Globale ERP & IA d'Entreprise"
    : "Case Study 1: Global Enterprise AI & ERP Transformation";
  const cs1Scenario = isFr
    ? "NEXUS Global entreprend une transformation numérique à l'échelle de l'entreprise pour intégrer l'IA générative et un ERP cloud dans 14 unités commerciales internationales avec 85 membres d'équipe. Les défis majeurs incluent la résistance des responsables régionaux, les exigences de confidentialité internationales et les objectifs Net-Zéro."
    : "NEXUS Global is undergoing an enterprise digital transformation to integrate generative AI and cloud ERP across 14 international business units with 85 cross-functional team members. Primary challenges include regional department head resistance, conflicting international privacy compliance mandates, and Net-Zero carbon targets.";

  const cs2Title = isFr
    ? "Étude de Cas 2 : Projet d'Infrastructure de Réseau Électrique Intelligent"
    : "Case Study 2: Smart Clean-Energy Microgrid Infrastructure Project";
  const cs2Scenario = isFr
    ? "Un consortium public-privé construit des micro-réseaux solaires et installe 50 000 capteurs IoT intelligents dans 3 districts municipaux. Le projet associe un calendrier matériel prédictif et un développement logiciel agile pour l'équilibrage du réseau. Les risques incluent la contestation des riverains, des retards de livraison de semi-conducteurs et des failles de micrologiciel."
    : "A public-private consortium is constructing solar microgrids and installing 50,000 smart IoT sensors across 3 municipal districts. The project combines predictive hardware construction timelines with agile software development for real-time grid balancing. Key risks include local community noise complaints, global semiconductor shipment delays, and IoT firmware security vulnerabilities.";

  const series1Label = isFr ? "Série 1 : Études de Cas (Q1 à Q10)" : "Series 1: Case Studies Series (Q1-Q10)";
  const series2Label = isFr ? "Série 2 : Questions Basées sur Scénarios (Q11 à Q100)" : "Series 2: Scenario-Based Questions (Q11-Q100)";
  const series3Label = isFr ? "Série 3 : Connaissances Stratégiques & Processus (Q101 à Q180)" : "Series 3: Strategic & Process Knowledge (Q101-Q180)";

  const caseStudyQuestions: PMPQuestion[] = [
    // Q1 (CS1)
    {
      question_id: "exam_q_1",
      eco_domain: "People",
      methodology: "Agile/Hybrid",
      case_study_id: "cs_1",
      case_study_title: cs1Title,
      case_study_scenario: cs1Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 1/180 - Question 1 de l'Étude de Cas 1] Trois responsables régionaux refusent d'adopter le module d'admission IA standardisé, affirmant qu'il ralentit le service client local. Quelle est la MEILLEURE première action du chef de projet ?"
        : "[Slot 1/180 - Case Study 1 Question 1] Three regional department leads refuse to adopt the standardized AI intake module, claiming it slows down local customer service. What is the project manager's best FIRST action?",
      options: isFr ? [
        "A. Escalader immédiatement l'obstruction au comité de pilotage pour imposer une directive formelle.",
        "B. Faciliter un atelier collaboratif avec les responsables régionaux pour analyser les goulots d'étranglement et co-créer des règles d'intégration adaptatives.",
        "C. Exclure définitivement les 3 unités commerciales du déploiement de l'ERP.",
        "D. Ordonner aux développeurs de contourner les commentaires des responsables régionaux."
      ] : [
        "A. Immediately escalate to the steering committee to issue a mandatory directive.",
        "B. Facilitate a collaborative workshop with department leads to analyze local workflow bottlenecks and co-create adaptive integration guidelines.",
        "C. Exclude the 3 business units from the ERP rollout permanently.",
        "D. Direct developers to bypass local department feedback."
      ],
      correct_option: "B",
      explanation: isFr
        ? "En leadership serviteur (Agile Practice Guide) et principes PMBOK 8, le chef de projet doit résoudre les conflits par la collaboration et la co-création plutôt que par l'escalade prématurée ou le rejet."
        : "Under servant leadership (Agile Practice Guide) and PMBOK 8 principles, the PM resolves stakeholder friction through collaborative engagement and co-creation rather than premature escalation or exclusion.",
      pmbok_8_reference: "PMBOK 8 Principles: Stakeholders & Team | Agile Practice Guide: Servant Leadership",
      tags: ["Case Study", "Stakeholder Engagement", "Change Management"]
    },
    // Q2 (CS1)
    {
      question_id: "exam_q_2",
      eco_domain: "Process",
      methodology: "Agile/Hybrid",
      case_study_id: "cs_1",
      case_study_title: cs1Title,
      case_study_scenario: cs1Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 2/180 - Question 2 de l'Étude de Cas 1] Lors du Sprint 4, les développeurs demandent l'autorisation de connecter la base de données clients en direct à une API LLM tierce non vérifiée pour accélérer les tests. Comment le chef de projet doit-il réagir ?"
        : "[Slot 2/180 - Case Study 1 Question 2] During Sprint 4, developers request permission to connect live customer database records to an unverified third-party LLM endpoint to accelerate testing. How should the project manager respond?",
      options: isFr ? [
        "A. Approuver immédiatement la demande pour maintenir la vélocité du sprint.",
        "B. Exiger un contrôle de conformité dans un environnement sécurisé (sandbox) et une évaluation des risques avant d'exposer les données réelles.",
        "C. Licencier les développeurs de l'équipe IA pour manquement à la sécurité.",
        "D. Ignorer le problème de sécurité car il s'agit seulement de tests."
      ] : [
        "A. Approve the request immediately to maintain sprint velocity goals.",
        "B. Require security sandbox compliance verification and risk assessment before exposing live customer data.",
        "C. Remove developers from the AI team for security oversight.",
        "D. Ignore the security concern since it is only during testing."
      ],
      correct_option: "B",
      explanation: isFr
        ? "La gouvernance de l'IA et la gestion des risques exigent que la protection des données clients et les audits de conformité prévalent sur la vitesse d'exécution."
        : "AI governance and risk management require data security and compliance verification prior to exposing production or sensitive customer records.",
      pmbok_8_reference: "PMBOK 8 Principles: Stewardship & Risk Management | Process Domain",
      tags: ["Case Study", "AI Governance", "Risk Management"]
    },
    // Q3 (CS1)
    {
      question_id: "exam_q_3",
      eco_domain: "Business Environment",
      methodology: "Predictive",
      case_study_id: "cs_1",
      case_study_title: cs1Title,
      case_study_scenario: cs1Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 3/180 - Question 3 de l'Étude de Cas 1] Une nouvelle réglementation européenne sur la souveraineté des données impose le stockage local pour les modèles d'IA sous 60 jours, impactant 4 modules ERP. Que doit faire le chef de projet en PREMIER ?"
        : "[Slot 3/180 - Case Study 1 Question 3] A new EU data sovereignty regulation comes into force requiring localized data storage for AI processing models within 60 days, impacting 4 core ERP modules. What should the project manager do FIRST?",
      options: isFr ? [
        "A. Suspendre immédiatement tous les travaux du projet indéfiniment.",
        "B. Enregistrer l'exigence réglementaire dans le registre des risques, évaluer l'impact sur le périmètre et le calendrier, et affiner le backlog avec le Product Owner.",
        "C. Déposer une demande de dérogation auprès du régulateur européen.",
        "D. Effectuer des modifications de code en cachette sans informer le Product Owner."
      ] : [
        "A. Immediately halt all project work indefinitely.",
        "B. Log the regulatory requirement in the risk register, evaluate the scope/schedule impact, and conduct a backlog refinement session with the Product Owner.",
        "C. File an extension request with the European Union regulator.",
        "D. Implement silent code changes without informing the Product Owner."
      ],
      correct_option: "B",
      explanation: isFr
        ? "Face à de nouvelles exigences de conformité, le chef de projet doit analyser l'impact, inscrire le risque et collaborer avec le Product Owner pour adapter le backlog."
        : "When regulatory changes occur, the project manager logs the risk, assesses constraints, and collaborates with the Product Owner on backlog prioritization.",
      pmbok_8_reference: "PMBOK 8 Domain 3: Business Environment | Compliance & Risk",
      tags: ["Case Study", "Compliance", "Backlog Refinement"]
    },
    // Q4 (CS1)
    {
      question_id: "exam_q_4",
      eco_domain: "People",
      methodology: "Agile/Hybrid",
      case_study_id: "cs_1",
      case_study_title: cs1Title,
      case_study_scenario: cs1Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 4/180 - Question 4 de l'Étude de Cas 1] Des développeurs séniors répartis sur 3 fuseaux horaires signalent un épuisement professionnel et des erreurs accrues en raison de réunions de synchronisation tardives. Comment le chef de projet doit-il réagir ?"
        : "[Slot 4/180 - Case Study 1 Question 4] Senior developers working across 3 time zones report high burnout and rising defect rates due to late-night alignment meetings. How should the servant-leader PM address this?",
      options: isFr ? [
        "A. Réévaluer les protocoles de communication, passer à des mises à jour asynchrones et adapter les horaires pour respecter le bien-être de l'équipe.",
        "B. Ordonner aux membres de l'équipe de travailler les week-ends pour compenser les retards.",
        "C. Remplacer les développeurs distants par du personnel local.",
        "D. Supprimer tous les canaux de communication de l'équipe."
      ] : [
        "A. Re-evaluate communication protocols, transition to asynchronous updates, and adjust meeting schedules to respect team well-being.",
        "B. Instruct team members to work overtime on weekends to compensate for meeting delays.",
        "C. Replace remote developers with local staff.",
        "D. Cancel all team communication channels."
      ],
      correct_option: "A",
      explanation: isFr
        ? "Le leader serviteur protège l'équipe contre le surmenage et optimise la communication pour préserver la sécurité psychologique et la qualité des livrables."
        : "Servant leaders actively manage team capacity, promote asynchronous communication, and prevent burnout to sustain long-term performance.",
      pmbok_8_reference: "PMBOK 8 Principles: Team & Leadership | Agile Practice Guide",
      tags: ["Case Study", "Team Well-being", "Servant Leadership"]
    },
    // Q5 (CS1)
    {
      question_id: "exam_q_5",
      eco_domain: "Process",
      methodology: "Predictive",
      case_study_id: "cs_1",
      case_study_title: cs1Title,
      case_study_scenario: cs1Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 5/180 - Question 5 de l'Étude de Cas 1] Un audit de durabilité révèle que l'hébergeur cloud sélectionné pour l'IA dépasse de 18% le seuil d'émission carbone Net-Zéro de l'entreprise. Selon les principes du PMBOK 8, que doit faire le chef de projet ?"
        : "[Slot 5/180 - Case Study 1 Question 5] A sustainability audit reveals the cloud hosting vendor selected for the AI processing engine exceeds the corporate Net-Zero carbon threshold by 18%. According to PMBOK 8 principles, what should the PM do?",
      options: isFr ? [
        "A. Résilier immédiatement le contrat de l'hébergeur cloud.",
        "B. Organiser une revue des risques et de durabilité avec le fournisseur et des experts pour évaluer des options d'acheminement d'énergie verte avant de modifier les lignes de base.",
        "C. Acheter secrètement des crédits carbone pour compenser sans informer le sponsor.",
        "D. Ignorer l'objectif de durabilité pour respecter l'échéancier."
      ] : [
        "A. Terminate the cloud vendor contract immediately.",
        "B. Convene a risk and sustainability review with the vendor and technical experts to evaluate green energy hosting routing before adjusting baselines.",
        "C. Secretly purchase carbon credits to offset the difference without informing stakeholders.",
        "D. Disregard sustainability targets to protect the schedule."
      ],
      correct_option: "B",
      explanation: isFr
        ? "Le principe de responsabilité (Stewardship) du PMBOK 8 impose la prise en compte des critères environnementaux via une analyse méthodique des options de réduction carbone."
        : "PMBOK 8 Stewardship mandates environmental sustainability and structured risk review to evaluate carbon mitigation options balanced against project constraints.",
      pmbok_8_reference: "PMBOK 8 Principles: Stewardship & Focus on Value | Process Domain",
      tags: ["Case Study", "Sustainability", "Procurement Risk"]
    },

    // Q6 (CS2)
    {
      question_id: "exam_q_6",
      eco_domain: "People",
      methodology: "Predictive",
      case_study_id: "cs_2",
      case_study_title: cs2Title,
      case_study_scenario: cs2Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 6/180 - Question 1 de l'Étude de Cas 2] Des représentants de riverains bloquent l'accès au chantier d'un micro-réseau solaire, craignant les radiations électromagnétiques et le bruit. Que doit faire le chef de projet en PREMIER ?"
        : "[Slot 6/180 - Case Study 2 Question 1] Local neighborhood representatives block access to a solar microgrid site, citing concerns over electromagnetic radiation and environmental noise. What should the PM do FIRST?",
      options: isFr ? [
        "A. Demander l'intervention des forces de l'ordre pour déblayer l'accès.",
        "B. Organiser une réunion publique d'information avec des experts techniques pour présenter les audits de sécurité et répondre de manière transparente aux inquiétudes.",
        "C. Déplacer unilatéralement le site solaire sans approbation.",
        "D. Poursuivre les travaux en cachette pendant la nuit."
      ] : [
        "A. Request police intervention to clear the site entrance.",
        "B. Organize an open community town hall with technical experts to share safety audits and address public concerns transparently.",
        "C. Relocate the solar site unilaterally without approval.",
        "D. Continue construction work secretly during nighttime."
      ],
      correct_option: "B",
      explanation: isFr
        ? "L'engagement proactif et transparent des parties prenantes locales favorise la confiance et résout les conflits communautaires sans escalade coercitive."
        : "Proactive and transparent stakeholder engagement builds trust and resolves community opposition constructively without coercive escalation.",
      pmbok_8_reference: "PMBOK 8 Principles: Stakeholders & Stewardship | People Domain",
      tags: ["Case Study", "Community Engagement", "Conflict Resolution"]
    },
    // Q7 (CS2)
    {
      question_id: "exam_q_7",
      eco_domain: "Process",
      methodology: "Predictive",
      case_study_id: "cs_2",
      case_study_title: cs2Title,
      case_study_scenario: cs2Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 7/180 - Question 2 de l'Étude de Cas 2] Le fabricant de capteurs IoT informe l'équipe d'un retard de livraison de 6 semaines lié à la chaîne d'approvisionnement des semi-conducteurs. Quelle est la meilleure réponse au risque ?"
        : "[Slot 7/180 - Case Study 2 Question 2] The primary IoT sensor manufacturer notifies the project team of a 6-week shipment delay due to semiconductor supply chain disruptions. What is the project manager's best risk response?",
      options: isFr ? [
        "A. Annuler immédiatement le projet de micro-réseau.",
        "B. Évaluer les réserves pour aléas, analyser les fournisseurs secondaires pré-qualifiés et réaliser une analyse d'impact sur le chemin critique.",
        "C. Forcer les ouvriers du chantier à faire des heures doubles une fois les capteurs arrivés.",
        "D. Cacher le retard au comité de pilotage."
      ] : [
        "A. Cancel the microgrid project immediately.",
        "B. Evaluate contingency reserves, assess pre-qualified alternative suppliers, and conduct a critical path impact analysis.",
        "C. Force site workers to work double shifts once sensors arrive.",
        "D. Conceal the delay from the steering committee."
      ],
      correct_option: "B",
      explanation: isFr
        ? "Une gestion rigoureuse des risques implique l'évaluation des alternatives de chaîne d'approvisionnement et l'analyse du chemin critique avant d'impacter les lignes de base."
        : "Proper risk management evaluates supply chain contingency options and critical path impact before altering project baselines.",
      pmbok_8_reference: "PMBOK 8 Domain 2: Process | Risk & Procurement",
      tags: ["Case Study", "Supply Chain Risk", "Critical Path"]
    },
    // Q8 (CS2)
    {
      question_id: "exam_q_8",
      eco_domain: "Process",
      methodology: "Agile/Hybrid",
      case_study_id: "cs_2",
      case_study_title: cs2Title,
      case_study_scenario: cs2Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 8/180 - Question 3 de l'Étude de Cas 2] L'équipe logicielle agile termine l'algorithme d'équilibrage du réseau, mais l'équipe matériel prédictif ne peut pas tester en direct car l'installation des capteurs n'est réalisée qu'à 30%. Comment aligner ces méthodologies ?"
        : "[Slot 8/180 - Case Study 2 Question 3] The agile software team completes the grid-balancing algorithm, but the predictive hardware team cannot conduct live testing because physical sensor installation is only 30% complete. How should the PM align these methodologies?",
      options: isFr ? [
        "A. Forcer l'équipe logicielle à geler tous les travaux jusqu'à ce que l'installation matérielle atteigne 100%.",
        "B. Mettre en place un logiciel de simulation de capteurs virtuels pour permettre des tests agiles continus avant le déploiement du matériel physique.",
        "C. Abandonner la méthodologie agile et convertir le logiciel en cycle en cascade.",
        "D. Déployer le logiciel non testé directement sur le réseau public."
      ] : [
        "A. Force the software team to freeze all work until physical sensor installation reaches 100%.",
        "B. Implement virtual sensor simulation software to enable continuous agile testing ahead of physical hardware readiness.",
        "C. Abandon agile methodology and convert software development to waterfall.",
        "D. Deploy untested software directly onto the live public grid."
      ],
      correct_option: "B",
      explanation: isFr
        ? "Dans les projets hybrides, la création de bancs d'essais ou simulations virtuelles permet de découpler le développement logiciel agile des contraintes matérielles prédictives."
        : "In hybrid delivery models, virtual simulation environments decouple agile software iterations from predictive physical hardware constraints.",
      pmbok_8_reference: "PMBOK 8 Principles: Adaptability & Delivery | Agile/Hybrid Integration",
      tags: ["Case Study", "Hybrid Delivery", "Quality Assurance"]
    },
    // Q9 (CS2)
    {
      question_id: "exam_q_9",
      eco_domain: "Process",
      methodology: "Agile/Hybrid",
      case_study_id: "cs_2",
      case_study_title: cs2Title,
      case_study_scenario: cs2Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 9/180 - Question 4 de l'Étude de Cas 2] Des tests automatisés révèlent une vulnérabilité de sécurité critique dans le micrologiciel IoT 48 heures avant l'installation sur le terrain. Le responsable technique suggère un correctif après déploiement. Que doit faire le chef de projet ?"
        : "[Slot 9/180 - Case Study 2 Question 4] Automated testing flags a critical security vulnerability in the IoT firmware 48 hours before planned field installation. The technical lead suggests patching it post-deployment. What should the PM do?",
      options: isFr ? [
        "A. Approuver l'application du correctif après le déploiement sur le terrain.",
        "B. Suspendre le déploiement des unités matérielles affectées jusqu'à ce que les tests de sécurité soient validés.",
        "C. Ignorer les tests pour les sites d'installation secondaires.",
        "D. Blâmer publiquement l'équipe d'assurance qualité."
      ] : [
        "A. Approve post-deployment patching in the field.",
        "B. Halt deployment of affected hardware units until security testing and verification are passed.",
        "C. Skip testing for minor installation sites.",
        "D. Blame the QA team publicly."
      ],
      correct_option: "B",
      explanation: isFr
        ? "Le principe de Qualité exige qu'aucune vulnérabilité critique ne soit déployée en production, la sécurité primant sur les échéances de livraison."
        : "Quality principles mandate that critical security defects must be resolved before releasing hardware to production.",
      pmbok_8_reference: "PMBOK 8 Principles: Quality | Process Domain: Quality Management",
      tags: ["Case Study", "Quality Management", "Cybersecurity Risk"]
    },
    // Q10 (CS2)
    {
      question_id: "exam_q_10",
      eco_domain: "Business Environment",
      methodology: "Predictive",
      case_study_id: "cs_2",
      case_study_title: cs2Title,
      case_study_scenario: cs2Scenario,
      series_type: "case_study",
      series_label: series1Label,
      scenario: isFr
        ? "[Slot 10/180 - Question 5 de l'Étude de Cas 2] Alors que la Phase 1 s'achève, les opérateurs municipaux refusent de prendre possession des installations, invoquant un manque de formation et de manuels d'exploitation. Que doit faire le chef de projet ?"
        : "[Slot 10/180 - Case Study 2 Question 5] As Phase 1 completes, municipal utility operators refuse to take operational ownership, citing a lack of training and operating manuals. What should the project manager do?",
      options: isFr ? [
        "A. Déclarer le projet clôturé et quitter le site.",
        "B. Organiser des sessions structurées de transfert de connaissances, fournir une documentation d'exploitation complète et obtenir la signature d'acceptation formelle.",
        "C. Poursuivre la municipalité en justice pour non-respect des engagements.",
        "D. Transmettre les fichiers de code bruts sans explication."
      ] : [
        "A. Declare the project completed and leave.",
        "B. Conduct structured operational training sessions, deliver comprehensive handoff documentation, and obtain formal acceptance sign-off.",
        "C. Sue the municipal utility for non-compliance.",
        "D. Hand over raw code files without training or documentation."
      ],
      correct_option: "B",
      explanation: isFr
        ? "La clôture de projet et le transfert de valeur nécessitent un transfert de connaissances complet et la signature formelle d'acceptation par les exploitants."
        : "Successful project closure requires formal handoff, operational enablement, and explicit stakeholder sign-off.",
      pmbok_8_reference: "PMBOK 8 Principles: Focus on Value | Process Domain: Project Closure",
      tags: ["Case Study", "Project Closure", "Knowledge Transfer"]
    }
  ];

  const blendedQuestions: PMPQuestion[] = [...caseStudyQuestions];
  const localDefaults = isFr ? DEFAULT_QUESTIONS_FR : DEFAULT_QUESTIONS;

  // Look up the placeholder template fixed once (per slot) in the blueprint at exam start, by
  // its language-independent question_id, in whichever language is currently being displayed.
  // Deliberately NOT re-drawn/reshuffled here: doing so would let a language switch mid-exam
  // silently swap an already-answered slot's question, corrupting its recorded score.
  const findTemplate = (templateId: string): PMPQuestion =>
    localDefaults.find(q => q.question_id === templateId) || localDefaults[0];

  // Questions 11 to 100 (Series 2: Scenario-Based Questions)
  for (let i = 10; i < 100; i++) {
    const target = blueprint[i - 10] || { templateId: localDefaults[0].question_id };
    const template = findTemplate(target.templateId);
    blendedQuestions.push({
      ...template,
      question_id: `exam_q_${i + 1}`,
      series_type: "scenario",
      series_label: series2Label,
      isPlaceholder: true,
      scenario: `[Slot ${i + 1}/180 - ${isFr ? 'Scénario Situationnel' : 'Situational Scenario'}] ${template.scenario}`
    });
  }

  // Questions 101 to 180 (Series 3: Strategic & Process Knowledge)
  for (let i = 100; i < 180; i++) {
    const target = blueprint[i - 10] || { templateId: localDefaults[0].question_id };
    const template = findTemplate(target.templateId);
    blendedQuestions.push({
      ...template,
      question_id: `exam_q_${i + 1}`,
      series_type: "final_series",
      series_label: series3Label,
      isPlaceholder: true,
      scenario: `[Slot ${i + 1}/180 - ${isFr ? 'Série Stratégique & Processus' : 'Strategic & Process Series'}] ${template.scenario}`
    });
  }

  return blendedQuestions;
}
