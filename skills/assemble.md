# Skill: assemble

## Command
```
jeremai assemble --client <id>
```

Writes ` .data/jobs/<job>/`:
- `rough-cut.mp4` — ffmpeg concat of reused stubs + generated stub
- `handoff.json` — machine-readable Premiere / CapCut notes
- `EDITOR.md` — human polish checklist (~10%)

## NLE
- **Premiere:** import rough cut or relink `clips[]` onto V1; supers on V2.
- **CapCut:** import rough cut, split hook/body/CTA, captions from the **approved** script only.

Do not upload from the NLE. Editor exports locally.
