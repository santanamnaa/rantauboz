// Aggregate each source before joining: multiple expenses must never multiply a budget.
export const monthlyTrackingSql = `
WITH bounds AS (
 SELECT GREATEST(date '2000-01-01', $2::date - interval '11 months') AS first,
        $2::date AS last
), months AS (
 SELECT generate_series(first, last, interval '1 month')::date AS month FROM bounds
), allocations AS (
 SELECT b.month, sum(b.amount) AS budget, count(*) AS count
 FROM budgets b, bounds r
 WHERE b.user_id=$1 AND b.month >= r.first AND b.month <= r.last
 GROUP BY b.month
), spending AS (
 SELECT date_trunc('month', e.date)::date AS month, sum(e.amount) AS spent, count(*) AS count
 FROM expenses e, bounds r
 WHERE e.user_id=$1 AND e.date >= r.first AND e.date < r.last + interval '1 month'
 GROUP BY 1
)
SELECT to_char(m.month,'YYYY-MM') AS month,
 coalesce(a.budget,0)::float8 AS budget,
 coalesce(s.spent,0)::float8 AS spent,
 (coalesce(a.budget,0)-coalesce(s.spent,0))::float8 AS remaining,
 coalesce(a.count,0)::integer AS "budgetCount",
 coalesce(s.count,0)::integer AS "expenseCount"
FROM months m LEFT JOIN allocations a ON a.month=m.month LEFT JOIN spending s ON s.month=m.month
ORDER BY m.month`;
