# Perception, cognition, and human factors

## Contents

- Scope and caution
- Attention and visual search
- Memory and recognition
- Mental models and mapping
- Decisions and cognitive load
- Motor behavior and input
- Error and expertise
- Exercises and rubric
- Sources

## Scope and caution

Human factors connects design to human capabilities, limitations, and context. Use models to
form hypotheses and explain mechanisms, not to declare that every person behaves identically.
Age, disability, culture, expertise, motivation, environment, and consequences change behavior.

UC San Diego's Design and Interaction curriculum explicitly combines cognitive science, HCI,
prototyping, visual design, experimentation, and evaluation. This interdisciplinarity is a
better model than applying a list of named "UX laws."

## Attention and visual search

Attention is selective and limited.

- Strong differences in color, orientation, size, or motion can make an item preattentively
  salient, but salience does not guarantee comprehension.
- Competing salient elements divide attention and erase priority.
- Stable spatial landmarks support repeated use.
- Visual search is faster when targets have distinctive features and plausible location.
- Unexpected change outside the focus of attention can go unnoticed.
- Motion captures attention strongly; reserve it for consequential change or explanation.

Design implication: make important state changes visible near the cause, preserve them long
enough to perceive, and avoid simultaneous unrelated animation.

## Memory and recognition

Working memory is limited and task-sensitive. Avoid quoting a universal item count as a UI law.
Complexity depends on chunking, familiarity, interference, and duration.

- Prefer recognition over unaided recall for infrequent tasks.
- Keep needed information visible during comparison and multistep decisions.
- Preserve entered data and context across recoverable errors.
- Use meaningful groups and labels that match domain language.
- Let experienced users rely on learned shortcuts without hiding paths from novices.
- Do not force people to remember transient codes, totals, or rules between distant screens.

Recognition is not always superior. Search, command palettes, and expert notation can be faster
than visually browsing a very large option space.

## Mental models and mapping

People predict a system from prior experience, visible cues, and feedback.

- **Conceptual model**: the explanation the design offers for how the system works.
- **Mental model**: the user's evolving understanding.
- **Mapping**: relation between control and effect.
- **Affordance**: possible action in relation to an actor and environment.
- **Signifier**: perceivable cue indicating an affordance.

Use familiar models when they fit. A metaphor that initially teaches but later constrains the
product should be replaced by a clear domain model.

Natural mapping reduces translation: spatial controls correspond to spatial effects; the order
of fields follows the object or process people know; feedback appears near its source.

## Decisions and cognitive load

Reduce extraneous work, not meaningful choice.

- Clarify distinctions between options.
- Supply defaults only when they are safe, reversible, and explainable.
- Stage information according to task sequence, while preserving access to consequences.
- Group related decisions and separate unrelated ones.
- Reveal advanced options without making essential behavior mysterious.
- Use comparison structures when people must weigh alternatives.
- Avoid false urgency and visually coercive defaults.

Hick-Hyman and choice-reaction models describe experimental relationships between alternatives
and response time under conditions; they do not mean every menu should contain fewer items.
Organization, familiarity, frequency, and search strategy can matter more than raw count.

## Motor behavior and input

Fitts's law models acquisition time as a function of target distance and effective width.
Transferable implications:

- Give frequent and consequential targets sufficient effective size.
- Use screen edges and corners deliberately where the platform makes them easy to acquire.
- Avoid placing destructive and frequent actions adjacent without separation or confirmation.
- Do not require precision for common touch actions.
- Support keyboard, pointer, touch, voice, switch, and other inputs where relevant.
- Account for tremor, limited dexterity, one-handed use, posture, movement, gloves, and glare.

Do not infer a single target size from Fitts's law. Follow applicable platform and WCAG
requirements, then test the actual interaction.

## Error and expertise

- Slips occur when execution differs from intention.
- Mistakes occur when the intention or model is wrong.
- Prevention, feedback, and recovery must address the correct type.
- Experts benefit from accelerators, stable structure, batch actions, and low interaction cost.
- Novices benefit from clear concepts, examples, progressive guidance, and safe exploration.
- Confirmation dialogs are appropriate for rare, consequential, hard-to-reverse actions; they
  become habituated noise when applied to everything.

Design for agency: undo, version history, drafts, previews, and reversible operations often
protect better than warnings.

## Exercises

### Attention audit

Record the first ten seconds of a new screen. Mark every element competing for attention and
every state change that can occur. Remove or sequence competition until task priority is clear.

### Memory walk

Complete a multistep flow while listing every fact the interface asks the user to remember.
Redesign to externalize necessary memory.

### Model mismatch

Find a product where internal system structure leaks into user-facing navigation. Draw the
system model and the user's task model, then propose a translation layer.

### Input diversity

Perform the same task with pointer, keyboard only, 200% zoom, and one-handed mobile use. Record
where target acquisition, focus, or context fails.

## Critique rubric

- What competes for attention, and is that competition intentional?
- What must be recalled instead of recognized or kept visible?
- Does the interface expose a coherent conceptual model?
- Are control-effect mappings visible and predictable?
- Is complexity intrinsic to the task or introduced by presentation?
- Are target size and placement appropriate to input and frequency?
- Does the design support both learning and efficient expert use?

## Sources and further study

- [UC San Diego B.S. Design and Interaction curriculum](https://cogsci.ucsd.edu/undergraduates/major/design-interaction.html)
- [MIT User Interface Design and Implementation](https://ocw.mit.edu/courses/6-831-user-interface-design-and-implementation-spring-2011/)
- [ISO 9241-210:2019](https://www.iso.org/standard/77520.html)
- [W3C cognitive accessibility](https://www.w3.org/WAI/cognitive/)
- Don Norman, *The Design of Everyday Things*.
- Christopher Wickens et al., *Engineering Psychology and Human Performance*.
- Stuart Card, Thomas Moran, and Allen Newell, *The Psychology of Human-Computer Interaction*.
- Colin Ware, *Information Visualization: Perception for Design*.
