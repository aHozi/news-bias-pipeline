"""
This is a boilerplate pipeline 'data_processing'
generated using Kedro 1.0.0
"""

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
