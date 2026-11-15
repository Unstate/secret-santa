use std::time::Duration;

use super::{ParseError, ProductInfo, ProductParser, Source};

pub struct WildberriesParser {
    http: reqwest::Client,
}

impl WildberriesParser {
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

    async fn card(&self, code: &str) -> Result<serde_json::Value, ParseError> {
        let url = format!(
            "https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm={code}"
        );
        let response =
            self.http.get(url).send().await.map_err(|error| {
                ParseError::Unavailable(format!("card API недоступен: {error}"))
            })?;
        if !response.status().is_success() {
            return Err(ParseError::Unavailable(format!(
                "card API вернул {} (возможна блокировка по IP)",
                response.status()
            )));
        }
        response.json().await.map_err(|error| {
            ParseError::Unavailable(format!("неожиданный ответ card API: {error}"))
        })
    }

    async fn image_url(&self, code: &str) -> Option<String> {
        let nm: u64 = code.parse().ok()?;
        let vol = nm / 1_000_000;
        let part = nm / 1_000;

        let guess = basket_number(vol);
        let candidates = [
            guess,
            guess + 1,
            guess.saturating_sub(1).max(1),
            guess + 2,
            guess.saturating_sub(2).max(1),
        ];
        for basket in candidates {
            let url = format!(
                "https://basket-{basket:02}.wbbasket.ru/vol{vol}/part{part}/{nm}/images/c246x328/1.webp"
            );
            if self.head_ok(&url).await {
                return Some(url);
            }
        }
        None
    }

    async fn head_ok(&self, url: &str) -> bool {
        matches!(
            self.http.head(url).send().await,
            Ok(response) if response.status().is_success()
        )
    }
}

impl Default for WildberriesParser {
    fn default() -> Self {
        Self::new()
    }
}

fn stocks_qty(product: &serde_json::Value) -> u64 {
    product["sizes"]
        .as_array()
        .map(|sizes| {
            sizes
                .iter()
                .map(|size| {
                    size["stocks"]
                        .as_array()
                        .map(|stocks| {
                            stocks
                                .iter()
                                .filter_map(|stock| stock["qty"].as_u64())
                                .sum::<u64>()
                        })
                        .unwrap_or(0)
                })
                .sum()
        })
        .unwrap_or(0)
}

fn basket_number(vol: u64) -> u64 {
    const EARLY: &[(u64, u64)] = &[
        (143, 1),
        (287, 2),
        (431, 3),
        (719, 4),
        (1007, 5),
        (1061, 6),
        (1115, 7),
        (1169, 8),
        (1313, 9),
        (1601, 10),
        (1655, 11),
        (1919, 12),
        (2045, 13),
        (2189, 14),
    ];
    for (max_vol, basket) in EARLY {
        if vol <= *max_vol {
            return *basket;
        }
    }
    15 + (vol - 2190) / 216
}

#[async_trait::async_trait]
impl ProductParser for WildberriesParser {
    fn source(&self) -> Source {
        Source::Wildberries
    }

    async fn parse(&self, code: &str) -> Result<ProductInfo, ParseError> {
        if code.chars().any(|c| !c.is_ascii_digit()) {
            return Err(ParseError::Unavailable(
                "артикул WB — число, проверьте код товара".into(),
            ));
        }

        let value = self.card(code).await?;
        let product = value
            .pointer("/data/products/0")
            .ok_or_else(|| ParseError::Unavailable("card API не нашёл такой товар".into()))?;

        let title = product["name"].as_str().map(str::to_owned);
        let price = product["salePriceU"].as_i64();
        let in_stock = Some(stocks_qty(product) > 0);
        let image_url = self.image_url(code).await;

        Ok(ProductInfo {
            source: Source::Wildberries,
            code: code.to_string(),
            link: Source::Wildberries.product_link(code),
            title,
            image_url,
            price,
            in_stock,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::basket_number;

    #[test]
    fn basket_matches_known_ranges() {
        assert_eq!(basket_number(1), 1);
        assert_eq!(basket_number(143), 1);
        assert_eq!(basket_number(144), 2);
        assert_eq!(basket_number(287), 2);
        assert_eq!(basket_number(288), 3);
        assert_eq!(basket_number(719), 4);
        assert_eq!(basket_number(198), 2);
        assert_eq!(basket_number(2189), 14);
        assert_eq!(basket_number(2190), 15);
        assert_eq!(basket_number(2406), 16);
        assert_eq!(basket_number(5430), 30);
    }
}
