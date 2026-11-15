export const friendReportSql=`
WITH access AS (
 SELECT s.* FROM friend_connections f JOIN friend_shares s ON s.connection_id=f.id
 WHERE f.id=$1 AND f.active AND ($2=f.low_user OR $2=f.high_user)
 AND s.owner_id=CASE WHEN f.low_user=$2 THEN f.high_user ELSE f.low_user END AND s.mode<>'off'
), bounds AS (
 SELECT greatest(date '2000-01-01',$3::date-interval '11 months',a.from_month) AS first,$3::date AS last FROM access a
), scope_budgets AS (
 SELECT b.* FROM budgets b JOIN access a ON a.owner_id=b.user_id CROSS JOIN bounds r
 WHERE b.month>=r.first AND b.month<=r.last AND (a.mode<>'selected' OR b.category_id=ANY(a.category_ids))
), allocations AS (
 SELECT month,sum(amount) AS budget,count(*) AS count FROM scope_budgets GROUP BY month
), spending AS (
 SELECT date_trunc('month',e.date)::date AS month,sum(e.amount) AS spent,count(*) AS count
 FROM expenses e JOIN access a ON a.owner_id=e.user_id CROSS JOIN bounds r
 WHERE e.date>=r.first AND e.date<r.last+interval '1 month'
 AND (a.mode<>'selected' OR EXISTS(SELECT 1 FROM scope_budgets b WHERE b.id=e.budget_id)) GROUP BY 1
), month_values AS (
 SELECT m.month,coalesce(b.budget,0) AS budget,coalesce(s.spent,0) AS spent,
 coalesce(b.budget,0)-coalesce(s.spent,0) AS remaining,
 coalesce(b.count,0) AS budget_count,coalesce(s.count,0) AS expense_count
 FROM bounds r CROSS JOIN LATERAL generate_series(r.first,r.last,interval '1 month') m(month)
 LEFT JOIN allocations b ON b.month=m.month LEFT JOIN spending s ON s.month=m.month
), budget_values AS (
 SELECT b.name,b.photo,b.amount AS budget,coalesce((SELECT sum(e.amount) FROM expenses e WHERE e.user_id=b.user_id AND e.budget_id=b.id AND e.date>=$3::date AND e.date<$3::date+interval '1 month'),0) AS spent
 FROM scope_budgets b WHERE b.month=$3::date
)
SELECT a.mode,to_char(a.from_month,'YYYY-MM') AS "fromMonth",
 (SELECT coalesce(jsonb_agg(jsonb_build_object('month',to_char(v.month,'YYYY-MM'),'hasData',v.budget_count>0 OR v.expense_count>0,
 'budget',CASE WHEN a.mode<>'progress' THEN v.budget END,'spent',CASE WHEN a.mode<>'progress' THEN v.spent END,
 'remaining',CASE WHEN a.mode<>'progress' THEN v.remaining END,'budgetCount',CASE WHEN a.mode<>'progress' THEN v.budget_count END,
 'expenseCount',CASE WHEN a.mode<>'progress' THEN v.expense_count END,
 'percentUsed',CASE WHEN v.budget>0 THEN round(v.spent/v.budget*100)::float8 END,'overBudget',v.spent>v.budget) ORDER BY v.month),'[]'::jsonb) FROM month_values v) AS months,
 CASE WHEN a.mode IN ('progress','selected') THEN (SELECT coalesce(jsonb_agg(jsonb_build_object('name',v.name,'photo',v.photo,
 'budget',CASE WHEN a.mode='selected' THEN v.budget END,'spent',CASE WHEN a.mode='selected' THEN v.spent END,
 'remaining',CASE WHEN a.mode='selected' THEN v.budget-v.spent END,
 'percentUsed',round(v.spent/v.budget*100)::float8,'overBudget',v.spent>v.budget) ORDER BY v.name),'[]'::jsonb) FROM budget_values v) ELSE '[]'::jsonb END AS budgets
FROM access a`;
