import scrapy
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule

class TchSpider(CrawlSpider):
    name = "tch"
    allowed_domains = ["top-channel.tv"]
    start_urls = ["https://top-channel.tv", "https://top-channel.tv/english/"]

    rules = (
        # Extract and follow all links, calling parse_page for each
        Rule(LinkExtractor(allow=r"/\d{4}/\d{2}/\d{2}/"), callback="parse_article", follow=True),
        # Extract English article URLs (e.g., /english/article-slug/)
        Rule(LinkExtractor(allow=r"/english/[\w\-]+/$"), callback="parse_article", follow=True),
    )

    def parse_article(self, response):
        yield {
            "url": response.url,
            "title": response.css("h1::text").get(),
            "content": response.css(".articleContent p::text").getall(),
            "source": "tch",
        }
