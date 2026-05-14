# Agentic — Eccentric Expense Tracker (Android)

Native Android app where every transaction, budget, savings goal, and upcoming
bill is recorded by an LLM agent. Type "blew 38 on sushi and 4 on a metro card"
and Claude parses it, picks categories, calls the right tools, and updates a
local SQLite database — then writes back a short, observant reply.

Built to match a dashboard layout inspired by the supplied mockup: light theme,
indigo primary, a category donut chart, budget-vs-actual bars, goals progress,
upcoming bills, and an inline agent insights panel.

## Branches

- **`claude/ai-expense-tracker-app-R3geK`** — the Android app (this branch).
- **`claude/flask-web-app`** — earlier web-app prototype (Flask + SQLite).
  Preserved for reference; the Android app supersedes it.

## Stack

- **Kotlin 2.0** + **Jetpack Compose** (Material 3) — single-activity, NavHost.
- **Room** for the local database (SQLite under the hood).
- **OkHttp + kotlinx-serialization** for direct calls to `api.anthropic.com`
  — no SDK dependency on Android, keeps the APK small.
- **DataStore** for persisting the Claude auth token on-device.
- Min SDK 26, target 34, Java 17.

## How the agent works

`agent/ExpenseAgent.kt` runs a manual tool-use loop against the Messages API
(`claude-opus-4-7`). It exposes 8 tools to the model:

| Tool | What it does |
|---|---|
| `record_transaction` | Log one expense or income |
| `set_budget` | Monthly cap for a category |
| `list_transactions` | Read recent activity |
| `get_summary` | Totals + per-category spend for a month |
| `set_goal` | Create/update a savings goal |
| `add_goal_progress` | Bump the saved amount on an existing goal |
| `list_goals` | Read goals |
| `add_bill` | Track an upcoming or recurring bill |
| `list_bills` | Read upcoming bills |

The loop runs up to 6 turns per user message. Compound inputs like "blew 38 on
sushi and 4 on a metro card" produce two `record_transaction` calls in one
turn. Every conversation is logged to the `agent_log` table.

## Auth

The app sends a Claude token from on-device storage with each request. Set it
under **Settings**:

- A Claude **OAuth token** (`sk-ant-oat…`) → sent as `Authorization: Bearer`.
- An **API key** (`sk-ant-api…`) → sent as `x-api-key`.

The token is auto-detected by prefix. No backend, no proxy — the app talks
directly to `api.anthropic.com`.

> Storing a long-lived token on a device is fine for personal builds. For a
> publicly distributed app you'd use a backend proxy or short-lived tokens.

## Building locally

You need JDK 17 and either Android Studio (Hedgehog or later) or the Android
command-line tools + Gradle 8.5+.

```bash
# Open the project in Android Studio — it will sync and generate the wrapper.
# Or, from the command line with Gradle on PATH:
gradle :app:assembleRelease

# APK lands here:
ls -lh app/build/outputs/apk/release/*.apk
```

If no signing keystore is configured the build falls back to the debug key, so
the resulting APK is installable on a phone or emulator.

## CI / CD

`.github/workflows/android-release.yml` builds a release APK on every push to
`main`, every `v*` tag, every PR, and on manual dispatch.

- **Always**: uploads the APK as a workflow artifact named `agentic-release-apk`.
- **On `main` or `v*` tag**: also publishes a GitHub Release (one per build
  number, or one per tag for `v*` tags) with the APK attached.

### Signing the release APK

By default the workflow signs with the debug keystore — installable but not
suitable for the Play Store. To use a real release keystore, add these repo
secrets:

| Secret | What |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 release.keystore` of your `.keystore` / `.jks` |
| `KEYSTORE_PASSWORD` | Store password |
| `KEY_ALIAS` | Key alias inside the keystore |
| `KEY_PASSWORD` | Key password |

When `KEYSTORE_BASE64` is present the workflow decodes it to a temp file and
the Gradle build picks it up via environment variables.

## Project layout

```
app/
├── build.gradle.kts                 # module config (compose, room, signing)
├── proguard-rules.pro
└── src/main/
    ├── AndroidManifest.xml
    ├── java/com/mintwise/expense/
    │   ├── MintwiseApp.kt           # Application: builds db / repo / agent
    │   ├── MainActivity.kt          # NavHost + bottom bar
    │   ├── agent/
    │   │   ├── AnthropicClient.kt   # OkHttp wrapper over /v1/messages
    │   │   └── ExpenseAgent.kt      # Tool-use loop + 9 tool schemas
    │   ├── data/
    │   │   ├── AppDatabase.kt
    │   │   ├── Entities.kt          # Budgets, Transactions, Funds, Goals, Bills
    │   │   ├── Daos.kt
    │   │   ├── ExpenseRepository.kt
    │   │   └── SettingsStore.kt     # DataStore-backed token storage
    │   └── ui/
    │       ├── ExpenseViewModel.kt
    │       ├── DashboardScreen.kt   # Multi-card scroll matching the mockup
    │       ├── CategoryDonut.kt     # Canvas-drawn donut chart
    │       ├── BudgetScreen.kt
    │       ├── TransactionsScreen.kt
    │       ├── SettingsScreen.kt
    │       ├── BottomBar.kt
    │       └── theme/               # Light theme, indigo primary
    └── res/
        ├── values/{strings,colors,themes}.xml
        ├── xml/                     # backup_rules, data_extraction_rules
        ├── drawable/ic_launcher_foreground.xml
        └── mipmap-anydpi-v26/       # adaptive launcher icons
build.gradle.kts                      # root
settings.gradle.kts
gradle.properties
gradle/libs.versions.toml             # version catalog
.github/workflows/android-release.yml # CI: APK build + release publishing
```

## Usage examples

Once your token is set, type any of these into the agent chat at the top of
the dashboard:

- `spent 12 on lunch`
- `blew 38 on sushi and 4 on a metro card` *(two transactions in one turn)*
- `got paid 2500`
- `set food budget to 400 this month`
- `add Europe Trip goal 4000 by 2027-06`
- `add electricity bill 1800 due 2026-06-01 recurring`
- `how much have I spent on dining this month?`

## Caveats

- Single-user, single-device. All data is local; uninstalling clears it.
- The token sits in DataStore unencrypted — fine for personal builds. Wrap with
  `EncryptedSharedPreferences` for stricter at-rest protection.
- The agent can occasionally categorise wrong; just say "actually that was
  Entertainment not Food" and it'll re-record.
- Currency is purely visual — amounts are stored as `Double` with no symbol.
