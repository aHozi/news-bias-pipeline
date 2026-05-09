import scrapy
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule

class KlanSpider(CrawlSpider):
    name = "klan"
    allowed_domains = ["tvklan.al"]
    start_urls = ["https://tvklan.al"]

    rules = (
        # Extract and follow all links, calling parse_article for each
        Rule(LinkExtractor(allow=r"/[^/]+\-[^/]+$"), callback="parse_article", follow=True),
    )

    def parse_article(self, response):
        yield {
            "url": response.url,
            "title": response.css("h1::text").get(),
            "content": response.css(".post-content p::text").getall(),
            "source": "klan",
        }
