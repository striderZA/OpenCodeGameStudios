# Godot — Breaking Changes

Last verified: 2026-11-04

Changes between Godot versions, focused on post-LLM-cutoff changes (4.4+).

## 4.6 → 4.7 (June 2026 — POST-CUTOFF, HIGH RISK; pinned 4.7.2)

Full migration guide: https://docs.godotengine.org/en/4.7/tutorials/migrating/upgrading_to_godot_4.7.html. Optional-parameter additions are compatible and are not listed. Where a default changed, a project that relies on the old value must set it explicitly.

| Subsystem | Change | Details |
|-----------|--------|---------|
| GDScript | Packed array elements | Setting an element no longer calls the setter for the whole packed-array property. |
| GDScript | Typed-return overrides | An override of a method with a typed return must return explicitly (the guide suggests `return null`). |
| Core | `Object.is_class` | `class` parameter changed from `String` to `StringName`. GDScript compatible. |
| Input | Device IDs | Mouse and keyboard device IDs are now `InputEvent.DEVICE_ID_MOUSE` and `InputEvent.DEVICE_ID_KEYBOARD` (was `0`). |
| Physics | AudioStreamPlayer area mask | Default `area_mask` changed from `1` to `0`. Area `audio_bus_override` needs layer 1 set again if the default was used. |
| Physics | Jolt WorldBoundaryShape3D | The sign of `plane.d` is interpreted opposite to 4.6. Flip the sign to keep 4.6 behavior. |
| Physics | Jolt SoftBody3D | Default mass is 1 kg for the whole body (was per point). `linear_stiffness` applies differently; re-tune it and `damping_coefficient`. |
| Physics | Jolt Area3D and SoftBody3D | Area3D now reports overlaps with SoftBody3D. Use collision layers and masks to ignore unwanted pairs. |
| Animation | BlendSpace sync | `AnimationNodeBlendSpace1D` and `2D` `sync` (bool) replaced by a `sync_mode` enum. Set it if transitions break. |
| Animation | Animation length | `Animation.length` type changed from `float` to `double`. Not C# binary or source compatible. |
| Animation | LookAtModifier3D | Default `relative` changed from `true` to `false`. |
| GUI | RichTextLabel images | `add_image` and `update_image`: `width_in_percent` and `height_in_percent` (bool) replaced by `width_unit` and `height_unit` (`ImageUnit`). Defaults changed to `0`. |
| GUI | Control accessibility | `accessibility_live` type changed to `AccessibilityServer.AccessibilityLiveMode`. |
| Rendering | LinearToSRGB | No longer clamps to [0, 1] on Mobile and Forward+. |
| Rendering | CanvasItem lines | No longer adds the antialiasing feather. Lines look thinner; increase the width to match. |
| Rendering | RenderingServer | `particles_request_process_time` renames `time` to `process_time`. |
| Audio | AudioEffectSpectrumAnalyzer | `tap_back_pos` removed. |
| Editor | EditorVCSInterface | `_commit` gained an `amend` parameter; plugins that override it must update. |
| Editor | EditorSceneFormatImporter | `IMPORT_*` constants moved to the `ImportFlags` enum. Not C# source compatible. |
| Project | New projects | Stretch mode `canvas_items` and aspect `expand` (were `disabled` and `keep`). |
| Import | ResourceImporterDynamicFont | `hinting` default changed from `1` to `3`. |
| Project | ProjectSettings | `rendering/reflections/sky_reflections/roughness_layers` default changed from `7` to `8`. |
| Platform | macOS | Minimum version is macOS 11 (was 10.13). |

## 4.5 → 4.6 (Jan 2026 — POST-CUTOFF, HIGH RISK)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Physics | Jolt is now the DEFAULT 3D physics engine | New projects use Jolt automatically. Existing projects keep their setting. Some HingeJoint3D properties (like `damp`) only work with GodotPhysics. |
| Rendering | Glow processes BEFORE tonemapping | Was after tonemapping. Scenes with glow will look different. Adjust intensity/blend in WorldEnvironment. |
| Rendering | D3D12 default on Windows | Was Vulkan. For better driver compatibility. |
| Rendering | AgX tonemapper new controls | White point and contrast parameters added. |
| Core | Quaternion initializes to identity | Was zero. Unlikely to affect most code but technically breaking. |
| UI | Dual-focus system | Mouse/touch focus now separate from keyboard/gamepad focus. Visual feedback differs by input method. |
| Animation | IK system fully restored | CCDIK, FABRIK, Jacobian IK, Spline IK, TwoBoneIK via SkeletonModifier3D nodes. |
| Editor | New "Modern" theme default | Grayscale replaces blue-tint. Restore: Editor Settings → Interface → Theme → Style: Classic |
| Editor | "Select Mode" keybind changed | New "Select Mode" (v key) prevents accidental transforms. Old mode renamed "Transform Mode" (q key). |
| 2D | TileMapLayer scene tile rotation | Scene tiles can now be rotated like atlas tiles. |
| Localization | CSV plural form support | No longer requires Gettext for plurals. Context columns added. |
| C# | Automatic string extraction | Translation strings auto-extracted from C# code. |
| Plugins | New EditorDock class | Specialized container for plugin docks with layout control. |

## 4.4 → 4.5 (Late 2025 — POST-CUTOFF, HIGH RISK)

| Subsystem | Change | Details |
|-----------|--------|---------|
| GDScript | Variadic arguments added | Functions can accept `...` arbitrary params — new language feature |
| GDScript | `@abstract` decorator | Abstract classes and methods now enforceable |
| GDScript | Script backtracing | Detailed call stacks available even in Release builds |
| Rendering | Stencil buffer support | New capability for advanced visual effects |
| Rendering | SMAA 1x antialiasing | New post-processing AA option |
| Rendering | Shader Baker | Pre-compiles shaders — reportedly 20x faster startup on some demos |
| Rendering | Bent normal maps, specular occlusion | New material features |
| Accessibility | Screen reader support | Control nodes work with accessibility tools via AccessKit |
| Editor | Live translation preview | Test GUI layouts in different languages in-editor |
| Physics | 3D interpolation rearchitected | Moved from RenderingServer to SceneTree. API unchanged but internals differ. |
| Animation | BoneConstraint3D | New: AimModifier3D, CopyTransformModifier3D, ConvertTransformModifier3D |
| Resources | `duplicate_deep()` added | New explicit method for deep duplication of nested resources |
| Navigation | Dedicated 2D navigation server | No longer a proxy to 3D navigation; smaller export for 2D games |
| UI | FoldableContainer node | New accordion-style container for collapsible UI sections |
| UI | Recursive Control behavior | Disable mouse/focus interactions across entire node hierarchies |
| Platform | visionOS export support | New platform target |
| Platform | SDL3 gamepad driver | Delegated gamepad handling to SDL library |
| Platform | Android 16KB page support | Required for Google Play targeting Android 15+ |

## 4.3 → 4.4 (Mid 2025 — NEAR CUTOFF, VERIFY)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Core | `FileAccess.store_*` return `bool` | Was `void`. Methods: `store_8`, `store_16`, `store_32`, `store_64`, `store_buffer`, `store_csv_line`, `store_double`, `store_float`, `store_half`, `store_line`, `store_pascal_string`, `store_real`, `store_string`, `store_var` |
| Core | `OS.execute_with_pipe` | Added optional `blocking` parameter |
| Core | `RegEx.compile/create_from_string` | Added optional `show_error` parameter |
| Rendering | `RenderingDevice.draw_list_begin` | Many parameters removed; `breadcrumb` parameter added |
| Rendering | Shader texture types | Parameter/return types changed from `Texture2D` to `Texture` |
| Particles | `.restart()` method | Added optional `keep_seed` parameter (CPU/GPU 2D/3D) |
| GUI | `RichTextLabel.push_meta` | Added optional `tooltip` parameter |
| GUI | `GraphEdit.connect_node` | Added optional `keep_alive` parameter |

## 4.2 → 4.3 (In Training Data — LOW RISK)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Animation | `Skeleton3D.add_bone` returns `int32` | Was `void` |
| Animation | `bone_pose_updated` signal | Replaced by `skeleton_updated` |
| TileMap | `TileMapLayer` replaces `TileMap` | One node per layer instead of multi-layer single node |
| Navigation | `NavigationRegion2D` | Removed `avoidance_layers`, `constrain_avoidance` properties |
| Editor | `EditorSceneFormatImporterFBX` | Renamed to `EditorSceneFormatImporterFBX2GLTF` |
| Animation | AnimationMixer base class | AnimationPlayer and AnimationTree now extend AnimationMixer |
