# Session state

First session for this version of the project. It covers the scaffold, docs and
initial repository setup. Previous sessions belong to the old version and are
excluded. These are snapshot values and will not update themselves.

## Credits

- **Agent harness:** [OpenCode](https://opencode.ai)
- **Model:** `deepseek-v4.1-flash` (provider `opencode-go`)
- **Repository:** https://github.com/yx0128/evergrow

## Session

| Session | Duration | Input | Output | Reasoning | Cache read | Non-cache total | Cost |
|---|---|---|---|---|---|---|---|
| Scaffold session | 1h 38m 54s | 138,056 | 23,224 | 20,145 | 4,351,232 | 181,425 | $0.059783 |

Total consumption including cache-read tokens: **4,532,657 tokens**.

Duration is wall-clock from session creation to the last recorded update, so it
includes time between messages. The game is still at the scaffold stage.

## How to refresh

OpenCode stores sessions in `~/.local/share/opencode/opencode.db`:

```bash
sqlite3 -header -column ~/.local/share/opencode/opencode.db \
  "select title,cost,tokens_input,tokens_output,tokens_reasoning,
          tokens_cache_read,tokens_cache_write,time_created,time_updated
   from session
   where id = 'ses_e1abfb19dffekHkhNg0c1NytP4';"
```

Per-message token detail is in the `message` table (`data` JSON column) filtered by
`session_id`. See [`PROGRESS.md`](./PROGRESS.md) for the build context, [`DECISIONS.md`](./DECISIONS.md)
for choices and [`BRIEF.md`](./BRIEF.md) for the requirements.
