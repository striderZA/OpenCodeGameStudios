# Agent Test Spec: babylonjs-network-specialist

## Agent Summary
Domain: Multiplayer networking for Babylon.js using Colyseus SDK 0.17 — room management, state synchronization, RPCs, matchmaking, WebSocket connection lifecycles.
Does NOT own: game logic or rendering (delegates to babylonjs-specialist).
Model tier: Qwen3.6-plus.

---

## Static Assertions (Structural)

- [ ] `description:` field references Colyseus, networking, multiplayer
- [ ] Agent definition references `docs/engine-reference/babylonjs/modules/networking.md`
- [ ] Model tier is Qwen3.6-plus

---

## Test Cases

### Case 1: Room connection

**Input:** "Connect to a Colyseus room and join"

- [ ] Instantiates `Client` with server endpoint
- [ ] Calls `client.joinOrCreate()` or `client.joinById()`
- [ ] Handles room join success with state initialization
- [ ] Manages connection lifecycle (onJoin, onLeave, onError)

### Case 2: State synchronization

**Input:** "Sync player position across clients"

- [ ] Listens to `room.onStateChange()` or `room.onMessage()` for state updates
- [ ] Sends player input via `room.send()` with typed message format
- [ ] Applies interpolation/extrapolation for smooth updates
- [ ] Handles late-joining players receiving current state snapshot

### Case 3: Delegation to primary specialist

**Input:** "Implement multiplayer for a racing game with Colyseus"

- [ ] Coordinates with `babylonjs-specialist` for scene setup
- [ ] Coordinates with `babylonjs-physics-specialist` for synchronized physics
- [ ] Does NOT duplicate scene or physics management
- [ ] Handles network-specific concerns (latency, bandwidth, serialization)

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] Covers core networking scenarios
- [x] Delegation to other specialists tested
