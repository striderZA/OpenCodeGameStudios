# Systems Index: [Game Title]

> **Status**: [Draft / Under Review / Approved]
> **Created**: [Date]
> **Last Updated**: [Date]
> **Source Concept**: design/gdd/game-concept.md

## System Enumeration

| ID | System | Category | MVP? | Dependencies | Owner |
|---|---|---|---|---|---|
| [SYS-01] | [System name] | [Category] | [Yes / No] | [System IDs or None] | [Role / person] |

## Dependency Map

### Foundation

- [System — no dependencies]

### Core

- [System] → depends on [Foundation system(s)]

### Feature

- [System] → depends on [Core system(s)]

### Presentation

- [UI/feedback system] → depends on [Gameplay system(s)]

### Polish

- [Meta/tutorial/analytics/accessibility system] → depends on [System(s)]

### Cycles and Bottlenecks

- [Circular dependency and proposed resolution, or None identified]
- [Bottleneck system(s) with many dependents]

## Recommended Design Order

1. [MVP Foundation system]
2. [MVP Core system]
3. [MVP Feature system]
4. [Vertical Slice Foundation/Core system]
5. [Remaining systems in dependency and priority order]

## High-Risk Systems

| System | Risk / reason | Mitigation or validation |
|---|---|---|
| [System name] | [Technical, design, or scope risk] | [Mitigation / validation approach] |

## Progress Tracker

| ID | System | Priority tier | GDD status | GDD path |
|---|---|---|---|---|
| [SYS-01] | [System name] | [MVP / Vertical Slice / Alpha / Full Vision] | [Not Started / In Design / Complete] | [design/gdd/system-name.md] |
