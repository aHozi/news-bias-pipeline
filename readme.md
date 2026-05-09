# News Bias Detection Pipeline
A complete pipeline for scraping news articles and analyzing media bias using NER (Named Entity Recognition) and popularity metrics.
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
### 3. Run Bias Detection Pipeline
```bash
cd bias-detection #From root folder
# Run the data processing pipeline
kedro run --pipeline=data_processing
# OR Run all pipelines
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
kedro run --pipeline=popularity_metrics
kedro run --pipeline=data_processing
# Run single node
kedro run --node=extract_people_node
# Preview pipeline (dry run)
kedro run --dry-run
# Visualize pipeline
kedro viz
```

---
## 📈 Pipeline Flow
1. **Scrapy Spiders** → Collect articles (tch, klan)
2. **Data Processing** → Clean and prepare data
3. **Popularity Metrics** → Extract person entities
4. **Dashboard** → Visualize bias patterns
---

## 📖 Resources
- [Scrapy Documentation](https://docs.scrapy.org/)
- [Kedro Documentation](https://docs.kedro.org/)
- [spaCy NER](https://spacy.io/)
---
