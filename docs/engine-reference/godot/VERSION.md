# Godot — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | 4.6.2 |
| **Project Pinned** | 2026-04-28 |
| **LLM Knowledge Cutoff** | May 2025 |
| **Risk Level** | HIGH — version is beyond LLM training data |

## Post-Cutoff Version Timeline

| Version | Release Date | Relative to Cutoff |
|---------|-------------|-------------------|
| 4.3 | July 2024 | Within training data |
| 4.4 | March 2025 | Near edge |
| 4.5 | September 2025 | Beyond cutoff |
| 4.6 | January 2026 | Beyond cutoff |
| 4.6.2 | April 2026 | Beyond cutoff |

## Knowledge Gap Analysis

- **Training data likely covers**: Up to Godot 4.3 / early 4.4
- **Known gap areas**: 4.4+ TileMapLayer migration, 4.5 NavigationServer improvements, 4.6 editor features, 4.6 rendering changes
- **Mitigation**: All engine specialists must consult reference docs before suggesting APIs

## Note

This engine version is beyond the LLM's training data. Engine reference docs are **required** for accurate API suggestions.

Run `/setup-engine refresh` to update reference docs at any time.
