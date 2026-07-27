# Interaction design

## Contents

- Interaction as behavior
- Discoverability and signifiers
- Feedback and system status
- Control, agency, and reversibility
- Modes, selection, and direct manipulation
- Errors and validation
- Frequency and expertise
- Exercises and rubric
- Sources

## Interaction as behavior

Interaction design shapes the conversation among person, interface, system, and other actors
over time. A static screen is one state in that conversation.

For each interaction specify:

- trigger and available inputs;
- eligibility and permissions;
- immediate acknowledgment;
- progress or latency behavior;
- result and changed state;
- persistence;
- cancellation and undo;
- errors and recovery;
- accessibility semantics and keyboard operation.

## Discoverability and signifiers

An action is discoverable when people can perceive that it exists and predict its likely effect.

- Use familiar control forms for common behavior.
- Give unfamiliar behavior explicit labels, instruction, demonstration, or safe exploration.
- Preserve a visible distinction between interactive and static content.
- Do not rely on hover to reveal essential actions.
- Icons require learned meaning; pair ambiguous icons with labels.
- Gesture shortcuts should supplement visible paths, not replace them.

Consistency supports learning, but locally consistent misuse of a platform convention can still
be surprising.

## Feedback and system status

Feedback should be:

- immediate enough to connect with the action;
- proportional to consequence;
- located near cause and effect;
- persistent long enough to perceive;
- expressed through more than one sensory channel when necessary;
- honest about progress and uncertainty.

Differentiate acknowledgment ("input received"), progress ("work continues"), completion
("result exists"), and outcome ("what changed"). A spinner acknowledges activity but does not
explain state or recovery.

For long work, support background continuation, cancellation, and safe navigation when possible.
Never display fake precise progress.

## Control, agency, and reversibility

Good interaction preserves agency:

- preview consequential effects;
- let people cancel or back out;
- use undo for reversible operations;
- keep drafts and autosave visible and trustworthy;
- explain permissions before requesting them;
- avoid changing user data silently;
- expose automated actions and their scope.

Use confirmation when the action is rare, consequential, and difficult to reverse. The
confirmation must name the object and effect. Generic "Are you sure?" dialogs teach habituation.

## Modes, selection, and direct manipulation

Modes change the meaning of input. Make active modes visible, bounded, and easy to exit.
Prefer modeless behavior when it does not create ambiguity.

Selection is state, not merely highlight:

- distinguish focus, hover, active press, current item, and selected items;
- show selection count and action scope;
- preserve selection through operations only when expected;
- define partial and mixed selection;
- make bulk actions reversible where possible.

Direct manipulation links action, object, and feedback. It can improve understanding, but
precision, accessibility, and discoverability require alternate controls for drag, resize,
reorder, and spatial gestures.

## Errors and validation

Prevent errors through constraints, examples, safe defaults, and clear dependencies.

Validation should:

- occur early enough to help but not interrupt every keystroke;
- preserve input;
- identify the specific field or object;
- explain what happened in plain language;
- describe how to fix it;
- move and announce focus appropriately;
- provide a summary when errors are distributed;
- avoid blaming the user.

Distinguish invalid format, unavailable value, permission denial, conflict, network failure,
expired state, and system error. Each requires different recovery.

## Frequency and expertise

Optimize differently by frequency:

- repeated expert actions: stable layout, keyboard access, low latency, batch operations;
- occasional actions: clear labels and guided context;
- first-run actions: examples and safe exploration;
- rare high-risk actions: explicit consequences and recovery.

Do not animate or confirm high-frequency actions by default. Small delays compound into a slow
product.

## Exercises

### State inventory

Choose one button that starts an asynchronous operation. Draw every state and transition,
including duplicate activation, cancellation, timeout, partial success, and lost permission.

### Undo versus confirmation

Redesign five destructive operations. Decide which need undo, confirmation, delayed commit,
version history, or a combination. Defend by consequence and reversibility.

### Keyboard translation

Take a drag-and-drop interaction and create equivalent keyboard and assistive-technology paths
without reducing functionality.

### Feedback timing

Prototype the same action with immediate local acknowledgment, delayed global feedback, and
optimistic update. Evaluate trust under success and failure.

## Critique rubric

- Can people discover actions and predict effects?
- Is feedback timely, local, and honest?
- Are long operations cancellable or safely backgrounded?
- Are destructive effects named and recoverable?
- Are modes and selections unambiguous?
- Does validation preserve data and guide repair?
- Are frequent and expert paths efficient?
- Are alternate inputs equivalent?

## Sources and further study

- [CMU Interaction Design Fundamentals](https://metals.hcii.cmu.edu/curriculum/)
- [Apple design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Nielsen Norman Group: Ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Don Norman, *The Design of Everyday Things*.
- Alan Cooper et al., *About Face: The Essentials of Interaction Design*.
- Bill Moggridge, *Designing Interactions*.
- Dan Saffer, *Designing for Interaction*.
