# Backflip su Codex CLI

Pagrindinis agentas — OpenAI Codex CLI. Claude Code palaikymas paliktas.
Šis vadovas nekeičia programos AI tiekėjo, duomenų bazės, diegimo ar produkcijos nustatymų.

## Paruošimas

Reikia Git, veikiančio Docker Desktop, Node ≥20 ir Corepack; CI naudoja Node 24.
Projekto paketų tvarkyklė — `corepack yarn`, prisegta 4.17.1.
Codex CLI įdiek pagal [oficialią diegimo dokumentaciją](https://developers.openai.com/codex/cli), pavyzdžiui `npm install -g @openai/codex`.
Ši npm komanda skirta tik atskiram CLI įrankiui, ne projekto priklausomybėms.
Prisijunk per `codex login`; Codex prisijungimas atskiras nuo Backflip naudotojo ir programos AI integracijų.
Prisijungimo duomenų nekopijuok į projekto env failus ar Git.

Iš projekto šaknies:

```bash
codex --version
codex --help
git status --short
codex --sandbox workspace-write --ask-for-approval on-request
```

CLI vėliavos patikrintos vietiniame `codex-cli 0.166.0`.
Kitose versijose tikrink `codex --help` ir oficialią dokumentaciją.
Codex perskaito `AGENTS.md`; pirmoje užduotyje paprašyk patikrinti taikomas taisykles ir įgūdžių sąrašą.
Naujai pridėjus įgūdžius pradėk naują sesiją, jei jų nematyti.

## Claude ir Codex darbo eigų atitikmenys

| Esama darbo eiga | Codex atitikmuo / sprendimas |
|---|---|
| `CLAUDE.md` projekto instrukcijos | Išplėstas `AGENTS.md`; Codex nereikia pasikliauti automatiniu `CLAUDE.md` įkėlimu. |
| `.claude/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` adapteriai su `name` ir `description`; bendras turinys lieka Claude šaltinyje. |
| Claude įgūdžio iškvietimas | Codex sesijoje `/skills` arba `$dev-workflow`, `$docs-sync`, `$commit`, `$digitalocean-devops`. |
| `AskUserQuestion` | Įprastas klausimas arba sesijoje prieinamas klausimų įrankis. |
| Claude hooks ir vietiniai leidimai | Automatiškai neperkeliami; jokie Codex hooks šiame pakeitime neįdiegti. |
| Claude MCP konfigūracija | Jei reikia, sukonfigūruok atskirai per `codex mcp`; nekeisk programos MCP prieigos dėl agento keitimo. |
| Kodo peržiūra prieš commit / PR | Interaktyvi peržiūros užduotis arba `codex review --uncommitted`; vėliau `codex review --base master`. |

Versijuojamame `.claude/` yra keturi įgūdžiai ir `docs-sync` šablonai; perkeliamų projekto hooks nerasta.
Ignoruojami asmeniniai Claude nustatymai neimportuojami ir nelaikomi bendros darbo eigos dalimi.
Codex turi savo [hooks sistemą](https://learn.chatgpt.com/docs/hooks); tai nėra Claude nustatymų suderinamumo garantija.
[Įgūdžių dokumentacija](https://learn.chatgpt.com/docs/build-skills) ir [AGENTS.md taisyklės](https://developers.openai.com/codex/guides/agents-md) aprašo atskirus atradimo mechanizmus.
Adapteriai yra paprasti Markdown failai, ne symlink; šaltinių ir jų `references/` nedubliuoja.
Jie priklauso nuo repozitorijoje išlikusių `.claude/skills/` failų.

## Vietinis paleidimas

Pirmą kartą vadovaukis [README](../README.md#run-it-locally).
Toliau pateiktos kopijavimo komandos skirtos tik dar neegzistuojantiems failams; esamų neperrašyk.

```bash
cp .env.example .env
cp .env.init.example .env.init
```

Vietoje redaguok `.env` ir `.env.init`; sukurk `.env.local` su `AUTH_SECRET` ir `AUTH_TRUST_HOST=true`.
Paslapčių generavimo komandos ir kintamųjų paskirtis — README; reikšmių nepateik pokalbyje ar loguose.
`ADMIN_*` skirti vienkartiniam owner seed; `AUTH_*` — vykdymo aplinkai.

```bash
corepack yarn install --immutable
docker compose up -d
corepack yarn db:migrate
corepack yarn init-owner
corepack yarn dev
```

Migracija ir owner seed keičia vietinę DB: vykdyk tik sąmoningai paruošdamas vietinę aplinką.
Programa: `http://localhost:3070`; prisijungimas: `http://localhost:3070/backflip/login`; PostgreSQL: 5544.
Pakeitus `AUTH_*` paleisk dev serverį iš naujo; pakeitus seed reikšmes seed kartojamas tik prireikus.
Anoniminė paleidimo telemetrija lieka įjungta pagal projekto taisykles.

## Funkcionalumo kūrimas ir dokumentacija

Pradėk nuo švarios, apžiūrėtos darbo būsenos ir atskiros aprašomosios šakos nuo tinkamos `master` bazės.
Neprarask jau esančių naudotojo pakeitimų.

Pavyzdinė Codex užduotis:

> Naudok $dev-workflow ir $docs-sync. Perskaityk L1, susijusius L2 bei L3.
> Įgyvendink <funkcionalumas>, atnaujink dokumentaciją ir @spec žymas, peržiūrėk diff,
> paleisk tinkamas patikras. Kol kas nedaryk commit, push ar diegimo.

L1 nekeičiamas; L2 atnaujinamas savarankiškai, išskyrus reikšmingą neišspręstą dviprasmybę; L3 atnaujinamas kartu su kodu.
Seni L2 ir šablonų patvirtinimo tekstai bei `docs-sync` L1 registro išimtis nesutampa su `CLAUDE.md` draudimu keisti L1.
Codex adapteris šiuos skirtumus išsprendžia pagal `AGENTS.md`; originalūs Claude failai nepakeisti.
Prieš Next.js kodo pakeitimus skaityk susijusias įdiegtos versijos gaires `node_modules/next/dist/docs/`.

## Testavimas ir peržiūra

```bash
git diff --check
corepack yarn typecheck
corepack yarn lint
corepack yarn workspace web test
```

Kodo pakeitimams parink aktualius testus; prieš PR atlik tipų ir lint patikras.
Kai aktualus surinkimas: `corepack yarn build` (web build taip pat generuoja dokumentacijos indeksą).
`corepack yarn format` perrašo failus; naudok tik sąmoningai formatuodamas pakeistą kodą.
Vien dokumentacijos pakeitimui pakanka diff, nuorodų ir įgūdžių struktūros peržiūros; DB ir serverio paleidimas nereikalingi.

E2E atskiras žingsnis:

```bash
docker compose up -d
corepack yarn workspace web exec playwright install chromium
corepack yarn workspace web test:e2e
# pasirinktinai
corepack yarn workspace web test:e2e:screenshots
```

E2E setup sukuria/migruoja `backflip_test`, išvalo testų auth lenteles ir įrašo fixtures; dev DB `backflip` neliečiama.
Serveris naudoja 3170 ir `.next-e2e`, ekranvaizdžiai — `.screenshots/`, 1200×720.
Patikrink paskirtį prieš vykdymą; testų URL nekeisk į dev ar produkciją.
Šaltiniai: [testavimo kontraktas](contracts/testing.md), [užrašai](notes/testing.md).

```bash
codex review --uncommitted
git diff --stat
git diff
git status --short
```

Peržiūrėk ir naujus, dar nesekamus failus: `git diff` jų turinio nerodo.
AI peržiūra nepakeičia testų ir žmogaus PR peržiūros.

## Commit ir pull request

Commit, push ir PR publikavimas vykdomi tik gavus užduotį, kuri juos apima.
Prieš tai pateik rezultatą, pakeistus failus, dokumentacijos pokyčius ir realius patikrų rezultatus.

- Commit ir PR pavadinimas: `type(scope): subject`, viena eilutė; commit be kūno ir prierašų.
- PR aprašymas: konkretus pakeitimas, patikros ir likę apribojimai.
- Jokios AI autorystės, sesijų nuorodų ar `Co-Authored-By` Git artefaktuose.
- `feat` — minor; `fix`/`perf`/`revert` — patch; breaking — `type(scope)!:`; dokumentacijos pakeitimui tinka `docs`.
- PR bazė — `master`; squash commit pavadinimas ateina iš PR pavadinimo.
- Versijų ir žymų rankomis nekeisk.

Kai publikavimas autorizuotas, naudok įprastą Git feature šakos push ir GitHub PR sąsają arba įdiegtą bei autentifikuotą `gh`.
Prieš merge patikrink PR diff ir CI rezultatus; merge nėra vietinių patikrų dalis.
Push į `master` gali automatiškai paleisti Drone diegimą ir GitHub semantic-release.
Esamas Drone `ci` vykdo install, typecheck, lint ir versijos patikrą; jis neįjungia unit/E2E automatiškai ir nestabdo lygiagretaus deploy.
Diegimo darbams atskirai skaityk [devops.md](../devops.md); šis pritaikymas CI ir diegimo nekeičia.

## Patikrinimo ribos šiame pakeitime

Patikrintos CLI `--help`, `--version` ir `review --help` komandos.
Aplinkoje nėra `node`, `corepack` ir įdiegtų Next.js gairių, todėl programos testai, lint, typecheck ir build nepaleisti.
Pilna interaktyvi Codex įgūdžių atradimo sesija ir prisijungimas netikrinti; patikrink `/skills` savo vietinėje CLI sesijoje.

`git diff --check`, vietinių Markdown nuorodų patikra ir keturių adapterių bazinės frontmatter struktūros patikra praėjo.
Patikrinta, kad pradinės AGENTS.md taisyklės išliko pažodžiui ir Claude, L1, programos bei CI failai nepakeisti.
Oficialus `skill-creator` `quick_validate.py` nepasileido, nes Python aplinkoje nėra `PyYAML`; bazinė struktūros patikra jo pilnai nepakeičia.
