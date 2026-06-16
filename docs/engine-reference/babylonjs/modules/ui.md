# Babylon.js GUI / UI — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- GUI: Fix reentrant remove behavior (v9.12)
- GUI: WGSL shader paths for GUI3D and GPU particles (v9.11)
- `markAsDirty` / `markAllAsDirty` exposed as public API on `Control`

## Current API Patterns

### AdvancedDynamicTexture Setup

```typescript
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Button, TextBlock, Image, StackPanel, Grid, Rectangle, Control } from "@babylonjs/gui/2D/controls";
import { Slider } from "@babylonjs/gui/2D/controls/slider";

// Full-screen UI
const adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");
adt.idealHeight = 1080; // Design for 1080p — auto-scales

// Mesh-attached GUI (3D in-world)
const adt3d = AdvancedDynamicTexture.CreateForMesh(planeMesh, 1024, 512);
```

### Common Controls

```typescript
// Text Block
const title = new TextBlock();
title.text = "OVERDRIVE";
title.color = "white";
title.fontSize = 48;
title.fontWeight = "bold";
title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
title.top = "5%";
adt.addControl(title);

// Button
const startBtn = Button.CreateSimpleButton("startBtn", "START RACE");
startBtn.width = "200px";
startBtn.height = "50px";
startBtn.color = "white";
startBtn.background = "green";
startBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
startBtn.onPointerClickObservable.add(() => {
  startRace();
});
adt.addControl(startBtn);
```

### Layout Containers

```typescript
// StackPanel (linear layout)
const panel = new StackPanel();
panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
panel.top = "10%";
panel.width = "200px";
adt.addControl(panel);

const speedText = new TextBlock();
speedText.text = "0 km/h";
speedText.height = "40px";
speedText.color = "white";
panel.addControl(speedText);

const positionText = new TextBlock();
positionText.text = "P1";
positionText.height = "40px";
positionText.color = "yellow";
panel.addControl(positionText);

// Grid (row/column layout)
const grid = new Grid();
grid.addColumnDefinition(0.5); // fractional width
grid.addColumnDefinition(0.5);
grid.addRowDefinition(0.5);
grid.addRowDefinition(0.5);
grid.width = "400px";
grid.height = "200px";
adt.addControl(grid);

const label = new TextBlock();
label.text = "LAP";
Grid.SetRow(label, 0);
Grid.SetColumn(label, 0);
grid.addControl(label);
```

### Responsive Positioning

```typescript
// Anchoring to edges/corners
const topLeft = new TextBlock();
topLeft.top = "10px";
topLeft.left = "10px";
topLeft.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
topLeft.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

const bottomCenter = new TextBlock();
bottomCenter.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
bottomCenter.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
bottomCenter.top = "-50px"; // offset from bottom

// Percentage-based sizing
element.width = "50%";  // 50% of parent width
element.height = "30px"; // fixed pixel
element.top = "5%";      // percentage offset
```

### HUD Pattern (Racing Game)

```typescript
class HUD {
  private adt: AdvancedDynamicTexture;
  private speedText: TextBlock;
  private lapText: TextBlock;
  private posText: TextBlock;
  private timerText: TextBlock;

  constructor(scene: Scene) {
    this.adt = AdvancedDynamicTexture.CreateFullscreenUI("HUD");
    this.adt.idealHeight = 1080;

    // Speed (top-center)
    this.speedText = new TextBlock();
    this.speedText.text = "0 km/h";
    this.speedText.fontSize = 36;
    this.speedText.color = "white";
    this.speedText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.speedText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.speedText.top = "20px";
    this.adt.addControl(this.speedText);

    // Position / Lap (top-right)
    const panel = new StackPanel();
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.top = "20px";
    panel.right = "20px";
    this.adt.addControl(panel);

    this.posText = new TextBlock();
    this.posText.text = "P1";
    this.posText.fontSize = 28;
    this.posText.color = "yellow";
    panel.addControl(this.posText);

    this.lapText = new TextBlock();
    this.lapText.text = "LAP 1/5";
    this.lapText.fontSize = 24;
    this.lapText.color = "white";
    panel.addControl(this.lapText);

    // Timer (top-left)
    this.timerText = new TextBlock();
    this.timerText.fontSize = 28;
    this.timerText.color = "white";
    this.timerText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.timerText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.timerText.top = "20px";
    this.timerText.left = "20px";
    this.adt.addControl(this.timerText);
  }

  update(speed: number, position: number, lap: string, time: string): void {
    // Only update when values change (performance)
    this.speedText.text = `${Math.round(speed)} km/h`;
    this.posText.text = `P${position}`;
    this.lapText.text = `LAP ${lap}`;
    this.timerText.text = time;
  }
}
```

### 3D GUI (In-World)

```typescript
// Create a plane mesh
const billboard = MeshBuilder.CreatePlane("billboard", { width: 2, height: 1 }, scene);
billboard.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera
billboard.position = new Vector3(0, 3, 0);

// Create GUI on mesh
const adt3d = AdvancedDynamicTexture.CreateForMesh(billboard, 1024, 512);
const text = new TextBlock();
text.text = "WORLD TEXT";
text.color = "white";
text.fontSize = 64;
text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
text.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
adt3d.addControl(text);
```

### Styling with Styles

```typescript
const style = adt.createStyle();
style.fontSize = 24;
style.fontFamily = "Arial";
style.color = "white";

const btn = Button.CreateSimpleButton("btn", "OK");
btn.style = style;
```

## Important Notes

- `adt.idealHeight` is your best tool for responsive design — design for one
  resolution, the engine handles scaling
- Only update HUD text when the displayed value actually changes
- Use `notRenderable` over `isVisible` when you need to keep the layout space
- For mesh GUI, `premulAlpha = false` is usually correct
- Use `adt.layer.layerMask` to show/hide GUI per camera
- Button images: `pointerEnterTexture`, `pointerDownTexture` for hover states
- Use `isPointerBlocker = true` so GUI prevents scene pointer events underneath
