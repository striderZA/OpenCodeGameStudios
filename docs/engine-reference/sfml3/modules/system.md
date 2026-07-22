# SFML System — Quick Reference

Last verified: 2026-07-22 | Engine: SFML 3.0

## What Changed Since 2.x (LLM Cutoff)

### SFML 3.0 Changes
- **Threading classes removed** — sf::Thread, sf::Mutex, sf::Lock removed
- **Use C++ standard library** — std::thread, std::mutex, std::lock_guard
- **sf::sleep() removed** — use std::this_thread::sleep_for()
- **sf::NonCopyable removed** — use `= delete` on copy constructors
- **C++17 patterns** — use modern C++ throughout

### Unchanged Core API
- `sf::Clock`, `sf::Time` for timing remain
- `sf::Vector2<T>`, `sf::Vector3<T>` for math remain
- `sf::String` for text remains (now uses std::string internally)

## Current API Patterns

### Timing
```cpp
#include <SFML/System.hpp>

// Frame timing (delta time)
sf::Clock clock;

while (window.isOpen()) {
    sf::Time elapsed = clock.restart();
    float deltaTime = elapsed.asSeconds();

    // Use deltaTime for frame-rate independent movement
    player.move(speed * deltaTime);
}

// Time operations
sf::Time t1 = sf::seconds(1.5f);
sf::Time t2 = sf::milliseconds(500);
sf::Time t3 = sf::microseconds(1000000);

float secs = t1.asSeconds();    // 1.5f
int millis = t2.asMilliseconds(); // 500
int micros = t3.asMicroseconds(); // 1000000
```

### Vector Math
```cpp
// 2D vectors
sf::Vector2f position(100.f, 200.f);
sf::Vector2f velocity(5.f, -3.f);

// Arithmetic
sf::Vector2f result = position + velocity * deltaTime;
result *= 2.f;
result -= sf::Vector2f(10.f, 10.f);

// Brace initialization (3.0)
sf::Vector2f newPos = {150.f, 250.f};
auto [x, y] = position; // Structured binding

// Length / normalization
float length = std::sqrt(position.x * position.x + position.y * position.y);
sf::Vector2f normalized = position / length;

// Dot product
float dot = position.x * velocity.x + position.y * velocity.y;

// 3D vectors
sf::Vector3f pos3d(1.f, 2.f, 3.f);
sf::Vector3f cross = crossProduct(a, b); // Implement manually if needed
```

### String & Unicode
```cpp
#include <SFML/System.hpp>

// sf::String handles Unicode
sf::String str = "Hello";
sf::String wide = L"Unicode: \u00e9\u00e8\u00ea";

// Conversion
std::string narrow = str.toAnsiString();
std::wstring wideStr = str.toWideString();

// From integer
sf::String fromInt = sf::String::fromNumber(42);

// String operations
str.getSize();     // Character count
str.isEmpty();     // Check empty
str.find("lo");    // Find substring
str.substring(0, 5); // Extract substring
```

### Threading (Use Standard Library)
```cpp
#include <thread>
#include <mutex>
#include <atomic>

// Basic thread
std::thread worker([]() {
    // Background task
    loadData();
});
worker.join(); // Wait for completion

// Detached thread (fire-and-forget)
std::thread([]() {
    // Background task
}).detach();

// Mutex for shared data
std::mutex dataMutex;
std::vector<int> sharedData;

void addToData(int value) {
    std::lock_guard<std::mutex> lock(dataMutex);
    sharedData.push_back(value);
}

// Atomic for simple counters
std::atomic<int> score(0);
score.fetch_add(10);

// Sleep (replaces sf::sleep)
#include <chrono>
std::this_thread::sleep_for(std::chrono::milliseconds(100));
```

### Non-Copyable Pattern
```cpp
// Old SFML 2.x: inherit from sf::NonCopyable
// class ResourceManager : public sf::NonCopyable { ... };

// New SFML 3.0 / C++17: delete copy operations
class ResourceManager {
public:
    ResourceManager() = default;
    ResourceManager(const ResourceManager&) = delete;
    ResourceManager& operator=(const ResourceManager&) = delete;

    // Allow move if needed
    ResourceManager(ResourceManager&&) = default;
    ResourceManager& operator=(ResourceManager&&) = default;
};
```

### Filesystem (Use std::filesystem)
```cpp
#include <filesystem>
namespace fs = std::filesystem;

// SFML 3.0: use C++ standard library for file operations
if (fs::exists("assets/config.json")) {
    // Load file
}

fs::create_directory("saves");
auto files = fs::directory_iterator("assets");
for (const auto& entry : files) {
    if (entry.path().extension() == ".png") {
        // Process image file
    }
}
```

## Common Mistakes
- Using `sf::Thread` / `sf::Mutex` / `sf::Lock` — removed in 3.0
- Using `sf::sleep()` — use `std::this_thread::sleep_for()`
- Not using `deltaTime` for movement — game speed depends on framerate
- Forgetting to call `clock.restart()` — delta time accumulates incorrectly
- Using `sf::Vector2f` arithmetic without understanding component-wise ops
- Creating threads without joining or detaching — undefined behavior on destruction
- Not using mutexes for shared data across threads — data races
- Inheriting from `sf::NonCopyable` — removed, use `= delete`
- Using `sf::String` for file paths — use `std::filesystem::path`
