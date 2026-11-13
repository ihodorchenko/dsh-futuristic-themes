# Pure Reflection — addendum: City of Glass

**Received:** 2026-11-13 · this refines the original brief
([`Pure-Reflection.md`](Pure-Reflection.md)) after the first light-theme pass.

## Original description (Russian, verbatim)

> Да, вы абсолютно правы — почти весь город Зеркал (City of Glass) в первой части Mirror's Edge
> строится на строгом сочетании белого и нескольких ярких акцентных цветов. Такой минималистичный
> дизайн нужен не только для создания стерильной атмосферы утопического города, но и для мгновенной
> навигации во время паркура на высокой скорости.
>
> **Основные цвета города**
>
> Художники студии DICE убрали лишние полутона, чтобы игрок мог считывать окружение за доли секунды:
>
> • **Белый и светло-серый.** Это базовый фон всего города, который символизирует стерильность,
> порядок и тотальный контроль власти. Светло-серые оттенки и мягкие тени используются, чтобы белые
> стены не сливались в одно слепящее пятно.
>
> • **Красный.** Это главный цвет «зрения бегущего» (Runner's Vision). Он подсвечивает трамплины,
> трубы, двери и уступы, показывая оптимальный маршрут побега или преследования.
>
> • **Оранжевый, синий и жёлтый.** Эти яркие цвета делят город на функциональные районы и задают
> настроение. Например, деловой центр часто использует холодный синий цвет, жилые и коммерческие
> зоны тяготеют к тёплому оранжевому, а технические помещения — к жёлтому или зелёному.
>
> **Зачем нужна такая палитра**
>
> В обычных играх навигация строится с помощью мини-карты или стрелок на экране, но в Mirror's Edge
> интерфейс почти полностью отсутствует. Контраст между стерильным белым фоном и редкими вспышками
> красного или оранжевого позволяет ориентироваться интуитивно и не сбавлять темп бега.
>
> Хотите обсудить, как изменилась цветовая палитра в сиквеле Mirror's Edge Catalyst, или разобрать,
> как именно работает система навигации в играх без мини-карты?

## English digest

The City of Glass removes unnecessary midtones so the player can read the environment in
fractions of a second: a sterile **white / light-grey** base, **red** as Runner's Vision on
the route and interactable geometry, and **orange, blue and yellow** as functional district
colours (business blue, residential/commercial orange, technical yellow/green). The contrast
between the white city and the rare bright accent is the navigation system.

## What this changed in the implementation (v0.3.0)

| City colour | HEX | DSH role |
| --- | --- | --- |
| White / light grey | `#EFF1F4` canvas, `#FFFFFF` panels, `#FBFCFD` dialogs, `#E5E9ED` hover, `#C9D0D6` borders | sterile architecture; thin 1 px borders and white panels on a cool grey canvas |
| Runner's Vision red | `#E10600`, bright `#FF2D2D`, button hover `#B00000` | selected navigation, primary action, focus, red route brackets and chamfer |
| Business blue | `#1E6FD9` | links, info states, the Preview badge, `chart-messages`, `label-primary-bluish` |
| Residential orange | `#D9480F` warning; `#F76707` district signature | warnings and warmth; bright orange in the swatch strip and effect layer |
| Technical yellow | `#F2C200` / `#E0A800` | technical charts (`chart-tools`), state-done amber, district signature |
| Technical green | `#1B8A4B` | success and confirmations |
| Error red | `#B00020` | destructive/error states, deliberately darker than Runner's Vision |

Additional decisions:

- **Sharp geometry.** The host radius scale is overridden for this theme only:
  `xs 0`, `sm 1`, `md 2`, `lg 3`, `xl 4`, `panel 4` px (was 4–28 px), so cards, dialogs and
  the composer read as the game's planar architecture.
- **Typography.** Inter for interface copy, IBM Plex Mono for logs, code, identifiers and
  metrics.
- **Decorative layer.** Overhead daylight, red L-brackets in the top-right and bottom-right
  corners, a red 45° chamfer and a small blue/orange/yellow district signature in the
  bottom-left corner. No scanlines, noise, flicker, glow or animation.
- **Token set.** 136 tokens (127 derived + 9 light/district overrides), 24 explicit overrides.
  Detail and screenshots: [`docs/qa/pure-reflection-verification.md`](../qa/pure-reflection-verification.md).
