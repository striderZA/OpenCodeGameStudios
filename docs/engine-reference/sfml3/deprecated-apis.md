# SFML 3 — Deprecated APIs

Last verified: 2026-07-22

If an agent suggests any API in the "Removed" column, it MUST be replaced
with the "Use Instead" column. These APIs existed in SFML 2.x but are
removed or fundamentally changed in SFML 3.0.

## Removed Classes

| Removed (SFML 2.x) | Use Instead | Since | Notes |
|---------------------|-------------|-------|-------|
| `sf::Thread` | `std::thread` | 3.0 | C++ standard library replacement |
| `sf::Mutex` | `std::mutex` | 3.0 | C++ standard library replacement |
| `sf::Lock` | `std::lock_guard<std::mutex>` | 3.0 | C++ standard library replacement |
| `sf::sleep()` | `std::this_thread::sleep_for()` | 3.0 | C++ standard library replacement |
| `sf::NonCopyable` | Deleted copy constructors | 3.0 | Use `= delete` on copy ctor/assignment |
| `sf::Unicode::Text` | `std::string` / `std::u32string` | 3.0 | Standard C++ string types |

## Changed Event Handling

| SFML 2.x Pattern | SFML 3.0 Pattern | Since | Notes |
|-------------------|------------------|-------|-------|
| `sf::Event event; window.pollEvent(event)` | `const auto event = window.pollEvent()` | 3.0 | Returns `std::optional<sf::Event>` |
| `event.type == sf::Event::Closed` | `event->is<sf::Event::Closed>()` | 3.0 | Type-safe visitor pattern |
| `event.key.code` | `event->getIf<sf::Event::KeyPressed>()->code` | 3.0 | Extract typed event data |
| `event.mouseButton.x` | `event->getIf<sf::Event::MouseButtonPressed>()->position` | 3.0 | Position is now sf::Vector2i |
| `event.mouseMove.x/y` | `event->getIf<sf::Event::MouseMoved>()->position` | 3.0 | Position is now sf::Vector2i |
| `event.key.code == sf::Keyboard::Escape` | `key->code == sf::Keyboard::Key::Escape` | 3.0 | Key enum is now `Keyboard::Key` |

## Changed Constructors & Signatures

| SFML 2.x | SFML 3.0 | Since | Notes |
|-----------|----------|-------|-------|
| `sf::VideoMode(800, 600)` | `sf::VideoMode({800, 600})` | 3.0 | Brace initialization for size |
| `sf::Texture tex; tex.loadFromFile("x.png")` | `sf::Texture tex("x.png")` | 3.0 | Constructor loads; throws on failure |
| `sf::SoundBuffer buf; buf.loadFromFile("x.wav")` | `sf::SoundBuffer buf("x.wav")` | 3.0 | Constructor loads; throws on failure |
| `sf::Font font; font.loadFromFile("x.ttf")` | `sf::Font font("x.ttf")` | 3.0 | Constructor loads; throws on failure |
| `sf::Image img; img.loadFromFile("x.png")` | `sf::Image img("x.png")` | 3.0 | Constructor loads; throws on failure |
| `window.setFramerateLimit(60)` | `window.setFramerateLimit(60)` | — | Unchanged but verify |

## Changed Enums & Constants

| SFML 2.x | SFML 3.0 | Since | Notes |
|-----------|----------|-------|-------|
| `sf::Keyboard::Escape` | `sf::Keyboard::Key::Escape` | 3.0 | Keys moved to `Keyboard::Key` enum |
| `sf::Mouse::Left` | `sf::Mouse::Button::Left` | 3.0 | Buttons moved to `Mouse::Button` enum |
| `sf::Event::KeyPressed` | `sf::Event::KeyPressed` (type) | 3.0 | Now a variant alternative, not an enum value |
| `sf::Shader::getCurrentTexture()` | Verify API | 3.0 | Check updated shader API |

## Changed Error Handling

| SFML 2.x Pattern | SFML 3.0 Pattern | Since | Notes |
|-------------------|------------------|-------|-------|
| Check return value of `loadFromFile()` | Catch `sf::Exception` | 3.0 | Constructors throw on failure |
| Silent failure on bad resource | Exception thrown | 3.0 | Must handle or program crashes |

## Patterns (Not Just APIs)

| Deprecated Pattern (2.x) | Use Instead (3.0) | Why |
|--------------------------|-------------------|-----|
| Union-based event handling | std::variant polymorphic events | Type safety, no undefined behavior |
| sf::Thread for concurrency | std::thread | Modern C++, better ecosystem support |
| Manual error code checking | Exception handling | Clearer error flow, less boilerplate |
| C++11 patterns | C++17 patterns | Required by SFML 3.0 |
| OpenGL 1.5 shader code | OpenGL 3.3+ shader code | Minimum GL version raised |
