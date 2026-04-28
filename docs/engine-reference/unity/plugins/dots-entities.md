# Unity 6.3 — DOTS / Entities (ECS)

**Last verified:** 2026-02-13
**Status:** Production-Ready (Entities 1.3+, Unity 6.3 LTS)
**Package:** `com.unity.entities` (Package Manager)

---

## Overview

**DOTS (Data-Oriented Technology Stack)** is Unity's high-performance ECS (Entity Component System)
framework. It's designed for games with massive scale (1000s-10,000s of entities).

**Use DOTS for:**
- RTS games (1000s of units)
- Simulations (crowds, traffic, physics)
- Procedural content generation
- Performance-critical systems

**DON'T use DOTS for:**
- Small games (overhead not worth it)
- Gameplay requiring frequent structural changes
- Heavy use of UnityEngine APIs (MonoBehaviour is easier)

**⚠️ Knowledge Gap:** Entities 1.0+ (Unity 6) is a complete rewrite from 0.x.
Many tutorials for Entities 0.x are now outdated.

---

## Installation

### Install via Package Manager

1. `Window > Package Manager`
2. Unity Registry > Search "Entities"
3. Install:
   - `Entities` (ECS core)
   - `Burst` (LLVM compiler)
   - `Jobs` (auto-installed)
   - `Mathematics` (SIMD math)

---

## Core Concepts

### 1. **Entity**
- Lightweight ID (int)
- No behavior, just an identifier

### 2. **Component**
- Data only (no methods)
- Struct implementing `IComponentData`

### 3. **System**
- Logic that operates on components
- Struct implementing `ISystem`

### 4. **Archetype**
- Unique combination of component types
- Entities with same components share archetype

---

## Basic ECS Pattern

### Define Component

```csharp
using Unity.Entities;
using Unity.Mathematics;

// ✅ Component: Data only, no methods
public struct Position : IComponentData {
    public float3 Value;
}

public struct Velocity : IComponentData {
    public float3 Value;
}
```

---

### Define System

```csharp
using Unity.Entities;
using Unity.Burst;

// ✅ System: Logic that processes entities
[BurstCompile]
public partial struct MovementSystem : ISystem {
    [BurstCompile]
    public void OnUpdate(ref SystemState state) {
        float deltaTime = SystemAPI.Time.DeltaTime;

        // Query all entities with Position + Velocity
        foreach (var (transform, velocity) in
            SystemAPI.Query<RefRW<Position>, RefRO<Velocity>>()) {

            transform.ValueRW.Value += velocity.ValueRO.Value * deltaTime;
        }
    }
}
```

---

### Create Entities

```csharp
using Unity.Entities;
using Unity.Mathematics;

public partial class EntitySpawner : SystemBase {
    protected override void OnUpdate() {
        var em = EntityManager;

        // Create entity
        Entity entity = em.CreateEntity();

        // Add components
        em.AddComponentData(entity, new Position { Value = float3.zero });
        em.AddComponentData(entity, new Velocity { Value = new float3(1, 0, 0) });
    }
}
```

---

## Hybrid ECS (MonoBehaviour + ECS)

### Baker (Convert GameObject to Entity)

```csharp
using Unity.Entities;
using UnityEngine;

public class PlayerAuthoring : MonoBehaviour {
    public float speed;
}

public class PlayerBaker : Baker<PlayerAuthoring> {
    public override void Bake(PlayerAuthoring authoring) {
        var entity = GetEntity(TransformUsageFlags.Dynamic);

        AddComponent(entity, new Position { Value = authoring.transform.position });
        AddComponent(entity, new Velocity { Value = new float3(authoring.speed, 0, 0) });
    }
}
```

**How it works:**
1. Add `PlayerAuthoring` to GameObject in editor
2. Baker automatically converts to Entity at runtime
3. Entity has Position + Velocity components

---

## Queries

### Query All Entities with Components

```csharp
foreach (var (position, velocity) in
    SystemAPI.Query<RefRW<Position>, RefRO<Velocity>>()) {

    position.ValueRW.Value += velocity.ValueRO.Value * deltaTime;
}
```

---

### Query with Entity

```csharp
foreach (var (position, velocity, entity) in
    SystemAPI.Query<RefRW<Position>, RefRO<Velocity>>().WithEntityAccess()) {

    // Access entity ID
    Debug.Log($"Entity: {entity}");
}
```

---

### Query with Filters

```csharp
// Only entities with "Enemy" tag
foreach (var position in
    SystemAPI.Query<RefRW<Position>>().WithAll<EnemyTag>()) {
    // Process enemies only
}
```

---

## Jobs (Parallel Execution)

### IJobEntity (Parallel Foreach)

```csharp
using Unity.Entities;
using Unity.Burst;

[BurstCompile]
public partial struct MovementJob : IJobEntity {
    public float DeltaTime;

    // Execute runs in parallel for each entity
    void Execute(ref Position position, in Velocity velocity) {
        position.Value += velocity.Value * DeltaTime;
    }
}

[BurstCompile]
public partial struct MovementSystem : ISystem {
    public void OnUpdate(ref SystemState state) {
        var job = new MovementJob {
            DeltaTime = SystemAPI.Time.DeltaTime
        };
        job.ScheduleParallel(); // Parallel execution
    }
}
```

---

## Burst Compiler (Performance)

### Enable Burst

```csharp
using Unity.Burst;

[BurstCompile] // 10-100x faster than regular C#
public partial struct MySystem : ISystem {
    [BurstCompile]
    public void OnUpdate(ref SystemState state) {
        // Burst-compiled code
    }
}
```

**Burst Restrictions:**
- No managed references (classes, strings, etc.)
- Only blittable types (structs, primitives, Unity.Mathematics types)
- No exceptions

---

## Entity Command Buffers (Structural Changes)

### Deferred Structural Changes

```csharp
using Unity.Entities;

public partial struct SpawnSystem : ISystem {
    public void OnUpdate(ref SystemState state) {
        var ecb = new EntityCommandBuffer(Allocator.Temp);

        // Defer entity creation (don't modify during iteration)
        foreach (var spawner in SystemAPI.Query<Spawner>()) {
            Entity newEntity = ecb.CreateEntity();
            ecb.AddComponent(newEntity, new Position { Value = spawner.SpawnPos });
        }

        ecb.Playback(state.EntityManager); // Apply changes
        ecb.Dispose();
    }
}
```

---

## Dynamic Buffers (Array-Like Components)

### Define Dynamic Buffer

```csharp
public struct PathWaypoint : IBufferElementData {
    public float3 Position;
}
```

### Use Dynamic Buffer

```csharp
// Add buffer to entity
var buffer = EntityManager.AddBuffer<PathWaypoint>(entity);
buffer.Add(new PathWaypoint { Position = new float3(0, 0, 0) });
buffer.Add(new PathWaypoint { Position = new float3(10, 0, 0) });

// Query buffer
foreach (var buffer in SystemAPI.Query<DynamicBuffer<PathWaypoint>>()) {
    foreach (var waypoint in buffer) {
        Debug.Log(waypoint.Position);
    }
}
```

---

## Tags (Zero-Size Components)

### Define Tag

```csharp
public struct EnemyTag : IComponentData { } // Empty component = tag
```

### Use Tag for Filtering

```csharp
// Only process entities with EnemyTag
foreach (var position in
    SystemAPI.Query<RefRW<Position>>().WithAll<EnemyTag>()) {
    // Enemy-specific logic
}
```

---

## System Ordering

### Explicit Ordering

```csharp
[UpdateBefore(typeof(PhysicsSystem))]
public partial struct InputSystem : ISystem { }

[UpdateAfter(typeof(PhysicsSystem))]
public partial struct RenderSystem : ISystem { }
```

---

## Performance Patterns

### Chunk Iteration (Maximum Performance)

```csharp
public void OnUpdate(ref SystemState state) {
    var query = SystemAPI.QueryBuilder().WithAll<Position, Velocity>().Build();

    var chunks = query.ToArchetypeChunkArray(Allocator.Temp);
    var positionType = state.GetComponentTypeHandle<Position>();
    var velocityType = state.GetComponentTypeHandle<Velocity>(true); // Read-only

    foreach (var chunk in chunks) {
        var positions = chunk.GetNativeArray(ref positionType);
        var velocities = chunk.GetNativeArray(ref velocityType);

        for (int i = 0; i < chunk.Count; i++) {
            positions[i] = new Position {
                Value = positions[i].Value + velocities[i].Value * deltaTime
            };
        }
    }

    chunks.Dispose();
}
```

---

## Migration from MonoBehaviour

```csharp
// ❌ OLD: MonoBehaviour (OOP)
public class Enemy : MonoBehaviour {
    public float speed;
    void Update() {
        transform.position += Vector3.forward * speed * Time.deltaTime;
    }
}

// ✅ NEW: DOTS (ECS)
public struct EnemyData : IComponentData {
    public float Speed;
}

[BurstCompile]
public partial struct EnemyMovementSystem : ISystem {
    public void OnUpdate(ref SystemState state) {
        float dt = SystemAPI.Time.DeltaTime;
        foreach (var (transform, enemy) in
            SystemAPI.Query<RefRW<LocalTransform>, RefRO<EnemyData>>()) {
            transform.ValueRW.Position += new float3(0, 0, enemy.ValueRO.Speed * dt);
        }
    }
}
```

---

## Debugging

### Entities Hierarchy Window

`Window > Entities > Hierarchy`

- Shows all entities and their components
- Filter by archetype, component type

### Entities Profiler

`Window > Analysis > Profiler > Entities`

- System execution times
- Memory usage per archetype

---

## Sources
- https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/index.html
- https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html
- https://learn.unity.com/tutorial/entity-component-system
