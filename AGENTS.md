# AGENTS.md

Repository standards for all contributors and coding agents.

## 1) Purpose and scope
This file defines implementation rules for the Requirements Manager project in this repository, including:
- `playground/app/**` (application pages, components, composables)
- `src/runtime/**` (editable-table runtime extensions)

These standards are mandatory unless the user explicitly requests an exception.

## 2) Core engineering principles
- Keep behavior correct first, then optimize structure.
- Prefer clean, modular, reusable code without over-engineering.
- Keep logic close to where it belongs:
  - UI rendering in components.
  - state/behavior in composables.
  - domain rules in dedicated validators/helpers.
- Prefer explicit naming and readability over cleverness.

## 3) Repository architecture rules

### 3.1 Components
- Components must use one-folder-per-component structure.
- Pattern:
  - `playground/app/components/<ComponentName>/<ComponentName>.vue`
- Do not group unrelated components under shared folders like `ui/` or `projects/`.

### 3.2 Base dialog pattern
- Use one base dialog component and compose all dialogs from it.
- `AppDialog` is the base dialog primitive.
- `ConfirmDialog`, `ProjectFormDialog`, and future dialogs must be wrappers/compositions over `AppDialog`.
- Do not use native browser `alert`, `confirm`, or `prompt`.

### 3.3 Composables
- Extract non-trivial interaction logic into composables (for example drag-and-drop state machines).
- Keep page files thin by delegating reusable logic to composables/components.

## 4) Vue SFC structure and ordering

### 4.1 Block order
For all `.vue` files:
1. `<script setup lang="ts">` first
2. `<template>` second

### 4.2 Script internal order
Inside `<script setup>` use this order:
1. imports
2. interfaces/types
3. `defineModel`, `defineProps`, `defineEmits`
4. refs/reactive state, composable usage, constants
5. computed values
6. custom functions
7. hooks/watchers

### 4.3 Hooks order
When present, hooks should be ordered as:
1. `watch` / `watchEffect`
2. `onUnmounted`
3. other lifecycle hooks (`onMounted`, etc.)

If a file only has some hooks, keep them in the closest possible order to this standard.

## 5) v-model and events standard
- Prefer `defineModel` for component v-model state instead of `modelValue` prop + `update:modelValue` emit plumbing.
- Use clear model names such as `isVisible`.
- Emit only domain/user actions from wrappers (for example `confirm`, `cancel`, `submit`).

## 6) Documentation (JSDoc) standard

### 6.1 General
- JSDoc must be concise, accurate, and present for:
  - interfaces
  - interface properties
  - composable functions (`use...`)
  - custom functions inside composables
  - emitted event definitions

### 6.2 Format requirements
- Interface property JSDoc must be multi-line.
- Emit signatures must have JSDoc above each event signature.
- Include one empty line between interface properties.
- Include one empty line between emit signatures.
- Function docs must include:
  - short description
  - `@param` entries for each parameter
  - `@returns`

## 7) Naming standards
- No abbreviations in identifiers.
- Use full, explicit, readable names.
- Avoid ambiguous short names like `el`, `evt`, `cfg`, `val`, `tmp`.
- Prefer names like:
  - `panelElement`
  - `properties`
  - `emitEvent`
  - `currentPointerX`
  - `dragStartPointerX`

## 8) Storage and persistence rules
- Use VueUse storage composables (`useLocalStorage` / `useStorage`) for browser persistence.
- Do not directly use `window.localStorage` in app code.
- Keep storage keys centralized as constants.
- For Nuxt, explicitly import from `@vueuse/core` when needed.

## 9) UI and UX rules already established
- Projects dashboard and project page must use consistent layout width.
- Use shared container sizing (`max-w-[1600px]` with matching paddings) across primary pages.
- Provide hydration/loading skeleton states for pages that depend on client storage.
- Dialogs should support click-outside close when intended.
- Keep design clean and professional with neutral palette plus brand ocean accent (`#0A8276`).

## 10) Requirements table behavior rules
- Save must only be enabled when:
  - data changed
  - all table validation passes
  - domain validation passes
- Disabled/non-editable cells must have explicit disabled styling.
- Requirement set save state is per-set, not global.
- Never regress validation semantics:
  - performance: symbol/unit required, description forbidden, at least one of min/typical/max required
  - functional: description required, unit and min/typical/max forbidden

## 11) Interaction behavior rules
- No sticky tooltip behavior on click; show only on hover when applicable.
- Requirement set tab interactions should remain clean:
  - drag-and-drop behavior via dedicated composable
  - rename on double click
  - add/delete actions through explicit controls

## 12) Refactoring rules
- Refactor for clarity and reuse without changing expected behavior.
- Avoid broad rewrites when targeted extraction solves the issue.
- Preserve existing UX unless user asks to change it.

## 13) Quality gates before completion
Before finishing any significant change:
1. run type/build checks (`npm run build` in `playground`)
2. confirm no accidental reintroduction of native alert/confirm
3. confirm no direct `window.localStorage` usage in app/runtime code
4. verify component/composable ordering and JSDoc format in modified files

## 14) Preferred workflow for agents
1. understand requested behavior and constraints
2. inspect relevant files first
3. implement with minimal, clean deltas
4. extract reusable code if logic grows
5. validate by building
6. report changed files and outcomes clearly

## 15) Non-goals
- Do not add architecture complexity without clear value.
- Do not add abstractions that are not reused.
- Do not sacrifice readability for terse code.

