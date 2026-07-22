# SFML 3 Engine — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | SFML 3.0 |
| **Release Date** | Early 2025 |
| **Project Pinned** | 2026-07-22 |
| **Last Docs Verified** | 2026-07-22 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

SFML 3.0 is a major rewrite released around the LLM's training cutoff (May 2025).
The model likely has limited knowledge of SFML 3.0 specifics and may default to
SFML 2.x patterns that are incompatible or removed in 3.0.

**Critical**: SFML 3.0 requires C++17 and has breaking API changes from 2.x.
Always cross-reference this directory before suggesting SFML code.

## Version Timeline

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 2.x | 2012-2024 | LOW | Legacy API, C++11, widely documented |
| 3.0 | Early 2025 | HIGH | C++17, modernized API, breaking changes |

## Major Changes in SFML 3.0

- **C++17 required** (was C++11 in 2.x)
- **CMake 3.20+ required**
- **Polymorphic event system** using std::variant (was union-based)
- **Modernized resource loading** with exception-based error handling
- **Removed deprecated APIs** from SFML 2.x
- **OpenGL 3.3+ minimum** (was 1.5)
- **Standard library replacements**: sf::Thread → std::thread, sf::Mutex → std::mutex

## Verified Sources

- Official website: https://www.sfml-dev.org/
- GitHub repository: https://github.com/SFML/SFML
- Migration guide: Check GitHub releases and wiki
- API documentation: https://www.sfml-dev.org/documentation/3.0.0/
