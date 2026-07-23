# SFML 3 — Current Best Practices

Last verified: 2026-07-22 | Engine: SFML 3.0

Practices specific to SFML 3.0 that differ from SFML 2.x patterns.
This supplements (not replaces) the agent's built-in knowledge.

## C++17 Language Features

- **Structured bindings** for cleaner code with pairs/tuples
  ```cpp
  auto [width, height] = window.getSize();
  ```

- **std::optional** for event polling
  ```cpp
  while (const auto event = window.pollEvent()) {
      // event is std::optional<sf::Event> — use -> and * operators
  }
  ```

- **std::variant** for type-safe event handling
  ```cpp
  // Events are now std::variant alternatives — use is<>() and getIf<>()
  if (event->is<sf::Event::Closed>())
      window.close();
  ```

- **constexpr** for compile-time constants
  ```cpp
  constexpr float PLAYER_SPEED = 200.0f;
  constexpr auto WINDOW_WIDTH = 800u;
  ```

- **if constexpr** for template metaprogramming
  ```cpp
  template<typename T>
  void process(const T& value) {
      if constexpr (std::is_arithmetic_v<T>) {
          // numeric processing
      }
  }
  ```

## Event Handling (3.0 Pattern)

- **Use polymorphic event handling** — the core 3.0 pattern
  ```cpp
  while (const auto event = window.pollEvent()) {
      if (event->is<sf::Event::Closed>()) {
          window.close();
      }
      if (const auto* key = event->getIf<sf::Event::KeyPressed>()) {
          if (key->code == sf::Keyboard::Key::Escape)
              window.close();
          if (key->code == sf::Keyboard::Key::Space)
              player.jump();
      }
      if (const auto* click = event->getIf<sf::Event::MouseButtonPressed>()) {
          auto [x, y] = click->position;
          handleClick(x, y);
      }
      if (const auto* resize = event->getIf<sf::Event::Resized>()) {
          // Update view for new window size
          sf::View view = window.getView();
          view.setSize(resize->size.x, resize->size.y);
          view.setCenter(resize->size.x / 2.f, resize->size.y / 2.f);
          window.setView(view);
      }
  }
  ```

## Resource Management

- **Constructor-based loading** with exception handling
  ```cpp
  try {
      sf::Texture playerTexture("assets/player.png");
      sf::SoundBuffer hitSound("assets/hit.wav");
      sf::Font mainFont("assets/font.ttf");
  } catch (const sf::Exception& e) {
      std::cerr << "Failed to load resource: " << e.what() << std::endl;
      return EXIT_FAILURE;
  }
  ```

- **Smart pointers for shared resources**
  ```cpp
  #include <memory>

  class ResourceManager {
      std::unordered_map<std::string, std::shared_ptr<sf::Texture>> m_textures;
  public:
      std::shared_ptr<sf::Texture> loadTexture(const std::string& path) {
          auto it = m_textures.find(path);
          if (it != m_textures.end()) return it->second;
          auto tex = std::make_shared<sf::Texture>(path);
          m_textures[path] = tex;
          return tex;
      }
  };
  ```

## Threading (Use Standard Library)

- **std::thread** for background work
  ```cpp
  #include <thread>

  std::thread worker([]() {
      // Background loading or computation
  });
  worker.join(); // Wait for completion
  ```

- **std::mutex + std::lock_guard** for thread safety
  ```cpp
  #include <mutex>

  std::mutex resourceMutex;
  std::lock_guard<std::mutex> lock(resourceMutex);
  // Thread-safe access to shared resource
  ```

- **std::this_thread::sleep_for** for timing
  ```cpp
  #include <chrono>

  std::this_thread::sleep_for(std::chrono::milliseconds(100));
  ```

## CMake Integration

- **find_package** for system-installed SFML
  ```cmake
  cmake_minimum_required(VERSION 3.20)
  project(GameProject)

  set(CMAKE_CXX_STANDARD 17)
  set(CMAKE_CXX_STANDARD_REQUIRED ON)

  find_package(SFML 3 REQUIRED COMPONENTS graphics window audio network system)

  add_executable(${PROJECT_NAME} src/main.cpp)
  target_link_libraries(${PROJECT_NAME} PRIVATE
      sfml-graphics sfml-window sfml-audio sfml-network sfml-system)
  ```

- **FetchContent** for vendored SFML
  ```cmake
  include(FetchContent)
  FetchContent_Declare(SFML
      GIT_REPOSITORY https://github.com/SFML/SFML.git
      GIT_TAG 3.0.0)
  FetchContent_MakeAvailable(SFML)

  add_executable(${PROJECT_NAME} src/main.cpp)
  target_link_libraries(${PROJECT_NAME} PRIVATE
      SFML::Graphics SFML::Window SFML::Audio SFML::Network SFML::System)
  ```

## Cross-Platform Build

- **Platform detection** in CMake
  ```cmake
  if(WIN32)
      # Windows-specific settings
      target_compile_definitions(${PROJECT_NAME} PRIVATE _WIN32)
  elseif(APPLE)
      # macOS-specific settings
      target_compile_definitions(${PROJECT_NAME} PRIVATE __APPLE__)
  elseif(UNIX)
      # Linux-specific settings
      target_compile_definitions(${PROJECT_NAME} PRIVATE __linux__)
  endif()
  ```

## Common Mistakes

- Using SFML 2.x event handling syntax (`event.type == ...`) — will not compile
- Using `sf::Thread` / `sf::Mutex` — removed in 3.0, use std equivalents
- Forgetting try-catch around resource constructors — will crash on missing files
- Using `sf::VideoMode(800, 600)` instead of `sf::VideoMode({800, 600})` — brace init required
- Using `sf::Keyboard::Escape` instead of `sf::Keyboard::Key::Escape` — enum moved
- Targeting OpenGL < 3.3 for shaders — minimum version raised in 3.0
- Not setting C++17 in CMake — compilation will fail
