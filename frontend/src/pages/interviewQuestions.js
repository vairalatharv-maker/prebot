const technical = {
  foundation: [
    { topic: 'Problem solving', prompt: 'Talk me through how you would break down a new problem in your {role} work before writing code.', lookFor: ['Clarifies the goal and constraints', 'Explains a step-by-step approach', 'Checks the result with an example'] },
    { topic: 'Data structures', prompt: 'How would you choose a data structure for a feature you might build as a {role}? Give one example.', lookFor: ['Connects the choice to the operations needed', 'Names a suitable structure and why', 'Mentions a trade-off or limitation'] },
    { topic: 'Debugging', prompt: 'You get a bug report that you cannot reproduce immediately. What would you do first?', lookFor: ['Collects useful steps, inputs, or logs', 'Narrows the cause with a repeatable check', 'Confirms the fix and guards against regression'] },
    { topic: 'Code quality', prompt: 'What makes code easy for another engineer to review and maintain?', lookFor: ['Uses clear names and focused functions', 'Explains tests or edge cases', 'Balances simplicity with the requirements'] },
    { topic: 'Testing', prompt: 'How would you test a small feature before asking for review?', lookFor: ['Covers the expected behavior', 'Includes an edge or failure case', 'Describes how they would verify the result'] },
    { topic: 'Project discussion', prompt: 'Choose a project you worked on. What did you build, and what would you improve if you revisited it?', lookFor: ['States their own contribution', 'Explains a real technical decision', 'Identifies a specific improvement and why'] },
  ],
  standard: [
    { topic: 'Problem solving', prompt: 'Describe a problem you solved in your {role} area. How did you move from requirements to a working solution?', lookFor: ['Clarifies constraints or success criteria', 'Explains the approach and a meaningful trade-off', 'Validates the solution with evidence or tests'] },
    { topic: 'Data structures', prompt: 'A feature is getting slow as its data grows. How would you investigate the bottleneck and choose a better approach?', lookFor: ['Measures or isolates where time is spent', 'Explains a complexity or data-structure trade-off', 'Mentions realistic input sizes and validation'] },
    { topic: 'Debugging', prompt: 'A bug only appears intermittently in production. How would you investigate it safely?', lookFor: ['Uses logs or metrics to narrow the trigger', 'Plans a safe reproduction or diagnostic', 'Verifies the fix and considers regression monitoring'] },
    { topic: 'System design', prompt: 'Sketch a small service or feature for a {role}. What are its main parts and how would they communicate?', lookFor: ['Identifies the main components and data flow', 'Explains an interface or storage choice', 'Addresses one failure, scale, or security concern'] },
    { topic: 'Testing', prompt: 'How would you build confidence in a change that touches several parts of an application?', lookFor: ['Combines focused and broader tests', 'Names a risky integration or edge case', 'Explains how the change is observed after release'] },
    { topic: 'Project discussion', prompt: 'Tell me about a technical decision on a project that had a downside. How did you choose it?', lookFor: ['Gives enough context to understand the choice', 'Compares benefits with the downside', 'Describes the outcome and what they learned'] },
  ],
  stretch: [
    { topic: 'Problem solving', prompt: 'A {role} feature has conflicting requirements around speed, cost, and reliability. How would you make a decision?', lookFor: ['Surfaces assumptions and measurable constraints', 'Compares options with explicit trade-offs', 'Proposes a way to validate and revisit the decision'] },
    { topic: 'Data structures', prompt: 'How would you explain the time and space costs of your preferred solution, and what input could make it perform poorly?', lookFor: ['Gives time and space complexity where relevant', 'Identifies a worst-case or scale risk', 'Suggests a benchmark or alternative'] },
    { topic: 'Debugging', prompt: 'A recent release increases latency for only some users. How would you find the cause without making the incident worse?', lookFor: ['Scopes impact and compares affected traffic', 'Uses traces, metrics, or a controlled rollback', 'Explains mitigation and follow-up prevention'] },
    { topic: 'System design', prompt: 'Design a {role} system that must remain useful when one dependency is unavailable. What would you prioritize?', lookFor: ['States reliability goals and failure boundaries', 'Explains fallback, retry, or isolation choices', 'Covers consistency, recovery, or observability'] },
    { topic: 'Testing', prompt: 'A critical test suite is slow and flaky. How would you improve it without losing confidence?', lookFor: ['Separates flaky causes from useful coverage', 'Proposes targeted parallelism or test boundaries', 'Defines how confidence and runtime will be measured'] },
    { topic: 'Project discussion', prompt: 'Describe a project where new evidence changed your technical direction. How did you respond?', lookFor: ['Names the original assumption and new evidence', 'Explains how they changed course and aligned others', 'Reflects on the impact or lesson'] },
  ],
};

const behavioral = {
  foundation: [
    { topic: 'Communication', prompt: 'Tell me about a time you had to explain a technical idea to someone new to it.', lookFor: ['Gives a specific situation', 'Adapts the explanation to the listener', 'Shares the result or feedback'] },
    { topic: 'Teamwork', prompt: 'Describe a time you worked with someone whose approach was different from yours.', lookFor: ['Explains the difference respectfully', 'Describes how they listened or collaborated', 'Shares the outcome'] },
    { topic: 'Ownership', prompt: 'Tell me about a mistake you made while working on a task. What did you do next?', lookFor: ['Takes responsibility without deflecting', 'Explains the action taken to fix it', 'Shares what changed afterward'] },
    { topic: 'Learning', prompt: 'What is something you recently had to learn for a project? How did you approach it?', lookFor: ['Names the skill or knowledge gap', 'Explains concrete learning steps', 'Describes how they applied it'] },
    { topic: 'Prioritization', prompt: 'Tell me about a time you had more than one important task to finish.', lookFor: ['Explains how urgency or impact was assessed', 'Communicates priorities or trade-offs', 'Shares the result'] },
    { topic: 'Feedback', prompt: 'Describe a piece of feedback that helped you improve.', lookFor: ['States the feedback clearly', 'Explains how they responded', 'Gives an example of the improvement'] },
  ],
  standard: [
    { topic: 'Communication', prompt: 'Tell me about a time you had to raise a risk or bad news with a team. How did you handle it?', lookFor: ['Gives context and the risk', 'Communicates early with evidence or options', 'Explains the outcome and follow-up'] },
    { topic: 'Teamwork', prompt: 'Describe a disagreement on a team and how you helped reach a decision.', lookFor: ['Explains both perspectives fairly', 'Uses shared goals or evidence to move forward', 'States the decision and result'] },
    { topic: 'Ownership', prompt: 'Tell me about a task that did not go as planned. What was your part in the outcome?', lookFor: ['Owns their contribution honestly', 'Describes corrective action', 'Shares a practical lesson'] },
    { topic: 'Learning', prompt: 'Describe a time you had to become productive in an unfamiliar area under a deadline.', lookFor: ['Identifies the learning goal and constraints', 'Explains how they learned and asked for help', 'Connects the learning to the delivered result'] },
    { topic: 'Prioritization', prompt: 'Tell me about a time requirements changed while you were working. How did you adjust?', lookFor: ['Clarifies what changed and why', 'Reassesses scope or communicates trade-offs', 'Describes the delivered outcome'] },
    { topic: 'Feedback', prompt: 'Give an example of feedback you initially found challenging. How did you use it?', lookFor: ['Describes the feedback without blaming', 'Explains reflection and specific changes', 'Shares evidence of growth'] },
  ],
  stretch: [
    { topic: 'Communication', prompt: 'Describe a time you had to influence a decision without having formal authority.', lookFor: ['States the shared goal and stakeholders', 'Builds a case with listening and evidence', 'Explains the decision and lasting impact'] },
    { topic: 'Teamwork', prompt: 'Tell me about a time a team commitment was at risk. How did you help the group recover?', lookFor: ['Recognizes the risk and their responsibility', 'Coordinates a realistic recovery plan', 'Explains the outcome and what they would change'] },
    { topic: 'Ownership', prompt: 'Describe a decision you would make differently now. What did you learn from the consequences?', lookFor: ['Is candid about the decision', 'Explains impact and corrective action', 'Shows a specific change in later behavior'] },
    { topic: 'Learning', prompt: 'Tell me about a time you had to change your mind after receiving new evidence.', lookFor: ['Explains the initial view and new evidence', 'Shows openness and how they updated their approach', 'Describes the result or lesson'] },
    { topic: 'Prioritization', prompt: 'Describe a situation where you could not meet every request. How did you decide what to defer?', lookFor: ['Uses impact, risk, or urgency to decide', 'Aligns expectations with affected people', 'Explains consequences and follow-up'] },
    { topic: 'Feedback', prompt: 'Tell me about a time you gave difficult feedback to a teammate. How did you make it constructive?', lookFor: ['Uses a specific, respectful example', 'Focuses on behavior and shared impact', 'Listens and agrees on a next step'] },
  ],
};

export const INTERVIEW_ROLES = ['Software engineer', 'Frontend developer', 'Backend developer', 'Data analyst'];
export const INTERVIEW_LEVELS = [
  { id: 'foundation', label: 'Foundational', detail: 'Build confidence with clear fundamentals' },
  { id: 'standard', label: 'Standard', detail: 'Practice common placement questions' },
  { id: 'stretch', label: 'Stretch', detail: 'Work through deeper trade-offs' },
];
export const INTERVIEW_FORMATS = [
  { id: 'mixed', label: 'Balanced practice', detail: 'Technical + behavioral' },
  { id: 'technical', label: 'Technical round', detail: 'Problem solving + projects' },
  { id: 'behavioral', label: 'Behavioral round', detail: 'Teamwork + communication' },
];

export function buildInterviewQuestions(level, role, format) {
  const technicalSet = technical[level].map((question) => ({ ...question, kind: 'technical', prompt: question.prompt.replaceAll('{role}', role.toLowerCase()) }));
  const behavioralSet = behavioral[level].map((question) => ({ ...question, kind: 'behavioral' }));
  if (format === 'technical') return technicalSet;
  if (format === 'behavioral') return behavioralSet;
  return technicalSet.slice(0, 3).flatMap((question, index) => [question, behavioralSet[index]]);
}
