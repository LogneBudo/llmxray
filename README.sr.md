<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>Vidite šta vaša lokalna AI zaista radi.</strong></p>
<p align="center">
  Usmerite VS Code Copilot, Open WebUI, Continue, n8n ili svog agenta na LLMxRay umesto na Ollama, i vidite svaki korak:<br/>
  šta je bilo u kešu, šta je ponovo pročitano, šta je demon tiho odsekao, koji alat je izbacio koji model. Bez clouda. Bez API ključeva. Bez troška.
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
  <a href="#šta-vaši-alati-zaista-šalju">Šta vaši alati šalju</a> &bull;
  <a href="#sačuvajte-i-pošaljite-dalje">Čuvanje i slanje</a> &bull;
  <a href="#za-agente">Za agente</a> &bull;
  <a href="#takođe-u-paketu">Takođe u paketu</a> &bull;
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

Potreban vam je pokrenut [Ollama](https://ollama.com/download) sa bar jednim preuzetim modelom (`ollama pull llama3.2`). Zatim:

```bash
npx llmxray
```

Ili sa Dockerom:

```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
```

Sada usmerite svoje alate na **http://localhost:11435** umesto na Ollama port 11434: VS Code Copilot, Open WebUI, Continue, n8n, vaše skripte. Ponaša se tačno kao Ollama i prosleđuje sve. Otvorite **http://localhost:5174**, idite na **Live**, i gledajte kako njihovi koraci stižu.

Želite samo da isprobate model? Otvorite stranicu za ćaskanje, izaberite model i pošaljite poruku.

---

## Šta vaši alati zaista šalju

Vaš editor, vaši agenti i vaše skripte razgovaraju sa istim Ollama. Ove stranice pokazuju šta svaki od njih šalje, šta demon radi s tim, i koliko to košta ostale.

### Live: šta vaši drugi alati šalju

LLMxRay otvara drugi port, **11435**, koji se ponaša tačno kao Ollama i sve mu prosleđuje. Usmerite VS Code Copilot, Open WebUI, Continue, n8n ili sopstvenu skriptu na `http://localhost:11435` i svaki korak koji pošalju pojavljuje se ovde: klijent, model, veličina prompta, koliko je došlo iz keša, brzina prefill-a i generisanja, pozivi alata.

```
VS Code Copilot ─┐
Open WebUI ──────┤                                   ┌─ Live stranica: svaki korak,
Continue / n8n ──┼─► http://localhost:11435 ─► Ollama ┤  pogoci keša, brzina prefill-a,
vaše skripte ────┘        (LLMxRay)                   └─ gde je keš pukao
```

![Live: koraci od dva klijenta, sa nalazima](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

Izaberite korak da vidite od čega se prompt sastoji i tačno mesto gde je prestao da se poklapa sa prethodnim, a to je mesto gde je keš pukao. Nalazi su obične rečenice, svaka vezana za korak koji je dokazuje: klijent koji iznova čita ceo prompt u svakom koraku, model koji delom radi na CPU-u, šeme alata koje zauzimaju 40% svakog prompta. Čuvaju se samo brojevi i vremena, na ovoj mašini 30 dana, pa ponovno pokretanje nastavlja tamo gde je stalo. Tekst prompta je opcija koja piše u lokalni fajl. Ništa ne napušta vašu mašinu, osim ako korake ne pošaljete svom pregledaču tragova.

Podrazumevano, oba porta odgovaraju samo ovoj mašini, jer Live dnevnik čuva ono što su vaši alati poslali. Pokrenite `npx llmxray --host 0.0.0.0` da bi druge mašine u vašoj mreži mogle da ih dosegnu, za Live stranicu na drugom monitoru ili deljenu GPU mašinu.

### Rendgen prompta: sam prompt, nacrtan u razmeri

Svaki korak koji je vaš alat poslao, kao traka. Boja pokazuje šta je bio svaki deo prompta: sistemski prompt, šeme alata, raniji koraci, nova poruka. Svetlina pokazuje šta mu se desilo: bledo je već bilo u memoriji modela i nije koštalo ništa, jarko je moralo ponovo da se pročita, prugasto je demon odsekao i nikada nije viđeno. Složite korake jednog razgovora i vidite kako keš raste, korak u kom ga je vremenska oznaka u sistemskom promptu ispraznila, i korak u kom je prompt prerastao kontekst pa je Ollama tiho odbacio početak, sistemski prompt uključen, i ipak odgovorio. Kliknite na deo i zahtev se otvara na tom mestu u tekstu.

![Rendgen prompta: svaki korak pravog agentskog izvršavanja nacrtan u razmeri, keširani delovi bledi, ponovo računati jarki](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/xray.png)

### Izvršavanja: rad jednog alata, od početka do kraja

Pozivi jednog alata modelu poređani u vremenu, kao vodopad. Svaki poziv je podeljen po onome što Ollama prijavljuje: čekanje, učitavanje modela, čitanje prompta, pisanje odgovora. Između poziva, vreme samog alata, nazvano po alatima koje je model tražio. Koraci počinju tamo gde je alat započeo novi razgovor, pa se agent koji baca svoj keš na svakom koraku vidi na prvi pogled, kao i model koji nije bio u memoriji kada je izvršavanje počelo. Kliknite na bilo koji red da vidite šta je taj poziv poslao i šta se vratilo, uključujući razmišljanje modela i njegove pozive alata sa argumentima, ili šta je alat pitan i šta je vratio. Svaki red ima svoj link. Uključite *Čuvaj tekst upita* na Live stranici da vidite tekst; vremenima ne treba ništa.

![Izvršavanja: agentsko izvršavanje od 36 poziva kao vodopad, sa ulazom i rezultatom jednog alata](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/runs.png)

### Deljena mašina: zašto je Ollama spor upravo sada, i koji alat je kriv

Jedan red po alatu, poređan po tome koliko je koštao ostale, u sekundama: onaj koji šalje `keep_alive: 0` i izbacuje model posle svakog izvršavanja, onaj koji traži kontekst od 128K za promptove od 4K i spušta demona na jedan zahtev odjednom, onaj koji je čekao 22 sekunde iza njih. Uz svaki, podešavanje koje treba promeniti. Alat koji nije koštao ništa je takođe na listi, da vidite kako izgleda dobro ponašanje.

![Deljena mašina: šta je jedan alat tražio od demona i koliko je to koštalo ostale](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/shared-box.png)

### GPU mapa: šta je u video memoriji, i šta bi još stalo

Jedna traka širine vaše kartice: svaki učitan model kao blok podeljen na težine i ono što njegov kontekst košta povrh toga, zatim slobodan prostor. Ispod, svaki preuzet model sa jednom od tri presude: staje sada, staje samo ako se učitano prvo izbaci, veći od kartice.

![GPU mapa: učitan model u stvarnoj veličini, sa onim što bi još stalo](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/gpu-map.png)

### Pozivi alata: može li ovaj model da vodi agenta?

Trinaest oblika zahteva koje agenti šalju po ceo dan, ocenjenih po onome što je demon vratio: pravi alat, pravi argumenti, pravi broj poziva, bez poziva kada nije potreban. Svaka ćelija je jedna rečenica: „nedostaje argument path”, „upisao je poziv u tekst odgovora”, „pozvao je search_web iako alat nije bio potreban”. Kliknite da vidite šta je model vratio.

![Pozivi alata: trinaest oblika agentskih zahteva ocenjenih na gemma4](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tool-calls.png)

### Laboratorija keša

Lokalni model ponovo koristi keš prompta samo dok se prompt poklapa od prvog tokena. Jedan vremenski pečat pri vrhu baca sve ispod njega. Laboratorija pronalazi vrednosti koje se menjaju između koraka, pokazuje gde ponovna upotreba umire, a zatim **meri** na vašem sopstvenom demonu koliko se dobija njihovim premeštanjem na kraj.

![Laboratorija keša: dijagnoza i izmereni rezultat](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

Izmereno na stvarnom promptu od 324 tokena: 4 tokena ponovo iskorišćena i 64,6 ms prefill-a sa pečatom napred, 290 ponovo iskorišćenih i 18,6 ms sa pečatom pozadi. **3,5x brže, iste reči.**

### Protocol Observatory

Isti prompt kroz tri Ollama protokola istovremeno: native `/api/chat`, OpenAI-kompatibilni `/v1/chat/completions` i Anthropic-kompatibilni `/v1/messages`. Strimovanje jedan pored drugog, metrike po protokolu, i diff omotača koji pokazuje kako svaki od njih uokviruje razloge završetka, broj tokena i greške.

![Protocol Observatory: tri protokola jedan pored drugog](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/protocols.png)

---

## Sačuvajte, i pošaljite dalje

Zapis svakog koraka (tokeni, keš, vremena, klijent, model, nikada tekst) ostaje na vašoj mašini 30 dana, pa ponovno pokretanje nastavlja tamo gde je stalo. Live, Izvršavanja, Rendgen prompta i MCP alati nastavljaju kao da se ništa nije desilo.

Ako vaš tim već čita tragove, pošaljite korake tamo: svaki poziv modela postaje OpenTelemetry span sa GenAI atributima koje pregledači već čitaju, svako izvršavanje trag, a vreme alata između poziva zaseban span, isti vodopad kao u Izvršavanjima. Upišite adresu na Live stranici, ili `OTEL_EXPORTER_OTLP_ENDPOINT`.

| Pregledač | Adresa |
|---|---|
| Jaeger (`docker run -p 16686:16686 -p 4318:4318 jaegertracing/jaeger`) | `http://localhost:4318` |
| Arize Phoenix (`docker run -p 6006:6006 arizephoenix/phoenix`) | `http://localhost:6006` |
| Langfuse | `https://cloud.langfuse.com/api/public/otel`, sa Basic zaglavljem od vaših ključeva |
| Grafana Tempo, OpenTelemetry Collector | njegova OTLP HTTP adresa, obično port 4318 |

Tekst prompta se šalje samo ako uključite i *Čuvaj tekst upita* i *Uključi tekst upita u svaki span*.

---

## Za agente

Ako ste agent koji radi na lokalnom modelu, LLMxRay može da vam kaže šta nije u redu sa vašim pozivima. Dva koraka.

1. Šaljite svoje Ollama pozive na port **11435** umesto na 11434. Ponaša se tačno kao Ollama i prosleđuje sve; LLMxRay samo beleži ono što prolazi.
2. Dodajte LLMxRay MCP server svojim alatima:

```json
{ "mcpServers": { "llmxray": { "command": "npx", "args": ["-y", "-p", "llmxray", "llmxray-mcp"] } } }
```

Sedam alata, svi samo za čitanje, ništa ne napušta mašinu:

| Alat | Odgovara na |
|---|---|

| `diagnose_my_turns` | Šta se ističe u vašim poslednjim koracima, kao rečenice sa rešenjem: prompt odbijen jer premašuje učitani kontekst, keš prompta izgubljen u svakom koraku ili u jednom, model koji delom radi na CPU-u, šeme alata koje zatrpavaju prompt. |
| `read_my_last_turn` | Vaš poslednji korak u brojevima: tokeni prompta i udeo iz keša, vreme i brzina predpopunjavanja, generisani tokeni i brzina, zašto je generisanje stalo, od čega se prompt sastojao, da li je model stao u video memoriju. |
| `list_local_models` | Koji modeli su preuzeti, njihova veličina i kvantizacija, koji su sada učitani i sa kojim kontekstom, i da li svaki staje u video memoriju. |
| `list_my_turns` | Istorija: jedan red po koraku sa tokenima, udelom iz keša, predpopunjavanjem, brzinom generisanja, razlogom zaustavljanja i oznakama. |
| `compare_my_turns` | Da li je promena pomogla: medijane udela iz keša, predpopunjavanja, brzine i veličine prompta pre i posle jednog trenutka, sa presudom. |
| `estimate_my_prompt` | Pre slanja: da li prompt od N tokena staje u učitani kontekst, koliko prostora ostaje, da li je model u video memoriji, koliko bi keš ponovo iskoristio. |
| `read_llmxray_status` | Gde LLMxRay radi, port za posmatranje, Ollama kome prosleđuje, koliko koraka čuva. |

Sam LLMxRay mora da radi (`npx llmxray`). MCP server ga čita preko localhost-a.

Isti postupak, kao [Agent Skill](https://agentskills.io) koji vaš agent može da učita: `npx skills add LogneBudo/llmxray` (skills.sh) ili `clawhub install llmxray-diagnose-ollama-calls` (ClawHub). Izvor: [skills/diagnose-ollama-calls/SKILL.md](skills/diagnose-ollama-calls/SKILL.md).

Dajte sebi ime da bi vaši koraci bili vaši: pošaljite zaglavlje `X-LLMxRay-Client: moj-agent`, ili koristite `http://localhost:11435/?client=moj-agent` kao osnovnu adresu, i prosledite `moj-agent` kao `client` alatima.

---

## Takođe u paketu

Pokrećete lokalni model. Ćaskate sa njim. LLMxRay odgovara na pitanja koja slede: koliko je brzo stigao svaki token, koliko je prompt koštao, da li je keš pomogao, koje je podešavanje zaista bilo bolje, i šta vaši *drugi* alati šalju istom modelu.

Svaka stranica ispod je jedan od tih odgovora.

### Ćaskanje, token po token

Svaki token se iscrtava čim stigne, obojen po verovatnoći koju mu model daje, iz Ollama logprobs. Vidite gde je model oklevao, a gde je bio siguran. Markdown, razgovori u više koraka, prilozi i slike, slash komande, i budžet za razmišljanje kod modela sa rezonovanjem (isključeno, po izboru modela, ili low / medium / high / max).


Svaki odgovor se proverava čim stigne. Oznaka se pojavljuje samo kada nešto nije u redu: ponavljanje, odbijanje, besmislice, prazan odgovor, ili odgovor odsečen na granici tokena.

<details><summary>Snimak ekrana</summary>

![Ćaskanje: odgovor u strimovanju, svaki token obojen po svojoj verovatnoći](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/chat-streaming.png)

</details>

### Sesija do detalja

Otvorite bilo koji korak da ga vidite kao vremensku liniju: vreme do prvog tokena, razmaci između tokena, blok rezonovanja ako ga je bilo, pozivi alata, i tačan prompt koji je poslat.

<details><summary>Snimak ekrana</summary>

![Detalji sesije: vremenska linija strima i metrike](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/session.png)

</details>

### Poređenje

Isti prompt na do četiri slota, svaki sa svojim modelom, temperaturom i sistemskim promptom, u strimovanju jedan pored drugog. Preseti na jedan klik: Temperature Sweep, Deterministic Pair, Language Compare. Diff na nivou reči pokazuje tačno šta se promenilo između dva odgovora.

<details><summary>Snimak ekrana</summary>

![Poređenje: pregled temperatura na jednom modelu](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/compare.png)

</details>

### Hirurški benchmark

Ocenite modele na odabranim skupovima pitanja (MMLU-Pro, ARC-Challenge, HellaSwag, GSM8K, TruthfulQA) pomoću **stvarnih logprobs tokena**, a ne po tome da li odgovor slučajno izgleda tačno. Poverenje naspram tačnosti po kategoriji, da vidite gde je model samouvereno pogrešio. Uvezite sopstvene skupove kao JSON.

<details><summary>Snimak ekrana</summary>

![Benchmark: poverenje naspram tačnosti](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/benchmark.png)

</details>

### Laboratorija odluka

Modeli za odlučivanje (nimble, tev1, clef) odgovaraju na tipizirana pitanja verovatnoćama umesto tekstom. Dajte laboratoriji situaciju i tražite izbor među kandidatima, verovatnoću da/ne, ili ocenu na skali. Svaki odgovor stiže kao sopstvena raspodela modela, iscrtana kao trake.

<details><summary>Snimak ekrana</summary>

![Laboratorija odluka: trake verovatnoće iza svakog odgovora](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/decision-lab.png)

</details>

### Baza znanja i embeddings

Ubacite PDF, DOCX, Markdown ili CSV fajlove. Seku se na delove, vektorizuju i pretražuju, pa vidite šta pretraga zaista vraća pre nego što model to uopšte vidi. Stranica Embeddings poredi bilo koja dva teksta kosinusnom sličnošću, vizualizuje vektore i pokazuje koliko košta Matryoshka skraćivanje.


Sve ostaje u IndexedDB-u vašeg pregledača.

<details><summary>Snimak ekrana</summary>

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

</details>

### Dopuna koda

Fill-in-the-middle za Qwen-Coder, CodeLlama, Codestral, DeepSeek-Coder i StarCoder: prefiks, sufiks, a model popunjava prazninu. Sastavljeni pregled pokazuje rezultat onako kako bi ga prikazao vaš editor.

<details><summary>Snimak ekrana</summary>

![Dopuna koda: prefiks, sufiks i sastavljeni pregled](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/fim.png)

</details>

### Tool Workshop

Platno sa čvorovima za pravljenje definicija alata, sa TypeScript-om sinhronizovanim u oba smera: menjajte čvorove ili menjajte kod. Ispitajte API, generišite šemu i testirajte alat stvarnim pozivom.

<details><summary>Snimak ekrana</summary>

![Tool Workshop: platno sa čvorovima i otvorenim panelom koda](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tools.png)

</details>

### Analitika i troškovi

Percentili latencije (P50 / P95 / P99) za zahteve i prve tokene, kvalitet kroz korake, greške po modelu, toplotna mapa korišćenja, i temperatura naspram tokena u sekundi. Stranica troškova vrednuje vašu lokalnu upotrebu po cloud cenama, pa vidite koliko štedite radeći lokalno.

<details><summary>Snimak ekrana</summary>

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

</details>

### Moj sistem i modeli

Hardver, okruženje i inferencija na jednoj stranici: CPU, memorija, GPU, koji su modeli učitani i gde. Kartica Modeli nabraja svaki instalirani model sa parametrima, šablonom i runner-om, i preuzima nove iz kataloga.

<details><summary>Snimak ekrana</summary>

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

</details>

### Još

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

Testirano sa **Ollama 0.40.x** (provereno na 0.40.6, oktobar 2026). Radi sa 0.20 i novijim; starije verzije ćaskaju, ali nemaju `think` ni `format` po JSON šemi. **Preporučeno: 0.33.3 ili novije**, koje prijavljuje ponovnu upotrebu keša prompta, pa se brzina prefill-a meri na tokenima koji su zaista obrađeni.

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

Vue 3.5, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, Pinia store po domenu, Chart.js i D3 za grafikone, Vue Flow za platno alata, CodeMirror 6 za kod. Skladište je IndexedDB pregledača. Pozadina je Ollama, lokalno.

Strimovanje čita Ollama NDJSON kroz `fetch()` i `ReadableStream`, a tokeni ažuriraju interfejs kroz Pinia. Ćaskanje i poređenje boje tokene po pravim logprobs koje Ollama vraća; bez njih token ostaje bez boje, a prikaz tokena vreme naziva „ritam”, nikada poverenje. Benchmark takođe koristi prave logprobs. Detekcija hardvera je mali Vite plugin koji direktno pita OS. Live port je providni proksi koji brojeve i vremena drži u memoriji.

| Komanda | Šta radi |
|---|---|
| `npm run dev` | Razvojni server (port 5173) |
| `npm run build` | Provera tipova i produkcioni build |
| `npm run test` | Jedinični testovi (Vitest) |
| `npm run test:e2e` | End-to-end testovi (Playwright) |

---

## Doprinosi

Doprinosi su dobrodošli. Pogledajte [CONTRIBUTING.md](CONTRIBUTING.md) za podešavanje i smernice. Prevodi zajednice su posebno dobrodošli: skele su spremne za hebrejski i japanski.

---

## Licenca

[Apache License 2.0](LICENSE)

---

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
