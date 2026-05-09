"""
Popularity metrics pipeline
"""

from kedro.pipeline import Pipeline, node, pipeline
from .nodes import extract_persons_from_articles


def create_pipeline(**kwargs) -> Pipeline:
    return pipeline(
        [
            node(
                func=extract_persons_from_articles,
                inputs=["articles_cleaned", "params:ner_model_path"],
                outputs="popularity_people_metrics",
                name="extract_people_node",
            ),
        ]
    )
