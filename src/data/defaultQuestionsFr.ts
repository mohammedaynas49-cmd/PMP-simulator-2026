import { PMPQuestion } from '../types';

export const DEFAULT_QUESTIONS_FR: PMPQuestion[] = [
  {
    question_id: "pmp_2026_001",
    eco_domain: "People",
    methodology: "Agile/Hybrid",
    scenario: "Une équipe de projet hybride conçoit un produit de consommation écologique. Le responsable marketing insiste sur l'introduction d'un assistant de génération de contenu par IA pour rédiger les brochures promotionnelles, tandis que le développeur principal s'inquiète du partage sécurisé des données et de la gouvernance de l'entreprise. Le scrum master observe que cette friction bloque la planification du sprint depuis trois jours consécutifs. Quelle est la meilleure PREMIÈRE action du scrum master dans cette situation ?",
    options: [
      "A. Demander à l'équipe d'exclure la tâche liée à l'outil d'IA du carnet de sprint actuel afin de protéger le budget et le délai de livraison.",
      "B. Demander au bureau de gestion des projets (PMO) ou au service juridique d'établir une charte d'utilisation de l'IA à l'échelle de l'entreprise avant de continuer.",
      "C. Faciliter un atelier technique collaboratif au cours duquel le développeur et le responsable marketing peuvent établir conjointement des lignes directrices temporaires de bac à sable (sandbox) et mener des expériences à risques limités.",
      "D. Escalader le point de blocage directement au sponsor du produit pour exiger une directive formelle sur l'approbation ou le rejet de l'intégration de l'IA."
    ],
    correct_option: "C",
    explanation: "Sous le leadership serviteur (Agile Practice Guide) et les principes fondamentaux du PMBOK 8 (gérance et adaptabilité), le chef de projet doit habiliter l'équipe à s'auto-organiser et à résoudre ses différends techniques de manière collaborative. Différer le problème (A) évite la situation, tandis que les escalades (B, D) court-circuitent les capacités d'auto-organisation de l'équipe. Faciliter un atelier technique (C) promeut la résolution créative de problèmes, l'apprentissage rapide à faible risque et le maintien de la dynamique d'innovation.",
    pmbok_8_reference: "Principes PMBOK 8 : Équipe et Adaptabilité | Guide Pratique Agile : Leadership Serviteur",
    tags: ["Intégration de l'IA", "Durabilité", "Dynamique d'équipe"]
  },
  {
    question_id: "pmp_2026_002",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "Un projet de développement d'infrastructure est engagé dans des objectifs stricts de durabilité dans le cadre des mandats d'entreprise Net Zero (zéro émission nette). Lors des audits de phase, un calcul de carbone basé sur des données réelles révèle que l'itinéraire de transport du fournisseur de béton génère des émissions de 14 % supérieures à celles budgétisées, bien que le béton lui-même respecte toutes les contraintes de qualité. Selon les directives du PMBOK 8e édition, que devrait faire le chef de projet ENSUITE ?",
    options: [
      "A. Résilier immédiatement le contrat d'approvisionnement avec le fournisseur de béton et lancer un tout nouveau cycle d'appel d'offres.",
      "B. Convoquer une session de revue des risques avec le fournisseur et des experts en durabilité pour analyser les profils d'options, tels que des biocarburants alternatifs ou des itinéraires de compensation, avant de modifier la référence de base (baseline).",
      "C. Demander un budget supplémentaire au sponsor pour acheter des crédits carbone, permettant ainsi au projet de se poursuivre avec le plan de transport existant.",
      "D. Réviser la référence de base de durabilité à la hausse dans le journal de gestion des changements et continuer à protéger le calendrier du chemin critique."
    ],
    correct_option: "B",
    explanation: "Le principe fondamental de Gérance (Stewardship) du PMBOK 8 exige le respect de la durabilité environnementale, tandis que le domaine Processus se concentre sur une prise de décision axée sur les données et consciente des risques. résilier le contrat (A) est une réaction disproportionnée qui ajoute des risques majeurs de livraison. L'achat de crédits carbone (C) sans explorer de réductions actives va à l'encontre de la gérance éthique. Réécrire arbitrairement les objectifs (D) contourne le contrôle des changements. Mener une revue des risques (B) permet de trouver une solution équilibrée.",
    pmbok_8_reference: "Principes PMBOK 8 : Gérance et Focalisation sur la Valeur | Domaine Processus : Risques et Approvisionnements",
    tags: ["Durabilité", "Gestion par les Données", "Gestion des Risques"]
  },
  {
    question_id: "pmp_2026_003",
    eco_domain: "Business Environment",
    methodology: "Agile/Hybrid",
    scenario: "Un fournisseur de logiciels amorce une transition prédictive vers une méthodologie hybride dynamique. Un organisme de réglementation majeur publie un projet de directive exigeant que tous les logiciels intégrant des algorithmes d'apprentissage automatique se conforment à des audits de traçabilité stricts dans quatre mois. Le carnet de produit (product backlog) agile actuel ne prend pas cela en compte. Que doit faire le chef de projet en PREMIER ?",
    options: [
      "A. Interrompre immédiatement tous les cycles de développement en cours et charger les développeurs d'étudier le texte réglementaire.",
      "B. Enregistrer la mise à jour réglementaire comme un risque à probabilité élevée, et organiser une session d'affinage du carnet (refinement) avec le Product Owner pour analyser l'impact et planifier des récits utilisateurs (user stories) de traçabilité.",
      "C. Déposer une requête formelle auprès de l'organisme de réglementation pour demander un délai de mise en conformité au motif que le projet est déjà en cours de développement.",
      "D. Implémenter immédiatement les règles de traçabilité dans le code et informer le Product Owner ultérieurement lors de la revue de sprint."
    ],
    correct_option: "B",
    explanation: "Selon le PMP ECO (Business Environment - Domaine 3 : Évaluer et gérer la conformité) et le Guide Pratique Agile, lorsque des facteurs de conformité externes surviennent, le chef de projet doit évaluer l'impact, documenter le risque et collaborer avec le Product Owner pour affiner le carnet. Arrêter tout travail (A) est prématuré. Pétitionner pour une extension (C) est irréaliste, et faire des changements de code secrets (D) contourne le rôle clé du Product Owner.",
    pmbok_8_reference: "Principes PMBOK 8 : Gérance (Conformité) | Domaine 3 : Environnement Commercial (Conformité)",
    tags: ["Intégration de l'IA", "Conformité", "Affinage du Carnet"]
  },
  {
    question_id: "pmp_2026_004",
    eco_domain: "People",
    methodology: "Agile/Hybrid",
    scenario: "Lors d'une mêlée quotidienne (daily standup), un membre d'une équipe virtuelle travaillant sur un tableau de bord analytique de durabilité signale que sa région subit des pannes d'électricité récurrentes et qu'il ne peut s'engager sur des horaires stables. Deux collègues l'accusent de négliger les tâches du sprint. Comment le chef de projet leader-serviteur doit-il réagir pour préserver la confiance et la sécurité psychologique ?",
    options: [
      "A. Rappeler au membre bloqué ses engagements contractuels et mettre en place un logiciel de suivi quotidien des tâches.",
      "B. Organiser un échange d'équipe bienveillant et empathique, discuter d'options temporaires de partage de tâches et coordonner la formation croisée pour soulager les goulots d'étranglement.",
      "C. Escalader la situation aux ressources humaines pour gérer les interruptions régionales d'électricité tout en cherchant un développeur de remplacement.",
      "D. Suggérer au membre de l'équipe de prendre un congé sans solde jusqu'à ce que les services publics locaux se stabilisent, et redistribuer ses tâches d'autorité."
    ],
    correct_option: "B",
    explanation: "Un leader serviteur donne la priorité aux personnes (PMP ECO Domaine 1) et favorise un environnement bienveillant. Les principes du PMBOK 8 reposent sur la sécurité psychologique, la pensée systémique et la résilience collective. Être rigide collectivement (A), licencier (C) ou forcer un congé sans solde (D) détruit la confiance. Organiser une redistribution collaborative (B) préserve la synergie d'équipe.",
    pmbok_8_reference: "Principes PMBOK 8 : Respect et Pensée Systémique | Domaine Personnel : Conduite des conflits et soutien d'équipe",
    tags: ["Dynamique d'équipe", "Durabilité", "Leadership Serviteur"]
  },
  {
    question_id: "pmp_2026_005",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "Un projet de technologie agricole utilise la télémétrie par drone basée sur des données massives pour surveiller la santé des cultures. Le comité directeur de parties prenantes affirme que les jeux de données bruts de plusieurs téraoctets sont trop complexes et confus, ce qui l'amène à suspendre son soutien financier. Quelle est la meilleure réponse du chef de projet pour sécuriser l'alignement ?",
    options: [
      "A. Distribuer tous les fichiers de données bruts via un stockage cloud et exiger que le comité directeur embauche des analystes dédiés pour les interpréter.",
      "B. Créer des tableaux de bord visuels simplifiés et pertinents détaillant l'empreinte carbone et les tendances de rendement agricole, adaptés précisément aux intérêts stratégiques du comité directeur.",
      "C. Remplacer les analyses par drone par de simples feuilles de calcul manuelles pour éviter la surcharge d'informations.",
      "D. Escalader le manque de collaboration du comité directeur auprès du parrain exécutif de l'entreprise pour exiger le rétablissement immédiat du financement."
    ],
    correct_option: "B",
    explanation: "La mobilisation efficace des parties prenantes (PMBOK 8) exige que les communications soient adaptées à leurs besoins spécifiques. Un comité directeur requiert des résumés stratégiques axés sur la valeur métier (rendements, conformité environnementale) plutôt que des données brutes écrasantes (B). Envoyer des données brutes (A) ou réduire drastiquement la qualité technologique (C) n'est pas professionnel.",
    pmbok_8_reference: "Domaines PMBOK 8 : Parties Prenantes et Communication | ECO Domaine 2 : Processus (Mobiliser les Parties Prenantes)",
    tags: ["Gestion par les Données", "Mobilisation des Parties Prenantes"]
  },
  {
    question_id: "pmp_2026_006",
    eco_domain: "Process",
    methodology: "Agile/Hybrid",
    scenario: "Une équipe de développement logiciel a intégré des outils d'IA générative dans son environnement de développement. Certains développeurs rapportent que le code produit manque de sécurité lors des tests de vulnérabilité, tandis que d'autres louent sa rapidité. Le Product Owner souhaite écrire des récits de tests de performance mais ne sait comment les structurer. Que doit proposer le chef de projet en premier ?",
    options: [
      "A. Interdire complètement l'utilisation de l'outil d'IA jusqu'à ce que le fournisseur certifie et garantisse l'absence totale de bogues ou failles.",
      "B. Planifier des sessions d'analyse (spikes) ou un court atelier pour définir des garde-fous de sécurité et intégrer des outils d'audit automatisés dans la pipeline d'intégration continue (CI/CD).",
      "C. Ordonner aux développeurs de tests de doubler la durée de leurs tests manuels d'assurance qualité (QA) pour intercepter toutes les failles.",
      "D. Mettre en place des binômes de programmation (pair programming) traditionnels et ignorer complètement l'apport de l'assistant d'IA."
    ],
    correct_option: "B",
    explanation: "Selon les standards du PMBOK 8 (Domaine Qualité) et le Guide Pratique Agile, intégrer des contrôles de conformité automatisés au sein des pipelines de déploiement (CI/CD) et mener de courts spikes d'analyse constituent les meilleures stratégies qualité proactives (B). Bannir l'innovation (A) ou alourdir inutilement les goulots d'étranglement de tests manuels (C) nuit à l'efficacité globale.",
    pmbok_8_reference: "Domaines PMBOK 8 : Qualité et Adaptabilité | Processus : Déterminer la méthodologie appropriée",
    tags: ["Intégration de l'IA", "Qualité du Processus", "Sécurité CI/CD"]
  },
  {
    question_id: "pmp_2026_007",
    eco_domain: "Business Environment",
    methodology: "Predictive",
    scenario: "Un consortium d'ingénierie international conçoit une usine de purification d'eau zéro émission. Au cours de la phase de planification, plusieurs réglementations municipales locales modifient leurs exigences concernant les compensations carbone. Le chef de projet craint que ces changements constants ne provoquent une dérive des objectifs du projet (scope creep). Comment doit-il procéder pour encadrer la gouvernance en toute sécurité ?",
    options: [
      "A. Refuser tout ajustement de périmètre en se référant strictement à la charte de projet d'origine signée pour éviter toute dérive.",
      "B. Établir un comité d'alignement réglementaire conjoint avec les représentants de la municipalité, et intégrer les revues de politiques locales au processus rigoureux du Comité de Contrôle des Changements (CCB).",
      "C. Demander au sponsor de déplacer l'emplacement de l'usine vers une municipalité ayant des exigences environnementales plus simples.",
      "D. Déléguer directement tous les ajustements municipaux à l'équipe d'ingénierie sans évaluer d'abord l'impact sur la référence de base."
    ],
    correct_option: "B",
    explanation: "Le domaine Environnement Commercial traite de la conformité et des facteurs externes. Un chef de projet professionnel s'appuie sur une gouvernance structurée. Refuser les changements nécessaires (A) ignore la réalité réglementaire. Déménager l'usine (C) est une fuite coûteuse. Autoriser des ajustements sauvages (D) détruit le contrôle de périmètre. Associer un comité d'alignement au CCB formel (B) assure conformité et contrôle.",
    pmbok_8_reference: "Principes PMBOK 8 : Pensée Systémique et Focalisation sur la Valeur | ECO Domaine 3 : Environnement Commercial",
    tags: ["Durabilité", "Gouvernance", "Contrôle des Changements"]
  },
  {
    question_id: "pmp_2026_008",
    eco_domain: "People",
    methodology: "Predictive",
    scenario: "Un chef de projet dirige un projet prédictif de centrale solaire thermique. L'ingénieur en thermodynamique principal, très expérimenté, refuse de saisir ses rapports d'avancement dans le portail de suivi basé sur les données réelles de l'entreprise, affirmant que l'application est fastidieuse et lui fait perdre un temps précieux d'ingénierie. Comment le chef de projet doit-il résoudre ce blocage ?",
    options: [
      "A. Soumettre officiellement un rapport disciplinaire pour insubordination à la direction générale.",
      "B. Rencontrer l'ingénieur en privé pour comprendre ses frustrations, lui expliquer la valeur systémique de la collecte de données, et co-concevoir une méthode de saisie simplifiée.",
      "C. Recruter un assistant administratif dédié pour le suivre quotidiennement et transcrire ses rapports d'activité à sa place.",
      "D. Autoriser l'ingénieur à s'affranchir de toute saisie afin de le ménager et débloquer les tâches technologiques cruciales."
    ],
    correct_option: "B",
    explanation: "Selon le principe de Leadership du PMBOK 8 et les compétences du domaine Personnel, le chef de projet doit privilégier l'empathie, l'écoute active et l'influence constructive pour éliminer les frictions internes. Rencontrer l'ingénieur en privé (B) permet d'identifier la racine du problème et de collaborer. Les mesures punitives (A), le gaspillage budgétaire (C) ou les passe-droits (D) endommagent la rigueur globale.",
    pmbok_8_reference: "Principes PMBOK 8 : Leadership et Empathie | Domaine Personnel : Gestion des conflits",
    tags: ["Gestion du Personnel", "Gestion par les Données", "Résolution de Conflits"]
  },
  {
    question_id: "pmp_2026_009",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "Un projet prédictif d'infrastructure affiche, à la date de reporting actuelle, une Valeur Planifiée (VP) de 180 000 $, une Valeur Acquise (VA) de 150 000 $ et un Coût Réel (CR) de 200 000 $. Que révèle l'Indice de Performance des Coûts (IPC), et que doit faire le chef de projet ENSUITE ?",
    options: [
      "A. IPC = 1,33, indiquant que le projet est largement sous le budget ; le chef de projet devrait réaffecter le surplus budgétaire à des ajouts de périmètre.",
      "B. IPC = 0,75, indiquant que le projet dépasse le budget ; le chef de projet devrait mener une analyse des causes profondes de l'écart avant de recommander des actions correctives.",
      "C. IPC = 0,83, indiquant que le calendrier est en avance ; le chef de projet devrait accélérer les lots de travaux restants.",
      "D. IPC = 1,20, indiquant une excellente efficacité des coûts ; aucune action supplémentaire n'est nécessaire."
    ],
    correct_option: "B",
    explanation: "IPC = VA / CR = 150 000 $ / 200 000 $ = 0,75, ce qui signifie que le projet ne génère que 0,75 $ de valeur pour chaque dollar dépensé — un dépassement de coûts significatif. Selon le PMBOK 8 et la prise de décision fondée sur les données, un IPC inférieur à 1,0 exige que le chef de projet enquête sur les causes profondes (erreurs d'estimation, dérive de périmètre, inefficacité des ressources) via une analyse des écarts avant toute action corrective, plutôt que de présumer un succès (A, D) ou de confondre performance des coûts et performance du calendrier, mesurée par l'IPD (SPI), et non l'IPC (C).",
    pmbok_8_reference: "PMBOK 8 Domaine Processus : Mesurer la Performance | Gestion de la Valeur Acquise (EVM)",
    tags: ["Gestion de la Valeur Acquise", "Indice de Performance des Coûts", "Quantitatif"]
  },
  {
    question_id: "pmp_2026_010",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "Un réseau de calendrier de projet comporte deux chemins du début à la fin : le Chemin 1 (Activités A-B-D) avec des durées de 4, 6 et 3 jours, et le Chemin 2 (Activités A-C-D) avec des durées de 4, 5 et 3 jours, les activités A et D étant partagées par les deux chemins. Quelle est la durée du chemin critique, et quelle séquence d'activités le définit ?",
    options: [
      "A. 12 jours, défini par le Chemin 2 (A-C-D), car il comporte moins d'activités.",
      "B. 13 jours, défini par le Chemin 1 (A-B-D), car il s'agit du chemin le plus long du réseau.",
      "C. 9 jours, défini par la combinaison la plus courte des activités non partagées (B et C uniquement).",
      "D. 16 jours, obtenu en additionnant les deux chemins pour représenter l'effort total du projet."
    ],
    correct_option: "B",
    explanation: "Le chemin critique est la séquence la plus longue d'activités dépendantes dans le diagramme de réseau, qui détermine la durée minimale possible du projet. Le Chemin 1 (A-B-D) totalise 4+6+3 = 13 jours, tandis que le Chemin 2 (A-C-D) totalise 4+5+3 = 12 jours. Puisque 13 jours est supérieur, le Chemin 1 est le chemin critique, et l'activité C du Chemin 2 dispose d'une marge totale de 1 jour. Les options A, C et D appliquent mal la méthode du chemin critique en choisissant le chemin le plus court, en isolant des activités non partagées, ou en additionnant les chemins au lieu de les comparer.",
    pmbok_8_reference: "PMBOK 8 Domaine Processus : Planifier l'Échéancier | Méthode du Chemin Critique (CPM)",
    tags: ["Gestion de l'Échéancier", "Méthode du Chemin Critique", "Quantitatif"]
  },
  {
    question_id: "pmp_2026_011",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "Une équipe de projet estime la durée d'une activité critique par l'estimation à trois points : Optimiste (O) = 8 jours, Le plus probable (M) = 12 jours, et Pessimiste (P) = 22 jours. En utilisant la formule PERT (loi bêta), quelle est la durée d'activité espérée ?",
    options: [
      "A. 14 jours, calculés à partir de la simple moyenne triangulaire des trois estimations.",
      "B. 13 jours, calculés à l'aide de la formule pondérée PERT (O + 4M + P) / 6.",
      "C. 10 jours, calculés en utilisant uniquement les estimations optimiste et la plus probable.",
      "D. 22 jours, calculés à partir de l'estimation pessimiste afin de garantir une marge de sécurité prudente."
    ],
    correct_option: "B",
    explanation: "La formule PERT (loi bêta) pondère l'estimation la plus probable quatre fois plus que les estimations optimiste et pessimiste : (O + 4M + P) / 6 = (8 + 48 + 22) / 6 = 78 / 6 = 13 jours. La distribution triangulaire (A) calcule à la place une simple moyenne (O+M+P)/3 = 14 jours, une technique différente et moins pondérée. Les options C et D ignorent complètement la formule standard.",
    pmbok_8_reference: "PMBOK 8 Domaine Processus : Estimer la Durée des Activités | Estimation à Trois Points (PERT)",
    tags: ["Estimation", "Estimation à Trois Points", "Quantitatif"]
  },
  {
    question_id: "pmp_2026_012",
    eco_domain: "Business Environment",
    methodology: "Predictive",
    scenario: "Une équipe d'approvisionnement finalise un contrat pour un composant dont le périmètre des travaux est totalement stable, bien défini, et présente un risque technique faible. L'organisation acheteuse souhaite minimiser son propre risque financier et transférer le risque de dépassement de coûts au vendeur. Quel type de contrat le chef de projet devrait-il recommander ?",
    options: [
      "A. Coût Plus Honoraires Incitatifs (CPIF), pour partager le risque et la récompense entre l'acheteur et le vendeur.",
      "B. Prix Forfaitaire Ferme (FFP), car le périmètre bien défini permet au vendeur d'absorber le risque de coût pour un prix fixé.",
      "C. Temps et Matériaux (T&M), pour conserver de la flexibilité sur des éléments de périmètre non définis.",
      "D. Coût Plus Pourcentage des Coûts (CPPC), pour permettre au vendeur de facturer sans limite selon l'effort déployé."
    ],
    correct_option: "B",
    explanation: "Un contrat à Prix Forfaitaire Ferme (FFP) convient lorsque le périmètre des travaux est stable, bien défini, et présente un faible risque de changement, car le vendeur assume le risque de tout dépassement de coûts pour un prix fixe convenu. Les contrats à remboursement de coûts comme le CPIF (A) ou le CPPC (D) conviennent mieux à un périmètre mal défini ou évolutif où le risque est partagé avec l'acheteur ou assumé par celui-ci, et le T&M (C) convient à des missions courtes à effort non défini, non à un livrable bien défini.",
    pmbok_8_reference: "PMBOK 8 Domaine Environnement Commercial : Approvisionnements | Types de Contrats",
    tags: ["Approvisionnements", "Types de Contrats"]
  },
  {
    question_id: "pmp_2026_013",
    eco_domain: "Business Environment",
    methodology: "Predictive",
    scenario: "Lors de la planification des approvisionnements, une analyse de faire ou faire-faire (make-or-buy) révèle que la fabrication en interne d'un composant de sécurité spécialisé exposerait le projet à un risque important de conformité et de responsabilité, faute d'expertise interne suffisante. Un fournisseur externe qualifié propose de fabriquer le composant dans le cadre d'un contrat à prix forfaitaire incluant des clauses de responsabilité définies. Que doit faire le chef de projet ?",
    options: [
      "A. Fabriquer le composant en interne malgré l'analyse, afin de conserver un contrôle total sur la qualité.",
      "B. Poursuivre avec le fournisseur externe, en transférant le risque de conformité et de responsabilité via le contrat à prix forfaitaire et ses clauses de responsabilité.",
      "C. Annuler entièrement l'exigence relative au composant de sécurité pour éviter tout risque.",
      "D. Répartir le travail à parts égales entre le personnel interne et le fournisseur sans clarifier les responsabilités."
    ],
    correct_option: "B",
    explanation: "Lorsqu'une analyse de faire ou faire-faire montre que la capacité interne est insuffisante pour gérer un risque en toute sécurité, transférer ce risque à un tiers qualifié par contrat (transfert de risque) est une réponse standard alignée sur le PMBOK, en particulier lorsque des clauses de responsabilité formalisent l'imputabilité. Insister pour travailler en interne malgré l'analyse (A) ignore les conclusions fondées sur les données, annuler le périmètre (C) est une réaction disproportionnée, et répartir le travail sans clarifier les responsabilités (D) crée des lacunes de gouvernance.",
    pmbok_8_reference: "PMBOK 8 Domaine Environnement Commercial : Approvisionnements | Transfert de Risque",
    tags: ["Approvisionnements", "Transfert de Risque", "Analyse Faire ou Faire-Faire"]
  },
  {
    question_id: "pmp_2026_014",
    eco_domain: "People",
    methodology: "Predictive",
    scenario: "Dans une organisation matricielle forte, un analyste métier affecté au projet reçoit pour instruction de son responsable fonctionnel de prioriser le reporting interne du département plutôt que les engagements du sprint, créant un conflit direct avec la matrice RACI du projet, qui désigne cet analyste comme Responsable (Accountable) d'un livrable critique. Que doit faire le chef de projet en PREMIER ?",
    options: [
      "A. Signaler immédiatement le responsable fonctionnel à la direction générale pour violation de la matrice RACI.",
      "B. Rencontrer directement le responsable fonctionnel pour clarifier l'attribution RACI et les priorités de ressources, et négocier une résolution qui protège le livrable critique.",
      "C. Réaffecter le livrable à un autre membre de l'équipe sans consulter le responsable fonctionnel.",
      "D. Demander à l'analyste métier d'ignorer complètement les instructions de son responsable fonctionnel."
    ],
    correct_option: "B",
    explanation: "Dans les organisations matricielles, les conflits de ressources entre priorités du projet et priorités fonctionnelles sont courants et doivent d'abord être résolus par la négociation directe et la clarification des responsabilités à l'aide d'outils comme la matrice RACI, conformément aux principes du PMBOK 8 sur la collaboration avec les parties prenantes et la gouvernance organisationnelle. Escalader immédiatement (A) contourne la résolution collaborative, réaffecter silencieusement le travail (C) fragilise la structure RACI, et demander à l'analyste d'ignorer son responsable (D) crée un conflit organisationnel supplémentaire.",
    pmbok_8_reference: "PMBOK 8 Domaine Personnel : Gestion des Conflits | Structures Organisationnelles et RACI",
    tags: ["Structure Organisationnelle", "RACI", "Résolution de Conflits"]
  },
  {
    question_id: "pmp_2026_015",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "Un registre des risques identifie une défaillance potentielle d'un fournisseur avec une probabilité d'occurrence de 25 % et un impact de coût de 200 000 $ si elle survient. Une réponse au risque proposée (qualifier un fournisseur de secours) coûte 30 000 $ et réduirait la probabilité d'occurrence à 5 %. Sur la base de l'analyse de la Valeur Monétaire Attendue (VME), le chef de projet doit-il mettre en œuvre cette réponse ?",
    options: [
      "A. Non, car le coût de la réponse de 30 000 $ dépasse la probabilité initiale du risque de 25 %.",
      "B. Oui, car la réponse réduit la VME du risque de -50 000 $ à une VME combinée de -40 000 $ (coût de la réponse plus exposition résiduelle), améliorant le résultat attendu du projet.",
      "C. Non, car l'analyse de la VME ne s'applique qu'aux opportunités, pas aux menaces.",
      "D. Oui, mais uniquement si la défaillance du fournisseur est reclassée comme un risque connu-inconnu."
    ],
    correct_option: "B",
    explanation: "Sans la réponse, la VME = 25 % x -200 000 $ = -50 000 $. Avec la réponse, la VME combinée = -30 000 $ (coût de la réponse) + (5 % x -200 000 $ = -10 000 $) = -40 000 $. Puisque -40 000 $ représente une perte attendue inférieure à -50 000 $, la réponse constitue un bon investissement. La VME s'applique aussi bien aux menaces qu'aux opportunités (ce qui exclut C), et la catégorie du risque (D) n'a aucune incidence sur la comparaison quantitative ; l'option A interprète mal la base de comparaison.",
    pmbok_8_reference: "PMBOK 8 Domaine Processus : Gestion des Risques | Analyse de la Valeur Monétaire Attendue (VME)",
    tags: ["Gestion des Risques", "Valeur Monétaire Attendue", "Quantitatif"]
  },
  {
    question_id: "pmp_2026_016",
    eco_domain: "Process",
    methodology: "Agile/Hybrid",
    scenario: "Une équipe Kanban livrant une plateforme numérique constate que de nombreuses tâches restent bloquées dans la colonne « En Révision », et que les membres de l'équipe continuent de tirer de nouvelles tâches vers « En Cours » pour rester occupés, ce qui fait augmenter régulièrement le temps de cycle. Que devrait recommander le chef de projet / facilitateur en PREMIER ?",
    options: [
      "A. Ajouter davantage de développeurs à la colonne « En Révision » pour résorber le retard plus rapidement.",
      "B. Instaurer ou abaisser les limites de travail en cours (WIP) afin que l'équipe se concentre en essaim sur la finalisation des tâches existantes avant d'en démarrer de nouvelles.",
      "C. Supprimer entièrement le tableau Kanban et le remplacer par une simple liste de tâches.",
      "D. Demander aux membres de l'équipe d'arrêter les révisions de code pour accélérer le débit."
    ],
    correct_option: "B",
    explanation: "Une hausse du temps de cycle combinée à une colonne goulot d'étranglement est un signe classique que les limites de travail en cours (WIP) sont trop élevées ou non appliquées. Les principes Kanban recommandent de limiter le WIP afin que l'équipe se concentre sur la finalisation du travail en cours (essaimage sur les goulots d'étranglement) plutôt que de démarrer de nouvelles tâches, ce qui améliore l'efficacité du flux. Ajouter du personnel sur un goulot d'étranglement sans traiter le flux (A) ne résout pas nécessairement le problème de processus, supprimer le système visuel (C) élimine l'outil de diagnostic lui-même, et arrêter les révisions de code (D) sacrifie la qualité au profit du débit.",
    pmbok_8_reference: "PMBOK 8 Domaine Processus : Gérer le Flux | Guide Pratique Agile : Kanban et Limites WIP",
    tags: ["Kanban", "Efficacité du Flux", "Agile"]
  },
  {
    question_id: "pmp_2026_017",
    eco_domain: "Process",
    methodology: "Agile/Hybrid",
    scenario: "Lors de la revue de sprint, le Product Owner rejette plusieurs éléments « terminés » du backlog car ils manquent de couverture de tests automatisés et de documentation à jour, alors même que les développeurs considèrent le code fonctionnel comme achevé. C'est le troisième sprint consécutif où cela se produit. Que doit faire le Scrum Master pour éviter que cela se reproduise ?",
    options: [
      "A. Demander au Product Owner d'accepter systématiquement les éléments futurs, quelle que soit la couverture de tests, afin de maintenir la vélocité.",
      "B. Faciliter une session d'équipe pour définir ou affiner explicitement la Definition of Done (DoD), en veillant à ce qu'elle inclue des critères de test et de documentation compris par tous les rôles.",
      "C. Confier à une équipe QA séparée la correction de la documentation et des tests après chaque sprint, sans impliquer les développeurs.",
      "D. Prolonger systématiquement chaque sprint de plusieurs jours pour prévoir une marge de test supplémentaire."
    ],
    correct_option: "B",
    explanation: "Des désaccords répétés sur le caractère « terminé » du travail indiquent que l'équipe ne dispose pas d'une Definition of Done (DoD) claire et partagée. Le rôle du Scrum Master est de faciliter la définition ou l'affinement explicite de la DoD par l'équipe afin d'aligner les attentes (y compris les tests et la documentation) avant le prochain sprint. Forcer l'acceptation (A) nuit à la qualité et à l'autorité du Product Owner, externaliser le travail à une équipe séparée (C) viole la responsabilité collective pluridisciplinaire, et prolonger simplement les sprints (D) traite un problème de clarté de processus comme un problème de capacité.",
    pmbok_8_reference: "PMBOK 8 Domaine Processus : Gérer la Qualité | Guide Pratique Agile : Definition of Done",
    tags: ["Artéfacts Scrum", "Definition of Done", "Qualité"]
  },
  {
    question_id: "pmp_2026_018",
    eco_domain: "People",
    methodology: "Agile/Hybrid",
    scenario: "Une matrice d'évaluation de l'engagement des parties prenantes montre qu'un directeur régional à fort pouvoir et fort intérêt est actuellement classé comme « Résistant », alors que le niveau d'engagement souhaité est « Leader ». Le chef de projet ne lui a envoyé jusqu'à présent que des rapports d'avancement mensuels standards. Que doit faire le chef de projet pour combler cet écart ?",
    options: [
      "A. Continuer à envoyer les mêmes rapports mensuels, puisque la partie prenante reçoit déjà des mises à jour régulières.",
      "B. Réduire la communication avec la partie prenante afin d'éviter d'accroître sa résistance.",
      "C. Concevoir un plan d'engagement ciblé avec des interactions plus fréquentes et personnalisées (briefings, implication directe dans les décisions clés) afin de faire évoluer la partie prenante de « Résistant » vers « Leader ».",
      "D. Escalader la résistance de la partie prenante auprès de son supérieur pour imposer sa conformité."
    ],
    correct_option: "C",
    explanation: "La matrice d'évaluation de l'engagement des parties prenantes compare le niveau d'engagement actuel d'une partie prenante à son niveau souhaité et sert à planifier des actions ciblées pour combler l'écart. Un écart important pour une partie prenante à fort pouvoir et fort intérêt, comme passer de « Résistant » à « Leader », nécessite une stratégie d'engagement délibérée et personnalisée, avec des interactions plus fréquentes et de meilleure qualité, et non un reporting passif (A), un désengagement (B), ou une escalade coercitive (D), qui risquerait d'accentuer la résistance.",
    pmbok_8_reference: "PMBOK 8 Domaine Personnel : Engager les Parties Prenantes | Matrice d'Évaluation de l'Engagement des Parties Prenantes",
    tags: ["Engagement des Parties Prenantes", "Planification de la Communication"]
  }
];
