# Information architecture and user flows

## Contents

- Scope
- Content modeling and taxonomy
- Navigation and orientation
- Search and retrieval
- Flows and state
- Progressive disclosure
- Exercises and rubric
- Sources

## Scope

Information architecture (IA) organizes information and actions so people can understand where
they are, what is available, and how to proceed. It includes content models, taxonomy, labels,
navigation, search, relationships, and wayfinding.

Do not confuse the sitemap, URL tree, database schema, organization chart, and user mental model.
They may influence each other but serve different purposes.

## Content modeling and taxonomy

Before screens, identify:

- entities and their attributes;
- relationships and cardinality;
- lifecycle and state;
- ownership and permissions;
- common user vocabulary and synonyms;
- facets used for filtering and comparison;
- canonical identifiers and display names.

Taxonomies can be:

- hierarchical;
- faceted;
- sequential;
- networked;
- task-based;
- audience-based;
- hybrid.

Choose a structure that supports retrieval and maintenance. Deep hierarchy is not inherently
worse than broad hierarchy; test scent, ambiguity, frequency, and the cost of scanning.

### Labels

Labels should:

- match user and domain language;
- distinguish neighboring choices;
- predict destination or effect;
- remain concise without becoming cryptic;
- localize and scale;
- avoid internal team terminology unless users share it.

Use controlled vocabulary where consistency and retrieval matter, while supporting synonyms in
search.

## Navigation and orientation

Navigation must answer:

1. Where am I?
2. What is this?
3. What can I do here?
4. Where can I go?
5. How do I return or recover?

Establish current location through heading, selected navigation, breadcrumb where hierarchy is
meaningful, and persistent context. Do not rely on color alone.

Global, local, contextual, utility, and in-content navigation serve different scopes. Keep
scope visually and behaviorally distinct.

Avoid hiding primary destinations behind ambiguous icons or account menus. A hamburger menu is
a space-saving control, not an information architecture.

## Search and retrieval

Search behavior depends on domain and inventory:

- exact known-item lookup;
- exploratory browsing;
- attribute comparison;
- re-finding;
- error-tolerant query;
- expert syntax.

Design:

- query entry and examples;
- autocomplete and suggestions;
- typo tolerance and synonyms;
- result ranking and explainability;
- filters and facets;
- zero-results recovery;
- recent and saved queries;
- visible active constraints;
- shareable and restorable state.

Filters alter the result set; sorting changes order. Make the distinction clear and preserve
user selections through navigation.

## Flows and state

A user flow is not merely a sequence of screens. Model:

- entry conditions;
- user intent;
- system and data prerequisites;
- decisions and branches;
- permission boundaries;
- validation;
- external actors or services;
- interruption and resumption;
- success, partial success, failure, cancellation, and recovery;
- exit conditions and downstream effects.

Represent the happy path only after mapping failure and alternate paths. For consequential
workflows, show what is committed at each step and whether it can be undone.

### State machines

Use state models when behavior becomes ambiguous. Define:

```text
state
event/action
guard or permission
transition
side effect
feedback
recovery
```

State models prevent visual mockups from silently contradicting product logic.

## Progressive disclosure

Progressive disclosure defers secondary complexity while preserving access and predictability.
It is appropriate when:

- advanced options are infrequent;
- defaults are safe;
- revealing everything would obscure the main task;
- hidden information does not change informed consent or consequences.

Do not hide prices, risks, eligibility, destructive effects, or necessary comparison data under
the banner of simplicity.

## Exercises

### Open card sort

Create a realistic content set and let participants group and label it. Analyze agreement and
disagreement without forcing a single "correct" tree.

### Tree test

Test whether people can locate target information using labels and hierarchy without visual
design.

### Flow stress map

Take a simple purchase or publishing flow and add interruption, permission loss, expired data,
partial failure, and return after seven days.

### Navigation without icons

Redesign a navigation system using words and structure first. Add icons only where they improve
recognition or scanning.

## Critique rubric

- Does structure follow user tasks and content relationships?
- Are labels distinct, predictable, and in domain language?
- Can people orient without memorizing the path?
- Are search, filter, sort, and browse roles clear?
- Are state, branches, interruptions, and recovery represented?
- Is progressive disclosure hiding only secondary complexity?
- Can navigation and filtered states be restored and shared where appropriate?

## Sources and further study

- [CMU Communication Design program](https://design.cmu.edu/about-our-programs/undergraduate-degrees/communications)
- [Nielsen Norman Group: Information architecture](https://www.nngroup.com/articles/information-architecture-sitemap/)
- [Nielsen Norman Group: Card sorting](https://www.nngroup.com/articles/card-sorting-definition/)
- [GOV.UK Service Manual: Structuring information](https://www.gov.uk/service-manual/design)
- [Baymard ecommerce search research](https://baymard.com/research/ecommerce-search)
- Louis Rosenfeld, Peter Morville, and Jorge Arango, *Information Architecture for the Web and Beyond*.
- Abby Covert, *How to Make Sense of Any Mess*.
- Dan Brown, *Communicating Design*.
