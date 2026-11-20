-- Casino Database Management System
-- MySQL Complex Queries: CTEs, Nested/Correlated, Recursive, Advanced Joins
-- =====================================================

-- =====================================================
-- QUERY 1: Recursive CTE - Player Referral Chain
-- Requires: ALTER TABLE PLAYER ADD COLUMN referred_by INT NULL;
-- =====================================================

-- Uncomment to add referral column:
-- ALTER TABLE PLAYER ADD COLUMN referred_by INT NULL,
--     ADD CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES PLAYER(player_id);

WITH RECURSIVE referral_chain AS (
    -- Base case: root players (not referred by anyone)
    SELECT
        player_id,
        name,
        NULL AS referred_by,
        0 AS level,
        CAST(name AS CHAR(1000)) AS referral_path
    FROM PLAYER
    WHERE referred_by IS NULL

    UNION ALL

    -- Recursive case: players referred by someone in the chain
    SELECT
        p.player_id,
        p.name,
        p.referred_by,
        rc.level + 1,
        CONCAT(rc.referral_path, ' -> ', p.name)
    FROM PLAYER p
    INNER JOIN referral_chain rc ON p.referred_by = rc.player_id
    WHERE rc.level < 10  -- Prevent infinite loops
)
SELECT
    player_id,
    name,
    referred_by,
    level AS referral_depth,
    referral_path
FROM referral_chain
ORDER BY level, player_id;

-- =====================================================
-- QUERY 2: CTE - Daily Casino Performance Report (30 days)
-- =====================================================

WITH daily_stats AS (
    SELECT
        DATE(g.start_time)                                                      AS game_date,
        g.game_type,
        COUNT(DISTINCT g.game_id)                                               AS total_games,
        COUNT(DISTINCT b.player_id)                                             AS unique_players,
        COUNT(b.bet_id)                                                         AS total_bets,
        COALESCE(SUM(b.amount), 0)                                              AS total_wagered,
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) AS total_payouts,
        COALESCE(SUM(b.amount), 0) -
            COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) AS house_profit
    FROM GAME g
    LEFT JOIN BET b ON g.game_id = b.game_id
    WHERE g.start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(g.start_time), g.game_type
),
summary AS (
    SELECT
        game_date,
        SUM(total_games)    AS daily_games,
        SUM(unique_players) AS daily_players,
        SUM(total_bets)     AS daily_bets,
        SUM(total_wagered)  AS daily_revenue,
        SUM(total_payouts)  AS daily_payouts,
        SUM(house_profit)   AS daily_profit
    FROM daily_stats
    GROUP BY game_date
)
SELECT
    ds.game_date,
    ds.game_type,
    ds.total_games,
    ds.total_wagered,
    ds.house_profit,
    s.daily_games,
    s.daily_profit,
    ROUND(ds.total_wagered / NULLIF(s.daily_revenue, 0) * 100, 2) AS game_type_contribution_pct
FROM daily_stats ds
JOIN summary s ON ds.game_date = s.game_date
ORDER BY ds.game_date DESC, ds.total_wagered DESC;

-- =====================================================
-- QUERY 3: Nested Subquery - High Rollers (Top Spenders above 2x average)
-- =====================================================

SELECT
    p.player_id,
    p.name,
    p.email,
    w.balance                       AS current_balance,
    total_stats.total_wagered,
    total_stats.total_bets,
    total_stats.win_rate,
    total_stats.avg_bet_size,
    total_stats.biggest_win
FROM PLAYER p
JOIN WALLET w ON p.player_id = w.player_id
JOIN (
    SELECT
        player_id,
        SUM(amount)                                                         AS total_wagered,
        COUNT(*)                                                            AS total_bets,
        ROUND(
            COUNT(CASE WHEN outcome = 'WON' THEN 1 END) * 100.0 /
            NULLIF(COUNT(CASE WHEN outcome IN ('WON', 'LOST') THEN 1 END), 0), 2
        )                                                                   AS win_rate,
        ROUND(AVG(amount), 2)                                               AS avg_bet_size,
        MAX(CASE WHEN outcome = 'WON' THEN payout ELSE 0 END)              AS biggest_win
    FROM BET
    WHERE bet_time >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    GROUP BY player_id
    HAVING SUM(amount) > (
        -- Correlated: players who spent > 2x the average player spend
        SELECT AVG(total_wagered)  * 2
        FROM (
            SELECT SUM(amount) AS total_wagered
            FROM BET
            WHERE bet_time >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
            GROUP BY player_id
        ) AS player_totals
    )
) AS total_stats ON p.player_id = total_stats.player_id
WHERE p.status = 'ACTIVE'
ORDER BY total_stats.total_wagered DESC
LIMIT 50;

-- =====================================================
-- QUERY 4: Complex Multi-Table JOIN - Game Performance with Dealer Info
-- =====================================================

SELECT
    g.game_id,
    g.game_type,
    ct.table_number,
    d.name                                                                                  AS dealer_name,
    d.employee_id,
    g.start_time,
    g.end_time,
    TIMESTAMPDIFF(MINUTE, g.start_time, g.end_time)                                        AS duration_minutes,
    COUNT(DISTINCT b.player_id)                                                             AS unique_players,
    COUNT(b.bet_id)                                                                         AS total_bets,
    COALESCE(SUM(b.amount), 0)                                                              AS total_wagered,
    COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)                AS total_payouts,
    COALESCE(SUM(b.amount), 0) -
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)            AS house_profit,
    ROUND(
        (COALESCE(SUM(b.amount), 0) -
            COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)) * 100.0 /
        NULLIF(SUM(b.amount), 0), 2
    )                                                                                       AS house_edge_pct,
    ROUND(
        COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END), 0), 2
    )                                                                                       AS player_win_rate
FROM GAME g
JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
JOIN DEALER d ON g.dealer_id = d.dealer_id
LEFT JOIN BET b ON g.game_id = b.game_id
GROUP BY g.game_id, g.game_type, ct.table_number, d.name, d.employee_id,
         g.start_time, g.end_time, g.status
ORDER BY g.start_time DESC;

-- =====================================================
-- QUERY 5: Correlated Subquery - Players With Wallet Below Average
-- =====================================================

SELECT
    p.player_id,
    p.name,
    p.email,
    w.balance,
    (SELECT AVG(balance) FROM WALLET) AS avg_balance,
    ROUND(
        (SELECT AVG(balance) FROM WALLET) - w.balance, 2
    )                                                                               AS below_avg_by,
    (
        SELECT COUNT(*)
        FROM BET b
        WHERE b.player_id = p.player_id
          AND b.outcome = 'PENDING'
    )                                                                               AS pending_bets
FROM PLAYER p
JOIN WALLET w ON p.player_id = w.player_id
WHERE w.balance < (SELECT AVG(balance) FROM WALLET)
  AND p.status = 'ACTIVE'
ORDER BY w.balance ASC;

-- =====================================================
-- QUERY 6: CTE - Running Total of Casino Revenue (Window-style with JOIN)
-- =====================================================

WITH daily_revenue AS (
    SELECT
        DATE(g.start_time)                                                      AS rev_date,
        COALESCE(SUM(b.amount), 0) -
            COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) AS daily_profit
    FROM GAME g
    LEFT JOIN BET b ON g.game_id = b.game_id
    WHERE g.status = 'COMPLETED'
      AND g.start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(g.start_time)
),
running_total AS (
    SELECT
        d1.rev_date,
        d1.daily_profit,
        (
            SELECT SUM(d2.daily_profit)
            FROM daily_revenue d2
            WHERE d2.rev_date <= d1.rev_date
        ) AS cumulative_revenue
    FROM daily_revenue d1
)
SELECT
    rev_date,
    ROUND(daily_profit, 2)        AS daily_profit,
    ROUND(cumulative_revenue, 2)  AS cumulative_revenue
FROM running_total
ORDER BY rev_date;

-- =====================================================
-- QUERY 7: CTE - Player Cohort Retention Analysis
-- =====================================================

WITH player_cohort AS (
    SELECT
        p.player_id,
        DATE_FORMAT(p.registration_date, '%Y-%u') AS registration_week,
        MIN(b.bet_time)                            AS first_bet_time,
        MAX(b.bet_time)                            AS last_bet_time,
        COUNT(b.bet_id)                            AS total_bets,
        COALESCE(SUM(b.amount), 0)                 AS total_wagered
    FROM PLAYER p
    LEFT JOIN BET b ON p.player_id = b.player_id
    WHERE p.status = 'ACTIVE'
    GROUP BY p.player_id, DATE_FORMAT(p.registration_date, '%Y-%u')
),
cohort_analysis AS (
    SELECT
        registration_week,
        COUNT(player_id)                       AS cohort_size,
        AVG(total_bets)                        AS avg_bets_per_player,
        AVG(total_wagered)                     AS avg_wagered_per_player,
        COUNT(CASE WHEN last_bet_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)  THEN 1 END) AS active_last_week,
        COUNT(CASE WHEN last_bet_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) AS active_last_month
    FROM player_cohort
    GROUP BY registration_week
)
SELECT
    registration_week,
    cohort_size,
    ROUND(avg_bets_per_player, 2)                                                       AS avg_bets_per_player,
    ROUND(avg_wagered_per_player, 2)                                                    AS avg_revenue_per_player,
    active_last_week,
    ROUND(active_last_week  * 100.0 / cohort_size, 2)                                  AS retention_7_day_pct,
    active_last_month,
    ROUND(active_last_month * 100.0 / cohort_size, 2)                                  AS retention_30_day_pct
FROM cohort_analysis
ORDER BY registration_week DESC;

-- =====================================================
-- QUERY 8: Complex Join - Dealer Efficiency Report
-- =====================================================

SELECT
    d.dealer_id,
    d.name                                                                          AS dealer_name,
    d.employee_id,
    COUNT(DISTINCT g.game_id)                                                       AS games_conducted,
    COUNT(DISTINCT DATE(g.start_time))                                              AS days_worked,
    ROUND(SUM(TIMESTAMPDIFF(MINUTE, g.start_time, g.end_time)) / 60.0, 2)          AS total_hours_worked,
    ROUND(AVG(TIMESTAMPDIFF(MINUTE, g.start_time, g.end_time)) / 60.0, 2)          AS avg_game_duration_hours,
    COUNT(b.bet_id)                                                                 AS total_bets_handled,
    COALESCE(SUM(b.amount), 0)                                                      AS total_wagered,
    COALESCE(SUM(b.amount), 0) -
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)    AS revenue_generated,
    ROUND(
        (COALESCE(SUM(b.amount), 0) -
            COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)) /
        NULLIF(SUM(TIMESTAMPDIFF(MINUTE, g.start_time, g.end_time)) / 60.0, 0), 2
    )                                                                               AS revenue_per_hour
FROM DEALER d
LEFT JOIN GAME g ON d.dealer_id = g.dealer_id AND g.status = 'COMPLETED'
LEFT JOIN BET b ON g.game_id = b.game_id
WHERE d.status = 'ACTIVE'
  AND (g.start_time IS NULL OR g.start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))
GROUP BY d.dealer_id, d.name, d.employee_id
HAVING COUNT(g.game_id) > 0
ORDER BY revenue_generated DESC;

-- =====================================================
-- QUERY 9: CTE - Transaction Audit Trail Summary
-- =====================================================

WITH transaction_summary AS (
    SELECT
        t.wallet_id,
        p.player_id,
        p.name                                                           AS player_name,
        t.transaction_type,
        COUNT(*)                                                         AS transaction_count,
        SUM(ABS(t.amount))                                               AS total_amount,
        MIN(t.timestamp)                                                 AS first_transaction,
        MAX(t.timestamp)                                                 AS last_transaction
    FROM TRANSACTION t
    JOIN WALLET w ON t.wallet_id = w.wallet_id
    JOIN PLAYER p ON w.player_id = p.player_id
    WHERE t.timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY t.wallet_id, p.player_id, p.name, t.transaction_type
),
player_transaction_summary AS (
    SELECT
        player_id,
        player_name,
        SUM(CASE WHEN transaction_type = 'DEPOSIT'    THEN total_amount ELSE 0 END) AS total_deposits,
        SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN total_amount ELSE 0 END) AS total_withdrawals,
        SUM(CASE WHEN transaction_type = 'BET'        THEN total_amount ELSE 0 END) AS total_bets,
        SUM(CASE WHEN transaction_type = 'PAYOUT'     THEN total_amount ELSE 0 END) AS total_payouts,
        SUM(transaction_count)                                                       AS total_transactions
    FROM transaction_summary
    GROUP BY player_id, player_name
)
SELECT
    player_id,
    player_name,
    total_deposits,
    total_withdrawals,
    total_bets,
    total_payouts,
    total_deposits - total_withdrawals AS net_deposits,
    total_payouts  - total_bets        AS net_winnings,
    total_transactions
FROM player_transaction_summary
ORDER BY total_deposits DESC;

-- =====================================================
-- QUERY 10: Advanced Join - Game Type Profitability
-- =====================================================

SELECT
    ct.game_type,
    COUNT(DISTINCT ct.table_id)                                                      AS tables_count,
    COUNT(DISTINCT g.game_id)                                                        AS games_played,
    COUNT(DISTINCT b.player_id)                                                      AS unique_players,
    COUNT(b.bet_id)                                                                  AS total_bets,
    ROUND(AVG(b.amount), 2)                                                          AS avg_bet_size,
    COALESCE(SUM(b.amount), 0)                                                       AS total_wagered,
    COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)         AS total_payouts,
    COALESCE(SUM(b.amount), 0) -
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)     AS house_profit,
    ROUND(
        (COALESCE(SUM(b.amount), 0) -
            COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)) * 100.0 /
        NULLIF(SUM(b.amount), 0), 2
    )                                                                                AS house_edge_pct,
    ROUND(
        COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END), 0), 2
    )                                                                                AS player_win_rate_pct,
    ROUND(
        (COALESCE(SUM(b.amount), 0) -
            COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0)) /
        NULLIF(COUNT(DISTINCT g.game_id), 0), 2
    )                                                                                AS avg_profit_per_game
FROM CASINO_TABLE ct
LEFT JOIN GAME g ON ct.table_id = g.table_id
LEFT JOIN BET b ON g.game_id = b.game_id
WHERE g.start_time IS NULL OR g.start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY ct.game_type
HAVING COUNT(b.bet_id) > 0
ORDER BY house_profit DESC;

-- =====================================================
-- QUERY 11: RBAC - Player Permission Check (nested subquery)
-- =====================================================

SELECT
    p.player_id,
    p.name,
    r.role_name,
    perm.permission_name,
    perm.resource,
    perm.action
FROM PLAYER p
JOIN USER_ROLE ur ON p.player_id = ur.player_id AND ur.is_active = 1
JOIN ROLE r ON ur.role_id = r.role_id
JOIN ROLE_PERMISSION rp ON r.role_id = rp.role_id
JOIN PERMISSION perm ON rp.permission_id = perm.permission_id
WHERE p.player_id IN (
    -- Players who have placed bets in the last 7 days
    SELECT DISTINCT player_id
    FROM BET
    WHERE bet_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
)
ORDER BY p.player_id, r.role_name, perm.resource;

-- End of MySQL queries.sql

