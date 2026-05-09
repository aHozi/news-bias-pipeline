"""Project pipelines."""
from __future__ import annotations

from kedro.framework.project import find_pipelines
from kedro.pipeline import Pipeline
from bias_detection.pipelines.data_processing import create_pipeline as create_data_processing_pipeline
from bias_detection.pipelines.popularity_metrics import create_pipeline as create_popularity_metrics_pipeline

def register_pipelines() -> dict[str, Pipeline]:
    """Register the project's pipelines.

    Returns:
        A mapping from pipeline names to ``Pipeline`` objects.
    """
    pipelines = find_pipelines()
    pipelines["data_processing"] = create_data_processing_pipeline()
    pipelines["popularity_metrics"] = create_popularity_metrics_pipeline()
    pipelines["__default__"] = sum(pipelines.values())
    return pipelines
