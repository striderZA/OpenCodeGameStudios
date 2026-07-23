# Raylib Core — Quick Reference

Last verified: 2026-07-22 | Engine: Raylib 5.5

## Overview

The core module handles window management, input, timing, and file I/O.
Everything starts with `InitWindow()` and ends with `CloseWindow()`.

## Current API Patterns

### Window Management
```c
#include "raylib.h"

int main() {
    // Initialize window
    InitWindow(800, 600, "My Game");

    // Window settings
    SetTargetFPS(60);
    SetWindowState(FLAG_VSYNC_HINT);
    // SetWindowState(FLAG_FULLSCREEN_MODE);
    // SetWindowState(FLAG_WINDOW_RESIZABLE);
    // SetWindowState(FLAG_WINDOW_UNDECORATED);

    // Check window state
    if (IsWindowReady()) { /* ... */ }
    if (WindowShouldClose()) { /* Exit requested */ }
    if (IsWindowMinimized()) { /* ... */ }
    if (IsWindowFullscreen()) { /* ... */ }

    // Window control
    ToggleFullscreen();
    MaximizeWindow();
    RestoreWindow();
    SetWindowSize(1024, 768);
    SetWindowTitle("New Title");
    SetWindowIcon(image);

    // Screen size
    int width = GetScreenWidth();
    int height = GetScreenHeight();
    Vector2 scale = GetWindowScaleDPI();

    // Cleanup
    CloseWindow();
    return 0;
}
```

### Drawing
```c
// All drawing MUST happen between BeginDrawing/EndDrawing
while (!WindowShouldClose()) {
    BeginDrawing();
    ClearBackground(RAYWHITE);

    // Draw shapes
    DrawPixel(100, 100, RED);
    DrawLine(0, 0, 800, 600, BLUE);
    DrawCircle(400, 300, 50, GREEN);
    DrawRectangle(100, 100, 200, 100, PURPLE);
    DrawRing({400, 300}, 30, 50, 0, 360, YELLOW);

    // Draw text
    DrawText("Hello World", 10, 10, 20, DARKGRAY);
    DrawFPS(10, 40);

    EndDrawing();
}
```

### Timing
```c
// Frame timing
float deltaTime = GetFrameTime();      // Seconds since last frame
double time = GetTime();               // Seconds since InitWindow()
int fps = GetFPS();                    // Current FPS

// Frame-rate independent movement
float speed = 200.0f; // pixels per second
position.x += speed * GetFrameTime();

// Wait/delay
WaitTime(0.5); // Wait 0.5 seconds (blocks)
```

### Keyboard Input
```c
// Detect key states
if (IsKeyPressed(KEY_SPACE)) {
    // Key was just pressed this frame
    player.jump();
}

if (IsKeyDown(KEY_RIGHT)) {
    // Key is being held down
    player.moveX(speed * GetFrameTime());
}

if (IsKeyReleased(KEY_SPACE)) {
    // Key was just released this frame
}

if (IsKeyUp(KEY_RIGHT)) {
    // Key is NOT being held down
}

// Get last key pressed
int key = GetKeyPressed();
if (key != 0) {
    // Process key press
}

// Common key codes
// KEY_SPACE, KEY_ENTER, KEY_ESCAPE, KEY_TAB
// KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT
// KEY_A through KEY_Z
// KEY_LEFT_SHIFT, KEY_LEFT_CONTROL, KEY_LEFT_ALT
```

### Mouse Input
```c
// Mouse position
Vector2 mousePos = GetMousePosition();
int mouseX = GetMouseX();
int mouseY = GetMouseY();

// Mouse buttons
if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
    // Left click just happened
}
if (IsMouseButtonDown(MOUSE_BUTTON_LEFT)) {
    // Left button is held
}
if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT)) {
    // Left button just released
}

// Mouse wheel
float wheel = GetMouseWheelMove();     // Vertical scroll
Vector2 wheelV = GetMouseWheelMoveV(); // Both axes

// Mouse cursor
SetMouseCursor(MOUSE_CURSOR_POINTER);
SetMouseCursor(MOUSE_CURSOR_CROSSHAIR);
ShowCursor();
HideCursor();
DisableCursor(); // Lock to window
EnableCursor();

// Mouse delta (for FPS camera)
Vector2 delta = GetMouseDelta();
```

### Gamepad Input
```c
// Check if gamepad is connected
if (IsGamepadAvailable(0)) {
    // Get gamepad name
    const char* name = GetGamepadName(0);

    // Axes (left stick, right stick, triggers)
    float leftX = GetGamepadAxisMovement(0, GAMEPAD_AXIS_LEFT_X);
    float leftY = GetGamepadAxisMovement(0, GAMEPAD_AXIS_LEFT_Y);
    float rightX = GetGamepadAxisMovement(0, GAMEPAD_AXIS_RIGHT_X);
    float leftTrigger = GetGamepadAxisMovement(0, GAMEPAD_AXIS_LEFT_TRIGGER);

    // Buttons
    if (IsGamepadButtonPressed(0, GAMEPAD_BUTTON_RIGHT_FACE_DOWN)) {
        // A button (Xbox) / Cross (PS)
    }
    if (IsGamepadButtonDown(0, GAMEPAD_BUTTON_LEFT_TRIGGER_1)) {
        // LB / L1
    }

    // Axis deadzone (manual)
    float deadzone = 0.1f;
    if (fabsf(leftX) > deadzone) {
        player.moveX(leftX * speed);
    }
}

// Total gamepads
int gamepadCount = GetGamepadPadCount();
```

### File I/O
```c
// Check files
bool exists = FileExists("assets/config.json");
bool isDir = DirectoryExists("assets/");
const char* ext = GetFileExtension("image.png"); // ".png"
const char* name = GetFileNameWithoutExt("image.png"); // "image"
const char* dir = GetDirectoryPath("assets/image.png"); // "assets/"

// Load/save text
char* text = LoadFileText("assets/config.json");
SaveFileText("output.txt", "Hello World");
UnloadFileText(text);

// Load/save binary data
unsigned int dataSize;
unsigned char* data = LoadFileData("assets/data.bin", &dataSize);
SaveFileData("output.bin", data, dataSize);
UnloadFileData(data);

// Directory listing
int fileCount;
char** files = LoadDirectoryFiles("assets/", &fileCount);
for (int i = 0; i < fileCount; i++) {
    TraceLog(LOG_INFO, files[i]);
}
UnloadDirectoryFiles(files);

// Config files (INI-style)
SetConfigFlags(FLAG_CONFIG_FILE);  // Before InitWindow
// Or use:
bool loaded = LoadConfigFile("config.ini");
SaveConfigFile("config.ini");
```

### Logging
```c
// Log levels: LOG_ALL, LOG_TRACE, LOG_DEBUG, LOG_INFO,
//             LOG_WARNING, LOG_ERROR, LOG_FATAL, LOG_NONE
SetTraceLogLevel(LOG_WARNING); // Only show warnings and above

TraceLog(LOG_INFO, "Player spawned at %f, %f", x, y);
TraceLog(LOG_WARNING, "Texture missing: %s", path);
TraceLog(LOG_ERROR, "Failed to save: %s", error);
```

## Common Mistakes
- Not calling `InitWindow()` before other raylib functions — crash
- Not calling `CloseWindow()` — resource leak
- Drawing outside `BeginDrawing()` / `EndDrawing()` — undefined behavior
- Using `GetFrameTime()` before first frame — returns 0
- Not setting `SetTargetFPS()` — game runs at max speed
- Loading files every frame — huge performance hit
- Forgetting to `Unload*()` loaded data — memory leaks
- Using `IsKeyPressed()` for continuous movement — use `IsKeyDown()`
