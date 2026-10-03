# AI MODELS & AGENTS DIRECTIVE — OGGLEBOX SERVER

This document sets the mandatory operational rules for all AI models, assistants, and autonomous coding agents (Claude, Gemini, GPT, Cursor, Copilot, etc.) working in this codebase.

---

## 1. ABSOLUTE MANDATE: SURGICAL EDITS ONLY (NO SCOPE CREEP)

### 1.1 The Golden Rule: Ask for A = Deliver ONLY A
- **Zero Additive Mutations**: When asked to fix or implement A, deliver **strictly A**. Never deliver A + B.
- **Never Touch Unrelated Code**: Touch **only** the specific lines and files directly required to fulfill the user's prompt.
- **No Unsolicited "Fixes" or "Improvements"**:
  - Do NOT "clean up", refactor, re-theme, or alter styles on adjacent components.
  - Do NOT touch navigation menus, view toggle bars, headers, footers, or overlays unless explicitly asked.
  - If an issue is reported with card positioning, adjust **only** card positioning. Never alter the menu bar behind/above it to compensate.
- **No Cascade of Changes**: While fixing B, NEVER introduce unsolicited changes to C.

### 1.2 Definition of a "Surgical Strike"
1. **Identify the exact component** responsible for the requested behavior.
2. **Make the minimal, cleanest modification** that solves the user's specific request.
3. **Verify that no other component's visual appearance or behavior was altered.**
4. **Do not add decorative classes**, arbitrary margins, extra backdrop blurs, shadows, or color overrides.

---

## 2. CONTEXT & SYSTEM RULES

### 2.1 Always Read These Core Files Before Modifying Code:
- `GEMINI.md`: Architecture, global theming tokens, 3D perspective stacking context, and modal elevation rules.
- `CLAUDE.md`: Server architecture, dev commands, video streaming/transcoding pipelines, and static assets.
- `MODELS.md`: This rules file.

### 2.2 Critical Repository Constraints:
- **No Tailwind JIT**: `src/index.css` is handwritten static CSS3. Do NOT use arbitrary variant classes (`dark:bg-*`, `z-[99999]`). Use explicit boolean checks (`isLight ? ... : ...`) and defined CSS classes.
- **3D Stacking Contexts**: GSAP viewing modes use 3D CSS transforms (`preserve-3d`, perspective). All modals and overlays MUST be portaled to `document.body` with explicit inline `zIndex: 99999` (or `99990` for player) and `pointer-events-auto`.
- **Never Break Business Logic**:
  - Do NOT touch splash screen / intro video behavior.
  - Do NOT break HTTP-range video streaming or FFmpeg transcode fallbacks.
  - Do NOT modify the 7 display view toggles bar unless directly instructed.
  - Do NOT overwrite resume playback tracking or metadata probing.

---

## 3. VERIFICATION & DISCIPLINE PROTOCOL

Before concluding any task:
1. **Run `npm run lint` (`tsc --noEmit`)**: Repo correctness gate must pass with 0 errors.
2. **Run `git diff`**: Inspect every changed line. If a change is not directly related to the user's prompt, **revert it immediately**.
3. **Verify Dev Server**: Ensure the dev server is cleanly serving the latest changes without stale module caching.
