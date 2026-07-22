# SFML Window & Input — Quick Reference

Last verified: 2026-07-22 | Engine: SFML 3.0

## What Changed Since 2.x (LLM Cutoff)

### SFML 3.0 Changes
- **Polymorphic event system** — events are `std::variant` alternatives
- **`pollEvent()` returns `std::optional`** — was bool with out parameter
- **Key enum moved** — `sf::Keyboard::Key::Escape` instead of `sf::Keyboard::Escape`
- **Mouse button enum moved** — `sf::Mouse::Button::Left` instead of `sf::Mouse::Left`
- **Event position is `sf::Vector2i`** — mouse events use `.position` field
- **Brace initialization** — `sf::VideoMode({800, 600})`

## Current API Patterns

### Window Creation
```cpp
#include <SFML/Window.hpp>

// Fullscreen
auto window = sf::RenderWindow(
    sf::VideoMode(sf::VideoMode::getFullscreenModes()[0]),
    "Game",
    sf::Style::Fullscreen
);

// Windowed with specific size (brace init)
auto window = sf::RenderWindow(
    sf::VideoMode({1280, 720}),
    "Game",
    sf::Style::Default // Titlebar + resize + close
);

// Borderless
auto window = sf::RenderWindow(
    sf::VideoMode({800, 600}),
    "Game",
    sf::Style::None
);

// Window settings
window.setFramerateLimit(60);
window.setVerticalSyncEnabled(true);
window.setKeyRepeatEnabled(false); // Disable key repeat for games
window.setMouseCursorVisible(true);
window.setTitle("My Game");
```

### Event Handling (3.0 Polymorphic Pattern)
```cpp
while (window.isOpen()) {
    while (const auto event = window.pollEvent()) {
        // Close event
        if (event->is<sf::Event::Closed>()) {
            window.close();
        }

        // Keyboard
        if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
            if (key->code == sf::Keyboard::Key::Escape)
                window.close();
            if (key->code == sf::Keyboard::Key::Space)
                player.jump();
            if (key->code == sf::Keyboard::Key::Enter && key->alt)
                toggleFullscreen();
        }

        if (const auto* key = event->getIf<sf::Event::KeyReleased>()) {
            if (key->code == sf::Keyboard::Key::A)
                player.stopMoving();
        }

        // Mouse buttons
        if (const auto* click = event->getIf<sf::Event::MouseButtonPressed>()) {
            auto [x, y] = click->position;
            if (click->button == sf::Mouse::Button::Left)
                handleClick(x, y);
            if (click->button == sf::Mouse::Button::Right)
                handleRightClick(x, y);
        }

        // Mouse movement
        if (const auto* move = event->getIf<sf::Event::MouseMoved>()) {
            auto [x, y] = move->position;
            mousePosition = sf::Vector2i(x, y);
        }

        // Mouse wheel
        if (const auto* wheel = event->getIf<sf::Event::MouseWheelScrolled>()) {
            if (wheel->wheel == sf::Mouse::Wheel::Vertical)
                zoom(wheel->delta);
        }

        // Window resize
        if (const auto* resize = event->getIf<sf::Event::Resized>()) {
            sf::View view = window.getView();
            view.setSize(static_cast<sf::Vector2f>(resize->size));
            view.setCenter(static_cast<sf::Vector2f>(resize->size) / 2.f);
            window.setView(view);
        }

        // Text input (for chat boxes, name entry)
        if (const auto* text = event->getIf<sf::Event::TextEntered>()) {
            if (text->unicode >= 32 && text->unicode < 127) {
                inputString += static_cast<char>(text->unicode);
            }
        }

        // Focus
        if (event->is<sf::Event::LostFocus>()) {
            pauseGame();
        }
        if (event->is<sf::Event::GainedFocus>()) {
            resumeGame();
        }
    }
}
```

### Real-Time Input (Not Event-Based)
```cpp
// Check current key state (not events — polls hardware)
if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::W))
    player.moveUp();
if (sf::Keyboard::isKeyPressed(sf::Keyboard::Key::A))
    player.moveLeft();

// Mouse position
sf::Vector2i mousePos = sf::Mouse::getPosition(window);
sf::Vector2i mouseDesktop = sf::Mouse::getPosition(); // Screen coords

// Set mouse position
sf::Mouse::setPosition({400, 300}, window);

// Mouse button state
if (sf::Mouse::isButtonPressed(sf::Mouse::Button::Left))
    firing = true;
```

### Gamepad / Joystick
```cpp
// Check if joystick is connected
if (sf::Joystick::isConnected(0)) {
    // Axes (0-7): X, Y, Z, R, U, V, PovX, PovY
    float xAxis = sf::Joystick::getAxisPosition(0, sf::Joystick::Axis::X);
    float yAxis = sf::Joystick::getAxisPosition(0, sf::Joystick::Axis::Y);

    // Deadzone handling
    constexpr float DEADZONE = 15.f;
    if (std::abs(xAxis) > DEADZONE)
        player.moveX(xAxis / 100.f); // Normalize to -1..1

    // Buttons (0-31)
    if (sf::Joystick::isButtonPressed(0, 0))
        player.jump();
}

// Joystick events
if (const auto* axis = event->getIf<sf::Event::JoystickMoved>()) {
    if (axis->joystickId == 0 && axis->axis == sf::Joystick::Axis::X)
        handleStickMovement(axis->position);
}
if (const auto* btn = event->getIf<sf::Event::JoystickButtonPressed>()) {
    if (btn->joystickId == 0 && btn->button == 0)
        player.jump();
}
```

### Clipboard
```cpp
// Get clipboard text
std::string text = sf::Clipboard::getString();

// Set clipboard text
sf::Clipboard::setString("Copied text");
```

## Common Mistakes
- Using `event.type == sf::Event::Closed` — old 2.x syntax, won't compile
- Using `sf::Keyboard::Escape` — now `sf::Keyboard::Key::Escape`
- Using `sf::Mouse::Left` — now `sf::Mouse::Button::Left`
- Using `event.key.code` — now `event->getIf<sf::Event::KeyPressed>()->code`
- Using `event.mouseButton.x` — now `event->getIf<...>()->position`
- Mixing event-based input with real-time polling incorrectly
- Not handling window resize events — game renders incorrectly
- Not setting deadzone on joystick axes — drift issues
- Using `sf::Event::KeyPressed` for text input — use `TextEntered` for Unicode
