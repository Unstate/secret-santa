//! Парсер Ozon: артикул → og-теги страницы товара, best effort.
//! Ozon агрессивно защищается анти-ботом (челленджи, капчи): при 403 или
//! заглушке отдаём `ParseError::Unavailable` — ссылка всё равно генерируется
//! из кода, а фронт показывает ручной ввод названия.

use std::time::Duration;

use scraper::{Html, Selector};

use super::{ParseError, ProductInfo, ProductParser, Source};

pub struct OzonParser {
    http: reqwest::Client,
}

impl OzonParser {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 \
                 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            )
            .timeout(Duration::from_secs(8))
            .build()
            .expect("reqwest-клиент с rustls строится всегда");
        Self { http }
    }

    async fn page(&self, code: &str) -> Result<String, ParseError> {
        let url = format!("https://www.ozon.ru/product/{code}/");
        let response = self
            .http
            .get(url)
            .header("accept", "text/html,application/xhtml+xml")
            .header("accept-language", "ru-RU,ru;q=0.9")
            .send()
            .await
            .map_err(|error| {
                ParseError::Unavailable(format!("страница Ozon недоступна: {error}"))
            })?;
        match response.status() {
            status if status.is_success() => response.text().await.map_err(|error| {
                ParseError::Unavailable(format!("не удалось прочитать страницу: {error}"))
            }),
            status => Err(ParseError::Unavailable(format!(
                "Ozon ответил {status} (анти-бот или товар не найден)"
            ))),
        }
    }
}

impl Default for OzonParser {
    fn default() -> Self {
        Self::new()
    }
}

fn meta_content(html: &Html, property: &str) -> Option<String> {
    let selector = Selector::parse(&format!("meta[property='{property}']")).ok()?;
    html.select(&selector)
        .next()
        .and_then(|element| element.value().attr("content"))
        .map(str::to_owned)
}

#[async_trait::async_trait]
impl ProductParser for OzonParser {
    fn source(&self) -> Source {
        Source::Ozon
    }

    async fn parse(&self, code: &str) -> Result<ProductInfo, ParseError> {
        let page = self.page(code).await?;
        let html = Html::parse_document(&page);

        // og:price:amount — цена в рублях (иногда дробная); храним в копейках.
        let price = meta_content(&html, "og:price:amount")
            .and_then(|raw| raw.replace(',', ".").trim().parse::<f64>().ok())
            .map(|rubles| (rubles * 100.0).round() as i64);

        Ok(ProductInfo {
            source: Source::Ozon,
            code: code.to_string(),
            link: Source::Ozon.product_link(code),
            title: meta_content(&html, "og:title"),
            image_url: meta_content(&html, "og:image"),
            price,
            // по og-тегам наличие надёжно не определить — решит фронт/игрок
            in_stock: None,
        })
    }
}
