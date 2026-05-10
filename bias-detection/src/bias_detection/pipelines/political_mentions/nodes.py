"""
Political mentions pipeline nodes.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from typing import Iterable

import pandas as pd


MENTION_COLUMNS = [
    "article_id",
    "url",
    "source",
    "published_date",
    "title",
    "canonical_name",
    "entity_type",
    "party",
    "matched_alias",
    "appeared_in_title",
    "mention_weight",
    "context_sentence",
    "sentiment_label",
    "sentiment_score",
    "positive_terms",
    "negative_terms",
]

ENTITY_METRIC_COLUMNS = [
    "source",
    "published_date",
    "party",
    "canonical_name",
    "entity_type",
    "mentions",
    "articles",
    "title_mentions",
    "mention_weight",
    "positive_mentions",
    "neutral_mentions",
    "negative_mentions",
    "avg_sentiment_score",
    "favorability_score",
]

PARTY_METRIC_COLUMNS = [
    "source",
    "published_date",
    "party",
    "mentions",
    "articles",
    "title_mentions",
    "mention_weight",
    "positive_mentions",
    "neutral_mentions",
    "negative_mentions",
    "avg_sentiment_score",
    "favorability_score",
]

POSITIVE_TERMS = (
    "mbeshtet",
    "profesion",
    "besim",
    "fitore",
    "sukses",
    "vleres",
    "mirat",
    "perparim",
    "integrim",
    "bashkepunim",
    "garant",
    "qendrueshem",
    "transparent",
    "historik",
    "fuqishem",
    "pozitiv",
    "rritje",
    "reform",
    "drejtesi",
    "respekt",
    "zgjidh",
    "legal",
    "mire",
    "lavder",
)

NEGATIVE_TERMS = (
    "sulm",
    "dhun",
    "akuz",
    "korrups",
    "abuz",
    "arrest",
    "hetim",
    "mashtr",
    "genjesh",
    "skandal",
    "krim",
    "denon",
    "papranuesh",
    "problem",
    "rrezik",
    "bllok",
    "desht",
    "humb",
    "kritik",
    "perplas",
    "tritol",
    "vras",
    "burg",
    "proced",
    "ndalim",
    "kundersht",
    "dobes",
    "faliment",
    "shkel",
    "presion",
    "afere",
    "trafik",
    "incenerator",
    "droge",
)

NEGATORS = {"nuk", "ska", "pa", "jo"}

ALBANIAN_MONTHS = {
    "janar": "01",
    "shkurt": "02",
    "mars": "03",
    "prill": "04",
    "maj": "05",
    "qershor": "06",
    "korrik": "07",
    "gusht": "08",
    "shtator": "09",
    "tetor": "10",
    "nentor": "11",
    "dhjetor": "12",
}


def _as_text(value: object) -> str:
    if pd.isna(value):
        return ""
    return str(value)


def _fold_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", _as_text(value).lower())
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"\s+", " ", text).strip()


def _normalize_date(value: object) -> str:
    if pd.isna(value) or str(value).strip() == "":
        return ""

    folded_value = _fold_text(value)
    albanian_match = re.search(r"\b(\d{1,2})\s+([a-z]+),?\s+(20\d{2})\b", folded_value)
    if albanian_match and albanian_match.group(2) in ALBANIAN_MONTHS:
        day, month_name, year = albanian_match.groups()
        return f"{year}-{ALBANIAN_MONTHS[month_name]}-{int(day):02d}"

    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return str(value).strip()
    return parsed.strftime("%Y-%m-%d")


def _extract_published_date(row: pd.Series) -> str:
    for column in ("published_date", "publish_date", "published_at", "date"):
        if column in row and _normalize_date(row[column]):
            return _normalize_date(row[column])

    url = _as_text(row.get("url"))
    match = re.search(r"/(20\d{2})/(\d{2})/(\d{2})/", url)
    if match:
        year, month, day = match.groups()
        return f"{year}-{month}-{day}"

    return "unknown"


def _article_id(row: pd.Series, index: int) -> str:
    source = _as_text(row.get("source")) or "unknown"
    url = _as_text(row.get("url"))
    title = _as_text(row.get("title"))
    raw_identifier = url or f"{source}:{index}:{title}"
    digest = hashlib.sha1(raw_identifier.encode("utf-8")).hexdigest()[:12]
    return f"{source}-{digest}"


def _alias_pattern(alias: str) -> re.Pattern:
    return re.compile(rf"(?<!\w){re.escape(alias)}(?!\w)", flags=re.IGNORECASE)


def _split_aliases(value: object, canonical_name: str) -> list[str]:
    aliases = [
        alias.strip()
        for alias in _as_text(value).split("|")
        if alias and alias.strip()
    ]
    if canonical_name and canonical_name not in aliases:
        aliases.append(canonical_name)
    return sorted(set(aliases), key=len, reverse=True)


def _compile_entities(entities_df: pd.DataFrame) -> list[dict]:
    entities = []

    for _, row in entities_df.fillna("").iterrows():
        canonical_name = _as_text(row.get("canonical_name")).strip()
        if not canonical_name:
            continue

        aliases = _split_aliases(row.get("aliases"), canonical_name)
        entities.append(
            {
                "canonical_name": canonical_name,
                "entity_type": _as_text(row.get("entity_type")).strip(),
                "party": _as_text(row.get("party")).strip(),
                "aliases": [
                    {"alias": alias, "pattern": _alias_pattern(alias)}
                    for alias in aliases
                ],
            }
        )

    return entities


def _overlaps(span: tuple[int, int], used_spans: Iterable[tuple[int, int]]) -> bool:
    start, end = span
    return any(start < used_end and end > used_start for used_start, used_end in used_spans)


def _context_sentence(text: str, start: int, end: int) -> str:
    if not text:
        return ""

    sentence_start = max(
        text.rfind(".", 0, start),
        text.rfind("!", 0, start),
        text.rfind("?", 0, start),
        text.rfind("\n", 0, start),
    )
    sentence_end_candidates = [
        position for position in (
            text.find(".", end),
            text.find("!", end),
            text.find("?", end),
            text.find("\n", end),
        )
        if position != -1
    ]

    sentence_start = 0 if sentence_start == -1 else sentence_start + 1
    sentence_end = min(sentence_end_candidates) + 1 if sentence_end_candidates else len(text)
    sentence = " ".join(text[sentence_start:sentence_end].split())
    return sentence[:500]


def _is_negated(text: str, start: int) -> bool:
    previous_words = re.findall(r"\b\w+\b", text[max(0, start - 40) : start])
    return any(word in NEGATORS for word in previous_words[-4:])


def _term_matches(text: str, terms: tuple[str, ...], polarity: int) -> tuple[list[str], int, int]:
    matched_terms = []
    score = 0

    for term in terms:
        pattern = re.compile(rf"(?<!\w){re.escape(term)}\w*", flags=re.IGNORECASE)
        for match in pattern.finditer(text):
            matched_terms.append(term)
            score += -polarity if _is_negated(text, match.start()) else polarity

    return sorted(set(matched_terms)), score, len(matched_terms)


def _sentiment_for_context(context: str) -> dict:
    folded_context = _fold_text(context)
    positive_terms, positive_score, positive_count = _term_matches(folded_context, POSITIVE_TERMS, 1)
    negative_terms, negative_score, negative_count = _term_matches(folded_context, NEGATIVE_TERMS, -1)

    raw_score = positive_score + negative_score
    total_terms = positive_count + negative_count
    sentiment_score = raw_score / total_terms if total_terms else 0

    if sentiment_score > 0:
        sentiment_label = "Positive"
    elif sentiment_score < 0:
        sentiment_label = "Negative"
    else:
        sentiment_label = "Neutral"

    return {
        "sentiment_label": sentiment_label,
        "sentiment_score": round(sentiment_score, 3),
        "positive_terms": "|".join(positive_terms),
        "negative_terms": "|".join(negative_terms),
    }


def _find_entity_mentions(text: str, entity: dict) -> list[dict]:
    mentions = []
    used_spans = []

    for alias_config in entity["aliases"]:
        alias = alias_config["alias"]
        pattern = alias_config["pattern"]

        for match in pattern.finditer(text):
            span = match.span()
            if _overlaps(span, used_spans):
                continue

            used_spans.append(span)
            mentions.append(
                {
                    "matched_alias": match.group(0),
                    "start": span[0],
                    "end": span[1],
                    "canonical_name": entity["canonical_name"],
                    "entity_type": entity["entity_type"],
                    "party": entity["party"],
                }
            )

    return sorted(mentions, key=lambda mention: mention["start"])


def _build_mentions(articles_df: pd.DataFrame, entities_df: pd.DataFrame) -> pd.DataFrame:
    entities = _compile_entities(entities_df)
    rows = []

    for index, article in articles_df.fillna("").iterrows():
        article_id = _article_id(article, index)
        url = _as_text(article.get("url"))
        source = _as_text(article.get("source")) or "unknown"
        published_date = _extract_published_date(article)
        title = _as_text(article.get("title"))
        content = _as_text(article.get("content"))

        for entity in entities:
            for mention in _find_entity_mentions(title, entity):
                sentiment = _sentiment_for_context(title)
                rows.append(
                    {
                        "article_id": article_id,
                        "url": url,
                        "source": source,
                        "published_date": published_date,
                        "title": title,
                        "canonical_name": mention["canonical_name"],
                        "entity_type": mention["entity_type"],
                        "party": mention["party"],
                        "matched_alias": mention["matched_alias"],
                        "appeared_in_title": True,
                        "mention_weight": 3,
                        "context_sentence": title,
                        **sentiment,
                    }
                )

            for mention in _find_entity_mentions(content, entity):
                context = _context_sentence(content, mention["start"], mention["end"])
                sentiment = _sentiment_for_context(context)
                rows.append(
                    {
                        "article_id": article_id,
                        "url": url,
                        "source": source,
                        "published_date": published_date,
                        "title": title,
                        "canonical_name": mention["canonical_name"],
                        "entity_type": mention["entity_type"],
                        "party": mention["party"],
                        "matched_alias": mention["matched_alias"],
                        "appeared_in_title": False,
                        "mention_weight": 1,
                        "context_sentence": context,
                        **sentiment,
                    }
                )

    if not rows:
        return pd.DataFrame(columns=MENTION_COLUMNS)

    return pd.DataFrame(rows, columns=MENTION_COLUMNS)


def _entity_metrics(mentions_df: pd.DataFrame) -> pd.DataFrame:
    if mentions_df.empty:
        return pd.DataFrame(columns=ENTITY_METRIC_COLUMNS)

    metrics = (
        mentions_df.groupby(
            ["source", "published_date", "party", "canonical_name", "entity_type"],
            dropna=False,
        )
        .agg(
            mentions=("matched_alias", "size"),
            articles=("article_id", "nunique"),
            title_mentions=("appeared_in_title", "sum"),
            mention_weight=("mention_weight", "sum"),
            positive_mentions=("sentiment_label", lambda values: (values == "Positive").sum()),
            neutral_mentions=("sentiment_label", lambda values: (values == "Neutral").sum()),
            negative_mentions=("sentiment_label", lambda values: (values == "Negative").sum()),
            avg_sentiment_score=("sentiment_score", "mean"),
        )
        .reset_index()
    )
    metrics["avg_sentiment_score"] = metrics["avg_sentiment_score"].fillna(0).round(3)
    metrics["favorability_score"] = (
        (metrics["positive_mentions"] + (0.5 * metrics["neutral_mentions"]))
        / metrics["mentions"].clip(lower=1)
        * 100
    ).round(1)

    return metrics.sort_values(
        ["published_date", "source", "mention_weight", "mentions"],
        ascending=[True, True, False, False],
    )[ENTITY_METRIC_COLUMNS]


def _party_metrics(mentions_df: pd.DataFrame) -> pd.DataFrame:
    if mentions_df.empty:
        return pd.DataFrame(columns=PARTY_METRIC_COLUMNS)

    metrics = (
        mentions_df.groupby(["source", "published_date", "party"], dropna=False)
        .agg(
            mentions=("matched_alias", "size"),
            articles=("article_id", "nunique"),
            title_mentions=("appeared_in_title", "sum"),
            mention_weight=("mention_weight", "sum"),
            positive_mentions=("sentiment_label", lambda values: (values == "Positive").sum()),
            neutral_mentions=("sentiment_label", lambda values: (values == "Neutral").sum()),
            negative_mentions=("sentiment_label", lambda values: (values == "Negative").sum()),
            avg_sentiment_score=("sentiment_score", "mean"),
        )
        .reset_index()
    )
    metrics["avg_sentiment_score"] = metrics["avg_sentiment_score"].fillna(0).round(3)
    metrics["favorability_score"] = (
        (metrics["positive_mentions"] + (0.5 * metrics["neutral_mentions"]))
        / metrics["mentions"].clip(lower=1)
        * 100
    ).round(1)

    return metrics.sort_values(
        ["published_date", "source", "mention_weight", "mentions"],
        ascending=[True, True, False, False],
    )[PARTY_METRIC_COLUMNS]


def build_political_coverage_tables(
    articles_df: pd.DataFrame, entities_df: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Build political mention rows and aggregate political coverage metrics."""
    mentions_df = _build_mentions(articles_df, entities_df)
    return mentions_df, _entity_metrics(mentions_df), _party_metrics(mentions_df)
