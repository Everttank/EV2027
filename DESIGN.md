# Design — Getij (Bento)

Afgeleid van de gebouwde app. Alle tokens staan in `src/styles/app.css` (`:root` en de `[data-area]`-blokken).

## Wereld

Levendig en sportief, op echt zwart. Elk onderdeel heeft zijn eigen felle kleur. Elk scherm opent met een **gekleurde hoofdtegel** (`.hero`) in die kleur, met grote ronde cijfers. Daaronder staan donkere tegels (`.panel`) voor lijsten, formulieren en grafieken. Het startscherm is een bento: een raster van gekleurde tegels waarmee je doorklikt naar elk onderdeel.

## Kleur per onderdeel

Elk onderdeel heeft twee kleuren voor het verloop en een inktkleur voor de tekst op de tegel:

| Onderdeel | Variabelen | Kleur |
|---|---|---|
| Eten | `--c-eten` | roze, witte inkt |
| Stappen | `--c-stappen` | groen, donkere inkt |
| Sport | `--c-sport` | cyaan |
| Gewicht | `--c-gewicht` | oranje |
| Rookvrij | `--c-roken` | amber |
| Financiën | `--c-geld` | blauw |
| Mentaal | `--c-hoofd` | paars |

- Het actieve accent (`--accent`, `--accent-2`, `--accent-ink`) wordt gezet via `data-area` op de schil. In `App.tsx` krijgt elk onderdeel van Gezondheid zijn eigen kleur.
- **Ondergrond** `#000`, **tegels** `--surface #131315`, **invoer** `--surface-2`.
- **Tekst:** `#fff`; secundair `--text-2`; zwak `--text-3`. Op zwart halen alle drie minimaal 4,5:1.

## Typografie

- **Figtree Variable** voor alle tekst, vet gebruikt: koppen 800, labels 700.
- **Nunito Variable** voor cijfers (`.num`, `.figure`, `.huge`, `.big-input`), gewicht 800–900, met tabulaire cijfers. In de code heet deze variabele nog `--mono`; het is geen monospace.
- **Schaal:**
  - h1 2,125rem (paginatitel);
  - `.huge` 4rem (hoofdgetal in de hero);
  - `.figure` 2,5 / md 1,875 / sm 1,375.

## Componenten

- **`Hero`** (`src/components/ui.tsx`): gekleurde tegel met een optioneel `right`-vak (bijv. een witte ring). Een formulier mag ook een hero zijn (stappen, gewicht); de invoervelden passen zich daar automatisch aan.
- **`Rings`** (`src/components/Rings.tsx`): ringen die bij het openen vollopen. Boven 100% loopt een ring een tweede rondje.
- **Bento-tegels:** `.tile` + `.t-eten`, `.t-stappen`, `.t-sport`, `.t-gewicht`, `.t-roken`, `.t-geld`, `.t-hoofd`, of `.dark`.
- **Menubalk:** zwevend en pilvormig onderin (`.tabbar`). De actieve tab neemt de kleur van het onderdeel over.
- **Knoppen** zijn pillen (`.btn`); de primaire knop heeft het verloop van het accent. **Onderdeelknoppen** (`.segments`) zijn ook pillen; de actieve knop is gevuld met het accent.
- **Invoer** heeft geen rand: een donker vlak (`--surface-2`) dat bij focus een rand in de accentkleur krijgt.
- **Onderblad:** `Sheet` op `<dialog>`, met afgeronde bovenhoeken van 28px.

## Beweging

Alleen transform en opacity worden geanimeerd.

- **Tegels:** schuiven kort omhoog in (`tile-in`), op het startscherm licht na elkaar.
- **Ringen:** lopen in 1,3 s vol, cijfers tellen op met `CountUp`.
- **Tikken:** knoppen en tegels krimpen even naar 0,97.

Bij `prefers-reduced-motion` staat alle beweging uit.
