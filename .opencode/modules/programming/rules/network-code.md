---
paths:
  - "src/networking/**"
---

# Network Code Rules

- Server is AUTHORITATIVE for all gameplay-critical state — never trust the client
- All network messages must be versioned for forward/backward compatibility
- Client predicts locally, reconciles with server — implement rollback for mispredictions
- Handle disconnection, reconnection, and host migration gracefully
- Rate-limit all network logging to prevent log flooding
- All networked values must specify replication strategy: reliable/unreliable, frequency, interpolation
- Bandwidth budget: define and track per-message-type bandwidth usage
- Security: validate all incoming packet sizes and field ranges
- Never send the full game state every tick — delta-compress changes
- Use RPC authority checks — not all clients should be able to call all RPCs

## Examples

**Correct** (authoritative server, delta updates):

```gdscript
# Server-side authority check
func _on_player_request_move(player_id: int, new_position: Vector3) -> void:
    var player := get_player(player_id)
    if not _validate_position(player, new_position):
        rpc_id(player_id, "_sync_position", player.position)  # Reject, send correct
        return
    player.position = new_position
    rpc("_update_position", player_id, new_position)  # Broadcast to all
```

**Incorrect** (client-authoritative, no validation):

```gdscript
func _on_client_send_position(new_pos: Vector3) -> void:
    # VIOLATION: no validation of client-provided position
    position = new_pos  # VIOLATION: can teleport, clip through walls
    rpc("_update_position", new_pos)
```

## Anti-Patterns

- Trusting client timestamps for anything gameplay-related (add server time to messages)
- Not versioning network protocol — old clients break every update
- Sending the full state each tick instead of delta-compressed changes
- Logging every packet (rate-limit to avoid log flooding on disconnect storms)
- No timeout/reconnect handling — a disconnect dumps the player permanently
- Client-side prediction without server reconciliation (visible rubber-banding)
- RPCs without authority checks (any client can call them)

## Cross-References

- Agent: `network-programmer` — implements networking features
- Agent: `security-engineer` — validates network security
- Agent: `performance-analyst` — profiles bandwidth usage
- Agent: `engine-programmer` — provides transport layer
- Skill: `security-audit` — scans for network vulnerabilities
- Rule: `engine-code.md` — core engine dependency direction
