# Raylib raymath — Quick Reference

Last verified: 2026-07-22 | Engine: Raylib 5.5

## Overview

raymath is a header-only math library providing vector, matrix, and quaternion
operations. Include `raymath.h` separately — it is NOT bundled with `raylib.h`.

All functions follow the pattern: `TypeName_Operation(args)`.

## Current API Patterns

### Vector2 Operations
```c
#include "raylib.h"
#include "raymath.h"

Vector2 a = {10.0f, 20.0f};
Vector2 b = {5.0f, 15.0f};

// Basic operations
Vector2 sum = Vector2Add(a, b);          // {15, 35}
Vector2 diff = Vector2Subtract(a, b);    // {5, 5}
Vector2 scaled = Vector2Scale(a, 2.0f);  // {20, 40}
float dot = Vector2DotProduct(a, b);     // 10*5 + 20*15 = 350

// Length & normalization
float length = Vector2Length(a);         // sqrt(100+400) = 22.36
Vector2 normalized = Vector2Normalize(a); // Unit vector

// Distance & angle
float dist = Vector2Distance(a, b);
float angle = Vector2LineAngle(a, b);

// Rotation
Vector2 rotated = Vector2Rotate(a, PI / 4.0f); // Rotate 45 degrees

// Lerp (linear interpolation)
Vector2 mid = Vector2Lerp(a, b, 0.5f); // Midpoint

// Reflect
Vector2 normal = {0.0f, 1.0f};
Vector2 reflected = Vector2Reflect(velocity, normal);

// Clamp & clamp value
Vector2 clamped = Vector2Clamp(a, (Vector2){0, 0}, (Vector2){100, 100});
float clampedVal = Clamp(150.0f, 0.0f, 100.0f); // 100.0f
```

### Vector3 Operations
```c
Vector3 pos = {1.0f, 2.0f, 3.0f};
Vector3 vel = {0.5f, -1.0f, 0.5f};

// Basic operations
Vector3 sum = Vector3Add(pos, vel);
Vector3 scaled = Vector3Scale(pos, 2.0f);
float dot = Vector3DotProduct(pos, vel);
Vector3 cross = Vector3CrossProduct(pos, vel); // Perpendicular vector

// Length & normalization
float length = Vector3Length(pos);
Vector3 normalized = Vector3Normalize(pos);

// Distance
float dist = Vector3Distance(pos, vel);

// Transform
Matrix transform = MatrixTranslate(10, 0, 0);
Vector3 transformed = Vector3Transform(pos, transform);

// Lerp
Vector3 mid = Vector3Lerp(pos, vel, 0.5f);

// Min/Max component-wise
Vector3 minV = Vector3Min(pos, vel);
Vector3 maxV = Vector3Max(pos, vel);
```

### Matrix Operations
```c
// Create matrices
Matrix identity = MatrixIdentity();
Matrix translate = MatrixTranslate(10.0f, 0.0f, 0.0f);
Matrix rotate = MatrixRotateY(PI / 4.0f); // Rotate around Y
Matrix scale = MatrixScale(2.0f, 2.0f, 2.0f);

// Combine transforms (order matters!)
Matrix transform = MatrixMultiply(scale, rotate);
transform = MatrixMultiply(transform, translate);

// Camera matrices
Matrix view = MatrixLookAt(
    (Vector3){0, 10, 10},    // Eye position
    (Vector3){0, 0, 0},       // Target
    (Vector3){0, 1, 0}        // Up
);
Matrix projection = MatrixPerspective(
    60.0f * DEG2RAD,          // FOV in radians
    800.0f / 600.0f,          // Aspect ratio
    0.1f,                     // Near plane
    1000.0f                   // Far plane
);
Matrix ortho = MatrixOrtho(-10, 10, -10, 10, 0.1, 1000);

// Matrix operations
Matrix inverse = MatrixInvert(transform);
Matrix transposed = MatrixTranspose(transform);
float determinant = MatrixDeterminant(transform);

// Decompose
Vector3 translation, scale3;
Quaternion rotation;
MatrixDecompose(transform, &translation, &rotation, &scale3);

// Convert to/from quaternion
Quaternion quat = MatrixToQuaternion(transform);
Matrix fromQuat = QuaternionToMatrix(quat);
```

### Quaternion Operations
```c
// Create quaternions
Quaternion identity = QuaternionIdentity();
Quaternion fromAxis = QuaternionFromAxisAngle(
    (Vector3){0, 1, 0},     // Axis
    PI / 4.0f               // Angle in radians
);
Quaternion fromEuler = QuaternionFromEuler(
    pitch, yaw, roll         // Euler angles in radians
);

// Operations
Quaternion multiplied = QuaternionMultiply(q1, q2);
Quaternion normalized = QuaternionNormalize(q);
Quaternion conjugate = QuaternionConjugate(q);
Quaternion inverse = QuaternionInvert(q);

// Slerp (spherical linear interpolation — best for rotations)
Quaternion slerped = QuaternionSlerp(q1, q2, 0.5f);

// Lerp (faster but not constant velocity)
Quaternion lerped = QuaternionLerp(q1, q2, 0.5f);

// Convert
Vector3 eulerAngles = QuaternionToEuler(q);
float angle; Vector3 axis;
QuaternionToAxisAngle(q, &axis, &angle);

// Rotate a vector by quaternion
Vector3 rotated = Vector3RotateByQuaternion(vec, q);
```

### Utility Functions
```c
// Angle conversions
float radians = DEG2RAD * degrees;
float degrees = RAD2DEG * radians;
// Or use: DegToRad(deg), RadToDeg(rad)

// Clamp
float clamped = Clamp(value, min, max);

// Lerp
float lerped = Lerp(start, end, t);

// Normalize value to 0-1 range
float normalized = Normalize(value, start, end);

// Remap value from one range to another
float remapped = Remap(value, inputStart, inputEnd, outputStart, outputEnd);

// Float comparison
bool equal = FloatEquals(a, b); // Epsilon comparison
```

### Camera Math (3D)
```c
// Camera setup
Camera3D camera = {0};
camera.position = (Vector3){0, 10, 10};
camera.target = (Vector3){0, 0, 0};
camera.up = (Vector3){0, 1, 0};
camera.fovy = 60.0f;
camera.projection = CAMERA_PERSPECTIVE;

// Camera matrices
Matrix view = GetCameraMatrix(camera);
Matrix projection = GetCameraProjection(camera, 800.0f/600.0f);

// Screen to world (returns a Ray; use GetRayCollision for intersection)
Ray ray = GetScreenToWorldRay(mousePos, camera);
// or for a point along the ray:
Vector3 rayEnd = Vector3Add(camera.position,
    Vector3Scale(ray.direction, 100));
```

## Common Mistakes
- Forgetting to include `raymath.h` — functions won't be found
- Confusing degrees and radians — raylib uses radians everywhere
- Using `Vector3Normalize()` on zero vector — undefined behavior
- Matrix multiply order — `MatrixMultiply(A, B)` ≠ `MatrixMultiply(B, A)`
- Using `QuaternionLerp` for rotations — use `QuaternionSlerp` for constant velocity
- Not normalizing quaternions after multiple multiplications — drift accumulates
- Forgetting `MatrixIdentity()` — uninitialized matrix contains garbage
- Using `Vector2Length` when `Vector2LengthSqr` suffices — avoids sqrt cost
