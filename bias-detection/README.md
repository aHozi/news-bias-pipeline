# bias detection

[![Powered by Kedro](https://img.shields.io/badge/powered_by-kedro-ffc900?logo=kedro)](https://kedro.org)

## Overview

This Kedro project processes scraped Albanian news articles and builds two analysis layers:

* `political_mentions`: tracks configured Albanian political parties and linked public figures across source, date, title mentions, and body mentions.
* `popularity_metrics`: legacy spaCy-based person extraction for general person popularity metrics.

Before analysis, the data-processing pipeline balances article counts by source so larger media sites do not dominate the results unfairly.

## Rules and guidelines

In order to get the best out of the template:

* Don't remove any lines from the `.gitignore` file we provide
* Make sure your results can be reproduced by following a data engineering convention
* Don't commit data to your repository
* Don't commit any credentials or your local configuration to your repository. Keep all your credentials and local configuration in `conf/local/`

## How to install dependencies

Declare any dependencies in `requirements.txt` for `pip` installation.

To install them, run:

```
pip install -r requirements.txt
```

## How to run your Kedro pipeline

You can run your Kedro project with:

```
kedro run
```

Run only the political coverage layer with:

```
kedro run --pipeline=political_mentions
```

The political entity dictionary is stored in `conf/base/political_entities.csv`.

## Scrapers

Scrapy spiders live in `../news_spiders/media_crawlers/spiders/`.

Current pipeline sources are:

```
tch, klan, reporttv, news24, euronews, abc
```

Example scrape command:

```
cd ../news_spiders
../venv/bin/scrapy crawl reporttv -O ../bias-detection/data/01_raw/articles_reporttv.csv
```

Ora News is not wired into the pipeline yet because the site currently returns a Cloudflare challenge to the crawler.

## Political sentiment

The `political_mentions` pipeline scores sentiment per mention, not per whole article. It finds the sentence where a configured politician or party is mentioned, matches Albanian positive and negative term stems, and writes:

* `sentiment_label`: `Positive`, `Neutral`, or `Negative`
* `sentiment_score`: normalized score from the mention context
* `positive_terms` and `negative_terms`: matched evidence terms
* `favorability_score`: aggregate positive plus half-neutral share, from 0 to 100

This is a transparent lexicon-based signal. It is easy to inspect and tune, but it is not a trained sentiment model.

## How to test your Kedro project

Have a look at the file `tests/test_run.py` for instructions on how to write your tests. You can run your tests as follows:

```
pytest
```

You can configure the coverage threshold in your project's `pyproject.toml` file under the `[tool.coverage.report]` section.


## Project dependencies

To see and update the dependency requirements for your project use `requirements.txt`. You can install the project requirements with `pip install -r requirements.txt`.

[Further information about project dependencies](https://docs.kedro.org/en/stable/kedro_project_setup/dependencies.html#project-specific-dependencies)

## How to work with Kedro and notebooks

> Note: Using `kedro jupyter` or `kedro ipython` to run your notebook provides these variables in scope: `context`, 'session', `catalog`, and `pipelines`.
>
> Jupyter, JupyterLab, and IPython are already included in the project requirements by default, so once you have run `pip install -r requirements.txt` you will not need to take any extra steps before you use them.

### Jupyter
To use Jupyter notebooks in your Kedro project, you need to install Jupyter:

```
pip install jupyter
```

After installing Jupyter, you can start a local notebook server:

```
kedro jupyter notebook
```

### JupyterLab
To use JupyterLab, you need to install it:

```
pip install jupyterlab
```

You can also start JupyterLab:

```
kedro jupyter lab
```

### IPython
And if you want to run an IPython session:

```
kedro ipython
```

### How to ignore notebook output cells in `git`
To automatically strip out all output cell contents before committing to `git`, you can use tools like [`nbstripout`](https://github.com/kynan/nbstripout). For example, you can add a hook in `.git/config` with `nbstripout --install`. This will run `nbstripout` before anything is committed to `git`.

> *Note:* Your output cells will be retained locally.

## Package your Kedro project

[Further information about building project documentation and packaging your project](https://docs.kedro.org/en/stable/tutorial/package_a_project.html)
