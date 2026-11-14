# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript als installeerbare PWA, zonder server. Opslag lokaal in IndexedDB (Dexie). Gekozen door Claude (gedelegeerd) omdat een gratis Claude-account in claude.ai-chat een klein, getypeerd project zonder backend kan onderhouden.

## Users

Eén persoon: de eigenaar zelf. Gebruikt de app dagelijks op een Android-telefoon, meestal kort (invullen in een paar tikken), soms langer om terug te kijken naar trends.

## Product Purpose

Een persoonlijk dagboek van lichaam, geld en hoofd in één app. Succes = dagelijks invullen kost minder dan een minuut en de trends worden zichtbaar zonder moeite.

## Positioning

Geen account, geen server, geen advertenties: alles staat op de eigen telefoon. Drie levensgebieden in één overzicht, en een mentale check-in die je dwingt je gedachten op te schrijven in plaats van alleen een cijfer te geven.

## Operating Context

- Dagelijks: eten loggen (vaste gerechten, barcode scannen), stappen invullen, sporten, check-in.
- Wekelijks of minder vaak: gewicht, ABN AMRO-export importeren, portfolio bekijken.
- Live koersen: Twelve Data (eigen gratis API-sleutel, ingevuld in Instellingen) voor aandelen/ETF's, CoinGecko voor crypto.
- Overdracht: de eigenaar onderhoudt de app later met een gratis Claude-account (zie HANDOFF.md).

## Capabilities and Constraints

- Gezondheid: kcal + macro's met berekend dagdoel (Mifflin-St Jeor), vaste gerechten uit ingrediënten, barcode scannen via Open Food Facts, stappen handmatig (een web-app kan Health Connect niet uitlezen), sporten met kcal-schatting via MET × gewicht × duur, gewicht met streefgewicht en 7-daags gemiddelde, rookvrij-teller met geld bespaard.
- Financiën: betaal- en spaarrekening via ABN AMRO TAB-export, categorieën via regels op de omschrijving; portfolio per positie (aantal + aankoopprijs + datum), live koersen, donut met verdeling, historische waardegrafiek.
- Mentaal: eigen onderwerpen gescoord van 1-10, verplicht tekstveld (min. 50 tekens), trendgrafiek.
- Overig: vandaag-overzicht, pincode-slot (geen echte encryptie), herinneringen (best effort, geen server-push), JSON-export en -import.
- De taal is Nederlands, met getallen, bedragen en datums in de Nederlandse notatie.

## Evidence on Hand

Nog geen echte ABN AMRO-export ontvangen; de categorieregels zijn een eerste opzet en worden aangepast zodra de export binnen is.

## Product Principles

1. Invullen moet snel gaan: de meest gebruikte handeling zit maximaal twee tikken diep.
2. De data is van de eigenaar: lokaal, exporteerbaar, nooit naar een eigen server.
3. Eerlijk over beperkingen: wat een web-app niet kan (stappen live, betrouwbare push), zegt de app gewoon.
4. Rustig, geen dashboard-ruis: één getal per kaart dat ertoe doet.
