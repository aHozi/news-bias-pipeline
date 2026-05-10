from kedro.pipeline import Pipeline, node, pipeline
from .nodes import (
    clean_articles,
    combine_articles,
    filter_albanian_articles,
    normalize_source_article_counts,
)

SOURCES = ["tch", "klan", "reporttv", "news24", "euronews", "abc", "vizionplus", "rtsh"]

def create_pipeline(**kwargs) -> Pipeline:
    clean_nodes = [
        node(
            func=clean_articles,
            inputs=f"articles_{source}",
            outputs=f"articles_cleaned_{source}",
            name=f"clean_articles_{source}_node",
        )
        for source in SOURCES
    ]

    combine = node(
        func=combine_articles,
        inputs=[f"articles_cleaned_{source}" for source in SOURCES],
        outputs="articles_combined",
        name="combine_articles_node",
    )

    filter_albanian = node(
        func=filter_albanian_articles,
        inputs=["articles_combined", "params:langid_model_path"],
        outputs="articles_albanian",
        name="filter_albanian_node",
    )

    normalize_sources = node(
        func=normalize_source_article_counts,
        inputs=["articles_albanian", "params:articles_per_source_target"],
        outputs="articles_cleaned",
        name="normalize_source_article_counts_node",
    )

    return pipeline(clean_nodes + [combine, filter_albanian, normalize_sources])
