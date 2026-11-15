use std::collections::BTreeSet;

pub fn allowed_recipients(
    n: usize,
    blocked: &BTreeSet<(usize, usize)>,
    giver: usize,
) -> Vec<usize> {
    (0..n)
        .filter(|&recipient| recipient != giver && !blocked.contains(&(giver, recipient)))
        .collect()
}

pub fn perfect_matching_exists(n: usize, blocked: &BTreeSet<(usize, usize)>) -> bool {
    find_matching(n, blocked).is_some()
}

pub fn impossibility_reasons(names: &[&str], blocked: &BTreeSet<(usize, usize)>) -> Vec<String> {
    let mut reasons: Vec<String> = (0..names.len())
        .filter(|&giver| allowed_recipients(names.len(), blocked, giver).is_empty())
        .map(|giver| {
            format!(
                "у игрока {} не осталось допустимых получателей",
                names[giver]
            )
        })
        .collect();
    if reasons.is_empty() {
        reasons.push("исключения не позволяют составить полные пары".to_string());
    }
    reasons
}

pub fn find_matching(n: usize, blocked: &BTreeSet<(usize, usize)>) -> Option<Vec<usize>> {
    let adjacency: Vec<Vec<usize>> = (0..n)
        .map(|giver| allowed_recipients(n, blocked, giver))
        .collect();
    let mut matching: Vec<Option<usize>> = vec![None; n];
    let mut visited: Vec<bool> = vec![false; n];

    fn augment(
        giver: usize,
        adjacency: &[Vec<usize>],
        matching: &mut [Option<usize>],
        visited: &mut [bool],
    ) -> bool {
        for &recipient in &adjacency[giver] {
            if visited[recipient] {
                continue;
            }
            visited[recipient] = true;
            let previous_owner = matching.iter().position(|&m| m == Some(recipient));
            let free = match previous_owner {
                None => true,
                Some(owner) => augment(owner, adjacency, matching, visited),
            };
            if free {
                matching[giver] = Some(recipient);
                return true;
            }
        }
        false
    }

    for giver in 0..n {
        visited.iter_mut().for_each(|v| *v = false);
        if !augment(giver, &adjacency, &mut matching, &mut visited) {
            return None;
        }
    }
    Some(
        matching
            .into_iter()
            .map(|m| m.expect("augment заполняет слот"))
            .collect(),
    )
}

pub fn validate_assignment(
    n: usize,
    blocked: &BTreeSet<(usize, usize)>,
    assignment: &[usize],
) -> bool {
    if assignment.len() != n {
        return false;
    }
    let mut seen = vec![false; n];
    for (giver, &recipient) in assignment.iter().enumerate() {
        if recipient >= n
            || recipient == giver
            || seen[recipient]
            || blocked.contains(&(giver, recipient))
        {
            return false;
        }
        seen[recipient] = true;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assignment_must_be_bijection_without_self() {
        assert!(validate_assignment(3, &BTreeSet::new(), &[1, 2, 0]));
        assert!(!validate_assignment(3, &BTreeSet::new(), &[0, 2, 1])); // сам себе
        assert!(!validate_assignment(3, &BTreeSet::new(), &[1, 2, 2])); // дубль получателя
        assert!(!validate_assignment(
            3,
            &BTreeSet::from([(0, 1)]),
            &[1, 2, 0]
        )); 
    }

    #[test]
    fn kuhn_finds_matching_or_reports_absence() {
        assert!(find_matching(3, &BTreeSet::from([(0, 1), (1, 0)])).is_none());
        assert_eq!(
            find_matching(3, &BTreeSet::from([(0, 1), (1, 2)])).unwrap(),
            vec![2, 0, 1]
        );
    }
}
