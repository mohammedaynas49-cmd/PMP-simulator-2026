import { PMPQuestion } from '../types';

export const DEFAULT_QUESTIONS: PMPQuestion[] = [
  {
    question_id: "pmp_2026_001",
    eco_domain: "People",
    methodology: "Agile/Hybrid",
    scenario: "A hybrid project team is designing an eco-friendly consumer product. The marketing lead insists on introducing a generative AI content helper to draft product leaflets, while the senior developer is concerned about secure data sharing and corporate governance. The scrum master observes that this friction has stalled sprint planning for three consecutive days. What is the scrum master's best FIRST action in this situation?",
    options: [
      "A. Instruct the team to exclude the AI tool task from the current sprint backlog to protect the sprint budget and timebox.",
      "B. Request the Project Management Office (PMO) or legal department to establish a company-wide AI usage charter before proceeding.",
      "C. Facilitate a collaborative technical workshop where the developer and marketer can jointly establish temporary sandbox guidelines and run risk-bounded experiments.",
      "D. Escalated the blocker directly to the product sponsor to demand a formal directive on whether AI integration is approved or not."
    ],
    correct_option: "C",
    explanation: "Under servant leadership (Agile Practice Guide) and PMBOK 8 Core Principles (Stewardship and Adaptability), the project manager should empower the team to self-organize and resolve technical differences collaboratively. Postponing (A) avoids the problem, escalations (B, D) bypass team capability and delay progress. Facilitating a technical sandbox workshop (C) promotes collaborative problem-solving, rapid low-risk learning, and maintains progress on innovative capabilities.",
    pmbok_8_reference: "PMBOK 8 Principles: Team & Adaptability | Agile Practice Guide: Servant Leadership",
    tags: ["AI Integration", "Sustainability", "Team Dynamics"]
  },
  {
    question_id: "pmp_2026_002",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "An infrastructure development project is committed to strict sustainability goals under Net Zero corporate mandates. During phase audits, a data-driven carbon calculation reveals that the concrete supplier's transport route produces 14% higher emissions than budgeted, although the concrete itself complies with all quality constraints. According to PMBOK 8th Edition guidelines, what should the project manager do NEXT?",
    options: [
      "A. Immediately terminate the procurement contract with the concrete supplier and initiate a brand new sourcing cycle.",
      "B. Convene a risk review session with the supplier and sustainability experts to analyze option profiles, such as alternative bio-fuels or offset routing, before modifying the baseline.",
      "C. Request extra budget from the sponsor to buy carbon credits, allowing the project to proceed with the existing transport plan.",
      "D. Revise the sustainability baseline upwards in the change management log and proceed to protect the critical path timeline."
    ],
    correct_option: "B",
    explanation: "PMBOK 8 Core Principle of Stewardship mandates respect for environmental sustainability, and Process focuses on data-driven, risk-aware decision making. Terminating (A) is an extreme reaction that adds delivery risks. Buying credits (C) without exploring active reduction fails stewardship. Rewriting baseline goals (D) is unethical and violates change control. Conducting a risk review and path analysis (B) allows a balanced decision reflecting quality, carbon, cost, and delivery parameters.",
    pmbok_8_reference: "PMBOK 8 Principles: Stewardship & Focus on Value | Process Domain: Risk & Procurement",
    tags: ["Sustainability", "Data-Drive PM", "Risk Management"]
  },
  {
    question_id: "pmp_2026_003",
    eco_domain: "Business Environment",
    methodology: "Agile/Hybrid",
    scenario: "A software provider is initiating a predictive transition to a dynamic hybrid methodology. A major regulatory agency issues a draft ruling requiring all software involving machine-learning algorithms to adhere to strict traceability audits starting in four months. The current agile product backlog does not account for this. What should the project manager do FIRST?",
    options: [
      "A. Halt all current development cycles immediately and assign the developers to study the new draft regulation text.",
      "B. Log the regulatory update as a high-probability risk, and arrange a backlog refinement session with the Product Owner to analyze the impact and plan traceability user stories.",
      "C. File a formal petition to the regulatory agency requesting a compliance extension because the project is in mid-development.",
      "D. Implement the traceability rules immediately in code and let the Product Owner know afterwards during the sprint review."
    ],
    correct_option: "B",
    explanation: "According to the PMP ECO (Business Environment - Domain 3: Evaluate and address compliance) and Agile Practice Guide, when external environment compliance factors arise, the PM must actively assess the impact, log the risk, and work closely with the Product Owner (PO) to refine the backlog. Halting all work (A) is premature. Petitioning for extensions (C) is impractical, and making silent technical changes (D) bypasses the Product Owner's core responsibility for prioritization and ROI.",
    pmbok_8_reference: "PMBOK 8 Principles: Stewardship (Compliance) | Domain 3: Business Environment (Compliance)",
    tags: ["AI Integration", "Compliance", "Backlog Refinement"]
  },
  {
    question_id: "pmp_2026_004",
    eco_domain: "People",
    methodology: "Agile/Hybrid",
    scenario: "During a daily standup, an virtual team member working on a critical sustainability analytics dashboard informs the team that their home region is suffering from power grid failures, and they cannot commit to consistent work hours. Two other team members accuse them of neglecting sprint tasks. How should the servant leader project manager respond to maintain trust and psychological safety?",
    options: [
      "A. Remind the grid-blocked member about their contractual commitments and set up a daily task verification tracker.",
      "B. Actively facilitate an empathetic team check-in, discuss temporary task-sharing options, and coordinate cross-training to relieve critical-path bottlenecks.",
      "C. Escalate the situation to HR to handle regional workspace interruptions while searching for a replacement developer.",
      "D. Suggest the team member take unpaid leave until their local utilities fully stabilize, and distribute their tasks by force."
    ],
    correct_option: "B",
    explanation: "A servant leader prioritizes people (PMP ECO Domain 1) and fosters a supportive environment. PMBOK 8 Core Principles center on team psychological safety, systems thinking, and structural resilience. Showing rigid focus on contracts (A), escalating to HR/firing (C), or forcing unpaid leave (D) damages safety and long-term project trust. Actively organizing supportive redistribution and coverage (B) preserves team harmony and shows constructive problem solving.",
    pmbok_8_reference: "PMBOK 8 Principles: Respect & Systems Thinking | People Domain: Manage Conflict & Support Team",
    tags: ["Team Dynamics", "Sustainability", "Servant Leadership"]
  },
  {
    question_id: "pmp_2026_005",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "An agricultural technology development project is utilizing data-driven drone telemetry to monitor crop health. The stakeholder steering committee claims that the massive multi-terabyte raw datasets are too complex and confusing, causing them to withdraw funding support. What is the project manager's best response to secure alignment?",
    options: [
      "A. Distribute all raw data files via cloud storage and insist that the steering committee hires dedicated analysts to interpret them.",
      "B. Create clean, high-level visual telemetry dashboards detailing actionable carbon footprint and crop yield trends, tailored specifically to the strategic interests of the steering committee.",
      "C. Replace drone analytics with standard manual spreadsheets to prevent information overload.",
      "D. Escalate the steering committee's lack of collaboration to the company's executive champion to demand funding restoration."
    ],
    correct_option: "B",
    explanation: "Effective stakeholder engagement (PMBOK 8 Project Performance Domain) requires communication tailored to individual needs. Steering committees require high-level strategic summaries focusing on business value (e.g. crop yields and environmental compliance), not overwhelming technical telemetry (B). Dumping raw data (A) or reducing data quality (C) are unprofessional. Direct escalation (D) damages the relationship and does not solve the communication failure.",
    pmbok_8_reference: "PMBOK 8 Domains: Stakeholders & Communication | ECO Domain 2: Process (Engage Stakeholders)",
    tags: ["Data-Drive PM", "Stakeholder Engagement"]
  },
  {
    question_id: "pmp_2026_006",
    eco_domain: "Process",
    methodology: "Agile/Hybrid",
    scenario: "A software team has deployed general AI tools inside their integrated development framework. Some developers report code generated by the tool lacks test security, while others praise its speed. The product owner wants to write test stories, but is unsure how to structure the performance metrics. What should the project manager suggest first?",
    options: [
      "A. Mandate a complete ban on the AI tool until the vendor certifies and guarantees zero bugs or vulnerabilities.",
      "B. Set up a dedicated spikes or short workshop to define security guardrails and establish an automated checking tool inside the CI/CD pipieline.",
      "C. Direct the test developers to double their QA testing schedules to catch all security issues manually.",
      "D. Launch standard peer-programming assignments and ignore the tool's integrated output entirely."
    ],
    correct_option: "B",
    explanation: "Under PMBOK 8 rules (Quality Domain) and Agile Practice Guide, integrating automated compliance checks inside continuous integration (CI/CD) and running low-cost research spikes represent the best proactive quality strategies (B). Complete bans (A) stifle innovation. Doubling manual QA schedules (C) adds unnecessary time bottlenecks, and ignoring the tool (D) does not solve security concerns in the existing delivery loop.",
    pmbok_8_reference: "PMBOK 8 Domains: Quality & Adaptability | Process: Determine appropriate project methodology",
    tags: ["AI Integration", "Process Quality", "CI/CD Safety"]
  },
  {
    question_id: "pmp_2026_007",
    eco_domain: "Business Environment",
    methodology: "Predictive",
    scenario: "An international engineering consortium is designing a zero-emission water purification facility. Over the course of the planning phase, multiple local municipal policies alter their requirements on carbon offsets. The project manager is worried that these ongoing changes will cause scope creep. How should the project manager proceed to govern the business boundaries safely?",
    options: [
      "A. Refuse any scope adjustment, pointing strictly to the original signed charter to avoid scope creep.",
      "B. Establish a collaborative regulatory alignment committee with municipal representatives, and integrate local policy evaluations as standard items in the formal Change Control Board (CCB).",
      "C. Request the sponsor to move the facility location to another municipality with simpler environmental policies.",
      "D. Delegate all Municipal scope changes directly to the engineering team without checking the baseline impact."
    ],
    correct_option: "B",
    explanation: "Business Environment involves managing compliance and evaluating external factors. A professional PM leverages formal corporate project governance. Banning comments (A) ignores change necessity. Changing location (C) is a high-cost escapism that destroys business relationships. Delegating without analyzing baseline impacts (D) violates scope safety. Establishing an alignment committee and leveraging the CCB (B) ensures policy compliance is controlled, evaluated, and agreed.",
    pmbok_8_reference: "PMBOK 8 Principles: Systems Thinking & Focus on Value | ECO Domain 3: Business Environment (Compliance)",
    tags: ["Sustainability", "Governance", "Change Control"]
  },
  {
    question_id: "pmp_2026_008",
    eco_domain: "People",
    methodology: "Predictive",
    scenario: "A project manager is leading a predictive thermal solar plant project. The lead thermodynamic engineer, who is highly experienced, refuses to upload progress reports into the data-driven project portfolio portal, stating that the manual reporting application is user-unfriendly and takes away valuable execution hours. How should the project manager address this bottleneck?",
    options: [
      "A. Formally file a disciplinary report highlighting their insubordination to senior management.",
      "B. Meet with the engineer in private to understand their reporting barriers, explain the value of data logs for systemic optimization, and co-design a lightweight reporting method.",
      "C. Hire a secondary administrative assistant to shadow the engineer and write down their reports daily.",
      "D. Allow the senior engineer to skip all data logs to keep them happy and avoid stalling critical technical tasks."
    ],
    correct_option: "B",
    explanation: "PMBOK 8 Core Principle of Leadership and People Domain tasks remind project managers to utilize empathy, active listening, and relational influence to resolve conflicts. Privately discussing issues (B) maintains rapport, discovers the user friction block, and aligns data reporting to global value. Punitive reports (A) damage team chemistry, shadows (C) waste project budget, and exception bypasses (D) ruin data consistency and organizational reporting standards.",
    pmbok_8_reference: "PMBOK 8 Principles: Leadership & Empathy | People Domain: Manage Conflict",
    tags: ["People Management", "Data-Drive PM", "Conflict Resolution"]
  },
  {
    question_id: "pmp_2026_009",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "A predictive infrastructure project has a Planned Value (PV) of $180,000, an Earned Value (EV) of $150,000, and an Actual Cost (AC) of $200,000 at the current reporting date. What does the Cost Performance Index (CPI) indicate, and what should the project manager do NEXT?",
    options: [
      "A. CPI = 1.33, indicating the project is significantly under budget; the project manager should reallocate the surplus budget to scope additions.",
      "B. CPI = 0.75, indicating the project is over budget; the project manager should conduct a root-cause variance analysis before recommending corrective actions.",
      "C. CPI = 0.83, indicating the schedule is ahead of plan; the project manager should accelerate remaining work packages.",
      "D. CPI = 1.20, indicating cost efficiency is excellent; no further action is required."
    ],
    correct_option: "B",
    explanation: "CPI = EV / AC = $150,000 / $200,000 = 0.75, meaning the project is earning only $0.75 of value for every $1 spent — a significant cost overrun. Per PMBOK 8 guidance on data-driven decision making, a CPI below 1.0 requires the project manager to investigate root causes (estimating errors, scope creep, resource inefficiency) through variance analysis before recommending corrective action, rather than assuming success (A, D) or confusing cost performance with schedule performance, which is measured by SPI, not CPI (C).",
    pmbok_8_reference: "PMBOK 8 Process Domain: Measure Performance | Earned Value Management (EVM)",
    tags: ["Earned Value Management", "Cost Performance Index", "Quantitative"]
  },
  {
    question_id: "pmp_2026_010",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "A project schedule network has two paths from start to finish: Path 1 (Activities A-B-D) with durations of 4, 6, and 3 days, and Path 2 (Activities A-C-D) with durations of 4, 5, and 3 days, where A and D are shared by both paths. What is the critical path duration, and which sequence of activities defines it?",
    options: [
      "A. 12 days, defined by Path 2 (A-C-D), because it has fewer activities.",
      "B. 13 days, defined by Path 1 (A-B-D), because it is the longest path through the network.",
      "C. 9 days, defined by the shortest combination of non-shared activities (B and C only).",
      "D. 16 days, defined by summing both paths together to account for total project effort."
    ],
    correct_option: "B",
    explanation: "The critical path is the longest sequence of dependent activities through the network diagram, which determines the shortest possible project duration. Path 1 (A-B-D) totals 4+6+3 = 13 days, while Path 2 (A-C-D) totals 4+5+3 = 12 days. Since 13 days is longer, Path 1 is the critical path, and Activity C on Path 2 carries 1 day of total float. Options A, C, and D misapply the critical path method by choosing the shorter path, isolating unshared activities, or summing all paths instead of comparing them.",
    pmbok_8_reference: "PMBOK 8 Process Domain: Plan Schedule | Critical Path Method (CPM)",
    tags: ["Schedule Management", "Critical Path Method", "Quantitative"]
  },
  {
    question_id: "pmp_2026_011",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "A project team estimates the duration of a critical activity using three-point estimating: Optimistic (O) = 8 days, Most Likely (M) = 12 days, and Pessimistic (P) = 22 days. Using the PERT (beta distribution) formula, what is the expected activity duration?",
    options: [
      "A. 14 days, calculated using the simple triangular average of the three estimates.",
      "B. 13 days, calculated using the PERT weighted formula (O + 4M + P) / 6.",
      "C. 10 days, calculated using only the optimistic and most likely estimates.",
      "D. 22 days, calculated using the pessimistic estimate to ensure a safe contingency buffer."
    ],
    correct_option: "B",
    explanation: "The PERT (beta distribution) formula weights the most likely estimate four times more than the optimistic and pessimistic estimates: (O + 4M + P) / 6 = (8 + 48 + 22) / 6 = 78 / 6 = 13 days. The triangular distribution (A) instead computes a simple average of (O+M+P)/3 = 14 days, a different and less-weighted technique. Options C and D ignore the standard formula entirely.",
    pmbok_8_reference: "PMBOK 8 Process Domain: Estimate Activity Durations | Three-Point Estimating (PERT)",
    tags: ["Estimating", "Three-Point Estimate", "Quantitative"]
  },
  {
    question_id: "pmp_2026_012",
    eco_domain: "Business Environment",
    methodology: "Predictive",
    scenario: "A procurement team is finalizing a contract for a component with a completely stable, well-defined scope of work and low technical risk. The buyer organization wants to minimize its own financial risk and shift cost overrun risk to the seller. Which contract type should the project manager recommend?",
    options: [
      "A. Cost-Plus-Incentive-Fee (CPIF), to share risk and reward between buyer and seller.",
      "B. Firm-Fixed-Price (FFP), because the well-defined scope allows the seller to absorb the cost risk for a set price.",
      "C. Time-and-Materials (T&M), to allow flexibility for undefined scope elements.",
      "D. Cost-Plus-Percentage-of-Cost (CPPC), to allow the seller unlimited billing based on effort expended."
    ],
    correct_option: "B",
    explanation: "A Firm-Fixed-Price (FFP) contract is appropriate when the scope of work is stable, well-defined, and carries low risk of change, because the seller assumes the risk of any cost overruns for an agreed fixed price. Cost-reimbursable types like CPIF (A) or CPPC (D) suit poorly defined or evolving scope where risk is shared with or borne by the buyer, and T&M (C) fits short engagements with undefined effort, not a well-defined deliverable.",
    pmbok_8_reference: "PMBOK 8 Business Environment Domain: Procurement | Contract Types",
    tags: ["Procurement", "Contract Types"]
  },
  {
    question_id: "pmp_2026_013",
    eco_domain: "Business Environment",
    methodology: "Predictive",
    scenario: "During procurement planning, a make-or-buy analysis reveals that manufacturing a specialized safety component in-house would expose the project to significant compliance and liability risk due to limited internal expertise. A qualified external vendor offers to manufacture the component under a fixed-price contract with defined liability clauses. What should the project manager do?",
    options: [
      "A. Manufacture the component in-house regardless of the analysis, to retain full control over quality.",
      "B. Proceed with the external vendor, transferring the compliance and liability risk through the fixed-price contract and its liability clauses.",
      "C. Cancel the safety component requirement entirely to avoid the risk altogether.",
      "D. Split the work evenly between in-house staff and the vendor without clarifying accountability."
    ],
    correct_option: "B",
    explanation: "When a make-or-buy analysis shows internal capability is insufficient to manage a risk safely, transferring that risk to a qualified third party via contract (risk transference) is a standard, PMBOK-aligned response, especially when liability clauses formally allocate accountability. Insisting on in-house work despite the analysis (A) ignores the data-driven finding, cancelling scope (C) is an overreaction, and splitting responsibility without clear accountability (D) creates governance gaps.",
    pmbok_8_reference: "PMBOK 8 Business Environment Domain: Procurement | Risk Transference",
    tags: ["Procurement", "Risk Transfer", "Make-or-Buy Analysis"]
  },
  {
    question_id: "pmp_2026_014",
    eco_domain: "People",
    methodology: "Predictive",
    scenario: "In a strong matrix organization, a business analyst assigned to the project is instructed by their functional manager to prioritize internal departmental reporting over the project's sprint commitments, creating a direct conflict with the project's RACI chart, which lists the analyst as Accountable for a critical deliverable. What should the project manager do FIRST?",
    options: [
      "A. Immediately report the functional manager to senior executives for violating the RACI chart.",
      "B. Meet directly with the functional manager to clarify the RACI assignment, resource priorities, and negotiate a resolution that protects the critical deliverable.",
      "C. Reassign the deliverable to a different team member without consulting the functional manager.",
      "D. Instruct the business analyst to ignore their functional manager's instructions entirely."
    ],
    correct_option: "B",
    explanation: "In matrix organizations, resource conflicts between project and functional priorities are common and should first be resolved through direct negotiation and clarification of accountability using tools like the RACI chart, per PMBOK 8 principles on stakeholder collaboration and organizational governance. Escalating immediately (A) bypasses collaborative resolution, silently reassigning work (C) undermines the RACI structure, and instructing the analyst to disregard their manager (D) creates further organizational conflict.",
    pmbok_8_reference: "PMBOK 8 People Domain: Manage Conflict | Organizational Structures & RACI",
    tags: ["Organizational Structure", "RACI", "Conflict Resolution"]
  },
  {
    question_id: "pmp_2026_015",
    eco_domain: "Process",
    methodology: "Predictive",
    scenario: "A risk register identifies a potential supplier failure with a 25% probability of occurring and a cost impact of $200,000 if it occurs. A proposed risk response (qualifying a backup supplier) costs $30,000 and would reduce the probability of occurrence to 5%. Based on Expected Monetary Value (EMV) analysis, should the project manager implement the response?",
    options: [
      "A. No, because the response cost of $30,000 exceeds the original risk probability of 25%.",
      "B. Yes, because the response reduces the risk's EMV from -$50,000 to a combined -$40,000 (response cost plus reduced exposure), improving the project's expected outcome.",
      "C. No, because EMV analysis only applies to opportunities, not threats.",
      "D. Yes, but only if the supplier failure is reclassified as a known-unknown risk."
    ],
    correct_option: "B",
    explanation: "Without the response, EMV = 25% x -$200,000 = -$50,000. With the response, the combined EMV = -$30,000 (response cost) + (5% x -$200,000 = -$10,000) = -$40,000. Since -$40,000 represents a smaller expected loss than -$50,000, the response is a good investment. EMV applies equally to threats and opportunities (ruling out C), and the risk category label (D) is irrelevant to the quantitative comparison; option A misreads the comparison basis.",
    pmbok_8_reference: "PMBOK 8 Process Domain: Risk Management | Expected Monetary Value (EMV) Analysis",
    tags: ["Risk Management", "Expected Monetary Value", "Quantitative"]
  },
  {
    question_id: "pmp_2026_016",
    eco_domain: "Process",
    methodology: "Agile/Hybrid",
    scenario: "A Kanban team delivering a digital platform notices that many tasks are stuck in the 'In Review' column, and team members keep pulling new tasks into 'In Progress' to stay busy, causing cycle times to increase steadily. What should the project manager/facilitator recommend FIRST?",
    options: [
      "A. Add more developers to the 'In Review' column to clear the backlog faster.",
      "B. Enforce or lower the Work-in-Progress (WIP) limits so the team swarms on finishing existing tasks before starting new ones.",
      "C. Remove the Kanban board entirely and switch to a simple to-do list.",
      "D. Instruct team members to stop reviewing code to speed up throughput."
    ],
    correct_option: "B",
    explanation: "Rising cycle time combined with a bottleneck column is a classic sign that Work-in-Progress (WIP) limits are too high or unenforced. Kanban principles call for limiting WIP so the team focuses on finishing in-progress work (swarming on bottlenecks) rather than starting new tasks, which improves flow efficiency. Adding people to a bottleneck without addressing flow (A) may not resolve the process issue, removing the visual system (C) eliminates the diagnostic tool itself, and skipping code review (D) sacrifices quality to chase throughput.",
    pmbok_8_reference: "PMBOK 8 Process Domain: Manage Flow | Agile Practice Guide: Kanban & WIP Limits",
    tags: ["Kanban", "Flow Efficiency", "Agile"]
  },
  {
    question_id: "pmp_2026_017",
    eco_domain: "Process",
    methodology: "Agile/Hybrid",
    scenario: "During Sprint Review, the Product Owner rejects several 'completed' backlog items because they lack automated test coverage and updated documentation, even though the developers consider the functional code finished. This is the third sprint in a row this has happened. What should the Scrum Master do to prevent recurrence?",
    options: [
      "A. Instruct the Product Owner to accept all future items regardless of test coverage to maintain velocity.",
      "B. Facilitate a team session to explicitly define or refine the Definition of Done (DoD), ensuring it includes testing and documentation criteria understood by all roles.",
      "C. Assign a separate QA team to fix documentation and tests after each sprint without involving developers.",
      "D. Extend every sprint by several days to allow extra buffer time for testing."
    ],
    correct_option: "B",
    explanation: "Repeated disagreements about whether work is 'done' indicate the team lacks a clear, shared Definition of Done (DoD). The Scrum Master's role is to facilitate the team in explicitly defining or refining the DoD so expectations (including testing and documentation) are aligned before the next sprint. Forcing acceptance (A) undermines quality and the Product Owner's authority, offloading work to a separate team (C) violates cross-functional team accountability, and simply extending sprints (D) treats a process clarity problem as a capacity problem.",
    pmbok_8_reference: "PMBOK 8 Process Domain: Manage Quality | Agile Practice Guide: Definition of Done",
    tags: ["Scrum Artifacts", "Definition of Done", "Quality"]
  },
  {
    question_id: "pmp_2026_018",
    eco_domain: "People",
    methodology: "Agile/Hybrid",
    scenario: "A stakeholder engagement assessment matrix shows that a high-power, high-interest regional director is currently classified as 'Resistant,' while the desired engagement level is 'Leading.' The project manager has only sent this stakeholder standard monthly status reports so far. What should the project manager do to close this gap?",
    options: [
      "A. Continue sending the same monthly reports, since the stakeholder already receives regular updates.",
      "B. Reduce communication with the stakeholder to avoid further resistance.",
      "C. Design a targeted engagement plan with more frequent, tailored interactions (briefings, direct involvement in key decisions) to shift the stakeholder from Resistant toward Leading.",
      "D. Escalate the stakeholder's resistance to their supervisor to force compliance."
    ],
    correct_option: "C",
    explanation: "The Stakeholder Engagement Assessment Matrix compares a stakeholder's current engagement level against the desired level and is used to plan targeted actions that close the gap. A large gap for a high-power, high-interest stakeholder, such as moving from Resistant to Leading, requires a deliberate, tailored engagement strategy with more frequent, higher-quality interaction, not passive reporting (A), disengagement (B), or coercive escalation (D), which would likely deepen resistance.",
    pmbok_8_reference: "PMBOK 8 People Domain: Engage Stakeholders | Stakeholder Engagement Assessment Matrix",
    tags: ["Stakeholder Engagement", "Communication Planning"]
  }
];
