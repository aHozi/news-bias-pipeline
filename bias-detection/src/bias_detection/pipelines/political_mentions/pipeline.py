"""
Political mentions pipeline.
"""

from kedro.pipeline import Pipeline, node, pipeline

from .nodes import build_political_coverage_tables


def create_pipeline(**kwargs) -> Pipeline:
    return pipeline(
        [
            node(
                func=build_political_coverage_tables,
                inputs=["articles_cleaned", "political_entities"],
                outputs=[
                    "political_mentions",
                    "political_entity_metrics",
                    "party_source_metrics",
                ],
                name="build_political_coverage_tables_node",
            ),
        ]
    )
