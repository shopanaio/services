# Ethics, responsible design, and AI interfaces

Interface design distributes attention, opportunity, risk, and control. Ethical judgment
is therefore part of professional design practice, not an optional review after visual
decisions have been made.

## Contents

1. Ethical frame
2. Autonomy and deceptive design
3. Privacy, consent, and data
4. Inclusion, fairness, and power
5. Safety and high-stakes contexts
6. Principles for AI interfaces
7. AI interaction patterns
8. Responsible review
9. Exercises and assessment
10. Sources

## 1. Ethical frame

Review a product across four layers:

1. **Intent:** whose goal is being optimized?
2. **Mechanism:** what behavior does the interface encourage or obstruct?
3. **Distribution:** who receives benefit, cost, risk, and decision power?
4. **Consequence:** what happens in normal use, error, misuse, exclusion, and scale?

Compliance is a minimum constraint, not proof of ethical quality. A lawful interaction
can still be coercive, inaccessible, misleading, or socially harmful.

Use these values as explicit criteria:

- human agency;
- dignity;
- fairness;
- privacy;
- transparency;
- accessibility;
- safety;
- contestability;
- accountability;
- sustainability.

## 2. Autonomy and deceptive design

An interface undermines autonomy when it materially distorts a person’s ability to make
an informed, voluntary choice.

Warning signs include:

- hidden or delayed costs;
- preselected consent;
- asymmetric accept and decline paths;
- difficult cancellation;
- false scarcity or urgency;
- disguised advertising;
- confusing double negatives;
- obstruction through repeated steps;
- emotional pressure unrelated to the decision;
- silently expanding the scope of permission.

Apply the symmetry test:

- Are acceptance and refusal equally understandable?
- Are consequences disclosed before commitment?
- Is reversal reasonably proportional to enrollment?
- Does the design remain honest when business pressure rises?

The FTC’s dark-patterns report is a regulatory source and taxonomy aid. Do not reduce
ethical review to a finite blacklist; manipulation can take new forms.

## 3. Privacy, consent, and data

Design privacy as an interaction property:

- collect only what is necessary for the stated purpose;
- explain purpose at the moment of decision;
- separate required from optional data;
- avoid bundling unrelated permissions;
- make retention, sharing, export, and deletion understandable;
- allow review and revocation;
- protect sensitive information from accidental exposure;
- design safe defaults.

Consent should be informed, specific, freely given, and reversible. A link to a long
policy does not repair an interface whose immediate choice is misleading.

Create a data journey:

`collection → inference → storage → access → sharing → retention → deletion`

At each stage identify the user expectation, actual system behavior, risk, and control.

## 4. Inclusion, fairness, and power

Ask who is:

- represented in research and data;
- absent from default personas;
- expected to adapt to the system;
- disproportionately exposed to error;
- able to appeal;
- unable to refuse;
- affected without being a direct user.

Fairness is contextual. Equal treatment can preserve an unequal outcome, while different
support may be needed for equitable access. Do not claim that a visual treatment “solves
bias”; investigate policies, data, operations, and institutional incentives.

Use participatory methods when communities bear meaningful consequences. Compensation,
accessible participation, feedback loops, and visible influence on decisions matter.

## 5. Safety and high-stakes contexts

For health, finance, employment, education, legal, public-service, and safety-critical
interfaces:

- state the limits of the system;
- distinguish advice, estimate, and authoritative decision;
- prevent irreversible action by accident;
- preserve an audit trail where appropriate;
- support escalation to qualified humans;
- design for stress, low attention, and incomplete information;
- test rare but severe failure conditions;
- avoid translating uncertain evidence into false precision.

Risk is a combination of probability, severity, exposure, reversibility, and affected
population. A rare irreversible harm may deserve priority over common cosmetic friction.

## 6. Principles for AI interfaces

AI introduces variable, probabilistic behavior. The interface must help people form an
accurate working model without implying certainty or agency the system does not possess.

### Disclose appropriately

Make AI involvement clear when it materially affects interpretation, choice, authorship,
or consequence. Disclosure must be understandable and timely, not buried in settings.

### Calibrate trust

Communicate capability, limitation, uncertainty, and freshness. Avoid both magical
framing and blanket warnings that users learn to ignore.

### Preserve control

Support preview, edit, regenerate, undo, stop, opt out, and manual alternatives in
proportion to risk.

### Make correction productive

Let users identify what is wrong, repair the result, and understand whether feedback
changes the current artifact, future behavior, or neither.

### Show provenance where useful

For consequential claims, distinguish sources, system inference, user input, and generated
content. Do not use citations as decoration; they should resolve to supporting evidence.

### Design for failure

Cover refusal, hallucination, ambiguity, latency, partial completion, unsafe requests,
model unavailability, stale knowledge, and handoff to another mode or person.

### Avoid anthropomorphic deception

Conversational warmth can improve usability, but do not imply feelings, consciousness,
memory, confidentiality, or authority the system does not have.

## 7. AI interaction patterns

### Generative workspace

Keep prompt, context, output, edit history, and accepted changes distinguishable. Let the
user compare versions and preserve authored work.

### Recommendation

Explain what the recommendation optimizes, provide meaningful alternatives, and make
important exclusions visible. Users need a path to change the criteria.

### Classification or score

Show the decision’s purpose, relevant uncertainty, known limits, and a route to challenge
or correct inputs. Never present a score as a complete account of a person.

### Agentic action

Before consequential external action, make scope, target, side effect, and reversibility
clear. Use staged authorization and receipts. Separate proposing, preparing, and executing.

### Memory and personalization

Show what is remembered, why it is used, how to edit it, and how to disable or delete it.
Do not let conversational convenience obscure data persistence.

## 8. Responsible review

Create an impact record:

| Dimension | Question | Evidence | Risk | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- |
| Agency | Can the person refuse or reverse? | Flow review | High | Add manual path and undo | Product |
| Transparency | Is AI involvement understood? | Comprehension study | Medium | Contextual disclosure | Design |
| Fairness | Who has elevated error rates? | Segmented evaluation | High | Data and policy review | ML/Policy |

Run review before commitment, before launch, and after real-world evidence emerges.
Record unresolved risks rather than converting uncertainty into a green checkmark.

## 9. Exercises and assessment

### Exercise A: dark-pattern reversal

Select a manipulative flow. Diagram the business mechanism, user harm, and power
asymmetry. Redesign it while preserving a legitimate business objective.

### Exercise B: AI failure matrix

For one AI feature, map normal, ambiguous, low-confidence, unsafe, unavailable, and
irreversible cases. Design the interface response for each.

### Exercise C: stakeholder impact map

Map direct users, indirect subjects, operators, affected communities, purchasers, and
regulators. Identify who can challenge the system.

### Rubric

| Criterion | Developing | Competent | Advanced |
| --- | --- | --- | --- |
| Ethical framing | Relies on intention | Names stakeholders and consequences | Exposes power, incentives, and systemic effects |
| Agency | Adds generic consent | Supports informed choice and reversal | Calibrates control to risk and dependency |
| AI transparency | Adds an AI badge | Explains role and key limits | Calibrates explanation to consequence |
| Failure design | Covers one error message | Covers major failure states | Links interface, policy, operations, and escalation |
| Evidence | Makes broad fairness claims | Uses research and segmented evidence | Records uncertainty and ongoing monitoring |

## 10. Sources

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST AI RMF 1.0 publication](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10)
- [OECD AI Principles](https://oecd.ai/en/principles)
- [OECD principle on transparency and explainability](https://oecd.ai/en/dashboards/ai-principles/P7)
- [Federal Trade Commission: Bringing Dark Patterns to Light](https://www.ftc.gov/reports/bringing-dark-patterns-light)
- [Microsoft Inclusive Design](https://inclusive.microsoft.design/)
- [W3C Web Accessibility Initiative](https://www.w3.org/WAI/)
- Sasha Costanza-Chock, *Design Justice*.
- Mike Monteiro, *Ruined by Design*.
- Batya Friedman and David Hendry, *Value Sensitive Design*.
