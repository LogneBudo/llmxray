<div dir="rtl">

<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>انظر ما الذي يفعله ذكاؤك الاصطناعي المحلّي فعلاً.</strong></p>
<p align="center">
  أمر واحد، تبويب متصفّح واحد. بثّ رمزاً برمز، تشخيص الذاكرة المؤقتة، مقارنة النماذج، معايير الأداء وتتبّع التكاليف<br/>
  للنماذج التي تعمل على جهازك عبر Ollama. لا سحابة. لا مفاتيح API. لا تكلفة.
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
  <strong>العربية</strong> &bull;
  <a href="README.sr.md">Srpski</a>
</p>

<p align="center">
  <a href="#البدء-السريع">البدء السريع</a> &bull;
  <a href="#ما-الذي-يُريك-إياه-llmxray">ما الذي يُريك إياه</a> &bull;
  <a href="#لمن-هذه-الأداة">لمن هذه الأداة</a> &bull;
  <a href="#التثبيت">التثبيت</a> &bull;
  <a href="#التوافق-مع-ollama">التوافق مع Ollama</a> &bull;
  <a href="CHANGELOG.md">سجلّ التغييرات</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/demo.gif" alt="عرض LLMxRay: دور محادثة يصل رمزاً برمز، ثم مقاييس الجلسة" width="800" />
</p>

---

## البدء السريع

تحتاج إلى [Ollama](https://ollama.com/download) يعمل مع نموذج واحد على الأقل مُنزَّل (`ollama pull llama3.2`). ثم:

```bash
npx llmxray
```

أو باستخدام Docker:

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

افتح **http://localhost:5174**. اختر نموذجاً، أرسل رسالة، وراقب ما يحدث. هذا كل شيء.

---

## ما الذي يُريك إياه LLMxRay

أنت تشغّل نموذجاً محلياً. تتحدّث معه. يجيب LLMxRay عن الأسئلة التي تأتي بعد ذلك: كم استغرق كل رمز، كم كلّف المُوجّه، هل أفادت الذاكرة المؤقتة، أيّ إعداد كان الأفضل فعلاً، وما الذي ترسله أدواتك *الأخرى* إلى النموذج نفسه.

كل صفحة أدناه هي إحدى هذه الإجابات.

### المحادثة، رمزاً برمز

يُرسم كل رمز فور وصوله، ملوّناً حسب الثقة. ترى أين تردّد النموذج وأين كان واثقاً. Markdown، محادثات متعدّدة الأدوار، مرفقات ملفات وصور، أوامر الشرطة المائلة، وميزانية تفكير لنماذج الاستدلال (معطّلة، أو باختيار النموذج، أو low / medium / high / max).

![المحادثة: ردّ يُبثّ مع تلوين حسب الثقة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/chat-streaming.png)

يُفحص كل ردّ أيضاً عند وصوله. لا تظهر الشارة إلا عندما يكون هناك خلل: تكرار، رفض، كلام غير مفهوم، إجابة فارغة، أو ردّ مقطوع عند حدّ الرموز.

### الجلسة بالتفصيل

افتح أيّ دور لتراه كخطّ زمني: الوقت حتى الرمز الأول، الفواصل بين الرموز، كتلة الاستدلال إن وُجدت، استدعاءات الأدوات، والمُوجّه الذي أُرسل بالضبط.

![تفاصيل الجلسة: الخط الزمني للبثّ والمقاييس](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/session.png)

### Live: ما ترسله أدواتك الأخرى

يفتح LLMxRay منفذاً ثانياً، **11435**، يتصرّف تماماً مثل Ollama ويمرّر إليه كل شيء. وجّه VS Code Copilot أو Open WebUI أو Continue أو n8n أو سكربتك الخاص إلى `http://localhost:11435` وسيظهر هنا كل دور ترسله: العميل، النموذج، حجم المُوجّه، كم جاء من الذاكرة المؤقتة، سرعة التعبئة المسبقة والتوليد، استدعاءات الأدوات.

```
VS Code Copilot ─┐
Open WebUI ──────┤                                   ┌─ Live: كل دور،
Continue / n8n ──┼─► http://localhost:11435 ─► Ollama ┤  إصابات الذاكرة المؤقتة، سرعة التعبئة،
your scripts ────┘        (LLMxRay)                   └─ أين انكسرت الذاكرة المؤقتة
```

![Live: أدوار من عميلين، مع النتائج](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

اختر دوراً لترى ممّ يتكوّن المُوجّه والنقطة الدقيقة التي توقّف فيها عن مطابقة الدور السابق، وهي حيث انكسرت الذاكرة المؤقتة. النتائج جمل بسيطة، كل منها مرتبطة بالدور الذي يثبتها: عميل يعيد قراءة مُوجّهه كاملاً في كل دور، نموذج يعمل جزئياً على المعالج، مخطّطات أدوات تشغل 40% من كل مُوجّه. لا يُحفظ إلا الأعداد والأزمنة، في الذاكرة. نصّ المُوجّه خيار يُكتب في ملف محلّي. لا شيء يغادر جهازك.

يستمع المنفذان على شبكتك لا على localhost فقط، فيمكن لصفحة Live أن تعمل بملء الشاشة على شاشة ثانية أو جهاز آخر بينما يعمل الوكلاء.

### مختبر الذاكرة المؤقتة

لا يعيد النموذج المحلّي استخدام ذاكرة المُوجّه المؤقتة إلا ما دام المُوجّه مطابقاً من أول رمز. طابع زمني واحد قرب الأعلى يُهدر كل ما تحته. يجد المختبر القيم التي تتغيّر بين الأدوار، ويُظهر أين تموت إعادة الاستخدام، ثم **يقيس** على خادمك الخاص ما يوفّره نقلها إلى النهاية.

![مختبر الذاكرة المؤقتة: التشخيص والنتيجة المقيسة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

مقيس على مُوجّه حقيقي من 324 رمزاً: 4 رموز معاد استخدامها و64.6 مللي ثانية تعبئة مسبقة مع الطابع الزمني في المقدّمة، و290 رمزاً معاد استخدامها و18.6 مللي ثانية معه في النهاية. **أسرع 3.5 مرّة، بالكلمات نفسها.**

### المقارنة

المُوجّه نفسه على ما يصل إلى أربع خانات، لكلّ منها نموذجها ودرجة حرارتها ومُوجّهها النظامي، تُبثّ جنباً إلى جنب. إعدادات مسبقة بنقرة واحدة: مسح درجات الحرارة، زوج حتمي، مقارنة اللغات. فرق على مستوى الكلمة يُظهر بالضبط ما تغيّر بين إجابتين.

![المقارنة: مسح درجات الحرارة على نموذج واحد](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/compare.png)

### المعيار الجراحي

قيّم النماذج على مجموعات أسئلة منتقاة (MMLU-Pro، ARC-Challenge، HellaSwag، GSM8K، TruthfulQA) اعتماداً على **logprobs الحقيقية للرموز**، لا على ما إذا كانت الإجابة تبدو صحيحة. الثقة مقابل الدقة لكل فئة، لترى أين يخطئ النموذج بثقة. استورد مجموعاتك الخاصة بصيغة JSON.

![المعيار: الثقة مقابل الدقة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/benchmark.png)

### مختبر القرار

تجيب نماذج القرار (nimble، tev1، clef) عن الأسئلة المصنّفة باحتمالات بدلاً من النثر. أعطِ المختبر موقفاً واطلب اختياراً بين مرشّحين، أو احتمال نعم/لا، أو درجة على مقياس. تعود كل إجابة على شكل توزيع النموذج نفسه، مرسوماً كأعمدة.

![مختبر القرار: أعمدة الاحتمال خلف كل إجابة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/decision-lab.png)

### مرصد البروتوكولات

المُوجّه نفسه عبر بروتوكولات Ollama الثلاثة بالتوازي: الأصلي `/api/chat`، والمتوافق مع OpenAI `/v1/chat/completions`، والمتوافق مع Anthropic `/v1/messages`. بثّ جنباً إلى جنب، مقاييس لكل بروتوكول، وفرق للغلاف يُظهر كيف يصوغ كلٌّ منها أسباب الانتهاء وأعداد الرموز والأخطاء.

![مرصد البروتوكولات: ثلاثة بروتوكولات جنباً إلى جنب](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/protocols.png)

### قاعدة المعرفة والتضمينات

أضف ملفات PDF أو DOCX أو Markdown أو CSV. تُقسَّم وتُضمَّن وتصبح قابلة للبحث، فترى ما يعيده الاسترجاع فعلاً قبل أن يراه أيّ نموذج. تتيح صفحة التضمينات مقارنة أيّ نصّين بتشابه جيب التمام، وتصوّر المتّجهات، وتُظهر ما يكلّفه اقتطاع Matryoshka.

<table>
<tr>
<td width="50%">

![قاعدة المعرفة: نتائج البحث مع الدرجات](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/knowledge-base.png)

</td>
<td width="50%">

![التضمينات: تشابه جيب التمام بين نصّين](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/embeddings.png)

</td>
</tr>
</table>

كل شيء يبقى في IndexedDB في متصفّحك.

### إكمال الكود

الإكمال في الوسط لنماذج Qwen-Coder وCodeLlama وCodestral وDeepSeek-Coder وStarCoder: بادئة ولاحقة، ويملأ النموذج الفجوة. تُظهر المعاينة المجمّعة النتيجة كما سيعرضها محرّرك.

![إكمال الكود: البادئة واللاحقة والمعاينة المجمّعة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/fim.png)

### ورشة الأدوات

لوحة عُقد لبناء تعريفات الأدوات، مع TypeScript متزامن في الاتجاهين: عدّل العُقد أو عدّل الكود. استكشف واجهة API، ولّد المخطّط، واختبر الأداة باستدعاء حقيقي.

![ورشة الأدوات: لوحة العُقد مع لوحة الكود مفتوحة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tools.png)

### التحليلات والتكاليف

النسب المئوية للتأخير (P50 / P95 / P99) للطلبات والرموز الأولى، الجودة عبر الأدوار، الأخطاء حسب النموذج، خريطة حرارية للاستخدام، ودرجة الحرارة مقابل الرموز في الثانية. تسعّر صفحة التكاليف استخدامك المحلّي بأسعار السحابة، لترى ما يوفّره التشغيل المحلّي.

<table>
<tr>
<td width="50%">

![التحليلات: النسب المئوية للتأخير والجودة](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/analytics.png)

</td>
<td width="50%">

![التكاليف: المكافئ السحابي لكل نموذج](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/costs.png)

</td>
</tr>
</table>

### جهازي والنماذج

العتاد وبيئة التشغيل والاستدلال في صفحة واحدة: المعالج، الذاكرة، بطاقة الرسوميات، أيّ النماذج محمّلة وأين. يعرض تبويب النماذج كل نموذج مثبّت مع معلماته وقالبه ومشغّله، ويسحب نماذج جديدة من الفهرس.

<table>
<tr>
<td width="50%">

![جهازي: العتاد وحالة Ollama](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/system.png)

</td>
<td width="50%">

![النماذج: النماذج المثبّتة والفهرس](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/models.png)

</td>
</tr>
</table>

### أيضاً في العلبة

- **خط أنابيب التدريب.** انتقِ أزواجاً من محادثاتك، وسمها وراجعها، وصدّرها بصيغة JSONL للضبط الدقيق.
- **قاعدة بيانات التاريخ المحلّية.** تُؤرشف كل محادثة ومقارنة ومعيار في IndexedDB مع مرشّحات واتجاهات وتصدير وقواعد احتفاظ.
- **حقيبة المعلّمين.** تسع وحدات دراسية على [موقع التوثيق](https://lognebudo.github.io/llmxray/docs/community/educators/)، كل منها مبنية حول صفحة من LLMxRay.
- **خمس لغات.** الإنجليزية والفرنسية والصربية (لاتينية وسيريلية) والصينية والعربية، مع تخطيط من اليمين إلى اليسار. الهياكل جاهزة للعبرية واليابانية.

---

## لمن هذه الأداة

| أنت... | يساعدك LLMxRay على... |
|---|---|
| **مطوّر** | تنقيح المُوجّهات، قياس التأخير، مقارنة النماذج، فحص استدعاءات الأدوات، رؤية ما يرسله محرّرك |
| **باحث** | إجراء تجارب مضبوطة بالإعدادات نفسها عبر النماذج ودرجات الحرارة |
| **طالب / معلّم** | مراقبة سلوك النماذج بدل القراءة عنه، مع [حقيبة المعلّمين](https://lognebudo.github.io/llmxray/docs/community/educators/) ذات الوحدات التسع |
| **قائد فريق ذكاء اصطناعي** | منح كل مطوّر الإعداد المحلّي نفسه، وجمع نتائج المعايير وأزواج التدريب التي يصدّرونها |

---

## التثبيت

### npx (مُوصى به)
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
npx llmxray --observe-port 11436     # منفذ Live، الافتراضي 11435
```

### Docker
```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
docker run -p 5174:5174 -p 11435:11435 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### من الكود المصدري
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## التوافق مع Ollama

مُختبَر على **Ollama 0.40.x** (تم التحقّق على 0.40.6، أكتوبر 2026). يعمل مع 0.20 وما بعده؛ الإصدارات الأقدم تتحادث لكنها تفتقر إلى `think` و`format` بمخطّط JSON. **مُوصى به: 0.33.3 أو أحدث**، إذ يبلّغ عن إعادة استخدام ذاكرة المُوجّه المؤقتة، فتُقاس سرعة التعبئة المسبقة على الرموز المُقيَّمة فعلاً.

| النقطة | تُستخدم لـ |
|---|---|
| `/api/chat` | المحادثة المبثوثة (NDJSON، مع `tools` ومستويات جهد `think` ومخطّط `format`) |
| `/api/generate` | التوليد والإكمال في الوسط عبر `suffix` |
| `/api/tags`، `/api/show` | قائمة النماذج، القدرات، طول السياق، المعلمات، القالب |
| `/api/embed` | التضمينات المتّجهية لقاعدة المعرفة، مع اقتطاع `dimensions` اختياري |
| `/api/pull`، `/api/delete`، `/api/ps`، `/api/version` | إدارة النماذج والحالة |
| `/v1/chat/completions` | المسار المتوافق مع OpenAI، يستخدمه المعيار الجراحي للحصول على logprobs حقيقية |
| `/v1/messages` | المسار المتوافق مع Anthropic، يستخدمه مرصد البروتوكولات |
| `/v1/systemone` | نماذج القرار، يستخدمها مختبر القرار |

---

## تحت الغطاء

Vue 3.5، TypeScript 5.9 (صارم)، Vite 7، Tailwind CSS 4، متجر Pinia لكل اهتمام، Chart.js وD3 للرسوم، Vue Flow للوحة الأدوات، CodeMirror 6 للكود. التخزين هو IndexedDB في المتصفّح. الخلفية هي Ollama، محلياً.

يقرأ البثّ NDJSON من Ollama عبر `fetch()` و`ReadableStream`، وتحدّث الرموز الواجهة عبر Pinia. تُقدَّر ثقة المحادثة من التأخير بين الرموز وتُوسم بذلك؛ تستخدم المعايير logprobs حقيقية. اكتشاف العتاد مكوّن Vite صغير يسأل نظام التشغيل مباشرة. منفذ Live وكيل شفّاف يحتفظ بالأعداد والأزمنة في الذاكرة.

| الأمر | ما يفعله |
|---|---|
| `npm run dev` | خادم التطوير (المنفذ 5173) |
| `npm run build` | فحص الأنواع وبناء الإنتاج |
| `npm run test` | اختبارات الوحدة (Vitest) |
| `npm run test:e2e` | اختبارات شاملة (Playwright) |

---

## المساهمة

المساهمات مرحَّب بها. انظر [CONTRIBUTING.md](CONTRIBUTING.md) للإعداد والإرشادات. ترجمات المجتمع مرحَّب بها بصفة خاصّة: ملفات الهياكل جاهزة للعبرية واليابانية.

## الرخصة

[Apache License 2.0](LICENSE)

## العلامة التجارية

**LLMxRay** علامة تجارية لإيفان ستانكوفيتش ([LogneBudo](https://github.com/LogneBudo)). انظر [TRADEMARK.md](TRADEMARK.md).

---

<p align="center">
  <strong>إن ساعدك LLMxRay على فهم ذكائك الاصطناعي بشكل أفضل، فكّر في منح المشروع نجمة.</strong><br/>
  هذا يساعد آخرين على اكتشاف المشروع.
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>

</div>
