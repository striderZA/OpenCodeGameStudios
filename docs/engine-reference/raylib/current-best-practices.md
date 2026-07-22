# Raylib — Current Best Practices

Last verified: 2026-07-22 | Engine: Raylib 5.5

Best practices for Raylib development. Raylib is designed for simplicity
and learning, but proper patterns prevent common issues.

## Resource Management

- **Always pair Load* with Unload*** — memory leak prevention
  ```c
  Texture2D texture = LoadTexture("assets/player.png");
  // ... use texture ...
  UnloadTexture(texture); // MUST call before program exits
  ```

- **Load resources once, reuse** — don't reload every frame
  ```c
  // GOOD: Load once in initialization
  Texture2D playerTex = LoadTexture("assets/player.png");

  // BAD: Loading every frame (expensive!)
  void DrawPlayer() {
      Texture2D tex = LoadTexture("assets/player.png"); // DON'T DO THIS
      DrawTexture(tex, x, y, WHITE);
  }
  ```

- **Check resource validity** — handle load failures
  ```c
  Texture2D texture = LoadTexture("assets/missing.png");
  if (texture.id == 0) {
      TraceLog(LOG_WARNING, "Failed to load texture");
      // Use fallback or handle error
  }
  ```

- **Resource manager pattern** for larger projects
  ```c
  typedef struct {
      Texture2D* textures;
      int textureCount;
      Sound* sounds;
      int soundCount;
  } ResourceManager;

  void InitResources(ResourceManager* mgr) {
      mgr->textures = (Texture2D*)malloc(sizeof(Texture2D) * MAX_TEXTURES);
      mgr->textureCount = 0;
  }

  void UnloadAllResources(ResourceManager* mgr) {
      for (int i = 0; i < mgr->textureCount; i++) {
          UnloadTexture(mgr->textures[i]);
      }
      free(mgr->textures);
  }
  ```

## Game Loop Structure

- **Standard game loop pattern**
  ```c
  #include "raylib.h"

  int main() {
      InitWindow(800, 600, "My Game");
      SetTargetFPS(60);

      // Initialize resources
      Texture2D texture = LoadTexture("assets/player.png");
      Vector2 position = {400, 300};

      // Main game loop
      while (!WindowShouldClose()) {
          // Update
          if (IsKeyDown(KEY_RIGHT)) position.x += 5;
          if (IsKeyDown(KEY_LEFT)) position.x -= 5;
          if (IsKeyDown(KEY_UP)) position.y -= 5;
          if (IsKeyDown(KEY_DOWN)) position.y += 5;

          // Draw
          BeginDrawing();
          ClearBackground(RAYWHITE);
          DrawTexture(texture, position.x, position.y, WHITE);
          DrawFPS(10, 10);
          EndDrawing();
      }

      // Cleanup
      UnloadTexture(texture);
      CloseWindow();
      return 0;
  }
  ```

- **Delta time for frame-rate independent movement**
  ```c
  float speed = 200.0f; // pixels per second

  while (!WindowShouldClose()) {
      float deltaTime = GetFrameTime(); // Time since last frame

      if (IsKeyDown(KEY_RIGHT)) {
          position.x += speed * deltaTime;
      }

      BeginDrawing();
      // ... draw ...
      EndDrawing();
  }
  ```

## C vs C++ Usage

- **C pattern** (traditional raylib)
  ```c
  #include "raylib.h"

  typedef struct {
      Vector2 position;
      float speed;
      Texture2D texture;
  } Player;

  void UpdatePlayer(Player* player) {
      if (IsKeyDown(KEY_RIGHT)) player->position.x += player->speed;
  }

  void DrawPlayer(Player* player) {
      DrawTextureV(player->texture, player->position, WHITE);
  }
  ```

- **C++ pattern** (with raylib-cpp wrappers)
  ```cpp
  #include "raylib-cpp.hpp"

  class Player {
  public:
      raylib::Vector2 position{400, 300};
      float speed = 5.0f;
      raylib::Texture texture;

      Player() {
          texture = raylib::Texture("assets/player.png");
      }

      void Update() {
          if (raylib::Keyboard::IsKeyDown(KEY_RIGHT)) {
              position.x += speed;
          }
      }

      void Draw() {
          texture.Draw(position);
      }
  };
  ```

## Error Handling

- **Use TraceLog for logging**
  ```c
  TraceLog(LOG_INFO, "Game initialized");
  TraceLog(LOG_WARNING, "Texture not found, using fallback");
  TraceLog(LOG_ERROR, "Failed to load audio device");
  TraceLog(LOG_DEBUG, "Player position: %f, %f", x, y);
  ```

- **Check return values**
  ```c
  if (!IsFileExist("assets/config.json")) {
      TraceLog(LOG_WARNING, "Config file not found, using defaults");
      // Use default settings
  }

  Music music = LoadMusicStream("assets/bgm.ogg");
  if (music.ctxData == NULL) {
      TraceLog(LOG_ERROR, "Failed to load music");
      // Handle error
  }
  ```

## CMake Integration

- **find_package** for system-installed raylib
  ```cmake
  cmake_minimum_required(VERSION 3.20)
  project(GameProject)

  find_package(raylib REQUIRED)

  add_executable(${PROJECT_NAME} src/main.cpp)
  target_link_libraries(${PROJECT_NAME} PRIVATE raylib)
  ```

- **FetchContent** for vendored raylib (recommended)
  ```cmake
  cmake_minimum_required(VERSION 3.20)
  project(GameProject)

  include(FetchContent)
  FetchContent_Declare(raylib
      GIT_REPOSITORY https://github.com/raysan5/raylib.git
      GIT_TAG 5.5
  )
  FetchContent_MakeAvailable(raylib)

  add_executable(${PROJECT_NAME} src/main.cpp)
  target_link_libraries(${PROJECT_NAME} PRIVATE raylib)
  ```

## Platform-Specific Considerations

- **Web deployment** requires Emscripten toolchain
- **Android** requires NDK and platform-specific build setup
- **Desktop** (Windows/macOS/Linux) is straightforward with CMake
- See `modules/platforms.md` for detailed platform guidance

## Common Mistakes

- Not calling `InitWindow()` before other functions — will crash
- Not calling `CloseWindow()` at end — resource leaks
- Loading resources every frame — severe performance hit
- Not pairing `Load*()` with `Unload*()` — memory leaks
- Not calling `InitAudioDevice()` before audio functions
- Using `GetFrameTime()` before first frame — returns 0
- Not setting `SetTargetFPS()` — game runs at max speed
- Drawing outside `BeginDrawing()` / `EndDrawing()` — undefined behavior
- Forgetting to handle window resize — UI breaks at different sizes
