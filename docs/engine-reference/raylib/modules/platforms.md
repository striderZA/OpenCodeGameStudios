# Raylib Platforms — Quick Reference

Last verified: 2026-07-22 | Engine: Raylib 5.5

## Overview

Raylib supports multiple platforms: desktop (Windows, macOS, Linux), web
(via Emscripten), Android, and Raspberry Pi. Each platform has specific
build requirements and considerations.

## Desktop (Windows / macOS / Linux)

### Build with CMake
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

### Build & Run
```bash
# Configure
cmake -B build -S .

# Build
cmake --build build

# Run (Linux/macOS)
./build/GameProject

# Run (Windows)
.\build\Release\GameProject.exe
```

### Platform-Specific Notes
- **Windows**: MinGW-w64 or MSVC supported. Distribute as .exe with DLLs or static link.
- **macOS**: Xcode or CMake. May need to handle code signing for distribution.
- **Linux**: Install dependencies: `sudo apt install libasound2-dev libx11-dev libxrandr-dev libxi-dev libgl1-mesa-dev`

## Web (Emscripten)

### Prerequisites
```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### Build for Web
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

# Web-specific settings
if(EMSCRIPTEN)
    set_target_properties(${PROJECT_NAME} PROPERTIES
        SUFFIX ".html"
        LINK_FLAGS "-s USE_SDL=2 -s ASYNCIFY -s GL_ENABLE_GET_PROC_ADDRESS=1 --preload-file assets"
    )
endif()
```

### Build Commands
```bash
# Configure for web
emcmake cmake -B build-web -S .

# Build
cmake --build build-web

# Serve (need HTTP server for WebAssembly)
cd build-web
python -m http.server 8080
# Open http://localhost:8080 in browser
```

### Web-Specific Considerations
- **No file system access** — preload assets with `--preload-file assets`
- **Async loading** — resources load asynchronously, handle loading states
- **No command line args** — use query parameters or embedded config
- **Input** — mouse and keyboard work, but no raw file access
- **Audio** — browsers require user gesture before audio plays
- **Performance** — WebAssembly is fast but not native speed
- **Storage** — use IndexedDB or localStorage for save data

## Android

### Prerequisites
- Android NDK
- Android SDK
- CMake (bundled with Android Studio)

### Build Setup
```cmake
# In your CMakeLists.txt
set(PLATFORM Android)
set(ANDROID_NDK $ENV{ANDROID_NDK_HOME})

# Raylib handles Android-specific setup internally
# when PLATFORM is set to "Android"
```

### Build Commands
```bash
# Using raylib's Android template
cd raylib/projects/AndroidStudio
# Or use CMake with NDK toolchain

cmake -B build-android -S . \
    -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
    -DANDROID_ABI=arm64-v8a \
    -DANDROID_PLATFORM=android-21

cmake --build build-android
```

### Android-Specific Considerations
- **Touch input** — use `GetTouchPosition()`, `GetTouchX()`, `GetTouchY()`
- **Screen orientation** — lock in AndroidManifest.xml
- **Assets** — bundle in APK's `assets/` folder, access with `LoadFileData()`
- **Lifecycle** — handle pause/resume for background/foreground transitions
- **Performance** — target arm64-v8a for best performance
- **Storage** — use internal storage or external with permissions

## Raspberry Pi

### Prerequisites
```bash
sudo apt install libdrm-dev libegl1-mesa-dev libgles2-mesa-dev
```

### Build
```bash
cmake -B build -S . -DPLATFORM=DRM
cmake --build build
```

### Raspberry Pi-Specific Considerations
- **Platform**: Uses DRM/KMS for display (no X11 required)
- **Performance**: Limited GPU — keep draw calls minimal
- **Input**: USB keyboard/mouse or GPIO controllers
- **Resolution**: Often runs at native display resolution
- **Audio**: ALSA or PulseAudio

## Cross-Platform Code Patterns

### Platform Detection
```c
#if defined(PLATFORM_WEB)
    // Web-specific code
    #include <emscripten/emscripten.h>
#elif defined(PLATFORM_ANDROID)
    // Android-specific code
#elif defined(PLATFORM_RPI)
    // Raspberry Pi specific
#elif defined(_WIN32)
    // Windows-specific
#elif defined(__APPLE__)
    // macOS-specific
#elif defined(__linux__)
    // Linux-specific
#endif
```

### Web Main Loop (Emscripten)
```c
#ifdef PLATFORM_WEB
#include <emscripten/emscripten.h>

void UpdateDrawFrame() {
    // Update
    // Draw
}

int main() {
    InitWindow(800, 600, "Game");
    emscripten_set_main_loop(UpdateDrawFrame, 0, 1);
    CloseWindow();
    return 0;
}
#else
int main() {
    InitWindow(800, 600, "Game");
    while (!WindowShouldClose()) {
        // Update
        // Draw
    }
    CloseWindow();
    return 0;
}
#endif
```

### Touch vs Mouse Input
```c
// Cross-platform input handling
#if defined(PLATFORM_ANDROID) || defined(PLATFORM_WEB)
    // Touch input
    Vector2 touchPos = GetTouchPosition(0); // First finger
    if (GetTouchPointCount() > 0) {
        handleClick(touchPos);
    }
#else
    // Mouse input
    Vector2 mousePos = GetMousePosition();
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        handleClick(mousePos);
    }
#endif
```

### File Paths
```c
// Cross-platform asset paths
const char* assetPath;
#if defined(PLATFORM_ANDROID)
    assetPath = "assets/texture.png"; // APK assets
#elif defined(PLATFORM_WEB)
    assetPath = "assets/texture.png"; // Preloaded
#else
    assetPath = "assets/texture.png"; // Filesystem
#endif

Texture2D texture = LoadTexture(assetPath);
```

### Save Data
```c
// Platform-appropriate save location
#if defined(PLATFORM_ANDROID)
    const char* savePath = "/data/data/com.game/save.dat";
#elif defined(PLATFORM_WEB)
    // Use IndexedDB via JavaScript interop
    const char* savePath = "save.dat"; // In-memory FS
#else
    // Desktop: use user config directory
    #if defined(_WIN32)
        const char* savePath = "save.dat"; // Next to .exe
    #elif defined(__APPLE__)
        const char* savePath = "~/Library/Application Support/Game/save.dat";
    #else
        const char* savePath = "~/.config/game/save.dat";
    #endif
#endif
```

## Common Mistakes
- Not handling web async loading — assets not ready when accessed
- Forgetting to serve web build over HTTP — WebAssembly blocked on file://
- Not handling touch input on mobile — mouse-only controls fail
- Using platform-specific paths — won't work cross-platform
- Forgetting Android lifecycle handling — app crashes on resume
- Not preloading web assets — blank screen while loading
- Ignoring platform performance differences — web/mobile need optimization
- Forgetting to test on all target platforms — desktop-only testing misses issues
