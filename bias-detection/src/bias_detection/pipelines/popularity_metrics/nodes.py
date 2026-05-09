"""
Popularity metrics pipeline nodes
"""

import pandas as pd
import spacy


def _merge_similar_names(names: list) -> dict:
    """Merge similar names using substring matching.

    If one name is a substring of another (case-insensitive),
    they are merged under the longer name.

    Args:
        names: List of name strings to merge

    Returns:
        Dictionary mapping original names to canonical names
    """
    if not names:
        return {}

    # Sort by length descending to prefer longer names as canonical
    sorted_names = sorted(set(names), key=len, reverse=True)
    name_mapping = {}

    # Assign each name to a canonical form
    for name in sorted_names:
        if name in name_mapping:
            continue

        # Check if this name is a substring of an already canonical name
        canonical = name
        for existing_canonical in [n for n in sorted_names if n in name_mapping.values()]:
            if name.lower() in existing_canonical.lower():
                canonical = existing_canonical
                break

        name_mapping[name] = canonical

    return name_mapping


def extract_persons_from_articles(df: pd.DataFrame, model_path: str) -> pd.DataFrame:
    """Extract person entities from articles using spaCy NER.
    
    Automatically merges similar names (e.g., "Trump" and "Donald Trump") into
    a single canonical form to ensure accurate mention counts.

    Args:
        df: DataFrame with articles containing 'content' and 'source' columns
        model_path: Path to custom trained spaCy NER model
        
    Returns:
        DataFrame with columns: name, source, total_mentions
    """
    # Load custom spaCy model
    nlp = spacy.load(model_path)
    
    persons_list = []
    
    for _, row in df.iterrows():
        content = row.get("content", "")
        source = row.get("source", "unknown")
        
        if pd.isna(content):
            continue
            
        # Process text with spaCy
        doc = nlp(str(content))
        
        # Extract PERSON entities
        for ent in doc.ents:
            if ent.label_ == "PER":
                persons_list.append({
                    "name": ent.text,
                    "source": source
                })
    
    # Create DataFrame from extracted persons
    if not persons_list:
        return pd.DataFrame(columns=["name", "source", "total_mentions"])
    
    persons_df = pd.DataFrame(persons_list)
    
    # Merge similar names per source
    persons_df["canonical_name"] = persons_df.apply(
        lambda row: _merge_similar_names([row["name"]]).get(row["name"], row["name"]),
        axis=1
    )

    # For each source, build a comprehensive name mapping to catch all variants
    for source in persons_df["source"].unique():
        source_names = persons_df[persons_df["source"] == source]["name"].unique().tolist()
        name_mapping = _merge_similar_names(source_names)

        # Apply the mapping to this source's data
        mask = persons_df["source"] == source
        persons_df.loc[mask, "canonical_name"] = persons_df.loc[mask, "name"].map(name_mapping)

    # Group by canonical name and source, count mentions
    popularity_df = persons_df.groupby(["canonical_name", "source"]).size().reset_index(name="total_mentions")
    popularity_df.rename(columns={"canonical_name": "name"}, inplace=True)

    # Sort by mentions descending
    popularity_df = popularity_df.sort_values("total_mentions", ascending=False)
    
    return popularity_df

