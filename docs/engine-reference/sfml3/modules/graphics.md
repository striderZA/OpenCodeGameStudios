# SFML Graphics — Quick Reference

Last verified: 2026-07-22 | Engine: SFML 3.0

## What Changed Since 2.x (LLM Cutoff)

### SFML 3.0 Changes
- **OpenGL 3.3+ required** — was OpenGL 1.5 minimum
- **Exception-based resource loading** — constructors throw on failure
- **Brace initialization** — `sf::VideoMode({800, 600})`
- **C++17 features** — use modern patterns for texture/sprite management

### Removed in 3.0
- `sf::Image::loadFromFile()` as separate call — use constructor
- `sf::Texture::loadFromFile()` as separate call — use constructor
- Legacy OpenGL 1.5 shader compatibility

## Current API Patterns

### Window & Rendering
```cpp
#include <SFML/Graphics.hpp>

int main() {
    // Brace-init VideoMode
    auto window = sf::RenderWindow(sf::VideoMode({800, 600}), "SFML Game");
    window.setFramerateLimit(60);

    // Exception-based loading
    sf::Texture texture("assets/sprite.png");
    sf::Sprite sprite(texture);

    while (window.isOpen()) {
        // Polymorphic event handling
        while (const auto event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>())
                window.close();
        }

        window.clear(sf::Color::Black);
        window.draw(sprite);
        window.display();
    }
    return 0;
}
```

### Textures & Sprites
```cpp
// Constructor-based loading (3.0 pattern)
try {
    sf::Texture texture("assets/player.png");
    sf::Sprite sprite(texture);
    sprite.setPosition({100.f, 100.f});
    sprite.setScale({2.f, 2.f});
} catch (const sf::Exception& e) {
    // Handle load failure
}

// Texture from memory
sf::Texture memTexture(pixelData, size);

// Texture sub-rect
sf::Texture atlas("assets/atlas.png");
sf::Sprite frame(atlas, sf::IntRect({0, 0}, {32, 32}));
```

### Shapes
```cpp
sf::CircleShape circle(50.f);
circle.setPosition({100.f, 100.f});
circle.setFillColor(sf::Color::Red);

sf::RectangleShape rect({200.f, 100.f});
rect.setPosition({300.f, 200.f});
rect.setFillColor(sf::Color::Blue);

sf::ConvexShape polygon;
polygon.setPointCount(3);
polygon.setPoint(0, {0.f, 0.f});
polygon.setPoint(1, {50.f, 100.f});
polygon.setPoint(2, {100.f, 0.f});
```

### Shaders (OpenGL 3.3+)
```cpp
sf::Shader shader;
shader.loadFromFile("assets/shader.vert", "assets/shader.frag");
shader.setUniform("resolution", sf::Glsl::Vec2(window.getSize()));

// In draw loop
sf::RenderStates states;
states.shader = &shader;
window.draw(sprite, states);
```

### Views
```cpp
sf::View view;
view.setCenter({400.f, 300.f});
view.setSize({800.f, 600.f});
window.setView(view);

// Zoom
view.zoom(0.5f);

// Follow player
view.setCenter(player.getPosition());
```

## Common Mistakes
- Using `sf::VideoMode(800, 600)` — requires brace init `sf::VideoMode({800, 600})`
- Using `texture.loadFromFile()` — use constructor `sf::Texture("path")`
- Not handling exceptions from constructors — will crash on missing files
- Using OpenGL 1.5/2.0 shader code — minimum is OpenGL 3.3 in SFML 3.0
- Forgetting to call `window.display()` after drawing
- Creating sf::Sprite before sf::Texture is loaded (lifetime issue)
