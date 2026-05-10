# Albania Political News Coverage Pipeline
A pipeline for scraping Albanian news articles and tracking how much coverage news sources give to political parties and public figures.

The project compares mentions of parties and linked individuals such as PS, PD, PL, Edi Rama, Sali Berisha, Ilir Meta, and related aliases. It produces mention-level data, aggregated party/source metrics, and a React dashboard for exploring coverage differences and trends over time.
## 📋 Project Structure
```
news-bias-pipeline/
├── news_spiders/          # Scrapy spiders for data collection
├── bias-detection/        # Kedro project for data processing
│   ├── frontend/          # React dashboard
│   └── src/               # Data processing pipelines
└── readme.md
```
---
## 🚀 Quick Start
### 1. Setup Environment
```bash
# Create virtual environment
python3 -m venv venv
# Activate (macOS/Linux)
source venv/bin/activate
# Activate (Windows)
venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt # Install Scrapy and Kedro
cd bias-detection
pip install -r requirements.txt # Install Kedro dependencies
```
### 2. Scrape News Articles
```bash
cd news_spiders #From root folder
# Scrape articles (stops at 400 items automatically) and export to CSV
scrapy crawl tch -o ../bias-detection/data/01_raw/articles_tch.csv   # Top Channel
scrapy crawl klan -o ../bias-detection/data/01_raw/articles_klan.csv   # Klan
```
### 3. Run Political Coverage Pipeline
```bash
cd bias-detection #From root folder
# Run only the political tracking pipeline after cleaned articles exist
kedro run --pipeline=political_mentions

# Run the data processing pipeline
kedro run --pipeline=data_processing

# OR run all pipelines, including legacy person popularity metrics
kedro run
```
### 4. View Dashboard
```bash
cd bias-detection/frontend # From root folder
npm install
npm run build
npm run preview
```
---
## 🔧 Detailed Commands
### Scrapy (Data Collection)
```bash
cd news_spiders # From root folder
# List available spiders
scrapy list
# Run spider with export
scrapy crawl tch -o output.csv
# Monitor spider progress
scrapy crawl klan -v
```
### Kedro (Data Processing)
```bash
cd bias-detection # From root folder
# Run specific pipeline
kedro run --pipeline=political_mentions
kedro run --pipeline=popularity_metrics
kedro run --pipeline=data_processing
# Run single node
kedro run --node=extract_people_node
# Show registered pipelines
kedro registry list
# Visualize pipeline
kedro viz
```

---
## 📈 Pipeline Flow
1. **Scrapy Spiders** → Collect articles (tch, klan)
2. **Data Processing** → Clean and prepare data
   - Normalizes article counts by source so each media outlet contributes the same number of articles
3. **Political Mentions** → Match configured party/person aliases in titles and article text
4. **Popularity Metrics** → Legacy spaCy person extraction
5. **Dashboard** → Compare party/person coverage by source, date, title mentions, and article body mentions

## 🗳️ Political Tracking Outputs
The political pipeline reads `bias-detection/conf/base/political_entities.csv`.

It generates:
- `data/03_primary/political_mentions.csv` — every detected party/person mention with source, article, matched alias, title/body flag, and context.
- `data/03_primary/political_entity_metrics.csv` — metrics grouped by source, date, party, entity, and entity type.
- `data/03_primary/party_source_metrics.csv` — metrics grouped by source, date, and party.

## 📖 Resources
- [Scrapy Documentation](https://docs.scrapy.org/)
- [Kedro Documentation](https://docs.kedro.org/)
- [spaCy NER](https://spacy.io/)
---
