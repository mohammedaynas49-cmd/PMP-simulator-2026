import dotenv from "dotenv";
// Loads GEMINI_API_KEY (and any other server-side var) from .env.local into process.env for local
// `npm run dev`. Vite only does this substitution for its own client bundle (and only for
// VITE_-prefixed names), never for this Node process. In the real Cloud Run/AI Studio deployment
// there is no .env.local file, so this is a harmless no-op there - platform env vars already set
// on process.env take precedence, since dotenv never overrides an existing value.
dotenv.config({ path: ".env.local" });

import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_QUESTIONS } from "./src/data/defaultQuestions";
import { DEFAULT_QUESTIONS_FR } from "./src/data/defaultQuestionsFr";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initializeApp as initializeAdminApp, getApps as getAdminApps, App as AdminApp } from "firebase-admin/app";
import {
  getFirestore as getAdminFirestore,
  Firestore as AdminFirestore,
  CollectionReference,
  DocumentReference,
  DocumentData,
  Query
} from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import fs from "fs";
import { PDFParse } from "pdf-parse";

// The Firestore Admin SDK's underlying gRPC/auth layer can reject asynchronously - outside the
// promise chain of the specific call that triggered it - when no Google Cloud credentials are
// available (e.g. local development without `gcloud auth application-default login`, or without
// GOOGLE_APPLICATION_CREDENTIALS/emulator env vars set). Left unhandled, that crashes the whole
// process even though every Firestore call site in this file already has its own try/catch.
// In production (Cloud Run via AI Studio) Application Default Credentials are always available,
// so this only ever fires in a misconfigured local dev environment - log it and keep serving the
// rest of the app (Gemini question generation, local fallback questions, static assets) rather
// than taking the whole server down over an optional persistence feature.
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection] Continuing without crashing the server:", reason);
});

// Load Firebase Config dynamically
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);

// Initialize the server as a trusted backend via the Firebase ADMIN SDK (not the public client
// SDK the rest of the app uses): it bypasses firestore.rules entirely, which is what this
// process needs since it never signs in as an end user. In production (Cloud Run, via AI Studio)
// this authenticates automatically with the service's attached Application Default Credentials.
// For local development/testing, point FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST at
// the Firebase emulators and no credentials are needed at all.
const adminApp: AdminApp = getAdminApps().length
  ? getAdminApps()[0]
  : initializeAdminApp({ projectId: firebaseConfig.projectId });
const db = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const adminAuth = getAdminAuth(adminApp);

// Thin shims matching the modular client-SDK call shape (doc/getDoc/setDoc/getDocs/deleteDoc/
// collection) that the rest of this file was already written against, so the Admin SDK migration
// above doesn't require rewriting every call site - only the four `snapshot.exists()` call sites
// change, since Admin SDK snapshots expose `.exists` as a boolean property, not a method.
function doc(database: AdminFirestore, ...segments: string[]): DocumentReference {
  if (segments.length === 0 || segments.length % 2 !== 0) {
    throw new Error(`doc() requires an even number of path segments, got: ${segments.join("/")}`);
  }
  let ref: CollectionReference | DocumentReference = database.collection(segments[0]);
  for (let i = 1; i < segments.length; i++) {
    ref = i % 2 === 1 ? (ref as CollectionReference).doc(segments[i]) : (ref as DocumentReference).collection(segments[i]);
  }
  return ref as DocumentReference;
}

function collection(database: AdminFirestore, ...segments: string[]): CollectionReference {
  if (segments.length === 0 || segments.length % 2 !== 1) {
    throw new Error(`collection() requires an odd number of path segments, got: ${segments.join("/")}`);
  }
  let ref: CollectionReference | DocumentReference = database.collection(segments[0]);
  for (let i = 1; i < segments.length; i++) {
    ref = i % 2 === 1 ? (ref as CollectionReference).doc(segments[i]) : (ref as DocumentReference).collection(segments[i]);
  }
  return ref as CollectionReference;
}

function getDoc(ref: DocumentReference) {
  return ref.get();
}
function getDocs(ref: CollectionReference | Query) {
  return ref.get();
}
function setDoc(ref: DocumentReference, data: DocumentData) {
  return ref.set(data);
}
function deleteDoc(ref: DocumentReference) {
  return ref.delete();
}

// Without real Google Cloud credentials (plain local dev - no `gcloud auth
// application-default login`, no emulator env vars), the Admin SDK's underlying gRPC layer
// tries to resolve Application Default Credentials by reaching the GCE metadata server, which
// doesn't exist here - that connection attempt has to time out (observed: ~8 seconds) before
// falling back, on EVERY single Firestore call. On the hot path of generating a practice/exam
// question, that turns an instant local fallback into an 8+ second stall. Racing the Firestore
// call against a short timeout keeps the fallback experience fast in that environment, while
// changing nothing when real credentials resolve quickly (production on Cloud Run, or a
// configured local emulator).
const FIRESTORE_TIMEOUT_MS = 1500;
function withFirestoreTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore call timed out after ${FIRESTORE_TIMEOUT_MS}ms: ${label}`)), FIRESTORE_TIMEOUT_MS)
    )
  ]);
}

// Types for book upload and grounded learning Companion
interface UploadedBook {
  id: string;
  name: string;
  pageCount: number;
  charCount: number;
  chunkCount: number;
  uploadedAt: string;
  chunks: string[];
}

// Multer parsing configuration supporting up to 150MB files (for PMP books of 400+ pages).
// Restricted to .pdf/.txt - the only two formats the upload handler below actually knows how to
// parse (PDFParse or a raw UTF-8 read) - anything else used to be silently accepted and treated
// as raw text, which was never useful and just widened what an (admin, now that the route
// requires it) uploader could push through unchecked.
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 150 * 1024 * 1024 // 150 Megabytes limit
  },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || "").toLowerCase();
    if (name.endsWith(".pdf") || name.endsWith(".txt")) {
      cb(null, true);
    } else {
      cb(new Error("Only .pdf and .txt files are accepted."));
    }
  }
});

// Ensure dns resolution is fast in node
dns.setDefaultResultOrder("ipv4first");

async function seedPmbokGlossary() {
  try {
    const glossaryDocRef = doc(db, "books", "book_pmbok_glossary");
    const docSnap = await getDoc(glossaryDocRef);
    if (!docSnap.exists) {
      console.log("[Database Seeding] PMBOK_glossary.pdf is missing from Firestore. Seeding glossary definitions...");
      
      const chunks = [
        // Page 1
        `Glossary \n\nMany of the words defined here have broader, and in some cases, different dictionary definitions. In some cases, a single glossary term consists of multiple words (e.g., root cause analysis).\n\nacceptance criteria. A set of conditions that are met before deliverables are accepted. See also requirement.\naccuracy. Within the quality management system, accuracy is an assessment of correctness.\nactual cost (AC). The realized cost incurred for the work performed on an activity during a specific time period. See also budget at completion (BAC), earned value (EV), estimate at completion (EAC), estimate to complete (ETC), and planned value (PV).\nadaptive approach. A development approach in which the requirements are subject to a high level of uncertainty and volatility and are likely to change throughout the project.\nagile. A term used to describe a mindset of values and principles as set forth in the Manifesto for Agile Software Development.\nambiguity. A state of being unclear, having difficulty in identifying the cause of events, or having multiple options from which to choose.\nartifact. A document or other item created during a portfolio, program, or project to help manage it and provide information to the project team, stakeholders, and management.\nassumption. A factor in the planning process considered to be true, real, or certain, without proof or demonstration.\nauthority. The right to apply project resources, expend funds, make decisions, or give approvals.\nbaseline. The approved version of a work product that can be changed using formal change control procedures and is used as the basis for comparison to actual results.\nbenefit. A gain or asset realized by the organization and other stakeholders as the result of outcomes delivered.\nbid documents. All documents used to solicit information, quotations, or proposals from prospective sellers.\nbidder conference. Meetings with prospective sellers prior to the preparation of a bid or proposal to ensure all prospective vendors have a clear and common understanding of the procurement. Also known as contractor conferences, vendor conferences, or pre-bid conferences.`,
        
        // Page 2
        `blocker. See impediment.\nbudget. The approved estimate for the portfolio, program, or project, or any work breakdown structure component or schedule activity.\nbudget at completion (BAC). The sum of all budgets established for the work to be performed. See also actual cost (AC), earned value (EV), estimate at completion (EAC), estimate to complete (ETC), and planned value (PV).\nburn chart. A graphical representation of the work remaining in a timebox or the work completed toward the release of a product or project deliverable.\nbusiness value. The net quantifiable benefit derived from a business endeavor that may be tangible, intangible, or both.\ncadence. A rhythm of activities conducted throughout the project.\nchange. A modification to any formally controlled deliverable, project management plan component, or project document.\nchange control. A process whereby modifications to documents, deliverables, or baselines associated with the project are identified, documented, approved, or rejected. See also change control board (CCB).\nchange control board (CCB). A formally chartered group responsible for reviewing, evaluating, approving, delaying, or rejecting changes to the project, and for recording and communicating such decisions. See also change control.\nchange management. A comprehensive, cyclic, and structured approach for transitioning individuals, groups, and organizations from a current state to a future state with intended business benefits.\nClosing Focus Area. Processes performed to formally complete or close a project, phase, contract, or in some cases, to terminate a project before completion.\ncomplexity. A characteristic of a program or project or its environment that is difficult to manage due to human behavior, system behavior, and ambiguity.\nconfirmation bias. A type of cognitive bias that confirms preexisting beliefs or hypotheses.\nconformance. The degree to which the results meet the set quality requirements.\nconstraint. A limiting factor that affects the execution of a portfolio, program, project, or process.\ncontingency. An event or occurrence that could affect the execution of the project, which may be accounted for with a reserve.\ncontingency reserve. Time or money allocated in the schedule or cost baseline for known risks with active response strategies. See also management reserve.\ncontinuous delivery. The practice of delivering feature increments immediately to customers, often through the use of small batches of work and automation technology.\ncontract. A mutually binding agreement that obligates the seller to provide the specified product, service, or result and obligates the buyer to pay for it.\ncontrol. The process of comparing actual performance with planned performance, analyzing variances, assessing trends to effect process improvements, evaluating possible alternatives, and recommending appropriate corrective action as needed.`,
        
        // Page 3
        `cost performance index (CPI). A measure of the cost efficiency of budgeted resources expressed as the ratio of earned value to actual cost. See also schedule performance index (SPI).\ncost-reimbursable contract. A type of contract involving payment to the seller for the seller’s actual costs, plus a fee typically representing the seller’s profit.\ncost variance (CV). The amount of budget deficit or surplus at a given point in time, expressed as the difference between the earned value and the actual cost. See also schedule variance (SV).\ncrashing. A schedule compression technique used to shorten the schedule duration for the least incremental cost by adding resources. See also fast tracking.\ncriteria. Standards, rules, or tests on which a judgment or decision can be based or by which a product, service, result, or process can be evaluated.\ncritical path. The sequence of activities that represents the longest path through a project, which determines the shortest possible duration.\ncumulative flow diagram. A chart indicating features completed over time, features in other states of development, and those in the backlog.\ndashboard. A set of charts and graphs showing progress or performance against important measures of the project.\ndefinition of done (DoD). A checklist of all the criteria required to be met so that a deliverable can be considered ready for customer use.\nduration. The total number of work periods required to complete an activity or work breakdown structure component, expressed in hours, days, or weeks. See also effort.\nearned value (EV). The measure of work performed expressed in terms of the budget authorized for that work. See also actual cost (AC), budget at completion (BAC), estimate at completion (EAC), estimate to complete (ETC), and planned value (PV).\neffort. The number of labor units required to complete a schedule activity or work breakdown structure component, often expressed in hours, days, or weeks. See also duration.\nepic. A large, related body of work intended to hierarchically organize a set of requirements and deliver specific business outcomes.\nestimate. A quantitative assessment of the likely amount or outcome of a variable, such as project costs, resources, effort, or durations.\nestimate at completion (EAC). The expected total cost of completing all work expressed as the sum of the actual cost to date and the estimate to complete. See also actual cost (AC), budget at completion (BAC), earned value (EV), estimate to complete (ETC), and planned value (PV).\nestimate to complete (ETC). The expected cost to finish all the remaining project work. See also actual cost (AC), budget at completion (BAC), earned value (EV), estimate at completion (EAC), and planned value (PV).\nExecuting Focus Area. Consists of those processes performed to complete the work in a manner consistent with the integrated baseline, which can and should be changed whenever such a change would enhance the value proposition of the project.\nexpected monetary value (EMV). The estimated value of an outcome expressed in monetary terms.\nexplicit knowledge. Knowledge that can be codified using symbols such as words, numbers, and pictures.`,
        
        // Page 4
        `external dependencies. Relationships between project activities and non-project activities.\nfast tracking. A schedule compression technique in which activities or phases normally done in sequence are performed in parallel for at least a portion of their duration. See also crashing.\nfeature. A set of related requirements or functionalities that provides value to an organization.\nfixed-price contract. An agreement that sets the fee that will be paid for a defined scope of work regardless of the cost or effort to deliver it.\nflow. The measure of how efficiently work moves through a given process or framework.\nforecast. An estimate or prediction of conditions and events in the project’s future based on information and knowledge available at the time of the forecast.\nfunction point. An estimate of the amount of business functionality in an information system, used to calculate the functional size measurement of a software system.\nGantt chart. A bar chart of schedule information where activities are listed on the vertical axis, dates are shown on the horizontal axis, and activity durations are shown as horizontal bars placed according to start and finish dates.\ngovernance. The framework for directing and enabling an organization through its established policies, practices, and other relevant documentation.\nhistogram. A bar chart that shows the graphical representation of numerical data.\nhybrid approach. A combination of elements from both adaptive and predictive approaches that is useful when there is uncertainty or risk around the requirements.\nimpediment. An obstacle that prevents the team from achieving its objectives. Also known as a blocker.\nincremental approach. An adaptive development approach in which the deliverable is produced successively, adding functionality until the deliverable contains the necessary and sufficient capability to be considered complete.\nInitiating Focus Area. Those processes performed to define a new project or new phase of an existing project by obtaining authorization to start the project or phase.\ninternal dependencies. Relationships between two or more project activities.\nissue. A current condition or situation that may have an impact on one or more objectives. See also opportunity, risk, and threat.\niteration. A short cycle of development during which a product or deliverable is released or further matured. See also sprint.\niteration plan. A detailed plan for the current iteration.\niteration planning. A meeting to clarify the details of the backlog items, acceptance criteria, and work effort required to meet an upcoming iteration commitment.\niteration review. A meeting held at the end of an iteration to demonstrate the work that was accomplished during the iteration.\niterative approach. A development approach that focuses on an initial, simplified implementation then progressively elaborates, adding to the feature set until the final deliverable is complete.`,
        
        // Page 5
        `kanban board. A visualization tool that shows work in progress to help identify bottlenecks and overcommitments, thereby allowing the team to optimize the workflow. See also task board.\nknowledge. A mixture of experience, values and beliefs, contextual information, intuition, and insight that people use to make sense of new experiences and information.\nlessons learned. The knowledge gained during a project that shows how project events were addressed or should be addressed in the future for the purpose of improving future performance.\nlife cycle. See project life cycle.\nlog. A document used to record and describe or denote selected items identified during execution of a process or activity. Usually used with a modifier, such as issue, change, or assumption.\nmanagement reserve. Time or money that management sets aside in addition to the schedule or cost baseline and releases for unforeseen work that is within the scope of the portfolio, program, or project. See also contingency reserve.\nmandatory dependency. A relationship that is contractually required or inherent in the nature of the work.\nmethod. A means for achieving an outcome, output, result, or project deliverable.\nmethodology. A system of practices, techniques, procedures, and rules used by those who work in a discipline.\nmetric. A description of a project or product attribute and how to measure it.\nmilestone. A significant point or event in a portfolio, program, or project.\nmilestone schedule. A type of schedule that presents milestones with planned dates.\nminimum viable product (MVP). A concept used to define the scope of the first release of a solution to customers by identifying the fewest number of features or requirements that would deliver value.\nmodeling. Creating simplified representations of systems, solutions, or deliverables such as prototypes, diagrams, or storyboards.\nmonitoring. Collecting project performance data, producing performance measures, and reporting and disseminating performance information.\nMonitoring and Controlling Focus Area. Those processes required to track, review, and regulate the progress and performance of the project; identify any areas in which changes to the plan are required; and initiate the corresponding changes.\nMonte Carlo analysis/simulation. A method of identifying the potential impacts of risk and uncertainty using multiple iterations of a computer model to develop a probability distribution of a range of outcomes that could result from a decision or course of action.\nNet Promoter Score℠. An index that measures the willingness of customers to recommend an organization’s products or services to others.`,
        
        // Page 6
        `network path. A sequence of activities connected by logical relationships in a project schedule network diagram.\nobjective. Something toward which work is to be directed—a strategic position to be attained, a purpose to be achieved, a result to be obtained, a product to be produced, or a service to be performed.\nopportunity. A risk that would have a positive effect on one or more portfolio, program, or project objectives. See also issue, risk, and threat.\norganizational breakdown structure. A hierarchical representation of the project organization that illustrates the relationship between project activities and the organizational units that will perform those activities.\noutcome. An end result or consequence of a process or project.\nperformance measurement. Measures that characterize physical or functional attributes relating to system operation.\nphase gate. A review at the end of a phase in which a decision is made to continue to the next phase, to continue with modification, or to end a program or project. See also project phase.\nplan. A proposed means of accomplishing something.\nplanned value (PV). The authorized budget assigned to scheduled work. See also actual cost (AC), budget at completion (BAC), earned value (EV), estimate at completion (EAC), and estimate to complete (ETC).\nPlanning Focus Area. Those processes that establish the total scope of the effort, define and refine the objectives, and develop the course of action required to attain those objectives.\nportfolio. A collection of programs, projects, and operations managed as a group to maximize overall value delivery and achieve strategic objectives, meet mandatory obligations, or generate income streams. See also program and project.\nportfolio management. The centralized management of one or more portfolios to achieve strategic objectives. See also program management and project management.\nprecision. Within the quality management system, precision is an assessment of exactness.\npredictive approach. A development approach in which the project scope, time, and cost are determined in the early phases of the life cycle.\nprioritization matrix. A scatter diagram that plots effort against value so as to classify items by priority.\nproduct. An artifact that is produced, is quantifiable, and can be either an end item in itself or a component item.\nproduct life cycle. A series of phases that represent the evolution of a product, from concept through delivery, growth, maturity, and to retirement. See also project life cycle.\nproduct management. The integration of people, data, processes, and business systems to create, maintain, and evolve a product or service throughout its life cycle.\nproduct owner. A person responsible for maximizing the value of the product and is accountable for the end product.\nproduct scope. The features and functions that characterize a product, service, or result. See also project scope and scope.`,
        
        // Page 7
        `program. A group of related projects and program activities managed in a coordinated manner to obtain benefits not available from managing them individually. See also portfolio and project.\nprogram management. The application of knowledge, skills, and principles to a program to achieve the program objectives and to obtain benefits and control not available by managing program components individually. See also portfolio management and project management.\nprogressive elaboration. The iterative process of increasing the level of detail in a project management plan as greater amounts of information and more accurate estimates become available.\nproject. A temporary initiative in a unique context undertaken to create value. See also portfolio and program.\nproject calendar. A calendar that identifies working days and shifts that are available for scheduled activities.\nproject governance. The framework, functions, and processes that guide project management activities in order to meet or exceed target project objectives.\nproject lead. A person who helps the project team to achieve the project objectives, typically by orchestrating the work of the project. See also project manager.\nproject life cycle. The series of phases that a project passes through from its start to its completion. See also product life cycle.\nproject management. The application of knowledge, skills, tools, and techniques to project activities to meet or exceed the intended value. See also portfolio management and program management.\nproject management body of knowledge (PMBOK). A term that describes the knowledge within the profession of project management.\nProject Management Focus Areas. A logical grouping of project management inputs, tools and techniques, and outputs. The Project Management Focus Areas include Initiating processes, Planning processes, Executing processes, Monitoring and Controlling processes, and Closing processes.\nproject management office (PMO). Organizational entities, typically established as departments or teams, primarily tasked with centralizing activities related to the management of portfolios, programs, and/or projects. The nature of these activities can vary according to the unique needs of each organization.\nproject management team. The members of the project team who are directly involved in project management activities.\nproject manager. The person assigned by the performing organization to lead the team that is responsible for achieving the project objectives. See also project lead.\nproject phase. A collection of logically related project activities that culminates in the completion of one or more deliverables. See also phase gate.\nproject review. An event at the end of a phase or project to assess the status, evaluate the value delivered, and determine if the project is ready to move to the next phase or transition to operations.\nproject scope. The work performed to deliver a product, service, or result with the specified features and functions. See also product scope and scope.\nproject sponsor. See sponsor.`,
        
        // Page 8
        `project success. The consensus view across intended beneficiaries, other stakeholders, and project participants that a project was perceived to have delivered value that was worth the effort and expense.\nproject team. A set of individuals performing the work of the project to achieve its objectives.\nprototype. A working model used to obtain early feedback on the expected product before actually building it.\nquality. The degree to which a set of inherent characteristics of a project deliverable helps to meet or exceed the project’s target objectives.\nregister. A written record of regular entries for evolving aspects of a project, such as risks, stakeholders, or defects.\nregulations. Requirements imposed by a governmental body. These requirements can establish product, process, or service characteristics, including applicable administrative provisions that have government-mandated compliance.\nrelease. One or more components of one or more products, which are intended to be put into production at the same time.\nrelease planning. The process of identifying a high-level plan for releasing or transitioning a product, deliverable, or increment of value.\nreport. A formal record or summary of information.\nrequirement. A condition or capability that is necessary to be present in a product, service, or result to satisfy a business need.\nreserve. A provision in the project management plan to mitigate cost and/or schedule risk, often used with a modifier (e.g., management reserve, contingency reserve) to provide further detail on what types of risk are meant to be mitigated.\nresponsibility. An assignment that can be delegated within a portfolio, program, or project management plan such that the assigned resource incurs a duty to perform the requirements of the assignment.\nresult. An output from performing project management processes and activities.\nrework. Action taken to bring a defective or nonconforming component into compliance with requirements or specifications.\nrisk. An uncertain event or condition that, if it occurs, has a positive or negative effect on one or more portfolio, program, or project objectives. See also issue, opportunity, and threat.\nrisk acceptance. A risk response strategy that involves acknowledging the risk and taking no action unless it occurs. Acceptance of the risk’s implication(s) usually means using schedule and/or cost reserves and accepting scope and/or quality reduction(s). See also risk avoidance, risk enhancement, risk escalation, risk exploiting, risk mitigation, risk sharing, and risk transference.\nrisk appetite. The degree of uncertainty an organization or individual is willing to accept in anticipation of a reward. See also risk threshold.\nrisk avoidance. A risk response strategy that involves eliminating the threat or protecting the portfolio, program, or project from its impact. See also risk acceptance, risk enhancement, risk escalation, risk exploiting, risk mitigation, risk sharing, and risk transference.\nrisk breakdown structure (RBS). A hierarchical representation of potential sources of risks.`,
        
        // Page 9
        `risk enhancement. A risk response strategy that involves increasing the probability of occurrence or impact of an opportunity. See also risk acceptance, risk avoidance, risk escalation, risk exploiting, risk mitigation, risk sharing, and risk transference.\nrisk escalation. A risk response strategy that involves transferring the ownership of the risk to a relevant party in the organization because the risk is outside of scope or the team does not have sufficient authority to address it. See also risk acceptance, risk avoidance, risk enhancement, risk exploiting, risk mitigation, risk sharing, and risk transference.\nrisk exploiting. A risk response strategy whereby the project team acts to ensure that an opportunity occurs. See also risk acceptance, risk avoidance, risk enhancement, risk escalation, risk mitigation, risk sharing, and risk transference.\nrisk exposure. An aggregate measure of the potential impact of all risks at any given point in time in a portfolio, program, or project.\nrisk mitigation. A risk response strategy that involves decreasing the probability of occurrence or impact of a threat. See also risk acceptance, risk avoidance, risk enhancement, risk escalation, risk exploiting, risk sharing, and risk transference.\nrisk review. The process of analyzing the status of existing risks and identifying new risks. May also be known as a risk reassessment.\nrisk sharing. A risk response strategy that involves allocating ownership of an opportunity to a third party that is best able to capture the opportunity or absorb the impact of the threat. See also risk acceptance, risk avoidance, risk enhancement, risk escalation, risk exploiting, risk mitigation, and risk transference.\nrisk threshold. The measure of acceptable variation around an objective that reflects the risk appetite of the organization and stakeholders. See also risk appetite.\nrisk transference. A risk response strategy that involves shifting the impact of a threat to a third party, together with ownership of the response. See also risk acceptance, risk avoidance, risk enhancement, risk escalation, risk exploiting, risk mitigation, and risk sharing.\nroadmap. A high-level timeline that depicts such things as milestones, significant events, reviews, and decision points.\nrole. A defined function to be performed by a project team member, such as testing, filing, inspecting, or coding.\nS-curve diagram. A graph that displays cumulative costs over a specified period of time.\nschedule model. A representation of the plan for executing the project’s activities including durations, dependencies, and other planning information, used to produce a project schedule along with other scheduling artifacts.\nschedule performance index (SPI). A measure of schedule efficiency expressed as the ratio of earned value to planned value. See also cost performance index (CPI).\nschedule variance (SV). A measure of schedule performance expressed as the difference between the earned value and the planned value. See also cost variance (CV).\nscope. The sum of the products, services, and results to be provided as a project. See also product scope and project scope.\nscope creep. The uncontrolled expansion to product or project scope without adjustments to time, cost, and resources.`,
        
        // Page 10
        `self-organizing team. A cross-functional team in which people assume leadership as needed to achieve the team’s objectives.\nspecification. An attribute that is necessary to be present in a project deliverable to help meet or exceed a target business objective.\nsponsor. An individual or a group that provides resources and support for the portfolio, program, or project, and is accountable for enabling success. See also stakeholder.\nsprint. A timeboxed interval within a project during which a usable and potentially releasable increment of a product is created. See also iteration.\nstakeholder. An individual, group, or organization that may affect, be affected by, or perceive itself to be affected by a decision, activity, or outcome of a portfolio, program, or project. See also sponsor.\nstandard. A document established by an authority, custom, or general consent as a model or example.\nstatement of work (SOW). A narrative description of products, services, or results to be delivered by the project.\nstatus meeting. A regularly scheduled meeting to exchange and analyze information about the current progress of the project and its performance.\nsteering committee. An advisory body of senior stakeholders who provide direction and support for the portfolio, program, or project team and make decisions outside of the team’s authority.\nstory point. A unit used to estimate the relative level of effort needed to implement a user story.\nstrategic plan. A high-level document that explains an organization’s vision and mission plus the approach that will be adopted to achieve this mission and vision, including the specific goals and objectives to be achieved during the period covered by the document.\nswarm. A method in which multiple team members focus collectively on resolving a specific problem or task.\ntacit knowledge. Personal knowledge that can be difficult to articulate and share such as beliefs, experience, and insights.\ntailoring. The deliberate adaptation of approach, governance, and processes to make them more suitable for the given environment and the work at hand.\ntask board. A visual representation of the progress of the planned work that allows everyone to see the status of the tasks. See also kanban board.\ntechnical performance measures. Quantifiable measures of technical performance that are used to ensure system components meet the technical requirements.\ntemplate. A partially complete document in a predefined format that provides a defined structure for collecting, organizing, and presenting information and data.\nthreat. A risk that would have a negative effect on one or more portfolio, program, or project objectives. See also issue, opportunity, and risk.\nthreshold. A predetermined value of a measurable project variable that represents a limit that requires action to be taken if it is reached.\nthroughput. The number of items passing through a process.`,
        
        // Page 11
        `time and materials (T&M) contract. A type of contract that is a hybrid contractual arrangement containing aspects of both cost-reimbursable and fixed-price contracts.\ntimebox. A short, fixed period of time in which work is to be completed.\ntolerance. The quantified description of acceptable variation for a quality requirement.\ntriple bottom line. A framework for considering the full cost of doing business by evaluating a company’s bottom line from the perspective of profit, people, and the planet.\nuncertainty. A lack of understanding and awareness of issues, events, path to follow, or solutions to pursue.\nuse case. An artifact for describing and exploring how a user interacts with a system to achieve a specific goal.\nvalidation. The assurance that a product, service, or result meets the needs of the customer and other identified stakeholders. See also verification.\nvalue. The excess of monetary and nonmonetary benefits over investment that is gained from achieving the goals of a portfolio, program, or project.\nvalue delivery system. A collection of strategic business activities aimed at building, sustaining, and/ or advancing an organization.\nvalue proposition. The value of a product or service that an organization communicates to its customers.\nvanity metric. A measure that appears to show some result but does not provide useful information for making decisions.\nvariance. A quantifiable deviation, departure, or divergence away from a known baseline or expected value.\nvariance at completion (VAC). A projection of the amount of budget deficit or surplus, expressed as the difference between the budget at completion and the estimate at completion. See also budget at completion (BAC), cost variance (CV), and estimate at completion (EAC).\nverification. The evaluation of whether or not a product, service, or result complies with a regulation, requirement, specification, or imposed condition. See also validation.\nvision statement. A summarized, high-level description about the expectations for a product such as target market, users, major benefits, and what differentiates the product from others in the market.\nvolatility. The possibility for rapid and unpredictable change.\nwaste. Activities that consume resources and/or time without adding value.\nwideband Delphi. An estimating method in which subject matter experts go through multiple rounds of producing estimates individually, with a team discussion after each round, until a consensus is achieved.\nwork package. The work defined at the lowest level of the work breakdown structure for which cost, effort, duration, and resources are estimated and managed.`
      ];

      const fullText = chunks.join("\n\n");

      await setDoc(glossaryDocRef, {
        id: "book_pmbok_glossary",
        name: "PMBOK_glossary.pdf",
        pageCount: 11,
        charCount: fullText.length,
        chunkCount: chunks.length,
        uploadedAt: new Date().toISOString()
      });

      await Promise.all(
        chunks.map((text, idx) => {
          const chunkDocRef = doc(db, "books", "book_pmbok_glossary", "chunks", `chunk_${idx}`);
          return setDoc(chunkDocRef, {
            chunkId: `chunk_${idx}`,
            index: idx,
            text: text
          });
        })
      );
      console.log("[Database Seeding] Successfully seeded PMBOK_glossary.pdf.");
    } else {
      console.log("[Database Seeding] PMBOK_glossary.pdf already exists in Firestore.");
    }
  } catch (err) {
    console.error("[Database Seeding] Failed to seed PMBOK glossary:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run database seeding on server startup
  seedPmbokGlossary();

  // Sets a conservative set of security-related HTTP response headers (CSP, X-Frame-Options,
  // etc.). `contentSecurityPolicy: false` because this app serves Vite's dev/build output
  // directly (inline scripts/styles during dev, hashed-but-uninventoried asset URLs in
  // production) - a default CSP would break the app outright rather than add real protection
  // without a proper per-asset policy, which is out of scope here.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(express.json());

  // Every Gemini-backed or Firestore-write endpoint requires a signed-in caller (including an
  // anonymous guest session - this only blocks fully unauthenticated script/curl abuse, not real
  // candidates). Previously NONE of these endpoints checked authentication at all - only
  // /api/admin/set-role did - so anyone on the internet could call them directly, at cost, no
  // account needed. Firestore's own security rules never covered this gap either: they only
  // govern direct client-SDK access, not this Express API.
  async function verifyBearerToken(req: express.Request) {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!idToken) {
      throw new Error("Missing bearer ID token.");
    }
    return adminAuth.verifyIdToken(idToken);
  }

  async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const decoded = await verifyBearerToken(req);
      (req as any).authUid = decoded.uid;
      (req as any).authIsAdminClaim = decoded.admin === true;
      next();
    } catch (err: any) {
      console.warn(`[Auth] Rejected ${req.method} ${req.path}: ${err?.message || err}`);
      res.status(401).json({ error: "Sign-in required." });
    }
  }

  // Stricter than requireAuth: also confirms the caller is an admin, the same way
  // firestore.rules' isAdmin() does (custom claim first, Firestore `role` field as a fallback for
  // a freshly console-bootstrapped admin who hasn't had the claim minted yet).
  async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const decoded = await verifyBearerToken(req);
      let isAdminCaller = decoded.admin === true;
      if (!isAdminCaller) {
        const callerSnap = await getDoc(doc(db, "sessions", decoded.uid));
        isAdminCaller = callerSnap.exists && callerSnap.data()?.role === "admin";
      }
      if (!isAdminCaller) {
        res.status(403).json({ error: "Admin access required." });
        return;
      }
      (req as any).authUid = decoded.uid;
      next();
    } catch (err: any) {
      console.warn(`[Auth] Rejected ${req.method} ${req.path}: ${err?.message || err}`);
      res.status(401).json({ error: "Sign-in required." });
    }
  }

  // Caps how often any single IP can hit the endpoints that cost real money (Gemini calls) or
  // real storage (uploads) - generous enough for a candidate's real usage pattern, tight enough
  // to blunt a scripted abuse loop from burning through the shared Gemini quota/budget.
  const generationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests - please slow down and try again in a few minutes." }
  });

  // Helper to lazily initialize Gemini client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      }
    }
    return aiClient;
  }

  // Robust wrapper to call generateContent with retry (exponential backoff) and model fallback (e.g., gemini-3.1-flash-lite)
  async function generateContentWithRetry(client: GoogleGenAI, options: { model: string; contents: any; config?: any }, maxRetries = 3) {
    let delay = 1000;
    let lastError: any = null;
    const modelsToTry = [options.model || "gemini-3.5-flash", "gemini-3.1-flash-lite"];

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Gemini API] Requesting ${modelName} (attempt ${attempt}/${maxRetries})...`);
          const response = await client.models.generateContent({
            ...options,
            model: modelName
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = err.message || "";
          const errStatus = err.status || (err.error && err.error.code) || 0;
          const isUnavailable = errStatus === 503 || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("RESOURCE_EXHAUSTED");

          console.warn(`[Gemini API] Attempt ${attempt} on ${modelName} failed. Status: ${errStatus}. Message: ${errMsg}`);

          if (isUnavailable && attempt < maxRetries) {
            console.log(`[Gemini API] Waiting ${delay}ms before next retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            // Stop retrying on this model if it's not a 503/UNAVAILABLE or if we reached max retries
            break;
          }
        }
      }
    }
    throw lastError || new Error("Failed to generate content after retries.");
  }

  // API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Fetch standard default questions
  app.get("/api/questions/defaults", (req, res) => {
    res.json({ questions: DEFAULT_QUESTIONS });
  });

  // --- ADMIN API ENDPOINTS ---

  // Grants or revokes the `admin` custom claim on a target user's Firebase Auth account. This is
  // the only place in the whole app that mints that claim, which is what firestore.rules'
  // isAdmin() checks first (see firestore.rules). The caller must already be an admin themselves
  // - either via the claim, or via the Firestore `role` fallback, which lets a freshly
  // console-bootstrapped admin (see README) mint their own claim exactly once.
  app.post("/api/admin/set-role", requireAdmin, async (req, res) => {
    try {
      const { targetUid, makeAdmin } = req.body || {};
      if (typeof targetUid !== "string" || targetUid.length === 0 || typeof makeAdmin !== "boolean") {
        return res.status(400).json({ error: "targetUid (string) and makeAdmin (boolean) are required." });
      }

      await adminAuth.setCustomUserClaims(targetUid, { admin: makeAdmin });

      // Mirror into Firestore purely for existing UI reads/display; the custom claim above is
      // now the source of truth that firestore.rules actually enforces. Being made an admin also
      // implies granted access - without this, a console-bootstrapped or freshly-promoted admin
      // could be left showing a stale 'pending'/'restricted' accessStatus in the Candidate
      // Directory (harmless in practice, since the app's own lockout gate always bypasses admins,
      // but confusing to see and worth keeping consistent).
      const targetRef = doc(db, "sessions", targetUid);
      const targetSnap = await getDoc(targetRef);
      if (targetSnap.exists) {
        const update: Record<string, any> = { role: makeAdmin ? "admin" : "candidate" };
        if (makeAdmin) {
          update.accessStatus = "granted";
        }
        await targetRef.update(update);
      }

      console.log(`[Admin] ${(req as any).authUid} set admin=${makeAdmin} for ${targetUid}`);
      res.json({ success: true, targetUid, admin: makeAdmin });
    } catch (err: any) {
      console.error("Error in /api/admin/set-role:", err);
      res.status(500).json({ error: err.message || "Failed to update role." });
    }
  });

  // --- PMP STUDY BOOKS API ENDPOINTS ---

  // Scans an uploaded document's chunks for EXISTING, ready-to-use multiple-choice questions
  // (the kind found in exam-prep books or sample exams) and persists any it finds verbatim into
  // the `questions` Firestore collection, tagged with `source_book_id` so they can be listed and
  // practiced later. This is distinct from /api/books/generate-question, which always drafts a
  // brand NEW question inspired by the material - this instead only extracts what's already
  // there, and skips silently (finding nothing) rather than inventing content if none is present.
  //
  // Runs as a fire-and-forget background task right after upload responds (see the upload
  // handler below), so a large document doesn't make the candidate wait on the upload itself.
  // Bounded to a fixed number of chunks per document to keep cost/latency predictable regardless
  // of document size; a book's own `extractedQuestionsCount` field reflects how far it got.
  const MAX_EXTRACTION_CHUNKS = 40;
  const EXTRACTION_BATCH_SIZE = 3;

  async function extractQuestionsFromBook(bookId: string, bookName: string, chunks: string[]) {
    const bookRef = doc(db, "books", bookId);
    const client = getGeminiClient();
    if (!client) {
      console.warn(`[Extraction] Gemini offline - skipping question extraction for "${bookName}".`);
      await bookRef.update({ extractionStatus: "skipped_offline", extractedQuestionsCount: 0 }).catch(() => {});
      return;
    }

    const chunksToScan = chunks.slice(0, MAX_EXTRACTION_CHUNKS);
    let extractedCount = 0;

    for (let i = 0; i < chunksToScan.length; i += EXTRACTION_BATCH_SIZE) {
      const batch = chunksToScan.slice(i, i + EXTRACTION_BATCH_SIZE);
      const batchText = batch.join("\n\n---\n\n");

      try {
        const extractionPrompt = `
        You are scanning an excerpt of a candidate's uploaded PMP study document for EXISTING,
        ready-to-use multiple-choice practice questions - such as those found in exam-prep books
        or sample exams - NOT generating new ones.

        Examine the text below. If it contains one or more COMPLETE multiple-choice questions -
        each with a clear question/scenario, exactly 4 answer options, and either an explicitly
        stated correct answer or an answer key/explanation elsewhere in the excerpt that lets you
        determine it with certainty - extract them. Preserve the original wording and language;
        do not invent, rephrase, embellish, or add scenario details that are not present.

        If the excerpt contains no complete extractable question (e.g. it is narrative prose,
        glossary definitions, or a partial/truncated question with fewer than 4 options or no
        determinable correct answer), return an empty "questions" array. Do not guess a correct
        answer if the source material does not make it clear.

        [DOCUMENT EXCERPT]
        ${batchText}
        [END DOCUMENT EXCERPT]
        `;

        const response = await generateContentWithRetry(client, {
          model: "gemini-3.5-flash",
          contents: extractionPrompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      eco_domain: { type: Type.STRING, enum: ["People", "Process", "Business Environment"] },
                      scenario: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correct_option: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
                      explanation: { type: Type.STRING },
                      methodology: { type: Type.STRING, enum: ["Agile/Hybrid", "Predictive"] },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["eco_domain", "scenario", "options", "correct_option", "explanation", "methodology", "tags"]
                  }
                }
              },
              required: ["questions"]
            }
          }
        }, 2);

        const rawText = response.text;
        if (!rawText) continue;

        const parsed = JSON.parse(rawText);
        const found = Array.isArray(parsed.questions) ? parsed.questions : [];

        for (const q of found) {
          if (
            !q || typeof q.scenario !== "string" || !Array.isArray(q.options) || q.options.length !== 4 ||
            !["A", "B", "C", "D"].includes(q.correct_option)
          ) {
            continue; // skip anything that doesn't cleanly match our schema rather than guessing
          }
          const questionId = `extracted_${bookId}_${extractedCount}`;
          await setDoc(doc(db, "questions", questionId), {
            question_id: questionId,
            eco_domain: q.eco_domain,
            scenario: q.scenario,
            options: q.options,
            correct_option: q.correct_option,
            explanation: q.explanation || "Extracted from uploaded study material.",
            pmbok_8_reference: `Extracted from: ${bookName}`,
            methodology: q.methodology === "Predictive" ? "Predictive" : "Agile/Hybrid",
            tags: Array.isArray(q.tags) ? q.tags.slice(0, 10) : [],
            source_book_id: bookId,
            grounded_book_name: bookName
          });
          extractedCount++;
        }
      } catch (err) {
        console.error(`[Extraction] Failed on chunk batch starting at ${i} for "${bookName}":`, err);
        // Best-effort: move on to the next batch rather than aborting the whole document.
      }
    }

    await bookRef.update({
      extractionStatus: "done",
      extractedQuestionsCount: extractedCount
    }).catch(err => console.error("[Extraction] Failed to update book doc with final count:", err));

    console.log(`[Extraction] Found ${extractedCount} extractable question(s) in "${bookName}" (scanned ${chunksToScan.length}/${chunks.length} chunks).`);
  }

  // Upload a PMP book (accepts PDF and TXT up to 150MB)
  app.post("/api/books/upload", requireAdmin, generationLimiter, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded." });
      }

      console.log(`Received file: ${req.file.originalname}, Size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);

      let parsedText = "";
      let pageCount = 1;

      if (req.file.originalname.toLowerCase().endsWith(".pdf")) {
        const parser = new PDFParse({ data: req.file.buffer });
        const result = await parser.getText();
        parsedText = result.text || "";
        pageCount = result.total || 1;
        await parser.destroy();
      } else {
        parsedText = req.file.buffer.toString("utf-8");
        pageCount = Math.ceil(parsedText.length / 3200) || 1;
      }

      if (!parsedText || parsedText.trim().length === 0) {
        return res.status(400).json({ error: "The file text content was empty/could not be decoded." });
      }

      // Chunk the extracted study text
      const chunks: string[] = [];
      const CHUNK_SIZE = 4000;
      const OVERLAP = 500;
      for (let i = 0; i < parsedText.length; i += (CHUNK_SIZE - OVERLAP)) {
        const chunkText = parsedText.slice(i, i + CHUNK_SIZE).trim();
        if (chunkText.length > 200) {
          chunks.push(chunkText);
        }
      }

      if (chunks.length === 0 && parsedText.trim().length > 0) {
        chunks.push(parsedText.trim());
      }

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const uploadedAt = new Date().toISOString();

      // Save book metadata doc to Firestore
      const bookDocRef = doc(db, "books", bookId);
      await setDoc(bookDocRef, {
        id: bookId,
        name: req.file.originalname,
        pageCount: pageCount,
        charCount: parsedText.length,
        chunkCount: chunks.length,
        uploadedAt: uploadedAt,
        extractionStatus: "pending",
        extractedQuestionsCount: 0
      });

      // Save chunk docs to subcollection in parallel
      await Promise.all(
        chunks.map((text, idx) => {
          const chunkDocRef = doc(db, "books", bookId, "chunks", `chunk_${idx}`);
          return setDoc(chunkDocRef, {
            chunkId: `chunk_${idx}`,
            index: idx,
            text: text
          });
        })
      );

      console.log(`Success Cloud Persist: Loaded book "${req.file.originalname}" with ${pageCount} pages, parsed and saved into Firestore.`);

      // Fire-and-forget: scan for pre-existing extractable questions in the background so the
      // upload response below doesn't wait on it, no matter how large the document is.
      extractQuestionsFromBook(bookId, req.file.originalname, chunks).catch(err =>
        console.error(`[Extraction] Unhandled failure for book "${req.file?.originalname}":`, err)
      );

      // Same fire-and-forget treatment for glossary term extraction, so it's ready (cached in
      // Firestore) before the first Definitions Search / Matching Exercise request needs it -
      // ensureGlossaryTermsExtracted() would otherwise still run it lazily on first use anyway.
      if (isGlossaryBookName(req.file.originalname)) {
        ensureGlossaryTermsExtracted(bookId, req.file.originalname).catch(err =>
          console.error(`[GlossaryExtraction] Unhandled failure for book "${req.file?.originalname}":`, err)
        );
      }

      res.json({
        success: true,
        book: {
          id: bookId,
          name: req.file.originalname,
          pageCount: pageCount,
          charCount: parsedText.length,
          chunkCount: chunks.length,
          uploadedAt: uploadedAt,
          extractionStatus: "pending",
          extractedQuestionsCount: 0
        }
      });
    } catch (err: any) {
      console.error("Critical error in book processing:", err);
      res.status(500).json({ error: `Could not parse student prep material: ${err.message}` });
    }
  });

  // Fetch list of uploaded books metadata from Firestore
  app.get("/api/books/list", requireAuth, async (req, res) => {
    try {
      const booksColRef = collection(db, "books");
      const querySnapshot = await withFirestoreTimeout(getDocs(booksColRef), "list books");
      const list = querySnapshot.docs.map(docObj => {
        const data = docObj.data();
        return {
          id: data.id,
          name: data.name,
          pageCount: data.pageCount || 1,
          charCount: data.charCount || 0,
          chunkCount: data.chunkCount || 0,
          uploadedAt: data.uploadedAt || new Date().toISOString(),
          extractionStatus: data.extractionStatus || "done", // pre-existing books (e.g. the seeded glossary) never ran extraction
          extractedQuestionsCount: data.extractedQuestionsCount || 0
        };
      });
      res.json({ books: list });
    } catch (err: any) {
      console.error("Error listing books from Firestore:", err);
      res.status(500).json({ error: `Could not list prep books: ${err.message}` });
    }
  });

  // Delete an uploaded study book from Firestore (including all subcollection chunks)
  app.delete("/api/books/delete/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const bookDocRef = doc(db, "books", id);
      const bookSnapshot = await getDoc(bookDocRef);
      if (!bookSnapshot.exists) {
        return res.status(404).json({ error: "Study material not found in database." });
      }
      const bData = bookSnapshot.data();
      const name = bData.name || "Unnamed Book";

      // Delete all chunks inside the books chunk subcollection
      const chunksColRef = collection(db, "books", id, "chunks");
      const chunksSnapshot = await getDocs(chunksColRef);
      await Promise.all(
        chunksSnapshot.docs.map(chunkDocObj => deleteDoc(chunkDocObj.ref))
      );

      // Delete any questions extracted from this book too, so they don't outlive their source.
      const extractedSnapshot = await collection(db, "questions").where("source_book_id", "==", id).get();
      await Promise.all(extractedSnapshot.docs.map(qDoc => deleteDoc(qDoc.ref)));

      // Delete any cached glossary term extraction too, if this was a glossary book.
      const glossaryTermsSnapshot = await getDocs(collection(db, "books", id, "glossaryTerms"));
      await Promise.all(glossaryTermsSnapshot.docs.map(termDoc => deleteDoc(termDoc.ref)));

      // Delete the book metadata entry
      await deleteDoc(bookDocRef);

      console.log(`Deleted study book: ${name} (ID: ${id}) from database, along with ${extractedSnapshot.size} extracted question(s).`);
      return res.json({ success: true, message: `Removed book: ${name}` });
    } catch (err: any) {
      console.error("Error deleting book from Firestore:", err);
      res.status(500).json({ error: `Could not delete study book: ${err.message}` });
    }
  });

  // List questions previously extracted verbatim from a specific uploaded book (see
  // extractQuestionsFromBook above) - distinct from /api/books/generate-question, which always
  // makes a new AI-drafted question rather than returning ones already found in the material.
  app.get("/api/books/:bookId/extracted-questions", requireAuth, async (req, res) => {
    try {
      const { bookId } = req.params;
      const snap = await withFirestoreTimeout(
        collection(db, "questions").where("source_book_id", "==", bookId).get(),
        "list extracted questions"
      );
      const questions = snap.docs.map(d => d.data());
      res.json({ questions });
    } catch (err: any) {
      console.error("Error listing extracted questions:", err);
      res.status(500).json({ error: `Could not list extracted questions: ${err.message}` });
    }
  });

  // Generate question directly grounded in custom PMP study material
  app.post("/api/books/generate-question", requireAuth, generationLimiter, async (req, res) => {
    try {
      const { bookId, keyword, language, sessionCompletedCount, excludeIds, questionType } = req.body;
      const isFrench = language === "FR";

      // Load book metadata doc
      const bookDocRef = doc(db, "books", bookId);
      const bookDoc = await getDoc(bookDocRef);
      if (!bookDoc.exists) {
        return res.status(404).json({ error: isFrench ? "Livre non trouvé." : "Prep book not found." });
      }
      const bookData = bookDoc.data();

      // Load chunks subcollection
      const chunksColRef = collection(db, "books", bookId, "chunks");
      const chunksSnapshot = await getDocs(chunksColRef);
      const bookChunks = chunksSnapshot.docs
        .map(docObj => docObj.data())
        .sort((a, b) => (a.index || 0) - (b.index || 0))
        .map(data => data.text as string);

      let selectedChunks: string[] = [];
      if (keyword && keyword.trim().length > 0) {
        const searchTerms = keyword.toLowerCase().trim();
        const matches = bookChunks.filter(c => c.toLowerCase().includes(searchTerms));
        if (matches.length > 0) {
          selectedChunks = matches.slice(0, 2);
        }
      }

      if (selectedChunks.length === 0) {
        if (bookChunks.length > 0) {
          const randIdx = Math.floor(Math.random() * bookChunks.length);
          selectedChunks = [bookChunks[randIdx]];
          if (randIdx + 1 < bookChunks.length) {
            selectedChunks.push(bookChunks[randIdx + 1]);
          }
        } else {
          return res.status(400).json({ error: "Study book contains no chunks." });
        }
      }

      const contextText = selectedChunks.join("\n\n---\n\n");
      const client = getGeminiClient();

      const count = sessionCompletedCount !== undefined ? Number(sessionCompletedCount) : 0;

      // Determine the progressive difficulty level and its tailored generative instructions
      let difficultyTag = "Simple / Foundational (Definition & Terminology)";
      let difficultyInstruction = "";

      if (questionType === "definition") {
        difficultyTag = "PMBOK Definition (Simple/Terminology)";
        difficultyInstruction = `
        The candidate has explicitly selected the "PMBOK Definitions" mode to master PMBOK Glossary definitions from their materials.
        You MUST formulate a simple, direct question dedicated to project management terminology or definitions based on the provided material context:
        - Identify a major project management term or concept defined in the context (such as acceptance criteria, actual cost, agile, artifact, baseline, budget, etc. as defined in the glossary).
        - Formulate a direct, clear multiple-choice question testing the definition or correct usage of that term.
        - The question should be simple, objective, and unambiguous (NOT a complex multi-variable situational scenario), specifically helping the trainee learn and memorize the definition.
        - Create 4 choices where one option is the correct, accurate definition according to PMBOK / Agile guide principles, and the other options are other project management terms or plausible but incorrect definitions.
        - The correct_option MUST be exactly one of: "A", "B", "C", "D".
        `;
      } else {
        difficultyInstruction = `
        The candidate is starting their practice session (answered ${count} questions). You MUST formulate a simple, clear definition, terminology, or basic conceptual question based on the provided material context.
        - The question should test a direct standard PMP definition, project management framework, or basic PMBOK 8 / Agile concept present in the context.
        - Keep the scenario extremely brief (1 to 2 sentences maximum) and highly focused.
        - Do NOT include complex situational conflicts, political hurdles, multiple conflicting variables, or vague options.
        - Focus on direct, objective, and unambiguous knowledge verification of the concepts in the text.
        `;

        if (count >= 2 && count < 4) {
          difficultyTag = "Moderate / Intermediate";
          difficultyInstruction = `
          The candidate is in the middle of their practice session (answered ${count} questions). Introduce a standard PMP-level situational question of moderate complexity based on the provided material context. Focus on a realistic project dilemma featuring 1 to 2 stakeholder communication mismatches or planning barriers, requiring balanced servant-leadership and problem-solving.
          `;
        } else if (count >= 4) {
          difficultyTag = "Advanced / Highly Complex";
          difficultyInstruction = `
          The candidate has demonstrated proficiency (answered ${count} questions). Gather all forces to craft an exceptionally difficult, highly complex, and ambiguous multi-variable corporate or hybrid project dilemma based on the concepts in the provided material context. Include conflicting constraints (e.g., tight statutory timeframes vs. team burnout, supplier supply-chain failure vs. sponsor budget caps). All four choices must be crafted with high professional plausibility so that only deep analytical competence under PMBOK 8 stewardship principles, systems thinking, and servant-leadership can distinguish the ideal correct response.
          `;
        }
      }

      let processDomainInstruction = "";
      if (keyword && ["input", "tool", "technique", "output", "artifact", "process", "phase", "step"].some(term => keyword.toLowerCase().includes(term))) {
        processDomainInstruction = `
        DOMAIN-SPECIFIC PROCESS INSTRUCTION (CRITICAL):
        Since the query relates to "Process" or "ITTOs", you MUST center the question, scenario, or options around:
        - Inputs required for the process highlighted in the context (e.g. baseline, project charter).
        - Tools and Techniques used to perform/facilitate that process.
        - Project Artifacts and Outputs produced.
        Ensure the choices test the candidate's understanding of how these Inputs, Tools & Techniques, and Artifacts/Outputs are integrated to resolve the issue. At least 2 of the answer choices must explicitly name specific Inputs, Tools/Techniques, or Artifacts/Outputs from the text.
        `;
      }

      if (!client) {
        console.warn("Gemini offline inside custom book generator. Triggering elite default fallback.");
        const selectedDefaults = isFrench ? DEFAULT_QUESTIONS_FR : DEFAULT_QUESTIONS;
        // scan defaults for matches if possible
        let pool = keyword
          ? selectedDefaults.filter(q => q.scenario.toLowerCase().includes(keyword.toLowerCase()) || q.tags.some(t => t.toLowerCase().includes(keyword.toLowerCase())))
          : selectedDefaults;
        if (questionType === "definition") {
          const defTerms = ["definition", "term", "process", "terminology", "glossary", "concept", "methodology"];
          const matched = pool.filter(q => q.tags.some(t => defTerms.includes(t.toLowerCase())) || defTerms.some(term => q.scenario.toLowerCase().includes(term)));
          if (matched.length > 0) pool = matched;
        }
        if (excludeIds && Array.isArray(excludeIds) && excludeIds.length > 0) {
          pool = pool.filter(q => !excludeIds.includes(q.question_id));
        }
        const finalPool = pool.length > 0 ? pool : selectedDefaults;
        const question = finalPool[Math.floor(Math.random() * finalPool.length)];

        return res.json({
          question: {
            ...question,
            question_id: `gen_book_offline_${Date.now()}`,
            pmbok_8_reference: `Offline Grounded Fallback: ${bookData.name}`,
            grounded_book_name: bookData.name
          },
          fallback: true,
          message: isFrench
            ? `Généré en mode hors-ligne à partir des sujets de base (Livre: ${bookData.name})`
            : `Grounded Practice Mode (Offline Fallback to Core Bank; Book: ${bookData.name})`
        });
      }

      try {
        const creatorPrompt = `
        You are an elite PMP Exam Architect aligned with the 2026 updates, utilizing the PMBOK Guide 8th Edition, Agile Practice Guide, and the official Exam Content Outline (ECO).
        The candidate has uploaded their own PMP prep book/materials titled "${bookData.name}". 
        Below is a direct context excerpt retrieved from their material to ground this new practice question:
        
        [START STUDY MATERIAL CONTEXT]
        ${contextText}
        [END STUDY MATERIAL CONTEXT]
        
        Please generate a practice question directly based on or inspired by the concepts/principles from the study material above.
        
        PROGRESSIVE DIFFICULTY SETTING:
        The target difficulty configuration is: **${difficultyTag}**.
        You MUST implement the scenario following this complexity instruction strictly:
        ${difficultyInstruction}
        
        ${processDomainInstruction}
        
        ${excludeIds && Array.isArray(excludeIds) && excludeIds.length > 0 ? `
        PREVIOUSLY GENERATED QUESTIONS / DO NOT REPEAT:
        Do NOT repeat or generate questions that are identical or highly similar to any of these previously answered question IDs:
        [${excludeIds.slice(-10).join(", ")}]
        Ensure that the narrative, project context, specific conflict, and options are completely unique, fresh, and creative. Write a completely fresh, original project scenario!
        ` : ""}

        CRITICAL FORMATTING GUIDELINES:
        - The scenario must describe a challenging conflict representing team friction, steering-committee roadblocks, agile transitions, or scope compliance.
        - It must end in "What should the project manager do FIRST?" or "What should the project manager do NEXT?".
        - Create 4 plausible multiple-choice options (A, B, C, D) representing actual real-world paths. One option must represent the correct PMBOK 8 / Agile stance as described or supported by the study material, while the other three represent logical fallacies (doing nothing, escalate unnecessarily, acting without analyzing, etc.).
        - ${isFrench ? "IMPORTANT: The entire scenario, options (A, B, C, D), correct_option, explanation, and tags MUST be written in perfect, professional French language." : "Must be written in elegant professional English."}
        
        Provide your output in raw draft form.
        `;

        console.log(`Pass 1: Creating grounded question from book: ${bookData.name}...`);
        const pass1Response = await generateContentWithRetry(client, {
          model: "gemini-3.5-flash",
          contents: creatorPrompt,
          config: { temperature: 1.0 }
        });

        const draftText = pass1Response.text || "";

        const reviewerPrompt = `
        You are the PMP Senior Validation Reviewer. Your role is to test this draft question against standard PMI guidelines and shape it into our strict JSON format:
        
        ${draftText}
        
        Verify and refine:
        - Check that all four multiple-choice options start with correct prefix identifiers: "A.", "B.", "C.", "D.".
        - Ensure the "explanation" is an immersive coaching guide detailing why the chosen correct option is correct AND why each incorrect option fails relative to servant leadership, stewardship, team accountability, or systems thinking.
        - Set pmbok_8_reference to: "Grounded in Uploaded Material | ${bookData.name.replace(/[^\w\s\.-]/g, "")}"
        - The correct option must be strictly "A", "B", "C", or "D".
        - ${isFrench ? "Ensure all strings in the output JSON are in professional French." : ""}
        `;

        console.log("Pass 2: Polishing and structuring custom book question JSON...");
        const pass2Response = await generateContentWithRetry(client, {
          model: "gemini-3.5-flash",
          contents: reviewerPrompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                question_id: { type: Type.STRING },
                eco_domain: { 
                  type: Type.STRING, 
                  enum: ["People", "Process", "Business Environment"]
                },
                scenario: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correct_option: { 
                  type: Type.STRING,
                  enum: ["A", "B", "C", "D"]
                },
                explanation: { type: Type.STRING },
                pmbok_8_reference: { type: Type.STRING },
                methodology: { 
                  type: Type.STRING,
                  enum: ["Agile", "Hybrid", "Predictive", "Agile/Hybrid"]
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: [
                "question_id", "eco_domain", "scenario", "options", 
                "correct_option", "explanation", "pmbok_8_reference", "methodology", "tags"
              ]
            }
          }
        });

        const finalJSON = pass2Response.text;
        if (!finalJSON) {
          throw new Error("Empty response from AI Reviewer");
        }

        const cleanResponse = JSON.parse(finalJSON);
        res.json({
          question: {
            ...cleanResponse,
            question_id: `gen_book_${Date.now()}`,
            grounded_book_name: bookData.name
          },
          fallback: false
        });

      } catch (err: any) {
        console.error("AI Book-grounded Generation Error, rolling back:", err);
        const selectedDefaults = isFrench ? DEFAULT_QUESTIONS_FR : DEFAULT_QUESTIONS;
        const question = selectedDefaults[Math.floor(Math.random() * selectedDefaults.length)];
        res.json({
          question: {
            ...question,
            question_id: `gen_error_book_${Date.now()}`,
            pmbok_8_reference: `Direct Reference: ${bookData.name}`,
            grounded_book_name: bookData.name
          },
          fallback: true,
          message: isFrench 
            ? "Retourné à la banque de questions par défaut en raison d'une exception de l'IA"
            : "Rolled back to predefined simulator bank due to parsing fatigue."
        });
      }
    } catch (routeErr: any) {
      console.error("Critical error in generate-question route handling:", routeErr);
      res.status(500).json({ error: routeErr.message });
    }
  });

  // Deterministic "term. Definition." line parser - a FALLBACK ONLY (used when no Gemini client
  // is configured, or a real extraction run above found nothing). Real uploaded glossaries don't
  // reliably keep one entry per raw text line: a long definition wraps across several lines, and
  // a definition can itself contain multiple sentences (e.g. a trailing "See also X, Y." clause) -
  // this naive per-line regex has no way to tell a wrapped continuation from a genuine new entry,
  // so it both truncates definitions (only ever sees the first physical line) and fabricates bogus
  // entries out of mid-definition fragments (e.g. splitting "...ratio of earned value to actual
  // cost. See also schedule performance index (SPI)." into a fake term "ratio of earned value to
  // actual cost" whose "definition" is just "See also schedule performance index (SPI)."). See
  // `extractGlossaryTerms` below for the real, semantic-aware extraction this is a fallback for.
  function parseGlossaryEntries(text: string, bookName: string): { term: string; definition: string; bookName: string }[] {
    const entries: { term: string; definition: string; bookName: string }[] = [];
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      const match = line.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\-()\/'’]{1,80}?)\.\s+(.{10,})$/);
      if (match) {
        entries.push({ term: match[1].trim(), definition: match[2].trim(), bookName });
      }
    }
    return entries;
  }

  const isGlossaryBookName = (name: string): boolean => (name || "").toLowerCase().includes("glossary");

  // Gemini-based glossary extraction, run ONCE per glossary book and cached in Firestore
  // (`books/{id}/glossaryTerms`) rather than re-parsed on every search. Given the whole document
  // at once (not one raw line at a time), the model can correctly reconstruct a wrapped
  // definition's full text and tell a genuine new term apart from a mid-definition "See also ..."
  // continuation - both real bugs the line-based `parseGlossaryEntries` regex above could not
  // avoid on the actual uploaded glossary content.
  const MAX_GLOSSARY_CHARS_PER_CALL = 60000;

  async function extractGlossaryTerms(
    client: GoogleGenAI,
    bookName: string,
    chunks: { text: string; index: number }[]
  ): Promise<{ term: string; definition: string; isCoreTerm: boolean }[]> {
    // Chunks overlap deliberately (for RAG context), so concatenating them naively would repeat
    // whatever text falls in the overlap window - harmless here since results are deduped by
    // term below, but batching still needs to happen on the de-duplicated full text so an entry
    // that straddles a chunk boundary isn't split across two separate model calls.
    const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);
    let fullText = "";
    for (const chunk of sortedChunks) {
      // A later chunk's start commonly repeats the previous chunk's tail (the overlap window) -
      // trim that repeated prefix off before appending, so entries don't get duplicated/mangled
      // at the seam.
      const overlapCandidate = chunk.text.slice(0, 600);
      const existingTailIdx = fullText.length > 0 ? fullText.indexOf(overlapCandidate.slice(0, 80)) : -1;
      if (existingTailIdx !== -1 && existingTailIdx > fullText.length - 700) {
        fullText = fullText.slice(0, existingTailIdx) + chunk.text;
      } else {
        fullText += (fullText ? "\n" : "") + chunk.text;
      }
    }

    const batches: string[] = [];
    for (let i = 0; i < fullText.length; i += MAX_GLOSSARY_CHARS_PER_CALL) {
      batches.push(fullText.slice(i, i + MAX_GLOSSARY_CHARS_PER_CALL));
    }

    const seen = new Set<string>();
    const allEntries: { term: string; definition: string; isCoreTerm: boolean }[] = [];
    for (const batchText of batches) {
      try {
        const response = await generateContentWithRetry(client, {
          model: "gemini-3.5-flash",
          contents: batchText,
          config: {
            temperature: 0,
            systemInstruction: `
            This is raw PDF-extracted text of a PMP glossary. Line breaks are page-layout
            artifacts, not sentence or entry boundaries: a single entry's definition may wrap
            across several lines, and a definition may itself contain multiple sentences
            (including a trailing "See also X, Y." cross-reference, which belongs INSIDE that
            entry's definition - never as an entry of its own). Page numbers, running
            headers/footers, and "-- N of M --" page markers are noise; ignore them.

            Reconstruct every genuine glossary entry as {term, definition, isCoreTerm}: the term
            is the short heading phrase the entry is defined under (e.g. "earned value (EV)"),
            and the definition is its FULL text copied verbatim from the source (rejoin any
            wrapped lines into normal prose), including a trailing "See also ..." sentence when
            it is genuinely part of that entry. Copy the source wording exactly - do not invent,
            paraphrase, or summarize, and never split one entry's multi-sentence definition into
            more than one output entry. If this excerpt starts or ends mid-entry (cut off by the
            excerpt boundary), only include that entry if its complete text is present here;
            otherwise omit it entirely rather than emitting a partial definition.

            Set isCoreTerm to true only when the TERM ITSELF is distinctive project-management
            vocabulary - a named technique, artifact, role, framework element, metric, or concept
            that isn't ordinary general-English vocabulary outside a PM context (e.g. "change
            control board (CCB)", "earned value (EV)", "risk register", "kanban board",
            "definition of done (DoD)", "sprint retrospective", "critical path" are true). Set it
            to false when the term is a common English word or phrase that the glossary simply
            defines within a project context, but that isn't itself specialized PM terminology
            (e.g. "accuracy", "authority", "benefit", "outcome", "method", "waste", "assumption",
            "criteria", "duration", "effort" are false).
            `,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  isCoreTerm: { type: Type.BOOLEAN }
                },
                required: ["term", "definition", "isCoreTerm"]
              }
            }
          }
        }, 2);
        const parsed = response.text ? JSON.parse(response.text) : [];
        if (Array.isArray(parsed)) {
          for (const e of parsed) {
            if (!e || typeof e.term !== "string" || typeof e.definition !== "string") continue;
            const term = e.term.trim();
            const definition = e.definition.trim();
            const key = term.toLowerCase();
            if (!term || !definition || seen.has(key)) continue;
            seen.add(key);
            allEntries.push({ term, definition, isCoreTerm: e.isCoreTerm === true });
          }
        }
      } catch (err) {
        console.error(`[GlossaryExtraction] Failed on a batch for "${bookName}":`, err);
      }
    }
    return allEntries;
  }

  // A handful of real glossary entries are pure redirects - their ENTIRE definition is just
  // "See <other term>." (e.g. "project sponsor. See sponsor.", "blocker. See impediment.",
  // "life cycle. See project life cycle."), pointing to the canonical entry instead of repeating
  // its definition. That's fine as reference material, but showing a candidate "See sponsor." as
  // if it were the answer to their search isn't - they asked for a definition, not a pointer.
  // Resolves each redirect once, at extraction time, by substituting the target entry's real
  // definition; the redirect's own term name is kept so the candidate still sees what they
  // searched for.
  function resolveSeeRedirects<T extends { term: string; definition: string }>(entries: T[]): T[] {
    const byTermLower = new Map(entries.map(e => [e.term.toLowerCase(), e]));
    return entries.map(e => {
      const match = e.definition.trim().match(/^See\s+([^.]+?)\.?\s*$/i);
      if (!match) return e;
      const targetName = match[1].trim().toLowerCase();
      const target = byTermLower.get(targetName)
        || entries.find(cand => cand.term.toLowerCase().startsWith(targetName));
      if (!target || /^See\s+/i.test(target.definition.trim())) {
        // No resolvable target (or the target is itself another redirect) - leave as-is rather
        // than risk an infinite chase; better a rare unresolved redirect than a broken loop.
        return e;
      }
      return { ...e, definition: target.definition };
    });
  }

  // Returns a book's clean {term, definition} pairs, extracting-and-caching them into Firestore
  // on first use (or at upload time, see the upload handler below - usually already done by the
  // time a search needs it). Falls back to the naive line parser only when no Gemini client is
  // configured or a real extraction attempt genuinely found nothing.
  async function ensureGlossaryTermsExtracted(
    bookId: string,
    bookName: string
  ): Promise<{ term: string; definition: string; bookName: string; isCoreTerm: boolean }[]> {
    const bookRef = doc(db, "books", bookId);
    const bookSnap = await getDoc(bookRef);
    const bookData = bookSnap.exists ? (bookSnap.data() as any) : {};

    // "done" alone isn't enough to trust the cache: it may predate the isCoreTerm field being
    // added (an older extraction run), in which case every cached doc would be missing it -
    // require at least one cached entry to actually have the field before trusting the cache,
    // otherwise fall through and re-extract under the current schema.
    if (bookData.glossaryExtractionStatus === "done") {
      const termsSnapshot = await getDocs(collection(db, "books", bookId, "glossaryTerms"));
      const cached = termsSnapshot.docs.map(d => d.data() as { term: string; definition: string; isCoreTerm?: boolean });
      if (cached.length > 0 && cached.every(e => typeof e.isCoreTerm === "boolean")) {
        return cached.map(e => ({ ...e, isCoreTerm: e.isCoreTerm as boolean, bookName }));
      }
    }

    const chunksSnapshot = await getDocs(collection(db, "books", bookId, "chunks"));
    const chunks = chunksSnapshot.docs.map(d => ({
      text: d.data().text as string,
      index: (d.data().index as number) || 0
    }));

    const client = getGeminiClient();
    if (!client) {
      // Can't classify without Gemini - default every fallback entry to isCoreTerm: true so the
      // Matching Exercise's "prefer core terms" filter below doesn't accidentally strip
      // everything down to nothing in this degraded offline path.
      return resolveSeeRedirects(chunks.flatMap(c => parseGlossaryEntries(c.text, bookName))).map(e => ({ ...e, isCoreTerm: true }));
    }

    let entries = await extractGlossaryTerms(client, bookName, chunks);
    if (entries.length === 0) {
      await bookRef.update({ glossaryExtractionStatus: "error" }).catch(() => {});
      return resolveSeeRedirects(chunks.flatMap(c => parseGlossaryEntries(c.text, bookName))).map(e => ({ ...e, isCoreTerm: true }));
    }
    entries = resolveSeeRedirects(entries);

    await Promise.all(
      entries.map((e, i) => setDoc(doc(db, "books", bookId, "glossaryTerms", `term_${i}`), e))
    );
    await bookRef.update({ glossaryExtractionStatus: "done", glossaryTermsCount: entries.length }).catch(() => {});

    return entries.map(e => ({ ...e, bookName }));
  }

  // Standard PMP/EVM calculation formulas, keyed by a normalized (lowercase, no parenthesized
  // acronym) version of the metric's term name. Hardcoded rather than asked from Gemini: these
  // formulas are precise, well-known constants, and letting a model "recall" them risks a subtly
  // wrong formula (e.g. swapping EV/AC) being presented as authoritative.
  const FINANCIAL_FORMULAS: Record<string, string> = {
    "earned value": "EV = % Complete × BAC",
    "planned value": "PV = Planned % Complete × BAC",
    "actual cost": "AC = actual costs incurred to date (not calculated - recorded directly)",
    "cost variance": "CV = EV − AC",
    "schedule variance": "SV = EV − PV",
    "cost performance index": "CPI = EV ÷ AC",
    "schedule performance index": "SPI = EV ÷ PV",
    "estimate at completion": "EAC = BAC ÷ CPI (typical variance) — or EAC = AC + Bottom-up ETC (atypical variance)",
    "estimate to complete": "ETC = EAC − AC",
    "variance at completion": "VAC = BAC − EAC",
    "budget at completion": "BAC = sum of all planned work's budgets (not calculated - the project's total approved budget)",
    "to-complete performance index": "TCPI = (BAC − EV) ÷ (BAC − AC)",
    "expected monetary value": "EMV = Probability × Impact"
  };

  // Matches a result's term (English, before any French translation) against the formula table.
  // Terms in the source documents are usually written as "cost performance index (CPI)", so the
  // parenthesized acronym is stripped before comparing; a stem-style prefix match (not exact
  // equality) tolerates minor wording differences between documents.
  function getFinancialFormula(term: string): string | undefined {
    const normalized = term.toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").trim();
    for (const [key, formula] of Object.entries(FINANCIAL_FORMULAS)) {
      if (normalized === key || normalized.startsWith(key)) return formula;
    }
    return undefined;
  }

  // The real glossary source routinely ends a definition with a trailing "See also X, Y." (or,
  // once translated, "Voir aussi X, Y.") cross-reference clause - genuinely part of the source
  // text (kept intentionally in the cached `glossaryTerms` extraction, see extractGlossaryTerms
  // above), but not wanted in what's shown to the candidate: they asked for the definition alone,
  // nothing else appended. Stripped at display time (not at extraction/caching time) so the cache
  // stays faithful to the source in case a future feature wants those cross-references back.
  function stripSeeAlso(definition: string): string {
    return definition.replace(/\s*\b(See also|Voir aussi)\b[\s\S]*$/i, "").trim();
  }

  // Shared by the PMBOK 8 and Agile Practice Guide tiers of PMP Definitions Search: narrows a
  // large document down to its most relevant chunks via keyword-stem scoring, then asks Gemini to
  // extract every distinct term/technique it can find there related to the query - explicitly told
  // to skip anything the glossary (or an earlier-checked tier) already covers, with a deterministic
  // post-filter as a safety net beyond just that prompt instruction.
  async function extractSupplementalDefinitions(
    client: GoogleGenAI,
    englishQuery: string,
    chunks: { text: string; bookName: string }[],
    keywordStems: string[],
    alreadyCoveredTerms: string[],
    sourceLabel: string
  ): Promise<{ term: string; definition: string; bookName: string }[]> {
    const scored = chunks
      .map(chunk => {
        let score = 0;
        const chunkLower = chunk.text.toLowerCase();
        for (const stem of keywordStems) {
          let pos = chunkLower.indexOf(stem);
          while (pos !== -1) {
            score += 2;
            pos = chunkLower.indexOf(stem, pos + 1);
          }
        }
        return { chunk, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.chunk);

    if (scored.length === 0) return [];

    const context = scored.map(c => `[Source: ${c.bookName}]\n${c.text}`).join("\n\n---\n\n");
    const alreadyCovered = alreadyCoveredTerms.length > 0 ? alreadyCoveredTerms.join(", ") : "none";
    let matches: { term: string; definition: string; bookName: string }[] = [];
    try {
      const extractionResponse = await generateContentWithRetry(client, {
        model: "gemini-3.5-flash",
        contents: englishQuery,
        config: {
          temperature: 0.2,
          systemInstruction: `
          You are a PMP glossary lookup tool. The candidate searched for: "${englishQuery}"
          Below are excerpts from ${sourceLabel} (not the short glossary).

          [START CONTEXT]
          ${context}
          [END CONTEXT]

          The following terms are already covered elsewhere and must NOT be repeated: ${alreadyCovered}

          Find every DISTINCT named term, tool, or technique in the context above that relates to
          the search query and is NOT already in the list above. For each one, extract its name, a
          concise 1-2 sentence definition stated or lightly paraphrased from the context (no
          elaboration, no examples, no extra commentary), and the exact source document name copied
          from its [Source: ...] tag. If nothing in the context actually relates to the query,
          return an empty array. Do not use any knowledge beyond the provided context.
          `,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
                source: { type: Type.STRING }
              },
              required: ["term", "definition", "source"]
            }
          }
        }
      }, 2);
      const parsed = extractionResponse.text ? JSON.parse(extractionResponse.text) : [];
      if (Array.isArray(parsed)) {
        matches = parsed
          .filter((e: any) => e && typeof e.term === "string" && typeof e.definition === "string")
          .map((e: any) => ({
            term: e.term,
            definition: e.definition,
            bookName: typeof e.source === "string" && e.source ? e.source : scored[0].bookName
          }));
      }
    } catch (err) {
      console.error(`Definitions extraction from ${sourceLabel} failed:`, err);
    }

    // Deterministic safety net, not left purely to prompt compliance.
    const coveredLower = new Set(alreadyCoveredTerms.map(t => t.toLowerCase()));
    return matches.filter(e => !coveredLower.has(e.term.toLowerCase()));
  }

  // PMP Definitions Search endpoint: a dictionary-style lookup, not a chat. Searches every
  // uploaded document at once. Priority: the glossary is checked first, then the PMBOK 8 guide is
  // checked IN ADDITION (not only as an all-or-nothing fallback) so a broad query like
  // "estimation" surfaces every distinct matching entry from both sources, not just whichever the
  // glossary happens to define; the glossary's own version wins on any name conflict. PMBOK 7th
  // edition material is excluded entirely. The uploaded materials are in English, so a French
  // query is translated to English before matching, and results are translated back to French at
  // the end - literal keyword matching across languages never works, since French query words
  // simply don't appear anywhere in the English source text.
  app.post("/api/books/chat", requireAuth, generationLimiter, async (req, res) => {
    try {
      const { message, language } = req.body;
      const isFrench = language === "FR";
      const notFoundMessage = isFrench ? "Aucune définition trouvée." : "No definition found.";

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: "Empty message query." });
      }

      const booksSnapshot = await withFirestoreTimeout(collection(db, "books").get(), "list books for chat");
      const allBooks = booksSnapshot.docs.map(docObj => ({ id: docObj.id, ...(docObj.data() as any) }));

      const classifyForDefinitions = (name: string): "glossary" | "pmbok8" | "pmbok7" | "agile" | "other" => {
        const lower = (name || "").toLowerCase();
        // Digit boundary checked without \b: filenames commonly use underscores ("PMBOK_8_edition_Guide.pdf"),
        // and underscore counts as a \w character, so \b8\b would never match "_8_" at all.
        const hasStandaloneDigit = (digit: string) => new RegExp(`(?<!\\d)${digit}(?!\\d)`).test(lower);
        if (lower.includes("glossary")) return "glossary";
        if (lower.includes("pmbok") && hasStandaloneDigit("7")) return "pmbok7";
        if (lower.includes("pmbok") && hasStandaloneDigit("8")) return "pmbok8";
        if (lower.includes("agile")) return "agile";
        return "other";
      };

      const books = allBooks.filter(b => classifyForDefinitions(b.name) !== "pmbok7");
      if (books.length === 0) {
        return res.status(404).json({ error: isFrench ? "Aucun document disponible." : "No documents available." });
      }

      const chunksByTier: Record<"pmbok8" | "agile" | "other", { text: string; bookName: string }[]> = {
        pmbok8: [],
        agile: [],
        other: []
      };
      const glossaryEntries: { term: string; definition: string; bookName: string }[] = [];
      await Promise.all(books.map(async (book) => {
        const tier = classifyForDefinitions(book.name);
        if (tier === "glossary") {
          const entries = await ensureGlossaryTermsExtracted(book.id, book.name);
          glossaryEntries.push(...entries);
          return;
        }
        const chunksSnapshot = await getDocs(collection(db, "books", book.id, "chunks"));
        chunksSnapshot.docs
          .map(docObj => docObj.data())
          .sort((a, b) => (a.index || 0) - (b.index || 0))
          .forEach(data => chunksByTier[tier].push({ text: data.text as string, bookName: book.name }));
      }));

      const client = getGeminiClient();

      // Translate a French query to English before doing any matching (best effort - if
      // translation fails or Gemini is unavailable, fall through with the original query rather
      // than failing the whole search).
      let englishQuery = message;
      if (isFrench && client) {
        try {
          const translateResponse = await generateContentWithRetry(client, {
            model: "gemini-3.5-flash",
            contents: message,
            config: {
              temperature: 0,
              systemInstruction: "Translate the following PMP-related search query from French to English. Respond with ONLY the English translation - no quotes, no extra text, no explanation."
            }
          }, 2);
          englishQuery = (translateResponse.text || message).trim() || message;
        } catch (err) {
          console.error("Query translation to English failed, using original query:", err);
        }
      }

      const stopwords = new Set(["the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "of", "to", "for", "in", "on", "at", "by", "with", "about", "how", "what", "where", "why", "who", "which", "pmp", "exam", "prep", "book", "guide", "le", "la", "les", "un", "une", "des", "et", "ou", "mais", "est", "sont", "pour", "dans", "par", "avec", "sur", "comment", "quoi", "où", "pourquoi", "qui", "de", "ce", "cet", "cette", "ces"]);
      const keywords = englishQuery
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u00FF]/g, "") // support French accents (in case translation left any)
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && !stopwords.has(word));

      if (keywords.length === 0) {
        return res.json({ results: [], sourceBooks: [], found: false, answer: notFoundMessage });
      }

      // Crude shared-root check instead of exact substring containment: "estimation" is NOT a
      // substring of "estimate" (or vice versa) even though they're obviously the same PMP
      // concept, so a plain .includes() comparison would miss it entirely. Comparing on a short
      // shared prefix instead ("estima") lets "estimation", "estimate", and "estimating" all match
      // each other without needing real stemming/lemmatization.
      const stemOf = (word: string) => (word.length > 6 ? word.slice(0, 6) : word);
      const keywordStems = keywords.map(stemOf);

      // Exact-phrase priority: when the query itself names one precise multi-word term (e.g.
      // "change control board"), the candidate wants THAT definition alone - not also every
      // loosely-related entry that merely shares one of its words (e.g. "dashboard", "kanban
      // board", "task board" via the shared word "board"). Only single-word/short broad queries
      // (like "estimation", the case that motivated the per-keyword multi-result behavior below)
      // skip this check entirely and go straight to the broad match - this is deliberately scoped
      // to 2+ word queries so that earlier, already-confirmed behavior doesn't regress.
      const normalizeTermForExactMatch = (term: string) => term.toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").trim();
      const normalizedQuery = normalizeTermForExactMatch(englishQuery);
      const queryWordCount = englishQuery.trim().split(/\s+/).filter(Boolean).length;
      const exactGlossaryMatch = queryWordCount >= 2
        ? glossaryEntries.find(e => normalizeTermForExactMatch(e.term) === normalizedQuery)
        : undefined;

      // Tier 1 - Glossary: entries come pre-extracted (see ensureGlossaryTermsExtracted above,
      // cached in Firestore per book), then substring-match the TERM itself (not the whole
      // definition body) against every keyword's stem. This is what lets a broad query like
      // "estimation" surface every distinct glossary entry whose name contains it, rather than
      // blending them into one synthesized answer - skipped entirely when an exact-phrase match
      // was already found above, since that single definition is all that's wanted then.
      let glossaryMatches: { term: string; definition: string; bookName: string }[];
      if (exactGlossaryMatch) {
        glossaryMatches = [exactGlossaryMatch];
      } else {
        const seenTerms = new Set<string>();
        glossaryMatches = glossaryEntries.filter(e => {
          const termLower = e.term.toLowerCase();
          if (!keywordStems.some(stem => termLower.includes(stem))) return false;
          if (seenTerms.has(termLower)) return false;
          seenTerms.add(termLower);
          return true;
        });
      }

      // Tier 2 - PMBOK 8: consulted IN ADDITION to the glossary (not only when the glossary found
      // nothing), so a broad query gets full coverage - the glossary's own terms always win on a
      // conflict regardless (see extractSupplementalDefinitions's dedup filter). Skipped when the
      // glossary already resolved the query to one exact term, both to honor "just that one
      // definition" and to save a Gemini call that would only get filtered back out below anyway.
      let pmbokMatches: { term: string; definition: string; bookName: string }[] = [];
      if (!exactGlossaryMatch && client && chunksByTier.pmbok8.length > 0) {
        pmbokMatches = await extractSupplementalDefinitions(
          client, englishQuery, chunksByTier.pmbok8, keywordStems,
          glossaryMatches.map(e => e.term), "the PMBOK 8th Edition guide"
        );
      }

      // Tier 2b - Agile Practice Guide (once one is uploaded - name containing "agile"): same
      // supplemental treatment as PMBOK 8, consulted in addition, skipping anything the glossary or
      // PMBOK 8 already covers. Until such a guide is uploaded this tier is simply empty and
      // contributes nothing.
      let agileMatches: { term: string; definition: string; bookName: string }[] = [];
      if (!exactGlossaryMatch && client && chunksByTier.agile.length > 0) {
        agileMatches = await extractSupplementalDefinitions(
          client, englishQuery, chunksByTier.agile, keywordStems,
          [...glossaryMatches, ...pmbokMatches].map(e => e.term), "the Agile Practice Guide"
        );
      }

      let combined: { term: string; definition: string; bookName: string; formula?: string }[] = [...glossaryMatches, ...pmbokMatches, ...agileMatches];

      // Safety net for the case the exact term lives only in PMBOK 8/Agile prose (not the
      // glossary): if any tier's result set happens to contain that one exact term after all,
      // collapse down to just it rather than also showing the other, only loosely-related terms
      // those tiers may have additionally surfaced for a broad query.
      if (!exactGlossaryMatch && queryWordCount >= 2) {
        const exactAnyMatch = combined.find(e => normalizeTermForExactMatch(e.term) === normalizedQuery);
        if (exactAnyMatch) {
          combined = [exactAnyMatch];
        }
      }

      // Tier 3 - everything else (custom uploaded materials), only if tiers 1 and 2 found nothing
      // at all. Kept as a single blended answer (not per-term extraction) since we can't assume
      // "term. Definition." formatting for arbitrary documents.
      if (combined.length === 0 && chunksByTier.other.length > 0) {
        const scoredOther = chunksByTier.other
          .map(chunk => {
            let score = 0;
            const chunkLower = chunk.text.toLowerCase();
            for (const stem of keywordStems) {
              let pos = chunkLower.indexOf(stem);
              while (pos !== -1) {
                score += 2;
                pos = chunkLower.indexOf(stem, pos + 1);
              }
            }
            return { chunk, score };
          })
          .filter(s => s.score >= keywordStems.length * 2)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(s => s.chunk);

        if (scoredOther.length > 0) {
          if (!client) {
            combined = [{ term: englishQuery, definition: scoredOther[0].text, bookName: scoredOther[0].bookName }];
          } else {
            const otherContext = scoredOther.map(c => `[Source: ${c.bookName}]\n${c.text}`).join("\n\n---\n\n");
            try {
              const otherResponse = await generateContentWithRetry(client, {
                model: "gemini-3.5-flash",
                contents: englishQuery,
                config: {
                  temperature: 0.2,
                  systemInstruction: `
                  You are a PMP glossary lookup tool, not a tutor or coach. The student is looking
                  up a definition. Context from their uploaded study materials:

                  [START CONTEXT]
                  ${otherContext}
                  [END CONTEXT]

                  Return ONLY the definition of the requested term, stated or very lightly
                  paraphrased from the context above, 1 to 3 sentences maximum - no examples, no
                  elaboration. Do NOT use any knowledge beyond the provided context - if the
                  context does not actually define the term, respond with exactly: "${notFoundMessage}"
                  `
                }
              }, 2);
              const answerText = (otherResponse.text || notFoundMessage).trim();
              if (answerText !== notFoundMessage) {
                combined = [{ term: englishQuery, definition: answerText, bookName: scoredOther[0].bookName }];
              }
            } catch (err) {
              console.error("Fallback definitions search failed:", err);
            }
          }
        }
      }

      if (combined.length === 0) {
        return res.json({ results: [], sourceBooks: [], found: false, answer: notFoundMessage });
      }

      // Strip any trailing "See also ..." cross-reference before it ever reaches the candidate -
      // done in English, before translation, so there's no need to also match a French "Voir
      // aussi" variant separately.
      combined = combined.map(e => ({ ...e, definition: stripSeeAlso(e.definition) }));

      // Attach the standard calculation formula for financial/EVM terms (Earned Value, Planned
      // Value, CPI, SPI, EAC, ...), matched on the English term name before any French translation
      // below, since the lookup table itself is keyed in English.
      combined = combined.map(e => ({ ...e, formula: getFinancialFormula(e.term) }));

      // Translate the final result set back to French in one batched pass, if needed.
      if (isFrench && client) {
        try {
          const translateResultsResponse = await generateContentWithRetry(client, {
            model: "gemini-3.5-flash",
            contents: JSON.stringify(combined.map(e => ({ term: e.term, definition: e.definition }))),
            config: {
              temperature: 0,
              systemInstruction: "Translate each {term, definition} pair in this JSON array from English to professional French PMP terminology. Translate ONLY the exact text given - do not add, expand, or restore any content that isn't already in the provided text, even if you recognize the term and recall its official glossary definition includes more (e.g. a 'See also X' cross-reference) - if it's not in the input text, it must not appear in your French output either. Keep the exact same array length and order. Respond with ONLY the translated JSON array, same shape.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } },
                  required: ["term", "definition"]
                }
              }
            }
          }, 2);
          const translated = translateResultsResponse.text ? JSON.parse(translateResultsResponse.text) : null;
          if (Array.isArray(translated) && translated.length === combined.length) {
            combined = combined.map((e, i) => ({
              ...e,
              term: typeof translated[i]?.term === "string" ? translated[i].term : e.term,
              // Deterministic safety net: translation is instructed not to add a "Voir aussi ..."
              // clause back in, but a model that recognizes the real glossary term can still
              // "helpfully" restore one from its own training knowledge despite the instruction -
              // strip it again here rather than trust prompt compliance alone.
              definition: stripSeeAlso(typeof translated[i]?.definition === "string" ? translated[i].definition : e.definition)
            }));
          }
        } catch (err) {
          console.error("Definitions translation to French failed, returning English results:", err);
        }
      }

      const sourceBooks = Array.from(new Set(combined.map(e => e.bookName)));
      res.json({
        results: combined.map(e => ({ term: e.term, definition: e.definition, sourceBook: e.bookName, formula: e.formula })),
        sourceBooks,
        found: true
      });

    } catch (err: any) {
      console.error("Definitions search route error:", err);
      res.status(500).json({ error: `Could not process query: ${err.message}` });
    }
  });

  // Terminology Matching exercise: picks 4-5 random {term, definition} pairs from the uploaded
  // glossary (reusing the same deterministic line parser as PMP Definitions Search) for a
  // match-the-term-to-its-definition practice exercise. Available to every candidate, same as the
  // other practice exercise modes - not admin-gated. Restricted to the glossary only (not PMBOK 8/
  // Agile/other tiers): those are prose documents without the glossary's reliable one-line-per-
  // entry format, so they can't be parsed into clean discrete pairs the same deterministic way.
  app.get("/api/matching-exercise", requireAuth, generationLimiter, async (req, res) => {
    try {
      const language = typeof req.query.language === "string" ? req.query.language : "EN";
      const isFrench = language === "FR";

      const booksSnapshot = await withFirestoreTimeout(collection(db, "books").get(), "list books for matching exercise");
      const glossaryBooks = booksSnapshot.docs
        .map(docObj => ({ id: docObj.id, ...(docObj.data() as any) }))
        .filter(b => (b.name || "").toLowerCase().includes("glossary"));

      if (glossaryBooks.length === 0) {
        return res.status(404).json({ error: isFrench ? "Aucun glossaire disponible." : "No glossary available." });
      }

      const allEntries: { term: string; definition: string; isCoreTerm: boolean }[] = [];
      await Promise.all(glossaryBooks.map(async (book) => {
        const entries = await ensureGlossaryTermsExtracted(book.id, book.name);
        entries.forEach(e => allEntries.push({ term: e.term, definition: stripSeeAlso(e.definition), isCoreTerm: e.isCoreTerm }));
      }));

      if (allEntries.length < 4) {
        return res.status(404).json({ error: isFrench ? "Pas assez de définitions disponibles pour un exercice." : "Not enough definitions available for an exercise." });
      }

      // Sample from distinctively PMP-specific terms (change control board, earned value, kanban
      // board, ...) rather than the whole glossary, which also defines plenty of ordinary English
      // words in passing (accuracy, authority, benefit, outcome, method, waste, ...) that aren't
      // themselves PM vocabulary - not useful as a "guess the term" exercise. Falls back to the
      // full pool only if there simply aren't enough core terms to build an exercise from.
      const coreEntries = allEntries.filter(e => e.isCoreTerm);
      const samplingPool = coreEntries.length >= 4 ? coreEntries : allEntries;

      // Fisher-Yates shuffle, then sample 4 or 5 pairs.
      const shuffled = [...samplingPool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const count = samplingPool.length >= 5 && Math.random() < 0.5 ? 5 : 4;
      let pairs = shuffled.slice(0, count).map((e, i) => ({ id: `pair_${i}`, term: e.term, definition: e.definition }));

      const client = getGeminiClient();
      if (isFrench && client) {
        try {
          const translateResponse = await generateContentWithRetry(client, {
            model: "gemini-3.5-flash",
            contents: JSON.stringify(pairs.map(p => ({ term: p.term, definition: p.definition }))),
            config: {
              temperature: 0,
              systemInstruction: "Translate each {term, definition} pair in this JSON array from English to professional French PMP terminology. Translate ONLY the exact text given - do not add, expand, or restore any content that isn't already in the provided text, even if you recognize the term and recall its official glossary definition includes more (e.g. a 'See also X' cross-reference) - if it's not in the input text, it must not appear in your French output either. Keep the exact same array length and order. Respond with ONLY the translated JSON array, same shape.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } },
                  required: ["term", "definition"]
                }
              }
            }
          }, 2);
          const translated = translateResponse.text ? JSON.parse(translateResponse.text) : null;
          if (Array.isArray(translated) && translated.length === pairs.length) {
            pairs = pairs.map((p, i) => ({
              ...p,
              term: typeof translated[i]?.term === "string" ? translated[i].term : p.term,
              // Same deterministic safety net as Definitions Search's translation pass: strip any
              // "Voir aussi ..." the model "helpfully" restored from its own training knowledge of
              // the real glossary entry, despite being told not to.
              definition: stripSeeAlso(typeof translated[i]?.definition === "string" ? translated[i].definition : p.definition)
            }));
          }
        } catch (err) {
          console.error("Matching exercise translation to French failed, returning English pairs:", err);
        }
      }

      res.json({ pairs });
    } catch (err: any) {
      console.error("Matching exercise route error:", err);
      res.status(500).json({ error: `Could not build matching exercise: ${err.message}` });
    }
  });

  // Dynamic Two-Pass question generator endpoint
  app.post("/api/questions/generate", requireAuth, generationLimiter, async (req, res) => {
    const { domain, methodology, contextTag, language, subject, phase, sessionCompletedCount, excludeIds, questionType, generationSource } = req.body;
    const isFrench = language === "FR";
    const selectedDefaults = isFrench ? DEFAULT_QUESTIONS_FR : DEFAULT_QUESTIONS;
    
    const selectedDomain = domain && domain !== "Any" ? domain : "People";
    const selectedMethodology = methodology && methodology !== "Any" ? methodology : "Agile";
    const selectedSubject = subject && subject !== "Any" ? subject : "General Project Management";
    const selectedPhase = phase && phase !== "Any" ? phase : "Any Phase";
    const extraContext = contextTag || "general project constraints";

    const count = sessionCompletedCount !== undefined ? Number(sessionCompletedCount) : 0;

    // Determine the progressive difficulty level and its tailored generative instructions
    let difficultyTag = "Simple / Foundational (Definition & Terminology)";
    let difficultyInstruction = "";

    if (questionType === "definition") {
      difficultyTag = "PMBOK Definition (Simple/Terminology)";
      difficultyInstruction = `
      The candidate has explicitly selected the "PMBOK Definitions" mode to master PMBOK Glossary definitions - this mode must read as CLEARLY DIFFERENT from a situational scenario question, at every difficulty level and every session count, not just simpler.
      - Pick ONE major project management term, artifact, role, or technique (such as acceptance criteria, actual cost, agile, artifact, baseline, budget, change control board, earned value, etc. as defined in the PMBOK Guide or Agile Guide glossary).
      - The "scenario" field MUST be phrased as a bare definitional question about that term ONLY - e.g. exactly in the form "What is the definition of [TERM]?", "Which of the following best defines [TERM]?", or "[TERM] refers to which of the following?". Do NOT invent a project, a company, a project manager, a narrative situation, or any "During X phase, a project manager is doing Y..." framing - a plain one-sentence question naming the term is correct and expected, not a shortcoming.
      - Create 4 choices where one option is the correct, accurate definition according to PMBOK / Agile guide principles, and the other three are other real project management terms' definitions (plausible but incorrect for THIS term).
      - The correct_option MUST be exactly one of: "A", "B", "C", "D".
      `;
    } else {
      difficultyInstruction = `
      The candidate is starting their practice session (answered ${count} questions) in "PMP Situational Scenario" mode - every question MUST include a brief real-world project narrative (who, what situation), never a bare "what is the definition of X" question with no scenario at all (that bare-definition format is reserved for the separate "PMBOK Definitions" mode).
      - The question should test a direct standard PMP definition, project management framework, or basic PMBOK 8 / Agile concept, but framed through a brief concrete situation (e.g., "A project manager notices the schedule baseline has slipped by two weeks. Which term describes this deviation?", not just "What is schedule variance?").
      - Keep the scenario brief (1 to 2 sentences maximum) and highly focused at this difficulty level.
      - Do NOT include complex situational conflicts, political hurdles, multiple conflicting variables, or vague options.
      - Focus on direct, objective, and unambiguous knowledge verification, applied to a minimal real situation.
      `;

      if (count >= 2 && count < 4) {
        difficultyTag = "Moderate / Intermediate";
        difficultyInstruction = `
        The candidate is in the middle of their practice session (answered ${count} questions). Introduce a standard PMP-level situational question of moderate complexity. Focus on a realistic project dilemma featuring 1 to 2 stakeholder communication mismatches or planning barriers, requiring balanced servant-leadership and problem-solving.
        `;
      } else if (count >= 4) {
        difficultyTag = "Advanced / Highly Complex";
        difficultyInstruction = `
        The candidate has demonstrated proficiency (answered ${count} questions). Gather all forces to craft an exceptionally difficult, highly complex, and ambiguous multi-variable corporate or hybrid project dilemma. Include conflicting constraints (e.g., tight statutory timeframes vs. team burnout, supplier supply-chain failure vs. sponsor budget caps). All four choices must be crafted with high professional plausibility so that only deep analytical competence under PMBOK 8 stewardship principles, systems thinking, and servant-leadership can distinguish the ideal correct response.
        `;
      }
    }

    // Domain-specific compositional guidance, one block per ECO Domain - all three equally
    // detailed. Originally only "Process" had a dedicated block; "People" and "Business
    // Environment" requests got nothing beyond the single "Target Domain: X" line, which in
    // practice left the model under-constrained for those two and it would frequently default to
    // Process-flavored content anyway (PMBOK glossary/technique material skews process-heavy) -
    // confirmed empirically: repeated "Business Environment" requests came back classified as
    // "Process" regardless of generation source. A deterministic correction below is the real
    // guarantee; this stronger prompt is what makes that correction rarely need to fire at all.
    let domainInstruction = "";
    if (selectedDomain === "Process") {
      domainInstruction = `
      DOMAIN-SPECIFIC PROCESS INSTRUCTION (CRITICAL):
      Since the Target Domain is "Process", you MUST center the question, scenario, or options around:
      - Inputs required for a particular process (e.g., Project Charter, Stakeholder Register, Business Case).
      - Tools and Techniques (e.g., data gathering, expert judgment, data analysis, decision making, meetings, estimating techniques like three-point or parametric, critical path method, reserve analysis).
      - Project Artifacts and Outputs (e.g., project charter, project management plan, issue log, lessons learned register, change requests, work performance reports, product deliverables).
      Ensure the scenario asks about, or the choices test the candidate's understanding of, how these Inputs, Tools & Techniques, and Artifacts/Outputs are used or integrated to resolve the issue. At least 2 of the answer choices must explicitly relate to or name specific Inputs, Tools/Techniques, or Artifacts/Outputs.
      `;
    } else if (selectedDomain === "People") {
      domainInstruction = `
      DOMAIN-SPECIFIC PEOPLE INSTRUCTION (CRITICAL):
      Since the Target Domain is "People", you MUST center the core conflict of the scenario on team
      and stakeholder dynamics, NOT on a technical process, tool, or artifact question. Build the
      dilemma around one of: team conflict resolution, servant leadership, stakeholder engagement
      or communication breakdowns, team motivation/performance, negotiation, coaching/mentoring,
      virtual/distributed team management, or emotional intelligence. The correct answer must
      demonstrate a servant-leadership or people-first resolution (e.g. facilitating a
      conversation, coaching, removing a team impediment) rather than a purely technical/process
      fix. This question's eco_domain classification MUST be "People", never "Process" or
      "Business Environment", even if the scenario also touches on a process or tool in passing.
      `;
    } else if (selectedDomain === "Business Environment") {
      domainInstruction = `
      DOMAIN-SPECIFIC BUSINESS ENVIRONMENT INSTRUCTION (CRITICAL):
      Since the Target Domain is "Business Environment", you MUST center the core conflict of the
      scenario on organizational/strategic factors EXTERNAL to day-to-day process execution or
      team dynamics, NOT on a technical process, tool, or team-conflict question. Build the dilemma
      around one of: business value/benefits realization, regulatory or compliance requirements,
      organizational strategy alignment, external market or environmental factors, a project's
      alignment with the organization's strategic plan, or a go/no-go decision driven by a change
      in business needs. The correct answer must demonstrate an understanding of how the project
      connects to broader organizational or external business context, not a process-execution
      fix. This question's eco_domain classification MUST be "Business Environment", never
      "Process" or "People", even if the scenario also touches on a process or team issue in
      passing.
      `;
    }

    const activeGenSource = generationSource || "combine";
    console.log(`Generating question: Domain=${selectedDomain}, Methodology=${selectedMethodology}, Subject=${selectedSubject}, Phase=${selectedPhase}, DifficultyLevel=${difficultyTag} (session count=${count}), Context=${extraContext}, Language=${isFrench ? "French" : "English"}, SourceMode=${activeGenSource}`);

    // Try to retrieve concepts/excerpts from uploaded custom study reference books to combine them
    let groundedBookContext = "";
    let groundedBookName = "";
    
    if (activeGenSource !== "ai") {
      try {
        const booksColRef = collection(db, "books");
        let booksSnapshot = await withFirestoreTimeout(getDocs(booksColRef), "list books for grounding");

        // If in 'docs solely' mode and database is empty, seed and fetch the PMBOK Glossary
        if (booksSnapshot.empty && activeGenSource === "docs") {
          console.log("[Questions Generator] No books found in DB. Seeding default PMBOK Glossary...");
          await seedPmbokGlossary();
          booksSnapshot = await withFirestoreTimeout(getDocs(booksColRef), "re-list books after seeding");
        }

        if (!booksSnapshot.empty) {
          const bookDocs = booksSnapshot.docs;
          const randomBookDoc = bookDocs[Math.floor(Math.random() * bookDocs.length)];
          const bookData = randomBookDoc.data();
          const bookName = bookData.name || "Custom Study Book";

          const chunksColRef = collection(db, "books", randomBookDoc.id, "chunks");
          const chunksSnapshot = await withFirestoreTimeout(getDocs(chunksColRef), "list chunks for grounding");
          if (!chunksSnapshot.empty) {
            const chunkDocs = chunksSnapshot.docs;
            const randomChunkDoc = chunkDocs[Math.floor(Math.random() * chunkDocs.length)];
            const chunkText = randomChunkDoc.data().text;
            if (chunkText && chunkText.trim().length > 10) {
              groundedBookContext = chunkText;
              groundedBookName = bookName;
              console.log(`Grounded Question: Selected study material from "${groundedBookName}" for context-based generation.`);
            }
          }
        }
      } catch (bookErr) {
        console.error("Error retrieving uploaded book chunks for combination during question generation:", bookErr);
      }
    }

    const client = getGeminiClient();

    // Resilient Fallback if no operational API key is available
    if (!client) {
      console.warn("GEMINI_API_KEY is not configured or in placeholder state. Falling back to pre-defined 2026 simulator questions.");
      // Filter defaults by domain if possible, or pick a random one
      let filtered = selectedDefaults;
      if (excludeIds && Array.isArray(excludeIds) && excludeIds.length > 0) {
        filtered = filtered.filter(q => !excludeIds.includes(q.question_id));
        if (filtered.length === 0) {
          filtered = selectedDefaults;
        }
      }
      if (domain && domain !== "Any") {
        filtered = filtered.filter(q => q.eco_domain === domain);
      }
      if (methodology && methodology !== "Any") {
        const isMatch = (qMeth: string) => {
          const qm = qMeth.toLowerCase();
          const target = methodology.toLowerCase();
          if (target.includes('agile') || target.includes('adaptive')) {
            return qm.includes('agile');
          }
          if (target.includes('hybrid')) {
            return qm.includes('hybrid');
          }
          if (target.includes('predictive') || target.includes('waterfall')) {
            return qm.includes('predictive') || qm.includes('waterfall');
          }
          return qm.includes(target);
        };
        filtered = filtered.filter(q => isMatch(q.methodology));
      }
      if (subject && subject !== "Any") {
        const subWord = subject.toLowerCase().split(' ')[0];
        const matched = filtered.filter(q => 
          q.scenario.toLowerCase().includes(subWord) || 
          q.explanation.toLowerCase().includes(subWord) ||
          q.tags.some(t => t.toLowerCase().includes(subWord))
        );
        if (matched.length > 0) filtered = matched;
      }
      if (phase && phase !== "Any") {
        const phaseWord = phase.toLowerCase();
        const matched = filtered.filter(q => 
          q.scenario.toLowerCase().includes(phaseWord) || 
          q.explanation.toLowerCase().includes(phaseWord)
        );
        if (matched.length > 0) filtered = matched;
      }

      let pool = filtered.length > 0 ? filtered : selectedDefaults;
      if (questionType === "definition") {
        const defTerms = ["definition", "term", "process", "terminology", "glossary", "concept", "methodology"];
        const matched = pool.filter(q => q.tags.some(t => defTerms.includes(t.toLowerCase())) || defTerms.some(term => q.scenario.toLowerCase().includes(term)));
        if (matched.length > 0) pool = matched;
      }
      const question = pool[Math.floor(Math.random() * pool.length)];
      
      const responseObj: any = {
        question: {
          ...question,
          question_id: `gen_fallback_${Date.now()}`,
          question_focus_type: questionType || "situational"
        },
        fallback: true,
        message: isFrench
          ? "Généré via la banque de questions PMP de haute qualité."
          : "Generated via the high-fidelity PMP question bank."
      };

      if (groundedBookName) {
        responseObj.question.grounded_book_name = groundedBookName;
        responseObj.question.pmbok_8_reference = `${question.pmbok_8_reference} | Grounded in Study Book: ${groundedBookName}`;
      }

      return res.json(responseObj);
    }

     try {
       // --- PASS 1: THE CREATOR ---
       const creatorPrompt = `
       You are an elite PMP Exam Architect aligned with the 2026 updates, utilizing the PMBOK Guide 8th Edition, Agile Practice Guide, and the official Exam Content Outline (ECO).
       
       Generate a realistic, highly creative, and original project management question matching the following user preferences:
       Target Domain: "${selectedDomain}"
       Target Methodology: "${selectedMethodology}"
       Target Subject Area: "${selectedSubject}" (Construct the scenario around this project management topic, e.g., ${selectedSubject === 'General Project Management' ? 'general project constraints' : selectedSubject}).
       Target Project Phase/Process Group: "${selectedPhase}" (The scenario event MUST take place during or be highly relevant to this project phase, e.g. ${selectedPhase}).
       Primary Theme/Context: Build the core scenario tension around: "${extraContext}".
       
       METHODOLOGY MANDATE (CRITICAL):
       You MUST style the scenario to STRICTLY match the selected methodology: "${selectedMethodology}".
       - If Target Methodology is "Agile", the scenario MUST take place strictly within a pure Agile framework (Scrum, Kanban, or iterative software delivery) with an Agile mindset and servant leadership key solutions. There must be no traditional phase-gates, rigid Gantt charts, or Waterfall practices.
       - If Target Methodology is "Hybrid", the project MUST run strictly on a Hybrid framework combining traditional predictive oversight (e.g. procurement, rigid external milestone compliance, budget phases) with Agile iterations/sprints for product development.
       - If Target Methodology is "Predictive", the project MUST run strictly under a traditional Predictive/Waterfall model (distinct phase definitions, design-before-build sequence, baseline scope, and variance analysis).
       
       PROGRESSIVE DIFFICULTY SETTING:
       The target difficulty configuration is: **${difficultyTag}**.
       You MUST implement the scenario following this complexity instruction strictly:
       ${difficultyInstruction}

       ${domainInstruction}

       ${excludeIds && Array.isArray(excludeIds) && excludeIds.length > 0 ? `
       PREVIOUSLY ANSWERED QUESTIONS / DO NOT REPEAT:
       Do NOT repeat or generate questions that are identical or highly similar to any of these previously answered question IDs:
       [${excludeIds.slice(-10).join(", ")}]
       Ensure that the narrative, project context, specific conflict, and options are completely unique, fresh, and creative. Do not reuse scenarios about the same generic issues. Write a completely fresh, original project scenario!
       ` : ""}
       
       ${groundedBookContext ? `
       STUDY BOOK EXTRACTION / GROUNDING EXCERPT:
       We have premium custom preparatory study materials loaded from "${groundedBookName}".
       CRITICAL MANDATE: You MUST extract and construct this question DIRECTLY from the facts, concepts, methodologies, or rules detailed in this book context excerpt below:
       [START BOOK EXCERPT]
       ${groundedBookContext}
       [END BOOK EXCERPT]
       The scenario, options, correct answer, and explanation MUST be directly grounded in and supported by the specific text in this excerpt. Do not invent details that contradict this book text. Ensure the question tests the user's comprehension of the exact topic in the excerpt.
       ` : ""}

       ${activeGenSource === "docs" ? `
        CRITICAL SOLE GROUNDING MANDATE (STRICTEST DOCUMENTARY ACCURACY):
        Since the candidate has selected "Docs Solely" mode, you are acting as a strict documentary verifier.
        - You MUST NOT use general AI knowledge, extraneous Agile/Waterfall frameworks, or general PMP concepts unless they are explicitly referenced or defined in the provided BOOK EXCERPT above.
        - The question scenario, the exact question asked, and the answer options must test the user's understanding of the specific facts, terminology, or processes defined inside this specific BOOK EXCERPT.
        - Keep the facts 100% faithful and compliant with the excerpt text. Every distractor should represent a plausible alternative choice or concept directly referenced or related to the excerpt.
        ` : ""}

        ${activeGenSource === "ai" ? `
        CRITICAL BROAD AI MINDSET MANDATE:
        Since the candidate selected "AI Solely" mode, you are encouraged to create a highly creative, immersive, and comprehensive PMP situational scenario using your complete AI knowledge of 2026 PMP exam guidelines, PMBOK 8th Edition, and servant leadership principles. Do NOT reference any custom study guides or uploaded documents.
        ` : ""}

        CRITICAL INSTRUCTIONS:
       1. Wording must use PMP psychometric triggers, such as ending in "What should the project manager do FIRST?" or "What should the project manager do NEXT?".
       2. The scenario must describe a challenging conflict representing multi-department friction, technical issues, or steering-committee roadblocks.
       3. Create 4 plausible multiple-choice options (A, B, C, D) representing actual real-world paths. One option must represent the correct PMBOK 8 / Agile stance (servant leadership, team collaboration, systems thinking, continuous value focus, stakeholder empathy), while the other three represent typical logical fallacies (premature escalation, micromanagement, avoiding friction, passive inaction, contractual rigidity).
       4. Avoid silly or obvious distractors. Professional PMPs must struggle to pick the correct response.
       
       ${isFrench ? "IMPORTANT: The entire scenario, options, correct_option explanation, pmbok_8_reference, and tags MUST be written in perfect, professional French language. Use official standard French PMI/PMP terminology (e.g. use 'caractère de gérance' or 'gérance' for Stewardship, 'leadership serviteur' for Servant Leadership, 'référence de base' for baseline, 'groupe de processus de planification' for Planning phase)." : ""}
 
       Provide your output in raw draft form.
       `;

      console.log("Pass 1: Creating draft question...");
      const pass1Response = await generateContentWithRetry(client, {
        model: "gemini-3.5-flash",
        contents: creatorPrompt,
        config: {
          temperature: 1.0,
        }
      });

      const draftQuestionText = pass1Response.text || "";

      // --- PASS 2: THE REVIEWER ---
      const reviewerPrompt = `
      You are the PMP Senior Validation Reviewer. Your role is to test the draft question against Layer 1 (ECO Blueprint) and Layer 2 (PMBOK 8 principles & Agile Guide), eliminating formatting errors or silly distractors.
      
      Review the draft question:
      ${draftQuestionText}
      
      Verify and refine:
      - Check that all four multiple-choice options start with correct prefix identifiers: "A.", "B.", "C.", "D.".
      - Ensure the "explanation" is an immersive "AI Coach" explanation that details why the chosen correct option is correct AND why each incorrect option is a specific PM logical fallacy relative to servant leadership, stewardship, team accountability, or systems thinking.
      - Ensure the correct option is exactly one of: "A", "B", "C", "D".

      ${questionType === "definition" ? `
      - CRITICAL REWRITE: this is "PMBOK Definitions" mode, which must be visibly different from a
      situational scenario question. If the draft's "scenario" field contains ANY narrative setup
      (a project manager, a team, a meeting, a company, "during X phase...", etc.), REWRITE it to
      strip all of that away and keep ONLY a bare definitional question naming the term, in the
      exact form "What is the definition of [TERM]?" or "Which of the following best defines
      [TERM]?" - for example, rewrite "A project manager is leading a team meeting where a
      stakeholder asks about the Product Backlog. Which of the following best defines the Product
      Backlog?" down to simply "Which of the following best defines the 'Product Backlog'?". Do
      not change which term is being tested or which option is correct - only remove the narrative
      framing around it.
      ` : ""}

      ${isFrench ? "IMPORTANT: Verify that all text fields are written entirely in elegant, high-profile PMP French. The output schema must match exactly." : ""}

      Format the final output strictly as a JSON object matching this schema.
      `;

      console.log("Pass 2: Reviewing and structuring question with target schema...");
      const pass2Response = await generateContentWithRetry(client, {
        model: "gemini-3.5-flash",
        contents: reviewerPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question_id: { 
                type: Type.STRING,
                description: "Generate a randomized key starting with 'gen_pmp_'" 
              },
              eco_domain: { 
                type: Type.STRING, 
                enum: ["People", "Process", "Business Environment"],
                description: "Must match the chosen domain exactly"
              },
              scenario: { 
                type: Type.STRING,
                description: "The complete situational narrative scenario text" 
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Four sophisticated choices starting with A., B., C., D."
              },
              correct_option: { 
                type: Type.STRING,
                enum: ["A", "B", "C", "D"],
                description: "The single correct option identifier" 
              },
              explanation: { 
                type: Type.STRING,
                description: "The comprehensive AI Coach coaching layout explaining failures of A, B, C, D and successes" 
              },
              pmbok_8_reference: { 
                type: Type.STRING,
                description: "Exact chapter/principle reference in PMBOK 8 / Agile Practice Guide" 
              },
              methodology: { 
                type: Type.STRING,
                enum: ["Agile", "Hybrid", "Predictive", "Agile/Hybrid"],
                description: "Methodology representation. Must strictly match the methodology requested."
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Tag associations"
              }
            },
            required: [
              "question_id", 
              "eco_domain", 
              "scenario", 
              "options", 
              "correct_option", 
              "explanation", 
              "pmbok_8_reference", 
              "methodology",
              "tags"
            ]
          }
        }
      });

      const structuredJSON = pass2Response.text;
      if (!structuredJSON) {
        throw new Error("Empty response received from validation reviewer pass.");
      }

      const cleanResponse = JSON.parse(structuredJSON);
      console.log("Question generation completed successfully.");

      // Deterministic safety net for the ECO Domain filter: the prompt above asks for
      // eco_domain === selectedDomain, but empirically the model doesn't always comply,
      // especially for "Business Environment" (it tends to default to "Process", likely biased
      // by process/technique-heavy grounding content) - confirmed by repeated real generation
      // calls. Since the candidate explicitly picked this domain to practice, silently returning
      // a mismatched one would make the domain filter (and the ECO mastery tracking that reads
      // this field) meaningless. Force it to match rather than trust prompt compliance alone -
      // same "deterministic guarantee over prompt compliance" approach already used elsewhere in
      // this file (glossary conflict resolution, the not-found short-circuit).
      if (domain && domain !== "Any" && cleanResponse.eco_domain !== domain) {
        console.warn(`[Question Generation] Model returned eco_domain="${cleanResponse.eco_domain}" for a requested domain of "${domain}" - correcting.`);
        cleanResponse.eco_domain = domain;
      }

      if (groundedBookName) {
        cleanResponse.grounded_book_name = groundedBookName;
      }
      cleanResponse.question_focus_type = questionType || "situational";

      res.json({
        question: cleanResponse,
        fallback: false
      });

    } catch (err: any) {
      console.error("AI Generation Error, rolling back to fallback mode:", err);
      // Resilient fallback to defaults
      const filtered = selectedDefaults.filter(q => q.eco_domain === selectedDomain);
      const pool = filtered.length > 0 ? filtered : selectedDefaults;
      const question = pool[Math.floor(Math.random() * pool.length)];
      
      const responseObj: any = {
        question: {
          ...question,
          question_id: `gen_error_${Date.now()}`,
          question_focus_type: questionType || "situational"
        },
        fallback: true,
        message: isFrench
          ? "Retourné à la banque de questions par défaut en raison d’un échec de l'IA"
          : "Rolled back to default bank due to internal parser error."
      };

      if (groundedBookName) {
        responseObj.question.grounded_book_name = groundedBookName;
        responseObj.question.pmbok_8_reference = `${question.pmbok_8_reference} | Grounded in Study Book: ${groundedBookName}`;
      }

      res.json(responseObj);
    }
  });

  // Catches errors passed via next(err) that no route handler already turned into a JSON
  // response itself - in practice, almost always multer rejecting an upload (wrong file
  // type via fileFilter, or over the 150MB size limit), which would otherwise fall through to
  // Express's default HTML error page. Must be declared with all 4 params (err, req, res, next)
  // for Express to recognize it as error-handling middleware.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error("Unhandled request error:", err);
    const status = err?.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: err?.message || "Request could not be processed." });
  });

  // Serve Frontend Applications
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PMP Exam Simulator full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
