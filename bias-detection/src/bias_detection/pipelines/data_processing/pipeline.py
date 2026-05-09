from kedro.pipeline import Pipeline, node, pipeline
from .nodes import clean_articles, combine_articles, filter_albanian_articles

SOURCES = ["tch", "klan"]  # just add more here as needed

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
        outputs="articles_cleaned",
        name="filter_albanian_node",
    )

    return pipeline(clean_nodes + [combine, filter_albanian])
