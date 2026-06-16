# Babylon.js Networking — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1 | Colyseus 0.17

## What Changed Since LLM Cutoff (~May 2025)

### Colyseus
- Colyseus 0.17 is the current stable
- `@colyseus/schema` 2.x for state definitions
- State sync pattern is stable — server authoritative, client interpolates
- `colyseus.js` (client SDK) continues as the recommended client library

## Current API Patterns

### Server Setup (Colyseus)

```bash
npm install colyseus @colyseus/schema colyseus.js
```

```typescript
// server/src/index.ts
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MyRoom } from "./rooms/MyRoom";

const gameServer = new Server({
  transport: new WebSocketTransport(),
});

gameServer.define("room_name", MyRoom);

gameServer.listen(2567);
console.log("Server listening on ws://localhost:2567");
```

### Room Definition (Server)

```typescript
// server/src/rooms/MyRoom.ts
import { Room, Client } from "colyseus";
import { GameState, Player } from "./GameState";

export class MyRoom extends Room<GameState> {
  maxClients = 8;

  onCreate(options: any) {
    this.setState(new GameState());

    this.onMessage("updatePosition", (client, message: { x: number; y: number; z: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Server validates and sets the authoritative position
        player.x = message.x;
        player.y = message.y;
        player.z = message.z;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();
    player.x = Math.random() * 500 - 250;
    player.y = 1;
    player.z = Math.random() * 500 - 250;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }
}
```

### State Schema (Shared)

```typescript
// server/src/rooms/GameState.ts
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
```

### Client Connection (Babylon.js)

```typescript
import { Client } from "colyseus.js";

// Connect to server
const client = new Client("ws://localhost:2567");

async function joinGame() {
  try {
    const room = await client.joinOrCreate("room_name", {
      name: "Player123",
    });
    console.log("Joined room:", room.id);
    setupStateHandlers(room);
  } catch (error) {
    console.error("Failed to join:", error);
  }
}
```

### State Change Handlers

```typescript
let playerMeshes: Map<string, Mesh> = new Map();

function setupStateHandlers(room: Room) {
  // Player added
  room.state.players.onAdd((player, sessionId) => {
    // Create visual representation
    const sphere = MeshBuilder.CreateSphere(
      sessionId,
      { diameter: 1 },
      scene
    );
    sphere.position = new Vector3(player.x, player.y, player.z);
    playerMeshes.set(sessionId, sphere);

    // Track changes to this player
    player.onChange(() => {
      // For remote players, interpolate (see below)
      targetPositions.set(sessionId, new Vector3(player.x, player.y, player.z));
    });
  });

  // Player removed
  room.state.players.onRemove((player, sessionId) => {
    const mesh = playerMeshes.get(sessionId);
    if (mesh) {
      mesh.dispose();
      playerMeshes.delete(sessionId);
    }
    targetPositions.delete(sessionId);
  });
}
```

### Position Interpolation

```typescript
const targetPositions = new Map<string, Vector3>();
const INTERPOLATION_SPEED = 8; // Tune for feel

// In render loop:
scene.onBeforeRenderObservable.add(() => {
  const delta = engine.getDeltaTime() / 1000;

  targetPositions.forEach((targetPos, sessionId) => {
    const mesh = playerMeshes.get(sessionId);
    if (mesh) {
      mesh.position = Vector3.Lerp(
        mesh.position,
        targetPos,
        Scalar.Clamp(INTERPOLATION_SPEED * delta, 0, 1)
      );
    }
  });
});
```

### Sending Messages (Client → Server)

```typescript
// Send position update to server
room.send("updatePosition", {
  x: car.position.x,
  y: car.position.y,
  z: car.position.z,
});

// Custom message types
room.send("startRace", {});
room.send("lapCompleted", { lapTime: 45.2 });
```

### Client-Side Prediction

```typescript
// Store pending inputs
interface PendingInput {
  seq: number;
  timestamp: number;
  steer: number;
  throttle: number;
  brake: boolean;
}

let pendingInputs: PendingInput[] = [];
let inputSeq = 0;

function sendInput(steer: number, throttle: number, brake: boolean) {
  const input = { seq: ++inputSeq, steer, throttle, brake };
  pendingInputs.push(input);

  // Apply locally immediately (prediction)
  applyInput(input);

  // Send to server
  room.send("playerInput", input);
}

// On server state update:
room.onStateChange((state) => {
  // Get authoritative state for local player
  const myPlayer = state.players.get(room.sessionId);
  if (myPlayer) {
    // Reconcile: set position to server state
    localCar.position.set(myPlayer.x, myPlayer.y, myPlayer.z);

    // Re-apply pending inputs that haven't been processed yet
    // (In practice, use sequence numbers to determine which inputs
    //  the server has already incorporated)
  }
});
```

### Room Lifecycle Events

```typescript
room.onStateChange.once((state) => {
  console.log("Initial state received");
});

room.onLeave((code) => {
  console.log("Left room, code:", code);
  // Clean up all player meshes
  playerMeshes.forEach((mesh) => mesh.dispose());
  playerMeshes.clear();
});

room.onError((code, message) => {
  console.error("Room error:", code, message);
});

// Reconnection
function handleDisconnect(room: Room) {
  room.onLeave(async (code) => {
    if (code === 1000) return; // Normal close
    // Exponential backoff reconnect
    for (const delay of [1000, 2000, 4000, 8000, 16000]) {
      await new Promise((r) => setTimeout(r, delay));
      try {
        room = await client.joinById(room.id);
        console.log("Reconnected!");
        return;
      } catch (e) {
        console.log("Reconnect attempt failed");
      }
    }
  });
}
```

## Important Notes

- **Server is authoritative** — always validate and compute state server-side
- Use `@colyseus/schema` `Schema` types for auto-synced state
- Send simple data types (number, string) — never send Vector3 directly
- Interpolate remote positions using `Vector3.Lerp` — never snap
- Only predict inputs for the local player (other players interpolate)
- Include sequence numbers for reconciliation tracking
- Clean up meshes on player remove to prevent memory leaks
- Handle reconnection with exponential backoff
- For racing: send input state (steer/throttle/brake), not position
- The server computes wheel forces and updates position — clients predict

## Key URLs

- Babylon.js Colyseus guide: https://doc.babylonjs.com/guidedLearning/networking/Colyseus
- Colyseus documentation: https://docs.colyseus.io/
- Client tutorial project: https://github.com/colyseus/tutorial-babylonjs-client
- Server tutorial project: https://github.com/colyseus/tutorial-babylonjs-server
