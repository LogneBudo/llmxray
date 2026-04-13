"""
Transliterate Serbian Latin (latinica/gajica) -> Serbian Cyrillic.

Reads every .json file in src/locales/sr/ and writes the transliterated
version to src/locales/sr-Cyrl/. Brand names and {{template}} placeholders
are preserved untouched.

Re-run this whenever you hand-edit the Latin files to keep both scripts
in sync. This is a deterministic, lossless conversion.

Usage:
    python scripts/transliterate-sr.py
"""
import json
import os
import re
import sys

# Brand/proper names and accepted Serbian loanwords that stay in Latin
# even inside Cyrillic text. Mirrors the n8n workflow's preserve list.
PRESERVE_TOKENS = [
    "LLMxRay", "Ollama", "Mistral", "Llama", "OpenAI", "Anthropic", "Claude",
    "GPT", "Vue", "React", "GitHub", "Docker", "IndexedDB", "JSON", "JSONL",
    "LLM", "AI", "GPU", "CPU", "RAM", "VRAM", "API", "URL", "PDF", "CSV",
    "HTML", "CSS", "JS", "TS", "YAML", "XML", "SQL", "HTTP", "HTTPS",
    "RAG", "UTF-8", "OCR", "NLP", "ML", "NER",
    # Common Serbian tech loanwords kept in Latin
    "Benchmark", "benchmark", "Dashboard", "dashboard",
    "Embedding", "embedding", "Embeddings", "embeddings",
    "Token", "token", "Tokens", "tokens",
    # LLM sampling parameters — industry-standard technical terms
    "Top-P", "Top-K", "top-p", "top-k", "Top P", "Top K", "top",
    "Mirostat", "mirostat", "Seed", "seed", "TTFT", "TTF",
    "V1", "V2", "V3", "V4",  # version suffixes (e.g. "Mirostat V1")
    # ML/chat technical terms that appear in technical hints and examples
    "Nucleus", "nucleus", "sampling", "Sampling",
    "Human", "Assistant", "System",
    "num_predict", "num_ctx", "max_tokens",
    # Ollama CLI commands and model names — must stay literal so users can copy/paste
    "ollama", "ollama pull", "nomic-embed-text",
]

# Build a regex that matches preserve tokens as STANDALONE words only.
# Word boundaries (\b) prevent matching inside Serbian-inflected forms like
# "tokena" (genitive of "token") — those should fully transliterate to "токена".
# Tokens are sorted by length descending so longer phrases (e.g. "ollama pull")
# match before their prefixes ("ollama") in regex alternation.
_sorted_preserve = sorted(PRESERVE_TOKENS, key=len, reverse=True)
PRESERVE_RE = re.compile(r"\b(" + "|".join(re.escape(t) for t in _sorted_preserve) + r")\b")

# Digraphs: longest match first. Note dž uses U+017E (ž).
DIGRAPHS = [
    ("Lj", "Љ"), ("LJ", "Љ"), ("lj", "љ"),
    ("Nj", "Њ"), ("NJ", "Њ"), ("nj", "њ"),
    ("Dž", "Џ"), ("DŽ", "Џ"), ("dž", "џ"),
]

LAT2CYR = {
    "A": "А", "B": "Б", "C": "Ц", "Č": "Ч", "Ć": "Ћ",
    "D": "Д", "Đ": "Ђ", "E": "Е", "F": "Ф", "G": "Г",
    "H": "Х", "I": "И", "J": "Ј", "K": "К", "L": "Л",
    "M": "М", "N": "Н", "O": "О", "P": "П", "R": "Р",
    "S": "С", "Š": "Ш", "T": "Т", "U": "У", "V": "В",
    "Z": "З", "Ž": "Ж",
    "a": "а", "b": "б", "c": "ц", "č": "ч", "ć": "ћ",
    "d": "д", "đ": "ђ", "e": "е", "f": "ф", "g": "г",
    "h": "х", "i": "и", "j": "ј", "k": "к", "l": "л",
    "m": "м", "n": "н", "o": "о", "p": "п", "r": "р",
    "s": "с", "š": "ш", "t": "т", "u": "у", "v": "в",
    "z": "з", "ž": "ж",
}

# Match {{name}} mustache, {name} single-brace placeholders, and \-escapes
# like \n \t \r \\ — the latter must be preserved so JSON escape sequences in
# stop tokens etc. don't get their letter portion transliterated to Cyrillic
# (e.g. \n -> \н would break the escape).
TEMPLATE_RE = re.compile(r"(\{\{[^}]*\}\}|\{[^{}]*\}|\\.)")


def translit_word(word: str) -> str:
    """Transliterate a single Latin chunk to Cyrillic, digraphs first."""
    s = word
    for src, dst in DIGRAPHS:
        s = s.replace(src, dst)
    return "".join(LAT2CYR.get(ch, ch) for ch in s)


def translit_string(s: str) -> str:
    """Transliterate a string while preserving {{templates}} and brand tokens."""
    if not isinstance(s, str):
        return s
    out_parts = []
    # Split on {name} / {{name}} placeholders or \-escapes, leave them untouched.
    for tpl_part in TEMPLATE_RE.split(s):
        if (tpl_part.startswith("{") and tpl_part.endswith("}")) or \
           (len(tpl_part) == 2 and tpl_part.startswith("\\")):
            out_parts.append(tpl_part)
            continue
        # Split on preserve tokens, leave them in Latin.
        for brand_part in PRESERVE_RE.split(tpl_part):
            if brand_part in PRESERVE_TOKENS:
                out_parts.append(brand_part)
            else:
                out_parts.append(translit_word(brand_part))
    return "".join(out_parts)


def translit_deep(obj):
    """Walk a JSON tree and transliterate string values. Keys are preserved."""
    if isinstance(obj, str):
        return translit_string(obj)
    if isinstance(obj, list):
        return [translit_deep(v) for v in obj]
    if isinstance(obj, dict):
        return {k: translit_deep(v) for k, v in obj.items()}
    return obj


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(repo_root, "src", "locales", "sr")
    out_dir = os.path.join(repo_root, "src", "locales", "sr-Cyrl")

    if not os.path.isdir(src_dir):
        print(f"Source folder not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)

    files = sorted(f for f in os.listdir(src_dir) if f.endswith(".json"))
    if not files:
        print(f"No .json files found in {src_dir}", file=sys.stderr)
        sys.exit(1)

    for f in files:
        src_path = os.path.join(src_dir, f)
        out_path = os.path.join(out_dir, f)
        with open(src_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        cyrillic = translit_deep(data)
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(cyrillic, fh, ensure_ascii=False, indent=2)
        print(f"  {f}")

    print(f"\nWrote {len(files)} files to {out_dir}")


if __name__ == "__main__":
    main()
