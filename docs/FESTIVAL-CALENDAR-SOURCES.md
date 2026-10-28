# Festival calendar, authored stories and save contract

Verified for this release on 2026-10-28. The ten adventures are original fiction written for Tougaigu. All event ranges below are **game activity windows** chosen for this game; they are not statutory holidays, official leave schedules, or claims that a festival lasts for that entire range.

## Activity calendar

Every boundary is midnight in `Asia/Shanghai`, inclusive of the final calendar day. Overlaps return all active adventures. Display priority is deterministic; Halloween is the first active event on 2026-10-28.

| ID | Story | Game activity window | Priority |
| --- | --- | --- | --- |
| `halloween` | 南瓜夜邮 | October 24–November 3 | 100 |
| `thanksgiving` | 空椅子晚餐 | Three days before through three days after the fourth Thursday in November | 70 |
| `christmas` | 雪夜失物所 | December 18–27 | 70 |
| `newyear` | 零点修理铺 | December 28–January 4 | 75 |
| `spring` | 年兽的试音会 | Lunar month 12, day 25 through lunar month 1, day 8 | 95 |
| `lantern` | 月亮走失了 | Lunar month 1, days 10–17 | 85 |
| `valentine` | 两封没有地址的信 | February 10–17 | 80 |
| `dragonboat` | 逆风龙舟局 | Lunar month 5, days 3–7 | 75 |
| `qixi` | 鹊桥维修日 | Lunar month 7, days 5–10 | 80 |
| `midautumn` | 月饼里的地图 | Lunar month 8, days 12–18 | 85 |

Thanksgiving here uses the US calendar convention, not the Canadian date. Its seven-day activity window can extend into December: the fourth Thursday of November 2024 was November 28, so the game window ends on December 1. Gregorian day arithmetic deliberately supports this case. Leap lunar months do not activate an ordinary-month festival for a second time.

## Primary sources and implementation decisions

- [US Office of Personnel Management: Holidays, Work Schedules and Pay](https://www.opm.gov/policy-data-oversight/pay-leave/pay-administration/fact-sheets/holidays-work-schedules-and-pay/) identifies US Thanksgiving as the fourth Thursday of November. [US Naval Observatory: Federal Holidays](https://aa.usno.navy.mil/faq/holidays) independently documents that rule. The ±3-day range is our game design.
- [Hong Kong Observatory: Gregorian–Lunar Calendar Conversion Table](https://www.hko.gov.hk/en/gts/time/conversion1_text.htm) is the source of the embedded lunar month boundaries. We retrieved the yearly English text tables for 2024–2036 using the official URL form `https://www.hko.gov.hk/en/gts/time/calendar/text/files/T{YEAR}e.txt`. Examples: [2024](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2024e.txt), [2025](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2025e.txt), [2026](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt), [2027](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2027e.txt), [2028](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2028e.txt), [2029](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2029e.txt), [2030](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2030e.txt), [2031](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2031e.txt), [2032](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2032e.txt), [2033](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2033e.txt), [2034](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2034e.txt), [2035](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2035e.txt), [2036](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2036e.txt).
- The [HKO 2026 calendar PDF](https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2026e.pdf) and [HKO 2027 CSV](https://data.weather.gov.hk/weatherAPI/hko_data/calendar/nongli_calendar_2027.csv) provide cross-checks. The latter is also identified in the [Hong Kong government data catalogue](https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table/resource/bc159cbb-e99c-435b-881e-74d4b03bd60a).
- [ECMA-402, 2024](https://tc39.es/ecma402/2024/) specifies `Intl.DateTimeFormat`, requested calendars, `resolvedOptions()`, `formatToParts()`, and `relatedYear`. We check the actual resolved calendar before treating formatted parts as Chinese calendar data. [Unicode CLDR date and calendar specification](https://www.unicode.org/reports/tr35/49/tr35-dates.html) describes leap-month representations; the native English numeric Chinese format uses the `bis` marker.

### Why official month anchors are bundled

Testing the release's Node/ICU runtime exposed a material discrepancy: `Intl.DateTimeFormat('en-US-u-ca-chinese', ...)` returned lunar month 12, day 30 for 2027-02-06, whereas HKO's official 2027 table gives lunar month 1, day 1. Trusting that runtime alone would start the 2027 Lantern window a day late. The module therefore includes 138 compact lunar month-start anchors, each storing a Gregorian date, related lunar year, month and leap flag. It computes the lunar day by elapsed civil days from that anchor.

The anchors cover **2024-12-31 through 2036-01-27**, inclusive. The 2036-01-28 anchor is an exclusive end guard. That provides complete coverage for 2025–2035, including leap month 6 in 2025, leap month 5 in 2028, leap month 3 in 2031 and leap month 11 in 2033. No network request is needed at runtime.

Outside the bundled interval, native `Intl` Chinese-calendar data is used when supported and recognisable. If the browser silently falls back to another calendar, omits the related year, or produces an unknown month representation, the lunar value is `null` and lunar activation is skipped. Solar events remain usable. If `Intl` itself is absent, the modern UTC+8 fallback still permits the embedded official data and solar scheduling. The module accepts civil years 2000–2200; this is an input bound, not an accuracy guarantee for every future calendar prediction or timezone law. Future releases should refresh the official month anchors before their coverage ends.

### Release regression dates

| Gregorian date | Official lunar date | Purpose |
| --- | --- | --- |
| 2026-02-17 | 2026 month 1, day 1 | Spring boundary |
| 2026-06-19 | 2026 month 5, day 5 | Dragon Boat |
| 2026-08-19 | 2026 month 7, day 7 | Qixi |
| 2026-09-25 | 2026 month 8, day 15 | Midautumn |
| 2027-02-06 | 2027 month 1, day 1 | Corrects the observed native ICU discrepancy |
| 2027-02-20 | 2027 month 1, day 15 | Lantern |
| 2027-06-09 | 2027 month 5, day 5 | Dragon Boat |
| 2027-08-08 | 2027 month 7, day 7 | Qixi |
| 2027-09-15 | 2027 month 8, day 15 | Midautumn |

## Story and save API

Each festival config contains a named NPC, original opening/encounter/ending dialogue, two distinct puzzles with two progressive hints each, three named physical gifts, one permanent keepsake, one outfit and a two-choice epilogue. The playable level requires all three gifts and two lit puzzle lamps. Story callbacks pass `gifts` (or the existing engine's `memories` field), `time`, `deaths`, and `stars`; `seals`, when supplied, must be at least two. The engine owns the gated exit, while the save layer rejects malformed and incomplete gift results. Free story revisits are available outside activity windows; calendar activation governs seasonal presentation and playtime rewards separately.

The independent localStorage key is `tougaigu.festivals.v1`. No base-game or main-story data is overwritten.

```js
{
  version: 1,
  records: {
    'halloween:2026': {
      completed: true,
      bestStars: 3,
      bestGifts: 3,
      bestTime: 88,
      bestDeaths: 0,
      runs: 1,
      choice: 'doorstep',
      puzzles: { 'halloween-0': { solved: true, assisted: false } }
    }
  },
  outfits: ['halloween'],
  settings: { selectedOutfit: 'auto' }
}
```

`getFestivalOccurrenceKey(id, date)` returns `id:year`. December and January of one New Year activity share the upcoming year (`newyear:2027` for both December 30, 2026 and January 2, 2027). Spring's lunar month 12 belongs to the upcoming lunar year's occurrence; all other lunar festivals use the related lunar year. Keys are stable across the activity's year boundary, including for the independent reward ledger.

`getFestivalRecord(save, id, date)` returns that occurrence's record or `null`. `getFestivalStats(save)` returns distinct completed stories, gifts, best stars, permanent `items` (each also includes `festivalId`), owned outfit IDs, item/outfit counts, unique solved riddles, annual completions and total completed runs. Permanent story items derive from valid completed records across years. An outfit earned from playtime does not grant a story keepsake.

`recordFestivalComplete` returns `{ok, firstCompletion, newItem, newOutfit, key, record}` on success. `firstCompletion` is per occurrence; `newItem` and `newOutfit` are permanent first-time grants, or `null` if already owned. Choices require that occurrence to be completed. A later assisted solve cannot overwrite earlier independent-solve credit. `unlockFestivalOutfit` accepts only the ten festival IDs and `starlight`; callers use it after a legitimate reward claim. Selecting `auto` is always allowed, while selecting a fixed outfit requires ownership.

Validation whitelists record IDs, years, puzzle IDs, choices and outfits; bounds numeric values and archive size; and creates fresh objects rather than merging imported properties. At most 300 annual records are retained, preserving a completed record for each story when trimming. Invalid JSON, oversized data, unavailable storage and quota exceptions fail safely. This is local game progress, not a server-authoritative anti-cheat system.

## Verification

`node --test tests/festivals.test.mjs tests/play-rewards.test.mjs` verifies the content contract, Shanghai midnight, all ten event windows, Thanksgiving rollover, overlaps, 2026/2027 lunar dates, leap months, annual keys, unsupported-calendar behavior, collection and outfit separation, replay preservation, choice/puzzle validation, and independent storage. Integration, rendering and deployed-game checks are documented separately by the main release workflow.
