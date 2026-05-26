<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>Vidi šta tvoj AI zaista radi.</strong></p>
<p align="center">
  Strimovanje tokena u realnom vremenu, analiza kvaliteta, profilisanje performansi i praćenje troškova<br/>
  za lokalne LLM-ove. Bez clouda. Bez API ključeva. Bez troškova.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llmxray"><img src="https://img.shields.io/npm/v/llmxray?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://hub.docker.com/r/djovaneli/llmxray"><img src="https://img.shields.io/docker/pulls/djovaneli/llmxray?color=2496ED&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/ollama-local-000?logo=ollama&logoColor=white" alt="Ollama" />
</p>

<p align="center">
  🌐 <a href="README.md">English</a> &bull;
  <a href="README.fr.md">Français</a> &bull;
  <a href="README.zh-CN.md">中文</a> &bull;
  <a href="README.ar.md">العربية</a> &bull;
  <strong>Srpski</strong>
</p>

<p align="center">
  <a href="#brzi-start">Brzi start</a> &bull;
  <a href="#mogućnosti">Mogućnosti</a> &bull;
  <a href="#snimci-ekrana">Snimci ekrana</a> &bull;
  <a href="#kome-je-namenjeno">Kome je namenjeno</a> &bull;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="docs/public/screenshots/demo.gif" alt="LLMxRay demo — strimovanje tokena u realnom vremenu sa bojenjem prema poverenju" width="800" />
</p>

---

## Brzi start

**Jedna komanda. 30 sekundi.**

```bash
npx llmxray
```

Ili sa Docker-om:

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

Otvori **http://localhost:5174** i počni razgovor. To je sve.

> **Preduslov:** [Ollama](https://ollama.com/download) pokrenut lokalno sa bar jednim povučenim modelom (`ollama pull llama3.2`).

---

## Zašto LLMxRay?

Pokrenuo si lokalni LLM. Razgovaraš sa njim. Ali šta se zaista desilo?

- Koliko je svaki token bio brz? U koje je model bio siguran?
- Da li kvalitet odgovora opada tokom dugih razgovora?
- Koliko bi ovo koštalo da si ga pokrenuo u cloudu?
- Da li se model ponavlja? Odbija? Generiše besmislice?
- Kako se temperatura 0.3 poredi sa 0.9 na *istom* promptu?

**LLMxRay odgovara na sve ovo — vizuelno, u realnom vremenu, besplatno.**

---

## Mogućnosti

### Razgovor u realnom vremenu sa inteligencijom tokena
Pričaj sa bilo kojim Ollama modelom i posmatraj tokene kako pristižu sa **bojenjem prema poverenju** — svaki token je obojen prema brzini generisanja. Podržava Markdown, razgovore u više rundi, priloge datoteka, vision modele i slash komande.

### Kapije kvaliteta odgovora
Svaki odgovor se automatski analizira. Obojene oznake se pojavljuju samo kada nešto nije u redu:
- **Ponavljanje** — preterano ponavljanje fraza (4-gram analiza)
- **Odbijanje** — "kao AI jezički model" i još 7 obrazaca
- **Besmislice** — visok udeo ne-ASCII karaktera
- **Prazno** — manje od 10 reči
- **Sečenje** — dostigao limit tokena bez završetka

### Radionica za poređenje modela
Do **4 slota** sa nezavisnim modelom, temperaturom i sistemskim promptom. Mogućnosti uključuju strimovanje uporedo, isticanje razlika na nivou reči, poređenje metrika i jedno-klik preset-e (Temperature Sweep, Deterministic Pair, Language Compare sa vizualizacijom Token Tax-a).

### Analitika performansi
- **Percentili latencije** (P50/P95/P99) za trajanje i TTFT
- **Inteligencija grešaka** — klasifikator sa 7 kategorija i vremenska osa
- **Toplotna mapa korišćenja** — 7×24 mreža tvojih aktivnih sati
- **Uticaj podešavanja** — scatter dijagrami temperature naspram tokena/sec
- Praćenje **hladnog i toplog starta** sa istorijom učitavanja modela

### Tabla troškova
Potrošnja tokena po modelu/danu sa procenom ekvivalentne cene u cloudu. Vidi koliko *štediš* tako što pokrećeš lokalno.

### Hirurški benchmark
Testiraj znanje modela skupovima pitanja sa višestrukim izborom. Koristi prave logprobs preko OpenAI-kompatibilnog endpointa za tačno merenje poverenja. Pravi custom skupove vizuelno ili pusti AI da ih generiše iz teme.

### Embeddings Lab i RAG pipeline
Embeduj tekst, vizualizuj vektore, meri kosinusnu sličnost. Izgradi lokalnu bazu znanja iz PDF, DOCX i CSV fajlova — podeljeno na delove, embedovano i pretraživo. Sve smešteno u IndexedDB. Bez troškova.

### Tool Workshop (vizuelno platno)
Drag-and-drop platno sa čvorovima za pravljenje definicija alata. Dvosmerna sinhronizacija koda (uređuj čvorove ili TypeScript — oba se ažuriraju). Sondiraj API-je, automatski generiši šeme, testiraj uživo.

### Fill-in-the-Middle Playground *(novo u v0.4.7)*
Dopuna koda za Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder i StarCoder. Dva polja (prefiks / sufiks), model popunjava prazninu. Koristi Ollama `suffix` polje na `/api/generate`. Spojeni pregled pokazuje rezultat kao što bi izgledao u tvom editoru.

### Protocol Observatory *(novo u v0.4.7)*
Pošalji isti prompt kroz tri Ollama protokola posluživanja — **nativni** `/api/chat`, **OpenAI-compat** `/v1/chat/completions` i **Anthropic-compat** `/v1/messages` — paralelno protiv tvog lokalnog modela. Strimovanje uporedo, metrike po protokolu i tab za poređenje envelope-a koji pokazuje kako svaki protokol uobličava razloge završetka, brojeve tokena i envelope grešaka. Bez clouda, bez API ključeva — sva tri endpointa su lokalna na `localhost:11434`.

### AI Training Pipeline
Pripremi podatke za obuku iz svojih razgovora. Označavaj, pregledaj i izvozi kao JSONL za fine-tuning.

### Lokalna AI baza istorije
Svaki eksperiment (benchmark-i, poređenja, razgovori, parovi za obuku) se automatski arhivira u pretraživu IndexedDB bazu sa filterima, trendovima, izvozom i pravilima zadržavanja.

### Višejezičnost
Potpuni prevodi na engleskom, francuskom, srpskom (latinica + ćirilica), kineskom i arapskom. Podrška za RTL raspored. Skele zajednice za hebrejski i japanski.

---

## Ollama kompatibilnost

Testirano i verifikovano sa **Ollama 0.24.0** (trenutno najnovija stabilna verzija u maju 2026). LLMxRay koristi sledeće Ollama endpointe:

| Endpoint | Za šta se koristi |
|---|---|
| `/api/chat` | Strimovan chat (NDJSON, sa `tools`, `think`, `format` schema) |
| `/api/generate` | Generisanje + Fill-in-the-Middle preko `suffix` |
| `/api/tags`, `/api/show` | Lista modela + detekcija sposobnosti (`thinking`, `tools`, `vision`) |
| `/api/embed` | Vektorski embeddings za RAG |
| `/api/pull`, `/api/delete`, `/api/ps`, `/api/version` | Upravljanje modelima + status |
| `/v1/chat/completions` | OpenAI-compat putanja koju Surgical Benchmark koristi za prave logprobs |
| `/v1/messages` | Anthropic-compat putanja koju koristi Protocol Observatory |

**Kompatibilno sa:** Ollama 0.20 i novijim (starije verzije rade za chat/generate, ali nemaju `think` i JSON-schema `format`). **Preporučeno:** Ollama 0.24+ za potpunu paritetnost funkcija, uključujući Anthropic-compat endpoint (dodat u 0.23) i `think: "max"` režim (dodat u 0.21.3).

---

## Snimci ekrana

<table>
<tr>
<td width="50%">

**Chat sa strimovanjem tokena i poverenjem**
![Chat](docs/public/screenshots/chat-diagnostics.png)

</td>
<td width="50%">

**Poređenje modela — uporedo**
![Compare](docs/public/screenshots/compare-sidebyside.png)

</td>
</tr>
<tr>
<td width="50%">

**Detaljni pregled sesije — metrike i tajming**
![Session](docs/public/screenshots/session-details.png)

</td>
<td width="50%">

**Benchmark sa radarom poverenja**
![Benchmark](docs/public/screenshots/benchmark.png)

</td>
</tr>
<tr>
<td width="50%">

**Embeddings — kosinusna sličnost**
![Embeddings](docs/public/screenshots/embed-similarity.png)

</td>
<td width="50%">

**Monitor sistema — hardver i Ollama status**
![System](docs/public/screenshots/my-system.png)

</td>
</tr>
</table>

---

## Kome je namenjeno

| Ti si... | LLMxRay ti pomaže da... |
|---|---|
| **Developer** | Debaguješ promptove, profilišeš latenciju, porediš modele, pregledaš tool pozive, pratiš troškove |
| **Istraživač** | Pokrećeš kontrolisane eksperimente sa konzistentnim podešavanjima kroz modele i temperature |
| **Student / Edukator** | Istražuješ ponašanje modela vizuelno — ugrađeni Educators Kit sa 9 interaktivnih modula |
| **Vođa AI tima** | Razumeš trendove kvaliteta, obrasce grešaka i potrošnju resursa kroz svoju lokalnu flotu |

---

## Opcije instalacije

### npx (preporučeno)
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
```

### Docker
```bash
docker run -p 5174:5174 djovaneli/llmxray
docker run -p 5174:5174 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### Iz izvornog koda
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## Tehnološki stek

| Sloj | Tehnologija |
|---|---|
| Framework | Vue 3.5 + Composition API |
| Jezik | TypeScript 5.9 (strict) |
| Build | Vite 7.3 |
| Stilizovanje | Tailwind CSS 4.2 |
| State | Pinia 3 (store po domenu) |
| Grafici | Chart.js 4, D3.js 7 |
| Canvas | Vue Flow (vizuelni node editor) |
| Editor koda | CodeMirror 6 |
| Skladištenje | IndexedDB (nativan u browseru) |
| LLM Backend | Ollama (lokalno) |

---

## Arhitektura

**Strimovanje** — Čita Ollama NDJSON preko `fetch()` + `ReadableStream`. Tokeni reaktivno ažuriraju UI kroz Pinia store-ove.

**Poverenje tokena** — Aproksimirano iz latencije između tokena (brže = sigurnije). Jasno označeno kao aproksimacija. Benchmark-i koriste prave logprobs preko OpenAI-kompatibilnog endpointa.

**Store po domenu** — Svaki domen ima svoj Pinia store: tokens, sessions, metrics, reasoning, comparison, embeddings, quality, cost i drugi.

**Detekcija hardvera** — Custom Vite plugin direktno ispituje OS (PowerShell/proc/sysctl) za tačne hardverske specifikacije.

---

## Razvoj

| Komanda | Šta radi |
|---|---|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Provera tipova + production build |
| `npm run test` | Unit testovi (Vitest) |
| `npm run test:e2e` | End-to-end (Playwright) |

---

## Doprinosi

Doprinosi su dobrodošli! Pogledaj [CONTRIBUTING.md](CONTRIBUTING.md) za podešavanje i smernice.

**Prevodi zajednice su posebno dobrodošli** — skele su spremne za hebrejski i japanski.

---

## Licenca

[Apache License 2.0](LICENSE)

## Žig

**LLMxRay** je žig Ivana Stankovića ([LogneBudo](https://github.com/LogneBudo)). Pogledaj [TRADEMARK.md](TRADEMARK.md).

---

<p align="center">
  <strong>Ako ti LLMxRay pomaže da bolje razumeš svoj AI, razmisli da daš zvezdicu.</strong><br/>
  To pomaže drugima da otkriju projekat.
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>
