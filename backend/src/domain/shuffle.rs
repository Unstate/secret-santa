//! Чистая логика шафла: без БД и HTTP — только математика.
//!
//! Инварианты результата:
//! 1. это биекция (каждый игрок — получатель ровно один раз);
//! 2. никто не дарит сам себе;
//! 3. соблюдаются исключения: пары `(giver, recipient)` не входят в `blocked`.

use std::collections::BTreeSet;

use rand::{Rng, seq::SliceRandom};

use super::validate;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShuffleError {
    /// Шафл невозможен; список — человеческие причины для UI организатора.
    Impossible(Vec<String>),
    /// Неожиданный сбой генерации; после проверки разрешимости возникать не должен.
    GenerationFailed,
}

impl std::fmt::Display for ShuffleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ShuffleError::Impossible(reasons) => {
                write!(f, "шафл невозможен: {}", reasons.join("; "))
            }
            ShuffleError::GenerationFailed => write!(f, "генерация шафла не удалась"),
        }
    }
}

impl std::error::Error for ShuffleError {}

/// Строит дарение: `assignment[giver] = recipient` (индексы в `names`).
/// `names` нужны только для человекочитаемых причин невозможности.
/// Продуктовое правило: минимум 3 игрока.
pub fn shuffle(
    names: &[&str],
    blocked: &BTreeSet<(usize, usize)>,
    rng: &mut impl Rng,
) -> Result<Vec<usize>, ShuffleError> {
    let n = names.len();
    if n < 3 {
        return Err(ShuffleError::Impossible(vec![format!(
            "минимум 3 игрока, сейчас {n}"
        )]));
    }

    if !validate::perfect_matching_exists(n, blocked) {
        return Err(ShuffleError::Impossible(validate::impossibility_reasons(
            names, blocked,
        )));
    }

    // Существование уже доказано matching'ом, поэтому randomized backtracking
    // с бюджетом узлов и свежим случайным порядком попыток сходится.
    for _ in 0..32 {
        if let Some(assignment) = randomized_backtracking(n, blocked, rng) {
            debug_assert!(validate::validate_assignment(n, blocked, &assignment));
            return Ok(assignment);
        }
    }

    // Подстраховка: детерминированный matching — валидный, но менее случайный;
    // ветка практически недостижима.
    validate::find_matching(n, blocked).ok_or(ShuffleError::GenerationFailed)
}

/// Один прогон randomized backtracking: дарители в случайном порядке, каждому —
/// случайный свободный допустимый получатель; тупик — откат по дереву.
/// Бюджет раскрытых узлов защищает от патологического случая.
fn randomized_backtracking(
    n: usize,
    blocked: &BTreeSet<(usize, usize)>,
    rng: &mut impl Rng,
) -> Option<Vec<usize>> {
    let mut order: Vec<usize> = (0..n).collect();
    order.shuffle(rng);

    let mut assignment = vec![usize::MAX; n];
    let mut used_recipient = vec![false; n];
    let mut budget: u32 = 100_000;

    fn dfs(
        order: &[usize],
        index: usize,
        blocked: &BTreeSet<(usize, usize)>,
        assignment: &mut [usize],
        used_recipient: &mut [bool],
        rng: &mut impl Rng,
        budget: &mut u32,
    ) -> bool {
        if index == order.len() {
            return true;
        }
        let giver = order[index];
        let mut candidates: Vec<usize> = (0..order.len())
            .filter(|&recipient| {
                recipient != giver
                    && !blocked.contains(&(giver, recipient))
                    && !used_recipient[recipient]
            })
            .collect();
        candidates.shuffle(rng);

        for recipient in candidates {
            if *budget == 0 {
                return false;
            }
            *budget -= 1;

            assignment[giver] = recipient;
            used_recipient[recipient] = true;
            if dfs(
                order,
                index + 1,
                blocked,
                assignment,
                used_recipient,
                rng,
                budget,
            ) {
                return true;
            }
            used_recipient[recipient] = false;
            assignment[giver] = usize::MAX;
        }
        false
    }

    dfs(
        &order,
        0,
        blocked,
        &mut assignment,
        &mut used_recipient,
        rng,
        &mut budget,
    )
    .then_some(assignment)
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    use rand::{Rng, SeedableRng, rngs::StdRng};

    fn rng(seed: u64) -> StdRng {
        StdRng::seed_from_u64(seed)
    }

    fn make_names(n: usize) -> Vec<String> {
        (0..n).map(|i| format!("игрок{i}")).collect()
    }

    fn str_names(names: &[String]) -> Vec<&str> {
        names.iter().map(String::as_str).collect()
    }

    #[test]
    fn without_exclusions_is_derangement() {
        for seed in 0..50u64 {
            let owned = make_names(10);
            let names = str_names(&owned);
            let mut r = rng(seed);
            let assignment = shuffle(&names, &BTreeSet::new(), &mut r).unwrap();
            assert!(validate::validate_assignment(
                names.len(),
                &BTreeSet::new(),
                &assignment
            ));
        }
    }

    #[test]
    fn min_players_is_three() {
        let mut r = rng(1);
        assert!(matches!(
            shuffle(&["Аня", "Боря"], &BTreeSet::new(), &mut r),
            Err(ShuffleError::Impossible(_))
        ));
    }

    #[test]
    fn mutual_block_of_two_of_three_is_impossible() {
        // Аня и Боря могут дарить только Вере — пар на всех не хватает.
        let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(0, 1), (1, 0)]);
        let mut r = rng(2);
        assert!(matches!(
            shuffle(&["Аня", "Боря", "Вера"], &blocked, &mut r),
            Err(ShuffleError::Impossible(_))
        ));
    }

    #[test]
    fn reasons_use_player_names() {
        let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(0, 1), (0, 2)]);
        let names = ["Аня", "Боря", "Вера"];
        let reasons = validate::impossibility_reasons(&names, &blocked);
        assert_eq!(
            reasons,
            vec!["у игрока Аня не осталось допустимых получателей"]
        );
    }

    #[test]
    fn forced_exclusions_give_the_only_answer() {
        // Цикл Аня≠Боря, Боря≠Вера, Вера≠Аня: единственное решение
        // Аня→Вера, Боря→Аня, Вера→Боря.
        let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(0, 1), (1, 2), (2, 0)]);
        let mut r = rng(3);
        assert_eq!(
            shuffle(&["Аня", "Боря", "Вера"], &blocked, &mut r).unwrap(),
            vec![2, 0, 1]
        );
    }

    proptest! {
        #[test]
        fn random_exclusions_preserve_invariants(n in 3usize..=40, seed in any::<u64>()) {
            let mut r = rng(seed);
            let mut blocked = BTreeSet::new();
            for _ in 0..(2 * n) {
                let giver = r.random_range(0..n);
                let recipient = r.random_range(0..n);
                if giver != recipient {
                    blocked.insert((giver, recipient));
                }
            }
            // Неразрешимые конфигурации — валидный исход, пропускаем.
            let owned = make_names(n);
            let names = str_names(&owned);
            let Ok(assignment) = shuffle(&names, &blocked, &mut r) else {
                return Ok(());
            };
            prop_assert!(validate::validate_assignment(n, &blocked, &assignment));
        }
    }
}
