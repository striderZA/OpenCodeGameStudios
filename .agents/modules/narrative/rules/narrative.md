---
paths:
  - "design/narrative/**"
---

# Narrative Rules

- All new lore must be cross-referenced against existing lore for contradictions
- Every lore entry must specify canon level: Established / Provisional / Under Review
- Character dialogue must match the voice profile defined for that character
- World rules (what is possible/impossible) must be explicitly documented and consistent
- Mysteries must have documented "true answers" even if players never learn them
- Faction motivations, relationships, and power structures must be internally logical
- All narrative text must be localization-ready: no idioms that don't translate, named placeholders for variables
- No line of dialogue should exceed 120 characters for dialogue box constraints
- Every named location needs a one-sentence "elevator pitch" before details are written
- Player-facing text must match the established tone (not all characters sound the same)

## Examples

**Correct** (canon level, cross-referenced):

```markdown
## The Sundering

**Canon Level**: Established
**Source**: `design/narrative/world-history.md`
**Cross-ref**: References the Fall of Aetherius (see `design/narrative/myths/aetherius-fall.md`)
**Text**: The cataclysm that shattered the old continent 500 years ago...
```

**Incorrect** (no canon level, no cross-ref):

```markdown
- The big event happened long ago
- Some people remember it
- It's why things are the way they are
```

## Anti-Patterns

- Adding new lore that contradicts established canon without updating the contradicted entry
- Writing dialogue where every character sounds the same (no distinct voice profiles)
- Leaving mysteries unresolved in the authoring docs (players need not know, authors must)
- Using culturally specific idioms that won't translate (find universal replacements)
- Defining world rules through examples only — write them explicitly
- Exceeding the 120-character dialogue limit (breaks UI layout)

## Cross-References

- Agent: `narrative-director` — owns story architecture
- Agent: `writer` — creates dialogue and lore
- Agent: `world-builder` — ensures world rule consistency
- Agent: `localization-lead` — manages translation pipeline
- Skill: `team-narrative` — orchestrates narrative creation team
- Skill: `localize` — manages the localization pipeline
