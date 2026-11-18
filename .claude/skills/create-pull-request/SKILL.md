---
name: create-pull-request
description: How to open a pull request in the Wash Crew repo. Use this every time you create a pull request here, including the before and after screenshot rule for user-facing changes and the performance metrics table for game changes.
---

# Create a pull request

Follow these steps every time you open a pull request in this repository.

## 1. Prepare the branch

- Work on a feature branch, never directly on `main`.
- Keep the change focused on one goal. Split unrelated work into separate PRs.
- Make sure the project builds and any tests or lint checks pass before you open the PR.
- Write clear commit messages that say what changed and why.

## 2. Screenshots for user-facing changes (required)

Any change a player or user can see **must** include before and after screenshots in the PR description, so the reviewer can tell how it looks without running it.

This covers things like UI, HUD, menus, sprites, art, animations, layout, colors, text, and gameplay that looks different on screen.

- Take a **Before** screenshot from the base branch and an **After** screenshot from your branch, of the same screen and state.
- If the change is an interaction or animation, a short GIF or video is welcome in addition to the screenshots.
- For a brand new screen or feature with no previous state, say "Before: N/A (new feature)" and include the After screenshot.
- Skip this only when nothing visible changes (for example refactors, build config, tests, docs). In that case write "Screenshots: N/A, no user-facing change" so it is clear the rule was considered.

Upload the images into the PR description (drag and drop on GitHub, or commit them and link them) rather than leaving them on your machine.

## 3. Performance metrics for game changes (required)

Any PR that changes the game itself (gameplay, rendering, assets, physics, game loop, engine code, dependencies the game ships with) **must** include a before and after performance metrics table, so the reviewer can confirm nothing got slower or heavier.

- Measure on the base branch (**Before**) and on your branch (**After**) using the same machine, browser, build mode, and scene or level.
- Run each measurement a few times and report a typical value, not the best one.
- Include the metrics that apply, at minimum:
  - Average FPS and frame time (ms) during normal play
  - Worst frame time / 1% low FPS
  - Initial load time
  - Bundle or build size
  - Memory usage (JS heap)
- Add a Change column and call out anything that got worse. If a regression is intentional or unavoidable, explain why in the description.
- Note how you measured (tool, device, scene) under the table.
- Skip this only when the PR does not touch the game (for example docs, CI, repo tooling). In that case write "Performance metrics: N/A, game not changed".

## 4. Write the PR description

Use this layout:

```markdown
## Summary
What this PR does and why, in a few sentences.

## Changes
- Bullet list of the main changes.

## Screenshots
| Before | After |
| ------ | ----- |
| ![before](url) | ![after](url) |

<!-- or: Screenshots: N/A, no user-facing change -->

## Performance metrics
| Metric | Before | After | Change |
| ------ | ------ | ----- | ------ |
| Avg FPS | | | |
| Avg frame time (ms) | | | |
| 1% low FPS | | | |
| Load time (s) | | | |
| Bundle size (KB) | | | |
| JS heap (MB) | | | |

Measured on: device, browser, build mode, scene.

<!-- or: Performance metrics: N/A, game not changed -->

## How to test
Steps a reviewer can follow to check the change.
```

## 5. Open the PR

- Title: short and in plain words, describing the outcome (for example "Add soap meter to the HUD").
- Base branch: `main`, unless told otherwise.
- Link any related issue in the description.
- Do a final read of the diff before opening, and check that the Screenshots and Performance metrics sections are filled in or marked N/A.
