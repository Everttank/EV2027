# Getij — overdracht

Getij is een persoonlijke app voor gezondheid, geld en je hoofd. Het is een web-app (PWA) die je op je Android-beginscherm zet. Er is geen server en geen account: **alle data staat lokaal op je telefoon** (IndexedDB).

Dit document is geschreven voor jezelf én voor een (gratis) Claude die de app verder onderhoudt.

---

## 1. Eenmalig: de app online zetten (zonder te programmeren)

1. Maak op je **eigen** GitHub-account een nieuwe, lege repository aan, bijvoorbeeld `getij`. Privé mag; GitHub Pages werkt dan alleen met een betaald account, dus kies **Public** als je gratis wilt hosten. Er staan geen geheimen in de code.
2. Upload deze hele map, **behalve** `node_modules`, `dist` en `.env.local`:
   - met GitHub Desktop: map toevoegen → publish;
   - of in de terminal:
     ```
     git add . && git commit -m "Getij v0.1"
     git remote add origin https://github.com/<jouw-naam>/getij.git
     git push -u origin main
     ```
3. Ga in de repo naar **Settings → Pages → Source: GitHub Actions**.
4. Na een paar minuten staat de app op `https://<jouw-naam>.github.io/getij/`.
5. Open die link op je telefoon in Chrome en kies **⋮ → Toevoegen aan startscherm / App installeren**.
6. Ga in de app naar **Instellingen** en vul in:
   - je profiel (geslacht, geboortejaar, lengte, activiteit, doel);
   - je **Alpha Vantage-sleutel** (koersen) en **Twelve Data-sleutel** (wisselkoersen); beide gratis;
   - eventueel een pincode.

   Vul daarna bij **Gezondheid → Gewicht** je gewicht in. Pas dan kan de app je dagdoel berekenen.

Elke wijziging die je later op GitHub zet (ook via de webeditor) wordt automatisch opnieuw gebouwd en gepubliceerd. Je hebt daar geen Node of terminal voor nodig.

> **Back-up!** Omdat alles op je telefoon staat, verlies je data als je de sitegegevens van Chrome wist. Exporteer daarom af en toe een back-up via Instellingen → Back-up → Exporteren.

---

## 2. Wijzigingen laten maken door een gratis Claude

Een gratis Claude in claude.ai kan geen bestanden op je computer openen. Zo werk je ermee:

1. Start een nieuwe chat en plak **dit hele bestand** (HANDOFF.md) als eerste bericht, met de prompt hieronder.
2. Plak daarna alleen de bestanden die nodig zijn: kijk in de **bestandskaart** (sectie 3) welke.
3. Laat Claude het **volledige nieuwe bestand** teruggeven, niet alleen een stukje. Vervang het bestand op GitHub (potloodje → alles vervangen → Commit). De app wordt vanzelf opnieuw gepubliceerd.
4. Ging er iets mis? Kijk in de repo onder **Actions** of de build rood is. Plak de foutmelding in de chat.

### Startprompt (kopiëren)

```
Je helpt me met mijn persoonlijke app "Getij" (Vite + React 19 + TypeScript, PWA, data lokaal in
IndexedDB via Dexie, grafieken met Recharts, iconen van lucide-react). Hieronder staat HANDOFF.md
met de opbouw. Regels:
- Alle teksten in de app zijn Nederlands; getallen/bedragen via src/lib/format.ts.
- Gebruik de bestaande CSS-klassen en kleuren uit src/styles/app.css (geen nieuwe UI-bibliotheek,
  geen Tailwind). Iconen alleen uit lucide-react, geen emoji.
- Geef altijd het VOLLEDIGE bestand terug dat ik moet vervangen, en zeg welk pad het is.
- Verandert de database-structuur? Voeg dan een nieuwe db.version(n+1) toe in src/db/db.ts,
  wijzig nooit een bestaande versie (anders raak ik data kwijt).
- Rekenlogica hoort in src/lib/ (met een test in src/lib/lib.test.ts), schermen in src/features/.
Wat ik wil veranderen: <beschrijf hier je wens>
```

---

## 3. Bestandskaart: wat zit waar

| Wil je iets veranderen aan… | Plak deze bestanden |
|---|---|
| Kleuren, lettertypes, knoppen, de "waterlijn" | `src/styles/app.css` |
| Tabbladen onderin / pagina's toevoegen | `src/App.tsx` |
| Startscherm (Vandaag) | `src/features/vandaag/Vandaag.tsx` |
| Kcal-teller: dagbudget en lijst | `src/features/gezondheid/Eten.tsx` |
| Eten toevoegen: zoeken, scannen, nieuw product | `src/features/gezondheid/AddFood.tsx`, `src/features/gezondheid/foodData.ts` |
| Vaste gerechten | `src/features/gezondheid/Meals.tsx`, `src/features/gezondheid/foodData.ts` |
| Dagdoel- of macroberekening | `src/lib/nutrition.ts` |
| Stappen (en het doel van 8.000) | `src/features/gezondheid/Stappen.tsx` |
| Sporten / lijst met sporten en MET-waarden | `src/features/gezondheid/Sport.tsx`, `src/lib/met.ts` |
| Gewicht, grafiek, streefgewicht | `src/features/gezondheid/Gewicht.tsx`, `src/lib/weight.ts` |
| Stoppen met roken | `src/features/gezondheid/Roken.tsx`, `src/lib/smoking.ts` |
| ABN AMRO-import | `src/lib/abn.ts` |
| Categorieën van uitgaven | `src/lib/categories.ts` |
| Rekeningen-scherm | `src/features/financien/Rekeningen.tsx` |
| Portfolio-scherm, overige bezittingen | `src/features/financien/Portfolio.tsx`, `src/lib/portfolio.ts` |
| DeGiro-import | `src/lib/degiro.ts`, `src/features/financien/degiroImport.ts` |
| Zelf een positie toevoegen | `src/features/financien/AddPosition.tsx` |
| Koersbronnen (Alpha Vantage / Twelve Data / CoinGecko) | `src/lib/prices/index.ts`, `alphavantage.ts`, `twelvedata.ts`, `coingecko.ts` |
| Mentale check-in (minimaal aantal tekens, vragen) | `src/features/mentaal/Mentaal.tsx` |
| Instellingen, pincode, herinneringen, back-up | `src/features/instellingen/Instellingen.tsx`, `src/lib/pin.ts`, `src/lib/reminders.ts`, `src/db/backup.ts` |
| Database-tabellen | `src/db/db.ts` (+ `src/db/hooks.ts`) |
| Voorbeelddata | `src/db/demo.ts` |
| Gedeelde onderdelen (onderblad, toasts, telanimatie) | `src/components/ui.tsx`, `src/components/charts.tsx` |
| App-naam, icoon, snelkoppelingen bij lang indrukken | `vite.config.ts`, `public/icon.svg` |

---

## 4. Hoe het werkt (kort)

- **Opslag:** Dexie (IndexedDB), schema in `src/db/db.ts`. Schermen lezen live via `useLiveQuery` en verversen vanzelf.
- **Navigatie:** hash-routes (`#/gezondheid/eten`), zie `src/lib/router.ts`. Werkt op elke statische host.
- **Kcal-doel:** Mifflin-St Jeor × activiteitsfactor ± doel (−500 afvallen / +300 aankomen). Sport-kcal (MET × kg × uur) komen bij het dagbudget. Macro's: eiwit 1,8 g/kg (2,0 bij afvallen), vet 25%, de rest koolhydraten.
- **Barcode:** de ingebouwde `BarcodeDetector` van Chrome, met ZXing als reserve. Producten komen uit Open Food Facts en worden lokaal bewaard, dus de tweede keer werkt het ook offline. De camera werkt alleen via https of localhost.
- **Koersen:**
  - Aandelen en ETF's via **Alpha Vantage** (ook Euronext, bijv. VWRL.AMS). Gratis: 25 aanvragen per dag en 1 per seconde. De app telt zelf mee en bewaart koersen 2 uur en de historie een dag. De gratis historie is ~100 handelsdagen; de app bewaart elke dagkoers, dus de grafiek groeit vanzelf.
  - Koppelen (zoeken op ISIN of naam) gaat via de gratis zoekfunctie van Twelve Data, zonder sleutel. Wisselkoersen via Twelve Data met sleutel. Het gratis Twelve Data-abonnement geeft zelf **geen** Europese koersen, daarom Alpha Vantage.
  - Crypto via CoinGecko (geen sleutel; historie maximaal 365 dagen).
  - Koersen in een andere munt worden omgerekend naar euro's. Voor de historie gebeurt dat tegen de huidige wisselkoers, dus dat is een benadering.
  - Zonder live koers val je terug op de handmatige koers of de aankoopprijs.
- **Portfoliografiek:** wordt teruggerekend uit de koershistorie vanaf je aankoopdatum. De stippellijn is wat je hebt ingelegd.
- **ABN AMRO:**
  - Je importeert de **TXT-export** (tab-gescheiden, 8 kolommen: rekening, munt, datum, beginsaldo, eindsaldo, rentedatum, bedrag, omschrijving).
  - Dubbel importeren maakt geen dubbele regels.
  - Categorieën gaan via trefwoorden. Jouw eigen correcties ("altijd") worden regels die voorgaan.
- **Pincode:** er wordt alleen een SHA-256-hash bewaard. Dit is een slot tegen meekijkers, géén versleuteling.
- **Herinneringen:** zonder server kan een web-app geen betrouwbare push sturen. De app geeft een melding als hij openstaat of geopend wordt na het ingestelde tijdstip.
- **Stappen:** een web-app kan Health Connect of Google Fit niet uitlezen, dus je vult ze zelf in. Lang indrukken op het app-icoon → "Stappen invullen" brengt je er direct.

---

## 5. Lokaal draaien (optioneel, met Node 20+)

```
npm install
npm run dev        # http://localhost:5173
npm test           # rekenlogica-tests
npm run build      # productieversie in dist/
```

Voor lokale koersen zonder de sleutel in de app te plakken: kopieer `.env.example` naar `.env.local` en vul `VITE_TWELVE_DATA_KEY` in. Dit werkt alleen in ontwikkelmodus en komt nooit in de gebouwde app.

---

## 6. Bekende open punten

- **ABN AMRO-import is nog niet getest met een echte export.** Gebouwd op het gedocumenteerde TXT-formaat. Gaat de import mis, plak dan (geanonimiseerd) 3 regels van je export samen met `src/lib/abn.ts` in de chat. De categorieën verdienen ook een ronde bijschaven op basis van je echte omschrijvingen.
- **Koersen:** getest op 14-11-2026: VWRL.AMS en IWDA.AMS werken via Alpha Vantage (gratis). Twelve Data gratis geeft geen Euronext. Koersen van beurzen buiten Amsterdam/Xetra/Londen/VS zijn niet getest.
- **DeGiro-import** is getest met een nagemaakt bestand in het DeGiro-formaat, nog niet met een echte export.
- De crypto-historie gaat maximaal 365 dagen terug (beperking van het gratis CoinGecko).
- Geen sync tussen apparaten; dat is bewust zo gekozen. Wil je dat later toch, dan is Supabase de logische volgende stap.
