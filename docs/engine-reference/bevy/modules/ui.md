# Bevy UI — Quick Reference

**Last verified:** 2026-08-09

## Core Concepts
- **Node** — the layout component for every UI element (bevy_ui). Retained entity tree: parents are `Node`s; children spawned with `with_children` / `parent.spawn(...)`. Laid out with **Flexbox** (`display: Display::Flex`) or CSS Grid (`Display::Grid`).
- **Flexbox fields on `Node`** — `flex_direction`, `flex_wrap`, `justify_content`, `align_items`, `row_gap`/`column_gap`, `margin`/`padding`/`border` (`UiRect`), `width`/`height`/`min_*`/`max_*` (`Val`), `flex_grow`/`flex_shrink`/`flex_basis`, `position_type`, `border_radius: BorderRadius`.
- **Interaction** — `enum Interaction { Pressed, Hovered, None }`, added to interactive nodes (e.g. `Button`); query with `Changed<Interaction>`.
- **Text** — `Text(pub String)` widget + required `TextFont`/`TextColor`/`TextLayout`; `TextSpan` children for rich runs.
- **Styling components** — `BackgroundColor(Color)`, `BorderColor { top, right, bottom, left }` (`BorderColor::all(color)`), `BorderRadius` (a `Node` field since 0.18, not a component).
- **Separate systems guidance** — flex layout runs in `PostUpdate`; keep UI-mutating systems ordered before/after layout and don't read back layout results in the same frame you mutate style.

## Building a UI Tree
```rust
fn setup(mut commands: Commands) {
    commands.spawn(Camera2d);
    commands
        .spawn(Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        })
        .with_children(|parent| {
            parent.spawn((
                Button,
                Node {
                    width: Val::Px(150.0),
                    height: Val::Px(65.0),
                    border: UiRect::all(Val::Px(5.0)),
                    justify_content: JustifyContent::Center,
                    align_items: AlignItems::Center,
                    border_radius: BorderRadius::MAX,
                    ..default()
                },
                BorderColor::all(Color::BLACK),
                BackgroundColor(Color::srgb(0.15, 0.15, 0.15)),
            ));
        });
}
```
`Val` variants: `Auto`, `Px(f32)`, `Percent(f32)`, `Vw`, `Vh`, `VMin`, `VMax`. `Button` is a marker struct; required components `Node`, `FocusPolicy`, `Interaction`.

## Interaction Handling
```rust
fn button_system(
    mut interaction_query: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<Button>),
    >,
) {
    for (interaction, mut color) in &mut interaction_query {
        match *interaction {
            Interaction::Pressed => *color = BackgroundColor(Color::srgb(0.35, 0.75, 0.35)),
            Interaction::Hovered => *color = BackgroundColor(Color::srgb(0.25, 0.25, 0.25)),
            Interaction::None => *color = BackgroundColor(Color::srgb(0.15, 0.15, 0.15)),
        }
    }
}
```

## Text
```rust
world.spawn((
    Text::new("hello world!"),
    TextFont {
        font: asset_server.load("fonts/FiraSans-Bold.ttf").into(),
        font_size: FontSize::Px(60.0),
        ..default()
    },
    TextColor(Color::WHITE),
));
```
- `TextFont.font` is `FontSource` (build from `Handle<Font>` with `.into()`); `font_size` is `FontSize::Px(f32)` — both are 0.19 parley-migration changes.
- `LineHeight` is a separate component; `TextLayout { justify: Justify, linebreak: LineBreak }` controls alignment/wrapping (`TextLayout::justify(Justify::Center)`).

## Common Pitfalls
- **0.19: `ui` Cargo feature is no longer implied by `2d`/`3d`** — with `default-features = false`, add `"ui"` explicitly.
- **`BorderRadius` is a `Node` field, not a component** (0.18) — set `Node { border_radius: BorderRadius::all(...), .. }`.
- **`TextFont.font` takes `FontSource`** (0.19) — pass `handle.into()`; `font_size: FontSize::Px(...)`, not `f32`.
- Don't add `UiWidgetsPlugins` / `InputDispatchPlugin` manually — they are in `DefaultPlugins` since 0.19 (double-registering breaks).
- `JustifyText` was renamed to `Justify` (0.17).

## Sources
- https://docs.rs/bevy/0.19.0/bevy/ui/index.html
- https://docs.rs/bevy/0.19.0/bevy/ui/struct.Node.html
- https://docs.rs/bevy/0.19.0/bevy/ui/enum.Val.html
- https://docs.rs/bevy/0.19.0/bevy/ui/enum.Interaction.html
- https://docs.rs/bevy/0.19.0/bevy/ui/widget/struct.Button.html
- https://docs.rs/bevy/0.19.0/bevy/ui/widget/struct.Text.html
- https://docs.rs/bevy/0.19.0/bevy/text/struct.TextFont.html
- https://docs.rs/bevy/0.19.0/bevy/text/struct.TextLayout.html
- https://bevy.org/learn/migration-guides/0-17-to-0-18/#borderradius-has-been-added-to-node-and-is-no-longer-a-component
- https://bevy.org/learn/migration-guides/0-18-to-0-19/#ui-feature-is-now-no-longer-implied-by-the-3d-or-2d-features
