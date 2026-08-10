# Bevy Deprecated APIs

**Last verified:** 2026-08-09

If an agent suggests any API in the "Don't use" column, it MUST be replaced
with the "Use instead" column. Rows are taken from the official Migration
Guides (https://bevy.org/learn/migration-guides/); the "Deprecated in" column
is the version in which the old name was deprecated/renamed. For a version's
full change list see the corresponding guide URL in the Source column.

## Lookup Table

| Don't use | Use instead | Deprecated in | Source |
|-----------|-------------|---------------|--------|
| `App::init_non_send_resource` | `App::init_non_send` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data |
| `App::insert_non_send_resource` | `App::insert_non_send` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data |
| `World::init_non_send_resource` / `World::insert_non_send_resource` / `World::remove_non_send_resource` | `World::init_non_send` / `insert_non_send` / `remove_non_send` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data |
| `World::non_send_resource` / `World::non_send_resource_mut` / `World::get_non_send_resource(_mut)` | `World::non_send` / `non_send_mut` / `get_non_send(_mut)` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data |
| `UnsafeWorldCell::get_non_send_resource(_mut)(_by_id)` | `UnsafeWorldCell::get_non_send(_mut)(_by_id)` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data |
| `DeferredWorld::non_send_resource_mut` / `get_non_send_resource_mut` | `DeferredWorld::non_send_mut` / `get_non_send_mut` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data |
| `Components::get_valid_resource_id` / `valid_resource_id` / `resource_id` | `Components::get_valid_id` / `valid_component_id` / `component_id` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#component-registration |
| `ComponentsRegistrator::register_resource` | `ComponentsRegistrator::register_component` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#component-registration |
| `ComponentsQueuedRegistrator::queue_register_resource` | `ComponentsQueuedRegistrator::queue_register_component` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#component-registration |
| `ComponentDescriptor::new_resource` | `ComponentDescriptor::new` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#component-registration |
| `Access::add_component_read` / `add_resource_read` / `add_component_write` / `add_resource_write` | `Access::add_read` / `add_write` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#access |
| `Access::has_component_read` / `has_resource_read` / `has_component_write` / `has_resource_write` (and `has_any_*`) | `Access::has_read` / `has_write` / `has_any_read` / `has_any_write` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#access |
| `Access::read_all_components` / `write_all_components` | `Access::read_all` / `write_all` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#access |
| `Access::is_components_compatible` / `is_subset_components` | `Access::is_compatible` / `is_subset` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#access |
| `FilteredAccess::add_component_read` / `add_component_write` | `FilteredAccess::add_read` / `add_write` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#access |
| `FilteredAccess::read_all_components` / `write_all_components` | `FilteredAccess::read_all` / `write_all` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#access |
| `System::type_id` | `System::system_type` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#rename-system-type-id-to-system-system-type |
| `DefaultErrorHandler` / `default_error_handler` | `FallbackErrorHandler` / `fallback_error_handler` (deprecated alias kept for one release) | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#defaulterrorhandler-renamed-to-fallbackerrorhandler |
| `TextureFormat::bevy_default()` / `ViewTargets::TEXTURE_FORMAT_HDR` | source the format from `ExtractedView::target_format` | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#camera-textureformat-rework |
| `AssetServer::load_with_settings` / `load_with_settings_override` / other advanced load variants | `AssetServer::load_builder().with_settings(...)` (all variants reimplementable via `load_builder`) | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#advanced-assetserver-load-variants-are-now-exposed-through-a-builder-pattern |
| `LoadContext::loader()` (`NestedLoader`) | `LoadContext::load_builder()` (`NestedLoadBuilder`) | 0.19 | https://bevy.org/learn/migration-guides/0-18-to-0-19/#nestedloader |
| `EntityCommands::clear_children` / `remove_children` / `remove_child` / `clear_related` | `detach_all_children` / `detach_children` / `detach_child` / `detach_all_related` | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#renamed-clear-children-and-clear-related-methods-to-detach |
| `EntityWorldMut::clear_children` / `remove_children` / `remove_child` / `clear_related` | `EntityWorldMut::detach_all_children` / `detach_children` / `detach_child` / `detach_all_related` | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#renamed-clear-children-and-clear-related-methods-to-detach |
| `ThinSlicePtr::get()` | `ThinSlicePtr::get_unchecked()` | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#rename-thinsliceptr-get-to-thinsliceptr-get-unchecked |
| `MaterialPlugin { prepass_enabled, shadows_enabled }` fields | `Material::enable_prepass()` / `Material::enable_shadows()` methods | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#enable-prepass-and-enable-shadows-are-now-material-methods |
| `NextState::set` for same-state transitions | `NextState::set_if_neq` (if same-state transitions are undesired) | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#same-state-transitions |
| `Gizmos::cuboid` | `Gizmos::cube` | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#gizmos-cuboid-has-been-renamed-to-gizmos-cube |
| `AssetSourceBuilder::build()` | `AssetSourceBuilder::new(reader_fn)` (a reader is now required) | 0.18 | https://bevy.org/learn/migration-guides/0-17-to-0-18/#custom-asset-sources-now-require-a-reader |
| `World::send_event` / `send_event_default` / `send_event_batch` | `World::write_message` / `write_message_default` / `write_message_batch` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#rename-send-event-and-similar-methods-to-write-message |
| `Commands::send_event` | `Commands::write_message` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#rename-send-event-and-similar-methods-to-write-message |
| `Events<E>` / `EventWriter<E>` / `EventReader<E>` for buffered events | `Messages<M>` / `MessageWriter<M>` / `MessageReader<M>` (derive `Message`) | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#event-trait-split-rename |
| `Events::send` / `send_default` / `send_batch` | `Messages::write` / `write_default` / `write_batch` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#rename-send-event-and-similar-methods-to-write-message |
| `RemovedComponents::events` / `reader_mut_with_events` / `RemovedComponentEvents` | `RemovedComponents::messages` / `reader_mut_with_messages` / `RemovedComponentMessages` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#removedcomponents-methods-renamed-to-match-event-to-message-rename |
| `Condition` (trait) | `SystemCondition` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#renamed-condition-to-systemcondition |
| `StateScoped` / `add_state_scoped_event` | `DespawnOnExit` / `add_event` + `clear_events_on_exit` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#renamed-state-scoped-entities-and-events |
| `app.enable_state_scoped_entities::<State>()` | nothing (state-scoped entities always enabled; call is a no-op) | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#state-scoped-entities-are-now-always-enabled-implicitly |
| `JustifyText` | `Justify` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#renamed-justifytext-to-justify |
| `Handle::Weak` / `weak_handle!` / `Handle::clone_weak` | `Handle::Uuid` / `uuid_handle!` / `Handle::clone` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#handle-weak-has-been-replaced-by-handle-uuid |
| `Timer::paused()` / `Timer::finished()` | `Timer::is_paused()` / `Timer::is_finished()` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#renamed-timer-paused-to-timer-is-paused-and-timer-finished-to-timer-is-finished |
| `World::iter_entities()` / `World::iter_entities_mut()` | `world.query::<EntityRef>().iter(&world)` / `world.query::<EntityMut>().iter(&mut world)` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#deprecate-iter-entities-and-iter-entities-mut |
| `MergeMeshError` (0.16 name; was a struct) | `MeshMergeError` (enum, with `IncompatiblePrimitiveTopology` variant) | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#rework-mergemesherror |
| `ScaleVolume` Add/Sub arithmetic on `Volume::Linear` | `Volume::Linear(x).increase_by_percentage(...)` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#remove-the-add-sub-impls-on-volume |
| `SceneSpawner::despawn`/`despawn_sync`/`update_spawned_scenes` (0.16, dynamic-scene variants) | `despawn_dynamic` / `despawn_dynamic_sync` / `update_spawned_dynamic_scenes`; the un-suffixed names now act on `Scene` | 0.17 | https://bevy.org/learn/migration-guides/0-16-to-0-17/#scenespawner-methods-have-been-renamed-and-replaced |

Notes:

- The 0.16→0.17 guide also documents deprecations that were removed outright in 0.18: `SimpleExecutor` (deprecated in 0.17, removed in 0.18 — use `SingleThreadedExecutor` or `MultiThreadedExecutor`) — https://bevy.org/learn/migration-guides/0-16-to-0-17/#deprecated-simple-executor and https://bevy.org/learn/migration-guides/0-17-to-0-18/#removed-simpleexecutor.
- The guides for 0.16→0.17, 0.17→0.18, and 0.18→0.19 all document deprecations, so no version is without a deprecation note.
