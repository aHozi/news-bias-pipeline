"""
This is a boilerplate pipeline 'data_processing'
generated using Kedro 1.0.0
"""

import langid
import pandas as pd
from langid.langid import LanguageIdentifier

def filter_albanian_articles(df: pd.DataFrame, model_path: str = None) -> pd.DataFrame:
    """Filter articles to keep only Albanian language items using langid.

    Args:
        df: DataFrame with articles
        model_path: Path to custom trained langid model (text file with model string)

    Returns:
        DataFrame containing only Albanian articles
    """

    identifier = None
    if model_path:
        with open(model_path, "r") as model_file:
            model_string = model_file.read().encode()
        identifier = LanguageIdentifier.from_modelstring(model_string, norm_probs=True)

    def is_albanian(text):
        if pd.isna(text):
            return False
        try:
            classifier = identifier.classify if identifier else langid.classify
            lang, confidence = classifier(text)

            return lang == "sq"  # sq is ISO 639-1 code for Albanian
        except Exception as e:
            print(f"Error classifying text: {e}")
            return False

    # Filter to keep only Albanian articles
    df = df[df["content"].apply(is_albanian)].copy()
    return df

def clean_articles(df: pd.DataFrame) -> pd.DataFrame:
    """Same cleaning logic for any source."""
    df = df.dropna(subset=["content"])
    df = df.drop_duplicates(subset=["title"], keep="first")
    return df

def combine_articles(*dfs: pd.DataFrame) -> pd.DataFrame:
    return pd.concat(dfs, ignore_index=True)

def normalize_source_article_counts(
    df: pd.DataFrame, articles_per_source_target: int = None
) -> pd.DataFrame:
    """Keep the same article count per source for fair media comparison.

    If no target is configured, every source is capped to the smallest available
    source count after cleaning and language filtering. If a target is set, the
    effective target is still capped by the smallest source so all sources stay
    balanced.
    """
    if df.empty or "source" not in df.columns:
        return df

    counts = df.groupby("source").size()
    if counts.empty:
        return df

    smallest_source_count = int(counts.min())
    configured_target = (
        int(articles_per_source_target)
        if articles_per_source_target is not None and int(articles_per_source_target) > 0
        else smallest_source_count
    )
    target_count = min(configured_target, smallest_source_count)

    sortable = df.copy()
    sortable["_published_sort"] = pd.to_datetime(
        sortable.get("published_date"), errors="coerce", utc=True
    )
    sortable["_original_order"] = range(len(sortable))

    sortable = sortable.sort_values(
        by=["source", "_published_sort", "_original_order"],
        ascending=[True, False, True],
        na_position="last",
    )
    normalized = sortable.groupby("source", group_keys=False).head(target_count)
    normalized = normalized.drop(columns=["_published_sort", "_original_order"])
    return normalized.reset_index(drop=True)
