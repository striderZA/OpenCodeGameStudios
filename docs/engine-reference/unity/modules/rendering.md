# Unity 6.3 — Rendering Module Reference

**Last verified:** 2026-02-13
**Knowledge Gap:** LLM trained on Unity 2022 LTS; Unity 6 has major rendering changes

---

## Overview

Unity 6.3 LTS uses **Scriptable Render Pipelines (SRP)** as the modern rendering architecture:
- **URP (Universal Render Pipeline)**: Cross-platform, mobile-friendly (RECOMMENDED)
- **HDRP (High Definition Render Pipeline)**: High-end PC/console, photorealistic
- **Built-in Pipeline**: Deprecated, avoid for new projects

---

## Key Changes from 2022 LTS

### RenderGraph API (Unity 6+)
Custom render passes now use RenderGraph instead of CommandBuffer:

```csharp
// ✅ Unity 6+ (RenderGraph)
public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData) {
    using var builder = renderGraph.AddRasterRenderPass<PassData>("MyPass", out var passData);
    builder.SetRenderFunc((PassData data, RasterGraphContext ctx) => {
        // Rendering commands
    });
}

// ❌ Old (CommandBuffer - still works but deprecated)
public override void Execute(ScriptableRenderContext context, ref RenderingData data) { }
```

### GPU Resident Drawer (Unity 6+)
Automatic batching for massive draw call reduction:

```csharp
// Enable in URP Asset settings:
// Rendering > GPU Resident Drawer = Enabled
// Automatically batches thousands of objects with minimal CPU overhead
```

---

## URP Quick Reference

### Creating a URP Asset
1. `Assets > Create > Rendering > URP Asset (with Universal Renderer)`
2. Assign to `Project Settings > Graphics > Scriptable Render Pipeline Settings`

### URP Renderer Features
Add custom render passes:

```csharp
using UnityEngine.Rendering.Universal;

public class OutlineRendererFeature : ScriptableRendererFeature {
    OutlineRenderPass pass;

    public override void Create() {
        pass = new OutlineRenderPass();
    }

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData data) {
        renderer.EnqueuePass(pass);
    }
}
```

---

## Materials & Shaders

### Shader Graph (Visual Shader Editor)
Unity 6 Shader Graph is production-ready for all shader types:

```csharp
// Create: Assets > Create > Shader Graph > URP > Lit Shader Graph
// No code needed, visual node-based editing
```

### HLSL Custom Shaders (URP)

```hlsl
// URP Lit shader template
Shader "Custom/URPLit" {
    Properties {
        _BaseColor ("Base Color", Color) = (1,1,1,1)
    }
    SubShader {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }

        Pass {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes {
                float4 positionOS : POSITION;
            };

            struct Varyings {
                float4 positionCS : SV_POSITION;
            };

            Varyings vert(Attributes input) {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                return output;
            }

            half4 frag(Varyings input) : SV_Target {
                return half4(1, 0, 0, 1); // Red
            }
            ENDHLSL
        }
    }
}
```

---

## Lighting

### Baked Lighting (Unity 6 Progressive Lightmapper)

```csharp
// Mark objects as static: Inspector > Static > Contribute GI
// Bake: Window > Rendering > Lighting > Generate Lighting
```

### Real-Time Lights (URP)

```csharp
// Main Light (Directional): Auto-handled by URP
// Additional Lights: Limited by "Additional Lights" setting in URP Asset

// Check light count in shader:
int lightCount = GetAdditionalLightsCount();
```

---

## Post-Processing

### Volume System (Unity 6+)

```csharp
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

// Add Volume component to GameObject
// Add Volume Profile asset
// Configure effects: Bloom, Color Grading, Depth of Field, etc.

// Script access:
Volume volume = GetComponent<Volume>();
if (volume.profile.TryGet<Bloom>(out var bloom)) {
    bloom.intensity.value = 2.5f;
}
```

---

## Performance

### SRP Batcher (Auto-batching)

```csharp
// Enable: URP Asset > Advanced > SRP Batcher = Enabled
// Batches draws with same shader variant (minimal CPU overhead)
```

### GPU Instancing

```csharp
// Material: Enable "Enable GPU Instancing" checkbox
// Batches identical meshes (same material + mesh)

Graphics.RenderMeshInstanced(
    new RenderParams(material),
    mesh,
    0,
    matrices // NativeArray<Matrix4x4>
);
```

### Occlusion Culling

```csharp
// Window > Rendering > Occlusion Culling
// Bake occlusion data for static geometry
```

---

## Common Patterns

### Custom Camera Rendering

```csharp
// Get URP camera data
var cameraData = frameData.Get<UniversalCameraData>();
var camera = cameraData.camera;

// Access render targets
var colorTarget = cameraData.renderer.cameraColorTargetHandle;
```

### Screen-Space Effects

```csharp
// Create ScriptableRendererFeature
// Inject pass at specific point: AfterRenderingOpaques, AfterRenderingTransparents, etc.
```

---

## Debugging

### Frame Debugger
- `Window > Analysis > Frame Debugger`
- Step through draw calls, inspect state

### Rendering Debugger (Unity 6+)
- `Window > Analysis > Rendering Debugger`
- Live view of URP settings, overdraw, lighting

---

## Sources
- https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/index.html
- https://docs.unity3d.com/6000.0/Documentation/Manual/render-pipelines.html
