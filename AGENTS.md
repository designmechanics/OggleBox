# AGENTS.md — OPERATIONAL RULES FOR AUTONOMOUS AGENTS

## 1. ZERO SCOPE CREEP & SURGICAL STRIKES MANDATE
1. **NO ALTERING CODE UNRELATED TO THE PROMPTED TASK**:
   - Touch ONLY the exact lines and files directly required to fulfill the user's specific instruction.
   - Do NOT touch, re-style, re-theme, or "improve" adjacent components, wrapper bars, navigation menus, headers, sidebars, or overlays.
   - NEVER "anticipate" or "proactively fix" side effects in neighboring files. If a card needs spacing, change only the card/stage spacing; NEVER alter the menu bar behind/above it.
2. **SURGICAL STRIKES ONLY — NO DIVERSION, NO DEVIATION**:
   - Implement the minimal, cleanest change necessary.
   - Do NOT add unsolicited visual enhancements, extra utility classes, extra borders, shadows, or backdrop blurs.
   - When fixing an issue (fixing B), NEVER introduce new changes to C.
   - When the user asks for A, deliver ONLY A. Never A+B.
3. **CONTEXT AWARENESS & FILE DISCIPLINE**:
   - Read and respect `CLAUDE.md`, `GEMINI.md`, `MODELS.md`, and any related task documentation before proposing or making changes.
   - Preserve existing visual aesthetics, themes, backgrounds, and styling constants unless an explicit aesthetic change is commanded by the user.

## 2. REPO ARCHITECTURE QUICK RULES
- **Static CSS3**: No Tailwind JIT. Use `isLight ? ... : ...` ternary logic with defined classes in `src/index.css`.
- **Modals & Overlays**: All modals, drawers, and full-screen players MUST portal to `document.body` with inline `zIndex: 99999` (or `99990`) to escape GSAP 3D perspective contexts.
- **Verification Gate**: Always run `npm run lint` (`tsc --noEmit`) and verify clean `git diff` before reporting completion.
