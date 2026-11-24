use std::collections::BTreeSet;

use rand::{Rng, seq::SliceRandom};

use super::validate;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShuffleError {
    Impossible(Vec<String>),
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

    // Исключения взаимны: «Рома не дарит Юре» означает и «Юра не дарит Роме».
    let blocked = mutual_blocked(blocked);

    if !validate::perfect_matching_exists(n, &blocked) {
        return Err(ShuffleError::Impossible(validate::impossibility_reasons(
            names, &blocked,
        )));
    }

    for _ in 0..32 {
        if let Some(assignment) = randomized_backtracking(n, &blocked, rng) {
            debug_assert!(validate::validate_assignment(n, &blocked, &assignment));
            return Ok(assignment);
        }
    }

    validate::find_matching(n, &blocked).ok_or(ShuffleError::GenerationFailed)
}

/// Направленное исключение (giver, recipient) запрещает дарение в обе стороны.
pub fn mutual_blocked(blocked: &BTreeSet<(usize, usize)>) -> BTreeSet<(usize, usize)> {
    blocked
        .iter()
        .flat_map(|&(giver, recipient)| [(giver, recipient), (recipient, giver)])
        .filter(|&(giver, recipient)| giver != recipient)
        .collect()
}

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
    fn exclusion_is_mutual_in_result() {
        // Задано только «игрок2 не дарит игроку4», но и игрок4 не должен
        // достаться игроку2 в пары.
        for seed in 0..30u64 {
            let owned = make_names(6);
            let names = str_names(&owned);
            let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(2, 4)]);
            let mut r = rng(seed);
            let assignment = shuffle(&names, &blocked, &mut r).unwrap();
            assert_ne!(assignment[2], 4);
            assert_ne!(assignment[4], 2);
        }
    }

    #[test]
    fn one_way_block_of_two_of_three_is_impossible() {
        // «Аня не дарит Боре» взаимно: теперь и Аня, и Боря могут дарить
        // только Вере — два дарителя на одного получателя.
        let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(0, 1)]);
        let mut r = rng(3);
        assert!(matches!(
            shuffle(&["Аня", "Боря", "Вера"], &blocked, &mut r),
            Err(ShuffleError::Impossible(_))
        ));
    }

    #[test]
    fn one_way_blocks_leave_the_only_answer() {
        // Каждое исключение взаимно сужает выбор до единственной комплектации:
        // Аня→Вера, Боря→Гоша, Вера→Аня, Гоша→Боря.
        let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(0, 1), (1, 2), (2, 3), (3, 0)]);
        let mut r = rng(3);
        assert_eq!(
            shuffle(&["Аня", "Боря", "Вера", "Гоша"], &blocked, &mut r).unwrap(),
            vec![2, 3, 0, 1]
        );
    }

    #[test]
    fn directed_cycle_of_three_is_impossible_for_three_players() {
        // (0,1),(1,2),(2,0): во взаимной трактовке каждый заблокирован
        // с обоими — пары не собираются вовсе.
        let blocked: BTreeSet<(usize, usize)> = BTreeSet::from([(0, 1), (1, 2), (2, 0)]);
        let mut r = rng(3);
        assert!(matches!(
            shuffle(&["Аня", "Боря", "Вера"], &blocked, &mut r),
            Err(ShuffleError::Impossible(_))
        ));
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
            let owned = make_names(n);
            let names = str_names(&owned);
            let Ok(assignment) = shuffle(&names, &blocked, &mut r) else {
                return Ok(());
            };
            prop_assert!(validate::validate_assignment(n, &blocked, &assignment));
            // Взаимность: заданное исключение не работает ни в одну сторону.
            for &(giver, recipient) in &blocked {
                prop_assert_ne!(assignment[giver], recipient);
                prop_assert_ne!(assignment[recipient], giver);
            }
        }
    }
}
