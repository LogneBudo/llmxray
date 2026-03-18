# Creating Custom Benchmark Suites

Create your own benchmark suites to test models on topics that matter to you — no JSON editing required. The Benchmark Suite Builder lets you craft questions manually or use a local AI model to generate them automatically.

**Sidebar item:** Benchmark Builder
**Route:** `/benchmark` (Builder tab)

## Manual Question Entry

To build a suite entirely by hand:

1. Open the **Benchmark** page and click the **Builder** tab.
2. Enter a **Suite name** and an optional **Description**.
3. Click **Add Question** to create a new entry.
4. Fill in the **question text**.
5. Add the **answer choices** (A, B, C, D). You can add more choices if needed.
6. Select the **correct answer** from the dropdown.
7. Optionally assign a **category** to group questions by subject.
8. Repeat steps 3-7 for each question you want to add.
9. Click **Save Suite** when you are done.

Your custom suite now appears alongside the built-in suites and is ready to run.

## AI-Assisted Generation

Let a local model do the heavy lifting:

1. In the Builder tab, switch to the **AI Generate** section.
2. Enter a **topic** — for example, "French Revolution", "TCP/IP networking", or "organic chemistry".
3. Choose the **number of questions** to generate.
4. Select a **difficulty** level (easy, medium, hard).
5. Pick the **model** that will generate the questions from the dropdown.
6. Click **Generate**. The model streams questions in real time.

Once generation completes:

- **Review** each question for accuracy.
- **Edit** any question text, choices, or correct answers that need fixing.
- **Deselect** questions that are poorly formed or incorrect — they will not be included.
- Click **Add to Suite** to merge the approved questions into your suite.

## Editing Suites

Click the **Edit** button on any custom suite to modify it. You can:

- Rename the suite or update its description
- Add, remove, or reorder questions
- Edit individual question text, choices, and correct answers
- Change question categories

Built-in suites (ARC, GSM8K, etc.) cannot be edited, but you can duplicate them to create a modified version.

## Exporting

Click the **Export** button on a custom suite to download it as a **JSON** file. The exported file contains:

- Suite name and description
- All questions with their choices, correct answer index, and category

Share exported JSON files with others or contribute them to the [Community Benchmarks](/en/community/benchmarks) collection.

## Tips

- **Use specific topics** — "Mitochondrial electron transport chain" generates better questions than "biology". The more focused the topic, the more accurate the AI output.
- **Mix manual and AI** — Generate a batch with AI, then add a few hand-crafted edge-case questions to round out coverage.
- **Always validate answers** — AI-generated correct answers can be wrong. Double-check each one before saving.
- **Larger models produce better questions** — A 14B-parameter model generates significantly more accurate and nuanced questions than a 3B model. Use the best model you have available.
- **Categorize consistently** — Use consistent category names across questions so the results breakdown is meaningful.
- **Start small** — Generate 5-10 questions first to check quality before committing to a larger batch.
