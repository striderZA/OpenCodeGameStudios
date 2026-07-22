# SFML 3 — Breaking Changes

Last verified: 2026-07-22

Changes from SFML 2.x to SFML 3.0, focused on migration-critical changes.

## Build System & Requirements

| Subsystem | Change | Details |
|-----------|--------|---------|
| Language | C++17 required | Was C++11 in SFML 2.x. Modern language features required. |
| Build | CMake 3.20+ required | Older CMake versions not supported. |
| Graphics | OpenGL 3.3+ required | Was OpenGL 1.5 minimum. Older hardware may not be supported. |
| Dependencies | Standard library threading | sf::Thread, sf::Mutex, sf::Lock removed. Use std::thread, std::mutex, std::lock_guard. |

## Event Handling (HIGH RISK — Most Common Migration Issue)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Event API | Polymorphic events | `sf::Event` is now `std::variant`-based instead of struct with union. |
| Event polling | Returns optional | `window.pollEvent()` returns `std::optional<sf::Event>` instead of bool with out parameter. |
| Event checking | Type-safe visitors | `event->is<sf::Event::Closed>()` instead of `event.type == sf::Event::Closed`. |
| Key events | Structured access | `event->getIf<sf::Event::KeyPressed>()` to extract key event data. |

**Old SFML 2.x pattern:**
```cpp
sf::Event event;
while (window.pollEvent(event)) {
    if (event.type == sf::Event::Closed)
        window.close();
    if (event.type == sf::Event::KeyPressed) {
        if (event.key.code == sf::Keyboard::Escape)
            window.close();
    }
}
```

**New SFML 3.0 pattern:**
```cpp
while (const auto event = window.pollEvent()) {
    if (event->is<sf::Event::Closed>())
        window.close();
    if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
        if (key->code == sf::Keyboard::Key::Escape)
            window.close();
    }
}
```

## Window & Video Mode

| Subsystem | Change | Details |
|-----------|--------|---------|
| VideoMode | Brace initialization | `sf::VideoMode({800, 600})` instead of `sf::VideoMode(800, 600)`. |
| RenderWindow | Updated constructor | Takes `sf::VideoMode` with brace-init size. |
| Window styles | Enum changes | `sf::Style::Default` → `sf::Style::Default` (unchanged but verify usage). |

## Resource Loading

| Subsystem | Change | Details |
|-----------|--------|---------|
| Textures | Exception on failure | `sf::Texture` constructor throws on load failure instead of returning empty texture. |
| Sounds | Exception on failure | `sf::SoundBuffer` throws on load failure. |
| Fonts | Exception on failure | `sf::Font` throws on load failure. |
| Error handling | Use try-catch | Wrap resource loading in try-catch blocks. |

**Old pattern:**
```cpp
sf::Texture texture;
if (!texture.loadFromFile("image.png")) {
    // Handle error
}
```

**New pattern:**
```cpp
try {
    sf::Texture texture("image.png");
} catch (const sf::Exception& e) {
    // Handle error
}
```

## Threading & System

| Subsystem | Change | Details |
|-----------|--------|---------|
| Threading | Removed sf::Thread | Use `std::thread` from C++ standard library. |
| Mutexes | Removed sf::Mutex | Use `std::mutex` from C++ standard library. |
| Locks | Removed sf::Lock | Use `std::lock_guard` or `std::unique_lock`. |
| Sleep | Removed sf::sleep() | Use `std::this_thread::sleep_for()`. |
| Time | Clock API unchanged | `sf::Clock` and `sf::Time` remain available. |

## String & Unicode

| Subsystem | Change | Details |
|-----------|--------|---------|
| String | std::string based | `sf::String` uses `std::string` internally instead of custom implementation. |
| Unicode | Removed sf::Unicode::Text | Use standard C++ string handling. |

## Graphics & Rendering

| Subsystem | Change | Details |
|-----------|--------|---------|
| Vectors | Brace initialization | `sf::Vector2f({1.0f, 2.0f})` supported. |
| Shapes | Constructor changes | Some shape constructors updated. Verify usage. |
| Shaders | OpenGL 3.3+ | Shader code must be compatible with OpenGL 3.3+. |
| RenderTarget | View API | `getDefaultView()` API unchanged but verify usage patterns. |

## Common Migration Checklist

1. Update CMake to 3.20+ and set C++17 standard
2. Replace `sf::Thread` with `std::thread`
3. Update event handling to use polymorphic events
4. Add exception handling for resource loading
5. Update `sf::VideoMode` initialization to use braces
6. Verify OpenGL 3.3+ compatibility
7. Remove any usage of deprecated SFML 2.x APIs
