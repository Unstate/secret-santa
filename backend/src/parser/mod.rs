//! Парсинг товаров вишлиста. Решение (15.11): пользователь выбирает
//! маркетплейс радиобатоном и вводит артикул; ссылка генерируется из кода,
//! метаданные подтягиваются best effort. Незапарсившийся товар не блокирует
//! вишлист — fallback на ручной ввод.

pub mod ozon;
pub mod wildberries;

use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    Manual,
    Wildberries,
    Ozon,
}

impl Source {
    /// Ссылка строится детерминированно из артикула и доступна даже тогда,
    /// когда метаданные получить не удалось. У ручного товара ссылки нет.
    pub fn product_link(self, code: &str) -> Option<String> {
        match self {
            Source::Wildberries => Some(format!(
                "https://www.wildberries.ru/catalog/{code}/detail.aspx"
            )),
            Source::Ozon => Some(format!("https://www.ozon.ru/product/{code}/")),
            Source::Manual => None,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductInfo {
    pub source: Source,
    pub code: String,
    pub link: Option<String>,
    pub title: Option<String>,
    pub image_url: Option<String>,
    /// Копейки.
    pub price: Option<i64>,
    /// `None` — наличие неизвестно (например, ручной ввод).
    pub in_stock: Option<bool>,
}

#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("для источника {0:?} нет парсера")]
    NoParser(Source),
    #[error("данные товара недоступны: {0}")]
    Unavailable(String),
}

#[async_trait::async_trait]
pub trait ProductParser: Send + Sync {
    fn source(&self) -> Source;
    async fn parse(&self, code: &str) -> Result<ProductInfo, ParseError>;
}

#[derive(Clone)]
pub struct ParserRegistry {
    parsers: Vec<Arc<dyn ProductParser>>,
}

impl Default for ParserRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl ParserRegistry {
    pub fn new() -> Self {
        Self {
            parsers: vec![
                Arc::new(wildberries::WildberriesParser::new()),
                Arc::new(ozon::OzonParser::new()),
            ],
        }
    }

    pub fn get(&self, source: Source) -> Option<&dyn ProductParser> {
        self.parsers
            .iter()
            .find(|parser| parser.source() == source)
            .map(|parser| parser.as_ref())
    }

    pub async fn parse(&self, source: Source, code: &str) -> Result<ProductInfo, ParseError> {
        self.get(source)
            .ok_or(ParseError::NoParser(source))?
            .parse(code)
            .await
    }
}
