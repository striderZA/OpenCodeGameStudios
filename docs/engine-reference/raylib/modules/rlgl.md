# Raylib rlgl — Quick Reference

Last verified: 2026-07-22 | Engine: Raylib 5.5

## Overview

rlgl is raylib's internal OpenGL abstraction layer. It provides a
retained-mode-like API that mimics old OpenGL 1.1 but translates to modern
OpenGL under the hood. Use rlgl for advanced rendering when the high-level
raylib drawing functions are insufficient.

**Warning**: rlgl is for advanced users. Most games should use the high-level
raylib drawing functions (`DrawTexture`, `DrawModel`, etc.) instead.

## Current API Patterns

### Basic rlgl Drawing
```c
#include "raylib.h"
#include "rlgl.h"

// rlgl drawing MUST happen between BeginShaderMode/EndShaderMode
// or within a custom rendering context

// rlgl uses immediate-mode-style API
rlBegin(RL_TRIANGLES);
    rlColor3f(1.0f, 0.0f, 0.0f);
    rlVertex2f(0.0f, 0.0f);

    rlColor3f(0.0f, 1.0f, 0.0f);
    rlVertex2f(100.0f, 0.0f);

    rlColor3f(0.0f, 0.0f, 1.0f);
    rlVertex2f(50.0f, 100.0f);
rlEnd();

// Primitive types
// RL_LINES, RL_TRIANGLES, RL_QUADS
```

### Matrix Stack
```c
// rlgl has its own matrix stack (like OpenGL 1.1)
rlPushMatrix();
    rlTranslatef(x, y, 0.0f);
    rlRotatef(angle, 0.0f, 0.0f, 1.0f);
    rlScalef(scaleX, scaleY, 1.0f);

    // Draw something at transformed position
    rlBegin(RL_QUADS);
        rlVertex2f(-25, -25);
        rlVertex2f(25, -25);
        rlVertex2f(25, 25);
        rlVertex2f(-25, 25);
    rlEnd();
rlPopMatrix();

// Matrix operations
rlTranslatef(x, y, z);
rlRotatef(degrees, ax, ay, az);
rlScalef(sx, sy, sz);
rlMultMatrixf(matrixData);
```

### Texture Binding
```c
// Bind texture for rlgl drawing
Texture texture = LoadTexture("assets/sprite.png");

rlEnableTexture(texture.id);
    rlBegin(RL_QUADS);
        rlTexCoord2f(0.0f, 0.0f); rlVertex2f(0, 0);
        rlTexCoord2f(1.0f, 0.0f); rlVertex2f(100, 0);
        rlTexCoord2f(1.0f, 1.0f); rlVertex2f(100, 100);
        rlTexCoord2f(0.0f, 1.0f); rlVertex2f(0, 100);
    rlEnd();
rlDisableTexture();
```

### Custom Shaders
```c
Shader shader = LoadShader("assets/shader.vert", "assets/shader.frag");

// Set shader uniforms
int loc = GetShaderLocation(shader, "resolution");
Vector2 resolution = {800.0f, 600.0f};
SetShaderValue(shader, loc, &resolution, SHADER_UNIFORM_VEC2);

int timeLoc = GetShaderLocation(shader, "time");
float time = GetTime();
SetShaderValue(shader, timeLoc, &time, SHADER_UNIFORM_FLOAT);

// Use shader for drawing
BeginShaderMode(shader);
    DrawTexture(texture, x, y, WHITE);
EndShaderMode();

UnloadShader(shader);
```

### Render Textures (Off-screen Rendering)
```c
RenderTexture target = LoadRenderTexture(256, 256);

// Draw to render texture
BeginTextureMode(target);
    ClearBackground(BLANK);
    DrawCircle(128, 128, 50, RED);
EndTextureMode();

// Use render texture as a regular texture
DrawTexture(target.texture, 100, 100, WHITE);

UnloadRenderTexture(target);
```

### rlgl State Management
```c
// Depth testing
rlEnableDepthTest();
rlDisableDepthTest();

// Backface culling
rlEnableBackfaceCulling();
rlDisableBackfaceCulling();

// Scissor test (clipping rectangle)
rlEnableScissorTest();
rlScissor(x, y, width, height);
rlDisableScissorTest();

// Blend modes
rlSetBlendMode(BLEND_ALPHA);           // Default
rlSetBlendMode(BLEND_ADDITIVE);        // Additive blending
rlSetBlendMode(BLEND_MULTIPLIED);      // Multiply blending
rlSetBlendMode(BLEND_ALPHA_PREMULTIPLY);
```

### Vertex Buffers (Advanced)
```c
// Create vertex buffer for custom geometry
float vertices[] = {
    // x,    y,    z     // u,    v
    -0.5f, -0.5f, 0.0f,  0.0f, 0.0f,
     0.5f, -0.5f, 0.0f,  1.0f, 0.0f,
     0.0f,  0.5f, 0.0f,  0.5f, 1.0f,
};

Mesh mesh = {0};
mesh.vertexCount = 3;
mesh.vertices = (float*)MemAlloc(mesh.vertexCount * 3 * sizeof(float));
mesh.texcoords = (float*)MemAlloc(mesh.vertexCount * 2 * sizeof(float));

// Copy vertex data
for (int i = 0; i < mesh.vertexCount; i++) {
    mesh.vertices[i*3 + 0] = vertices[i*5 + 0];
    mesh.vertices[i*3 + 1] = vertices[i*5 + 1];
    mesh.vertices[i*3 + 2] = vertices[i*5 + 2];
    mesh.texcoords[i*2 + 0] = vertices[i*5 + 3];
    mesh.texcoords[i*2 + 1] = vertices[i*5 + 4];
}

UploadMesh(&mesh, false);
// Draw with: DrawMesh(mesh, material, transform)
```

## Common Mistakes
- Using rlgl for simple drawing — use `DrawTexture`, `DrawRectangle` etc. instead
- Forgetting `rlEnableTexture()` / `rlDisableTexture()` around textured drawing
- Not using `BeginDrawing()` / `EndDrawing()` — rlgl works within this context
- Matrix stack imbalance — always match `rlPushMatrix()` with `rlPopMatrix()`
- Using rlBegin(RL_QUADS) for complex shapes — consider indexed mesh instead
- Not unloading shaders and render textures — resource leak
- Confusing rlgl immediate-mode with raylib's high-level retained-mode API
