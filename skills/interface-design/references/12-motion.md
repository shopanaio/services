# Motion and temporal design

## Contents

- Motion as information
- Decision framework
- Spatial and state continuity
- Timing and easing
- Interruptibility and performance
- Accessibility
- Exercises and rubric
- Sources

## Motion as information

Motion is a change in state over time. Use it to:

- acknowledge input;
- preserve object continuity;
- explain spatial or causal relationships;
- indicate progress or system status;
- direct attention to meaningful change;
- communicate hierarchy and entry/exit;
- add character when it does not tax the task.

Do not add motion simply because implementation makes it easy. Apple recommends purposeful,
brief, precise feedback and warns against frequent gratuitous animation.

## Decision framework

Before designing an animation, answer:

1. What change must the person understand?
2. Would an immediate state change already communicate it?
3. How frequently will this occur?
4. Is the action direct, navigational, ambient, or explanatory?
5. Can the motion be interrupted or reversed?
6. What is the reduced-motion equivalent?
7. What happens under latency, dropped frames, and rapid repeated input?

Frequent expert operations should usually be instant or extremely restrained. Rare onboarding or
celebratory moments can carry more expression if they remain skippable and appropriate.

## Spatial and state continuity

Maintain origin and destination:

- anchored layers should appear related to their trigger;
- objects that move should remain identifiable;
- insertion and deletion should explain list reflow;
- navigation transitions should preserve orientation;
- dismissal should follow the established spatial model.

Use shared-element or container transformations only when the objects are meaningfully
continuous. Morphing unrelated surfaces can create a false model.

Motion is one channel. Reinforce important state through layout, text, color, or sound so the
meaning survives reduced motion.

## Timing and easing

Timing depends on distance, scale, frequency, consequence, platform, and input.

- Immediate acknowledgment must feel coupled to input.
- Small frequent transitions should be brief.
- Large spatial transitions may need more time to remain trackable.
- Exit can often be faster than entry.
- Stagger only when sequence supports hierarchy; excessive staggering delays access.

Easing expresses physical and attentional behavior:

- entering and feedback transitions often begin promptly and decelerate;
- on-screen repositioning often benefits from acceleration and deceleration;
- continuous progress uses linear time when constant rate is meaningful;
- spring motion suits interruptible, physically modeled interaction but must avoid gratuitous
  bounce.

Do not standardize one duration or curve for every component. Create a small semantic motion
system and test the perceived result.

## Interruptibility and performance

- Let input interrupt or reverse transitions.
- Do not block interaction until decorative motion finishes.
- Avoid queuing stale animations during rapid input.
- Preserve state if animation is skipped.
- Prefer properties and techniques that meet performance budgets on target devices.
- Test under CPU load, power-saving modes, and low-end hardware.
- Avoid layout movement that causes accidental activation or reading loss.

Skeleton screens are not motion decoration. Use them only when they represent a predictable
structure and do not create false progress.

## Accessibility

- Respect reduced-motion preferences.
- Replace large translation, zoom, parallax, and depth changes with fades or immediate changes.
- Avoid flashing beyond applicable thresholds.
- Avoid sustained peripheral and oscillating motion.
- Do not make animation the only way to perceive status.
- Let people pause, stop, or hide nonessential moving content where standards require.

W3C technique C39 documents `prefers-reduced-motion` as one sufficient technique for
interaction-triggered animation. The design must still define a meaningful alternative.

## Exercises

### No-motion baseline

Design a complete interaction with no animation. Confirm that state, hierarchy, and feedback
remain understandable. Add only motion that improves a named relationship.

### Frequency ladder

Apply the same transition to actions performed once, daily, and hundreds of times. Adjust or
remove motion based on cumulative interaction cost.

### Reduced-motion pair

Create full-motion and reduced-motion versions. Verify identical task meaning, control, and
completion.

### Interruption test

Trigger, reverse, and repeat every transition before it completes. Repair stale state, queues,
and visual discontinuities.

## Critique rubric

- Does each motion have an informational or experiential purpose?
- Does it preserve cause, origin, destination, and object continuity?
- Is timing proportional to frequency and scale?
- Can interaction interrupt or skip it?
- Does meaning survive without motion?
- Is reduced-motion behavior explicitly designed?
- Does it perform under realistic load and devices?
- Is it subordinate to the user's task?

## Sources and further study

- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Material Design 3: Motion](https://m3.material.io/styles/motion/overview)
- [W3C Technique C39: prefers-reduced-motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
- [W3C WCAG 2.2: Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [Microsoft Fluent 2: Motion](https://fluent2.microsoft.design/motion)
- Val Head, *Designing Interface Animation*.
- Rachel Nabors, *Animation at Work*.
