# rengas-online-contactor

> ⚠️ **JOKE PROJECT. PLEASE DON'T ACTUALLY USE IT.** ⚠️

A satirical "AI outreach agent" that gets a reply from Rengas Online one way or another. It climbs an
escalation ladder from a polite contact form all the way to a blimp over their warehouse.

**Nothing is ever sent.** Every email, SMS, robocall, Facebook message and "staff recon" result is simulated
in your browser. The app makes no network requests to any provider. The API keys it asks for are only
checked for shape, then thrown away; they are never stored or sent. The staff it "finds" are invented.

## The ladder

| Level | Rung                    | Pretend keys it asks for                  |
| ----- | ----------------------- | ----------------------------------------- |
| 1     | Polite customer inquiry | none: customer service number and website |
| 2     | Firmly worded email     | email provider key                        |
| 3     | Robo-emails             | bulk mailing key                          |
| 4     | Ominous text messages   | SMS gateway account ID + auth token       |
| 5     | AI robocalls            | voice calling key + neural speech key     |
| 6     | Social media siege      | Facebook Graph API token                  |
| 7     | Staff recon             | web scraping key                          |
| 8     | Total escalation        | blimp rental key + carrier pigeon licence |

You can only enter keys for the next level up. Any key-shaped text (8+ characters, no spaces) works.
The robocall level can play its script through **your own** speakers using the browser's speech synthesis.

## Run it

Needs Node 22.12+ and pnpm.

```sh
pnpm install
pnpm dev        # http://127.0.0.1:5173
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`.
