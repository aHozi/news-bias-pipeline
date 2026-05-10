import re
import unicodedata

from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule


def _fold_text(value):
    text = unicodedata.normalize("NFKD", value.lower())
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"\s+", " ", text).strip()


def _ends_article(value):
    folded = _fold_text(value)
    return (
        "nuk do te publikohen komente" in folded
        or "mos rri jashte" in folded
        or "votat totale jane unike" in folded
    )


def _skips_line(value):
    folded = _fold_text(value)
    return (
        folded.startswith("kjo audio eshte krijuar")
        or folded.startswith("mund te kete pasaktesi")
    )


def _first_text(response, selectors):
    for selector in selectors:
        value = response.css(selector).get()
        if value and value.strip():
            return value.strip()
    return None


def _text_list(response, selectors):
    for selector in selectors:
        values = []
        for value in response.css(selector).getall():
            if not value or not value.strip():
                continue

            value = " ".join(value.split())
            if _ends_article(value):
                break
            if _skips_line(value):
                continue

            values.append(value)

        if values:
            return values
    return []


def _article_item(response, source, title_selectors, content_selectors):
    title = _first_text(response, title_selectors)
    content = _text_list(response, content_selectors)

    if not title or not content or len(" ".join(content)) < 120:
        return None

    item = {
        "url": response.url,
        "title": title,
        "content": content,
        "source": source,
    }

    published_date = _first_text(
        response,
        [
            "meta[property='article:published_time']::attr(content)",
            "meta[name='date']::attr(content)",
            "[itemprop='datePublished']::text",
            ".news-published-on::text",
            "time::attr(datetime)",
        ],
    )
    if published_date:
        item["published_date"] = published_date

    return item


class TchSpider(CrawlSpider):
    name = "tch"
    allowed_domains = ["top-channel.tv"]
    start_urls = ["https://top-channel.tv"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"/\d{4}/\d{2}/\d{2}/",
                deny=(r"/english/", r"/video/", r"/live/"),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "tch",
            ["h1::text", "meta[property='og:title']::attr(content)"],
            [".articleContent p::text", ".entry-content p::text", "article p::text"],
        )
        if item:
            yield item


class KlanSpider(CrawlSpider):
    name = "klan"
    allowed_domains = ["tvklan.al"]
    start_urls = ["https://tvklan.al"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://tvklan\.al/[^/?#]+-[^/?#]+/?$",
                deny=(
                    r"/kategoria/",
                    r"/programe/",
                    r"/guide",
                    r"/rreth-nesh",
                    r"/puno-me-ne",
                    r"/politikat-e-privatesise",
                ),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "klan",
            ["h1::text", "meta[property='og:title']::attr(content)"],
            [".post-content p::text", ".entry-content p::text", "article p::text"],
        )
        if item:
            yield item


class ReportTvSpider(CrawlSpider):
    name = "reporttv"
    allowed_domains = ["shqiptarja.com"]
    start_urls = ["https://shqiptarja.com"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://shqiptarja\.com/lajm/[^?#]+/?$",
                deny=(r"/tag/", r"/kategori/", r"/video/", r"/live/"),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "reporttv",
            ["h1.single-title::text", "h1::text", "meta[property='og:title']::attr(content)"],
            [".single_article_body p::text", ".article-body p::text"],
        )
        if item:
            yield item


class News24Spider(CrawlSpider):
    name = "news24"
    allowed_domains = ["balkanweb.com", "www.balkanweb.com"]
    start_urls = ["https://www.balkanweb.com"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://www\.balkanweb\.com/[^/?#]+/$",
                deny=(
                    r"/category/",
                    r"/kategoria/",
                    r"/contact/",
                    r"/minute-pas-minute/",
                    r"/parashikimiimotit/",
                    r"/sondazhe",
                    r"/tag/",
                    r"/author/",
                    r"/news24-live/",
                    r"/kontakt/",
                    r"/privacy",
                    r"/wp-",
                ),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "news24",
            ["h1::text", "meta[property='og:title']::attr(content)"],
            [".article-text p::text", ".entry-content p::text", "article p::text"],
        )
        if item:
            yield item


class EuronewsSpider(CrawlSpider):
    name = "euronews"
    allowed_domains = ["euronews.al"]
    start_urls = ["https://euronews.al"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://euronews\.al/[^/?#]+/$",
                deny=(
                    r"/category/",
                    r"/tag/",
                    r"/author/",
                    r"/programet/",
                    r"/live/",
                    r"/page/",
                    r"/wp-",
                ),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "euronews",
            ["h1.fw-bold.title-30::text", "h1::text", "meta[property='og:title']::attr(content)"],
            ["main#site-content article p::text", ".entry-content p::text", "main#site-content p::text"],
        )
        if item:
            yield item


class AbcNewsSpider(CrawlSpider):
    name = "abc"
    allowed_domains = ["abcnews.al"]
    start_urls = ["https://abcnews.al"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://abcnews\.al/[^/?#]+/$",
                deny=(
                    r"/category/",
                    r"/kategoria/",
                    r"/etiketa/",
                    r"/author/",
                    r"/live/",
                    r"/life/",
                    r"/minute-pas-minute/",
                    r"/news-line",
                    r"/privacy",
                    r"/kushtet",
                    r"/rregulla",
                    r"/wp-",
                ),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "abc",
            ["h1.entry-title::text", "h1::text", "meta[property='og:title']::attr(content)"],
            [".entry-content p::text", "article p::text"],
        )
        if item:
            yield item


class VizionPlusSpider(CrawlSpider):
    name = "vizionplus"
    allowed_domains = ["vizionplus.tv", "www.vizionplus.tv"]
    start_urls = ["https://www.vizionplus.tv"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://www\.vizionplus\.tv/[^/?#]+/$",
                deny=(
                    r"/category/",
                    r"/emisione/",
                    r"/programacioni",
                    r"/seriale/",
                    r"/tag/",
                    r"/author/",
                    r"/feed/",
                    r"/wp-",
                ),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "vizionplus",
            ["h1.single-entry-title::text", "h1::text", "meta[property='og:title']::attr(content)"],
            [".entry-content p::text", "article p::text"],
        )
        if item:
            yield item


class RtshSpider(CrawlSpider):
    name = "rtsh"
    allowed_domains = ["rtsh.al"]
    start_urls = ["https://rtsh.al"]

    rules = (
        Rule(
            LinkExtractor(
                allow=r"^https://rtsh\.al/[^/?#]+/$",
                deny=(
                    r"/kategoria/",
                    r"/programet/",
                    r"/radio/",
                    r"/orkestra/",
                    r"/festivali/",
                    r"/rti/",
                    r"/rreth-rtsh",
                    r"/page/",
                    r"/wp-",
                ),
            ),
            callback="parse_article",
            follow=True,
        ),
    )

    def parse_article(self, response):
        item = _article_item(
            response,
            "rtsh",
            [
                ".single-post-title-box h2::text",
                "h1::text",
                "h2::text",
                "meta[property='og:title']::attr(content)",
            ],
            [".single-post-text-content p::text", ".entry-content p::text", "article p::text"],
        )
        if item:
            yield item
