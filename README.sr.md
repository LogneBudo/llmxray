<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>Vidite šta vaša lokalna AI zaista radi.</strong></p>
<p align="center">
  Jedna komanda, jedna kartica u pregledaču. Strimovanje token po token, dijagnostika keša, poređenje modela, benchmark i praćenje troškova<br/>
  za modele koji rade na vašoj mašini kroz Ollama. Bez clouda. Bez API ključeva. Bez troška.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llmxray"><img src="https://img.shields.io/npm/v/llmxray?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://hub.docker.com/r/djovaneli/llmxray"><img src="https://img.shields.io/docker/pulls/djovaneli/llmxray?color=2496ED&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/ollama-0.40.x-000?logo=ollama&logoColor=white" alt="Ollama" />
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
  <a href="#šta-vam-llmxray-pokazuje">Šta vam pokazuje</a> &bull;
  <a href="#kome-je-namenjeno">Kome je namenjeno</a> &bull;
  <a href="#instalacija">Instalacija</a> &bull;
  <a href="#ollama-kompatibilnost">Ollama kompatibilnost</a> &bull;
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/demo.gif" alt="LLMxRay demo: odgovor u ćaskanju stiže token po token, zatim metrike sesije" width="800" />
</p>

---

## Brzi start

Potreban vam je [Ollama](https://ollama.com/download) koji radi sa bar jednim preuzetim modelom (`ollama pull llama3.2`). Zatim:

```bash
npx llmxray
```

Ili sa Dockerom:

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

Otvorite **http://localhost:5174**. Izaberite model, pošaljite poruku i gledajte šta se dešava. To je sve.

---

## Šta vam LLMxRay pokazuje

Pokrećete lokalni model. Ćaskate sa njim. LLMxRay odgovara na pitanja koja slede: koliko je brzo stigao svaki token, koliko je prompt koštao, da li je keš pomogao, koje je podešavanje zaista bilo bolje, i šta vaši *drugi* alati šalju istom modelu.

Svaka stranica ispod je jedan od tih odgovora.

### Ćaskanje, token po token

Svaki token se iscrtava čim stigne, obojen po poverenju. Vidite gde je model oklevao, a gde je bio siguran. Markdown, razgovori u više koraka, prilozi i slike, slash komande, i budžet za razmišljanje kod modela sa rezonovanjem (isključeno, po izboru modela, ili low / medium / high / max).

![Ćaskanje: odgovor u strimovanju sa bojenjem po poverenju](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/chat-streaming.png)

Svaki odgovor se proverava čim stigne. Oznaka se pojavljuje samo kada nešto nije u redu: ponavljanje, odbijanje, besmislice, prazan odgovor, ili odgovor odsečen na granici tokena.

### Sesija do detalja

Otvorite bilo koji korak da ga vidite kao vremensku liniju: vreme do prvog tokena, razmaci između tokena, blok rezonovanja ako ga je bilo, pozivi alata, i tačan prompt koji je poslat.

![Detalji sesije: vremenska linija strima i metrike](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/session.png)

### Live: šta vaši drugi alati šalju

LLMxRay otvara drugi port, **11435**, koji se ponaša tačno kao Ollama i sve mu prosleđuje. Usmerite VS Code Copilot, Open WebUI, Continue, n8n ili sopstvenu skriptu na `http://localhost:11435` i svaki korak koji pošalju pojavljuje se ovde: klijent, model, veličina prompta, koliko je došlo iz keša, brzina prefill-a i generisanja, pozivi alata.

```
VS Code Copilot ─┐
Open WebUI ──────┤                                   ┌─ Live stranica: svaki korak,
Continue / n8n ──┼─► http://localhost:11435 ─► Ollama ┤  pogoci keša, brzina prefill-a,
vaše skripte ────┘        (LLMxRay)                   └─ gde je keš pukao
```

![Live: koraci od dva klijenta, sa nalazima](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

Izaberite korak da vidite od čega se prompt sastoji i tačno mesto gde je prestao da se poklapa sa prethodnim, a to je mesto gde je keš pukao. Nalazi su obične rečenice, svaka vezana za korak koji je dokazuje: klijent koji iznova čita ceo prompt u svakom koraku, model koji delom radi na CPU-u, šeme alata koje zauzimaju 40% svakog prompta. Čuvaju se samo brojevi i vremena, u memoriji. Tekst prompta je opcija koja piše u lokalni fajl. Ništa ne napušta vašu mašinu.

Oba porta slušaju na vašoj mreži, ne samo na localhost-u, pa Live stranica može da radi preko celog ekrana na drugom monitoru ili drugoj mašini dok agenti rade.

### Laboratorija keša

Lokalni model ponovo koristi keš prompta samo dok se prompt poklapa od prvog tokena. Jedan vremenski pečat pri vrhu baca sve ispod njega. Laboratorija pronalazi vrednosti koje se menjaju između koraka, pokazuje gde ponovna upotreba umire, a zatim **meri** na vašem sopstvenom demonu koliko se dobija njihovim premeštanjem na kraj.

![Laboratorija keša: dijagnoza i izmereni rezultat](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

Izmereno na stvarnom promptu od 324 tokena: 4 tokena ponovo iskorišćena i 64,6 ms prefill-a sa pečatom napred, 290 ponovo iskorišćenih i 18,6 ms sa pečatom pozadi. **3,5x brže, iste reči.**

### Poređenje

Isti prompt na do četiri slota, svaki sa svojim modelom, temperaturom i sistemskim promptom, u strimovanju jedan pored drugog. Preseti na jedan klik: Temperature Sweep, Deterministic Pair, Language Compare. Diff na nivou reči pokazuje tačno šta se promenilo između dva odgovora.

![Poređenje: pregled temperatura na jednom modelu](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/compare.png)

### Hirurški benchmark

Ocenite modele na odabranim skupovima pitanja (MMLU-Pro, ARC-Challenge, HellaSwag, GSM8K, TruthfulQA) pomoću **stvarnih logprobs tokena**, a ne po tome da li odgovor slučajno izgleda tačno. Poverenje naspram tačnosti po kategoriji, da vidite gde je model samouvereno pogrešio. Uvezite sopstvene skupove kao JSON.

![Benchmark: poverenje naspram tačnosti](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/benchmark.png)

### Laboratorija odluka

Modeli za odlučivanje (nimble, tev1, clef) odgovaraju na tipizirana pitanja verovatnoćama umesto tekstom. Dajte laboratoriji situaciju i tražite izbor među kandidatima, verovatnoću da/ne, ili ocenu na skali. Svaki odgovor stiže kao sopstvena raspodela modela, iscrtana kao trake.

![Laboratorija odluka: trake verovatnoće iza svakog odgovora](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/decision-lab.png)

### Protocol Observatory

Isti prompt kroz tri Ollama protokola istovremeno: native `/api/chat`, OpenAI-kompatibilni `/v1/chat/completions` i Anthropic-kompatibilni `/v1/messages`. Strimovanje jedan pored drugog, metrike po protokolu, i diff omotača koji pokazuje kako svaki od njih uokviruje razloge završetka, broj tokena i greške.

![Protocol Observatory: tri protokola jedan pored drugog](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/protocols.png)

### Baza znanja i embeddings

Ubacite PDF, DOCX, Markdown ili CSV fajlove. Seku se na delove, vektorizuju i pretražuju, pa vidite šta pretraga zaista vraća pre nego što model to uopšte vidi. Stranica Embeddings poredi bilo koja dva teksta kosinusnom sličnošću, vizualizuje vektore i pokazuje koliko košta Matryoshka skraćivanje.

<table>
<tr>
<td width="50%">

![Baza znanja: rezultati pretrage sa ocenama](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/knowledge-base.png)

</td>
<td width="50%">

![Embeddings: kosinusna sličnost dva teksta](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/embeddings.png)

</td>
</tr>
</table>

Sve ostaje u IndexedDB-u vašeg pregledača.

### Dopuna koda

Fill-in-the-middle za Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder i StarCoder: prefiks, sufiks, a model popunjava prazninu. Sastavljeni pregled pokazuje rezultat onako kako bi ga prikazao vaš editor.

![Dopuna koda: prefiks, sufiks i sastavljeni pregled](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/fim.png)

### Tool Workshop

Platno sa čvorovima za pravljenje definicija alata, sa TypeScript-om sinhronizovanim u oba smera: menjajte čvorove ili menjajte kod. Ispitajte API, generišite šemu i testirajte alat stvarnim pozivom.

![Tool Workshop: platno sa čvorovima i otvorenim panelom koda](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tools.png)

### Analitika i troškovi

Percentili latencije (P50 / P95 / P99) za zahteve i prve tokene, kvalitet kroz korake, greške po modelu, toplotna mapa korišćenja, i temperatura naspram tokena u sekundi. Stranica troškova vrednuje vašu lokalnu upotrebu po cloud cenama, pa vidite koliko štedite radeći lokalno.

<table>
<tr>
<td width="50%">

![Analitika: percentili latencije i kvalitet](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/analytics.png)

</td>
<td width="50%">

![Troškovi: cloud ekvivalent po modelu](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/costs.png)

</td>
</tr>
</table>

### Moj sistem i modeli

Hardver, okruženje i inferencija na jednoj stranici: CPU, memorija, GPU, koji su modeli učitani i gde. Kartica Modeli nabraja svaki instalirani model sa parametrima, šablonom i runner-om, i preuzima nove iz kataloga.

<table>
<tr>
<td width="50%">

![Moj sistem: hardver i status Ollame](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/system.png)

</td>
<td width="50%">

![Modeli: instalirani modeli i katalog](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/models.png)

</td>
</tr>
</table>

### Takođe u paketu

- **AI Training Pipeline.** Birajte parove iz svojih razgovora, označite ih, pregledajte, izvezite kao JSONL za fine-tuning.
- **Lokalna baza istorije.** Svako ćaskanje, poređenje i benchmark se arhivira u IndexedDB sa filterima, trendovima, izvozom i pravilima čuvanja.
- **Kit za predavače.** Devet lekcija na [sajtu dokumentacije](https://lognebudo.github.io/llmxray/docs/community/educators/), svaka oko jedne LLMxRay stranice.
- **Pet jezika.** Engleski, francuski, srpski (latinica i ćirilica), kineski i arapski, sa RTL rasporedom. Skele su spremne za hebrejski i japanski.

---

## Kome je namenjeno

| Vi ste... | LLMxRay vam pomaže da... |
|---|---|
| **Programer** | Debagujete promptove, profilišete latenciju, poredite modele, pregledate pozive alata, vidite šta vaš editor šalje |
| **Istraživač** | Vodite kontrolisane eksperimente sa istim podešavanjima na više modela i temperatura |
| **Student / Predavač** | Posmatrate ponašanje modela umesto da o njemu čitate, uz [kit za predavače](https://lognebudo.github.io/llmxray/docs/community/educators/) od devet modula |
| **Vođa AI tima** | Date svakom programeru isto lokalno okruženje, i prikupite rezultate benchmarka i parove za obuku koje izvezu |

---

## Instalacija

### npx (preporučeno)
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
npx llmxray --observe-port 11436     # Live port, podrazumevano 11435
```

### Docker
```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
docker run -p 5174:5174 -p 11435:11435 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### Iz izvornog koda
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## Ollama kompatibilnost

Testirano sa **Ollama 0.40.x** (provereno na 0.40.4, oktobar 2026). Radi sa 0.20 i novijim; starije verzije ćaskaju, ali nemaju `think` ni `format` po JSON šemi. **Preporučeno: 0.33.3 ili novije**, koje prijavljuje ponovnu upotrebu keša prompta, pa se brzina prefill-a meri na tokenima koji su zaista obrađeni.

| Endpoint | Koristi se za |
|---|---|
| `/api/chat` | Ćaskanje u strimu (NDJSON, sa `tools`, nivoima napora `think`, šemom `format`) |
| `/api/generate` | Generisanje i Fill-in-the-Middle preko `suffix` |
| `/api/tags`, `/api/show` | Lista modela, mogućnosti, dužina konteksta, parametri, šablon |
| `/api/embed` | Vektorski embeddings za bazu znanja, sa opcionim `dimensions` skraćivanjem |
| `/api/pull`, `/api/delete`, `/api/ps`, `/api/version` | Upravljanje modelima i status |
| `/v1/chat/completions` | OpenAI-kompatibilna putanja, koristi je hirurški benchmark za prave logprobs |
| `/v1/messages` | Anthropic-kompatibilna putanja, koristi je Protocol Observatory |
| `/v1/systemone` | Modeli za odlučivanje, koristi ih laboratorija odluka |

---

## Ispod haube

Vue 3.5, TypeScript 5.9 (strict), Vite 7, Tailwind CSS 4, Pinia store po domenu, Chart.js i D3 za grafikone, Vue Flow za platno alata, CodeMirror 6 za kod. Skladište je IndexedDB pregledača. Pozadina je Ollama, lokalno.

Strimovanje čita Ollama NDJSON kroz `fetch()` i `ReadableStream`, a tokeni ažuriraju interfejs kroz Pinia. Poverenje u ćaskanju se aproksimira iz latencije između tokena i tako je i označeno; benchmark koristi prave logprobs. Detekcija hardvera je mali Vite plugin koji direktno pita OS. Live port je providni proksi koji brojeve i vremena drži u memoriji.

| Komanda | Šta radi |
|---|---|
| `npm run dev` | Razvojni server (port 5173) |
| `npm run build` | Provera tipova i produkcioni build |
| `npm run test` | Jedinični testovi (Vitest) |
| `npm run test:e2e` | End-to-end testovi (Playwright) |

---

## Doprinosi

Doprinosi su dobrodošli. Pogledajte [CONTRIBUTING.md](CONTRIBUTING.md) za podešavanje i smernice. Prevodi zajednice su posebno dobrodošli: skele su spremne za hebrejski i japanski.

## Licenca

[Apache License 2.0](LICENSE)

## Žig

**LLMxRay** je žig Ivana Stankovića ([LogneBudo](https://github.com/LogneBudo)). Pogledajte [TRADEMARK.md](TRADEMARK.md).

---

<p align="center">
  <strong>Ako vam LLMxRay pomaže da bolje razumete svoju AI, razmislite o zvezdici.</strong><br/>
  Pomaže drugima da otkriju projekat.
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>
