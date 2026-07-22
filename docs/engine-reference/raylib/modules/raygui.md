# Raylib raygui — Quick Reference

Last verified: 2026-07-22 | Engine: Raylib 5.5

## Overview

raygui is a header-only immediate-mode GUI library for raylib. It provides
controls like buttons, sliders, text input, and windows. Include `raygui.h`
and define `RAYGUI_IMPLEMENTATION` in exactly one source file.

## Setup

```c
// In ONE source file (usually main.c):
#define RAYGUI_IMPLEMENTATION
#include "raygui.h"

// In other files:
#include "raygui.h"
```

## Current API Patterns

### Basic Controls
```c
// Button
if (GuiButton((Rectangle){100, 100, 120, 30}, "Click Me")) {
    // Button was clicked
}

// Label
GuiLabel((Rectangle){10, 10, 200, 30}, "Score: 100");

// Value box (int/float)
int value = 50;
GuiValueBox((Rectangle){100, 50, 80, 30}, NULL, &value, 0, 100, true);

// Slider
float volume = 0.5f;
GuiSlider((Rectangle){100, 100, 200, 20}, NULL, NULL, &volume, 0.0f, 1.0f);

// Slider bar (with text)
float health = 0.75f;
GuiSliderBar((Rectangle){100, 150, 200, 20}, "Health", TextFormat("%.0f%%", health * 100), &health, 0.0f, 1.0f);

// Spinner
int count = 5;
GuiSpinner((Rectangle){100, 200, 100, 30}, NULL, &count, 1, 10, true);

// Checkbox
bool enabled = true;
GuiCheckBox((Rectangle){100, 250, 20, 20}, "Enabled", &enabled);

// ComboBox
int selected = 0;
const char* items = "Option A;Option B;Option C";
GuiComboBox((Rectangle){100, 300, 150, 30}, items, &selected);

// Dropdown box
GuiDropdownBox((Rectangle){100, 350, 150, 30}, items, &selected, true);

// List view
int active = -1;
int scroll = 0;
const char* listItems = "Item 1;Item 2;Item 3;Item 4;Item 5";
GuiListView((Rectangle){100, 400, 200, 200}, listItems, &active, &scroll, true);

// TextBox (text input)
char text[64] = "Hello";
int textLen = strlen(text);
bool editMode = false;
GuiTextBox((Rectangle){100, 650, 200, 30}, text, 64, editMode);
```

### Window & Panel
```c
// Window (draggable container)
if (GuiWindowBox((Rectangle){100, 100, 300, 200}, "Settings")) {
    // Window close button clicked
}

// Inside window, draw controls
GuiLabel((Rectangle){120, 140, 260, 20}, "Volume:");
float volume = 0.5f;
GuiSlider((Rectangle){120, 170, 260, 20}, NULL, NULL, &volume, 0.0f, 1.0f);

// Panel (non-draggable container)
GuiPanel((Rectangle){450, 100, 300, 200}, "Info Panel");

// Group box (visual grouping)
GuiGroupBox((Rectangle){450, 350, 300, 150}, "Audio Settings");
```

### Progress & Message Box
```c
// Progress bar
float progress = 0.7f;
GuiProgressBar((Rectangle){100, 500, 200, 20}, NULL, NULL, &progress, 0.0f, 1.0f);

// Scroll bar
int scrollPos = 50;
GuiScrollBar((Rectangle){750, 100, 20, 400}, &scrollPos, 0, 100);

// Message box (modal dialog)
int result = GuiMessageBox(
    (Rectangle){200, 200, 300, 150},
    "Confirm",
    "Are you sure you want to quit?",
    "Yes;No"
);
if (result == 0) {
    // "Yes" clicked
} else if (result == 1) {
    // "No" clicked
}

// Text input dialog
char input[64] = "";
int inputResult = GuiTextInputBox(
    (Rectangle){200, 200, 350, 150},
    "Enter Name",
    "Please enter your name:",
    "Ok;Cancel",
    input, 64, NULL
);
```

### Styling
```c
// Global style
GuiSetStyle(DEFAULT, TEXT_SIZE, 16);
GuiSetStyle(DEFAULT, TEXT_COLOR, 0xFF0000FF); // Raylib color format: RGBA

// Control-specific style
GuiSetStyle(BUTTON, TEXT_COLOR, 0x00FF00FF);
GuiSetStyle(BUTTON, BORDER_COLOR_NORMAL, 0x0000FFFF);
GuiSetStyle(SLIDER, SLIDER_COLOR, 0xFF0000FF);

// Load custom style
GuiLoadStyle("assets/style_dark.rgs"); // raygui style file
GuiLoadStyleDefault(); // Reset to default

// Enable/disable controls
GuiLock();   // Disable all controls
GuiUnlock(); // Enable all controls

// Set specific control state
GuiSetState(GUI_STATE_DISABLED);
// ... draw controls ...
GuiSetState(GUI_STATE_NORMAL);
```

### Tooltip
```c
// Show tooltip after a control
GuiButton((Rectangle){100, 100, 120, 30}, "Hover Me");
GuiTooltip((Rectangle){100, 130, 200, 20}, "This is a tooltip");
```

### Grid & Custom Drawing
```c
// Grid (useful for editor tools)
Vector2 offset = {0, 0};
float spacing = 50.0f;
GuiGrid((Rectangle){0, 0, 800, 600}, NULL, spacing, 2, &offset);
```

### Color Picker
```c
Color color = {255, 0, 0, 255};
if (GuiColorPicker((Rectangle){100, 100, 200, 200}, "Pick Color", &color)) {
    // Color changed
}

// Color panel (alpha channel)
GuiColorPanel((Rectangle){100, 350, 200, 200}, NULL, &color);

// Color bar (hue/saturation/value)
GuiColorBarHue((Rectangle){350, 100, 30, 200}, NULL, &hue);
```

## Common Mistakes
- Forgetting `#define RAYGUI_IMPLEMENTATION` in one source file — linker errors
- Using absolute coordinates without accounting for window position
- Not handling text buffer sizes correctly in GuiTextBox — buffer overflow
- Forgetting raygui controls must be called every frame (immediate mode)
- Using GuiLock()/GuiUnlock() incorrectly — leaves controls disabled
- Not checking return values of buttons/checkboxes — controls don't "persist"
- Color format confusion — raygui uses 0xRRGGBBAA, not 0xAABBGGRR
- Not handling active/edit states for text inputs — text not editable
