# Getij online zetten — instructies voor een AI-assistent

> **Voor de eigenaar:** geef dit bestand aan een AI die op deze laptop een terminal heeft **en** is ingelogd op je **persoonlijke** GitHub, bijvoorbeeld Claude Code. Plak het samen met het bericht onderaan.
> Een AI in alleen een browserchat (zonder terminal) kan dit niet; volg dan zelf "Handmatig" onderaan.

---

## Opdracht

Zet de app in deze map (`C:\Users\stude\persoonlijke-app`) als **openbare** repository `getij` op het **persoonlijke** GitHub-account van de eigenaar. Zet GitHub Pages aan via GitHub Actions en lever het werkende adres op.

### Harde regels

- Gebruik **nooit** het GitHub-account `surfagency`; dat is een werkaccount. Staat dat account actief, voeg dan het persoonlijke account toe en wissel ernaar (stap 1), en zet het aan het eind weer terug (stap 7).
- Commit **nooit** `.env.local`, `dist/`, `node_modules/` of `getij-app.zip`. Die staan al in `.gitignore`; controleer het in stap 2.
- Zet geen API-sleutels in code, commits, issues of workflow-bestanden. De app krijgt de sleutels pas op de telefoon, via Instellingen.

### Stappen

**1. Juiste GitHub-account**

```bash
gh auth status
```

- Is het actieve account niet het persoonlijke account van de eigenaar, laat de eigenaar dan zelf inloggen: `gh auth login`. Vraag de eigenaar om het in te typen; doe het interactieve inloggen niet zelf.
- Wissel daarna naar dat account: `gh auth switch --user <persoonlijke-gebruikersnaam>`.
- Controleer het met `gh api user --jq .login`. Komt daar `surfagency` uit, **stop** dan en vraag de eigenaar om hulp.

**2. Controleren wat er online komt**

```bash
cd C:/Users/stude/persoonlijke-app
git status --short
git check-ignore .env.local dist node_modules getij-app.zip   # alle vier moeten verschijnen
```

Zoek ook in de bestanden die gecommit gaan worden naar iets wat op een API-sleutel lijkt (lange willekeurige tekenreeksen in `src/`, `*.json` of `.github/`). Vind je er een, **stop** dan en meld het.

**3. Tests en build moeten slagen**

```bash
npm ci
npm test
npm run build
```

Faalt iets, repareer dan niets op eigen houtje: meld de foutmelding aan de eigenaar.

**4. Eerste commit** (de branch heet al `main`)

```bash
git add -A
git commit -m "Getij v0.1"
```

**5. Repository aanmaken en pushen**

```bash
gh repo create getij --public --source . --remote origin --push --description "Persoonlijke app: gezondheid, geld en mentale check-in (PWA)"
```

Bestaat `getij` al, kies dan `getij-app` en meld dat aan de eigenaar.

**6. GitHub Pages aanzetten en wachten op de eerste uitrol**

```bash
gh api -X POST repos/{owner}/getij/pages -f build_type=workflow   # {owner} = persoonlijke gebruikersnaam
gh workflow run deploy.yml
gh run watch                                                        # wacht tot de run klaar is
```

- Faalt de eerste run omdat Pages nog niet aan stond, start hem dan opnieuw met `gh workflow run deploy.yml`.
- Controleer daarna dat `https://<owner>.github.io/getij/` een **200** geeft en de titel "Getij" bevat.

**7. Account terugzetten**

```bash
gh auth switch --user surfagency
```

Dit is het werkaccount van de eigenaar en moet weer het standaardaccount zijn.

**8. Opleveren aan de eigenaar**

Meld:
- het adres (`https://<owner>.github.io/getij/`);
- het repo-adres;
- dat de tests en de uitrol groen waren, of wat er misging.

Geef ook de stappen voor op de telefoon hieronder.

---

## Op de telefoon (voor de eigenaar)

1. Open het adres in **Chrome** op je Android → ⋮ → **App installeren**.
2. Open Getij → **Instellingen**:
   - **Koersen:** vul de Alpha Vantage-sleutel (koersen) en de Twelve Data-sleutel (wisselkoersen) in en druk bij elk op **Testen**.
   - **Profiel:** geboortejaar, lengte, activiteit, streefgewicht en tempo.
3. Vul bij **Gezondheid → Gewicht** je gewicht in. Daarna rekent de app je dagbudget uit.
4. Laad bij **Financiën → Portfolio** je DeGiro-transactie-export, en bij **Rekeningen** je ABN AMRO-export.
5. Data van de laptop overzetten: kies op de laptop Instellingen → Back-up → **Exporteren** en op de telefoon **Terugzetten**.

## Later iets veranderen

Elke push naar `main` (ook een bewerking in de GitHub-webeditor) bouwt de app opnieuw en zet hem online. De app op je telefoon werkt zichzelf bij de volgende keer openen bij. Hoe je wijzigingen laat maken met een gratis Claude staat in `HANDOFF.md`.

---

## Handmatig (zonder AI)

1. Maak op github.com een nieuwe **openbare** repository `getij` aan, zonder README.
2. Zet de map erin met GitHub Desktop (File → Add local repository → Publish), of in de terminal:
   ```bash
   git add -A && git commit -m "Getij v0.1"
   git remote add origin https://github.com/<jij>/getij.git
   git push -u origin main
   ```
3. Ga in de repo naar Settings → Pages → Source: **GitHub Actions**.
4. Kijk bij **Actions** tot de run groen is. Je app staat dan op `https://<jij>.github.io/getij/`.

---

### Bericht om mee te plakken

```
Lees DEPLOY.md in C:\Users\stude\persoonlijke-app en voer de stappen uit.
Gebruik mijn persoonlijke GitHub-account, nooit "surfagency".
Vraag me om in te loggen als dat nodig is, en lever aan het eind het adres op.
```
