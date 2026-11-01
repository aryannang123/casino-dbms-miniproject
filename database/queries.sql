-- Casino Database Management System
-- Complex SQL Queries (CTEs, Joins, Nested Queries)

-- =====================================================
-- QUERY 1: Recursive CTE - Player Referral Chain
-- (Assuming we add a referred_by column to PLAYER)
-- =====================================================

-- First, add referral support:
-- ALTER TABLE PLAYER ADD COLUMN referred_by INTEGER REFERENCES PLAYER(player_id);

WITH RECURSIVE referral_chain AS (
    -- Base case: Players who were referred
    SELECT 
        player_id,
        name,
        referred_by,
        1 as level,
        ARRAY[player_id] as path
    FROM PLAYER
    WHERE referred_by IS NOT NULL
    
    UNION ALL
    
    -- Recursive case: Follow the chain
    SELECT 
        p.player_id,
        p.name,
        p.referred_by,
        rc.level + 1,
        rc.path || p.player_id
    FROM PLAYER p
    INNER JOIN referral_chain rc ON p.referred_by = rc.player_id
    WHERE NOT p.player_id = ANY(rc.path) -- Prevent cycles
)
SELECT 
    player_id,
    name,
    referred_by,
    level as referral_depth,
    path as referral_chain
FROM referral_chain
ORDER BY level, player_id;

-- =====================================================
-- QUERY 2: CTE - Daily Casino Performance Report
-- =====================================================

WITH daily_stats AS (
    SELECT 
        DATE(g.start_time) as game_date,
        g.game_type,
        COUNT(DISTINCT g.game_id) as total_games,
        COUNT(DISTINCT b.player_id) as unique_players,
        COUNT(b.bet_id) as total_bets,
        SUM(b.amount) as total_wagered,
        SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as total_payouts,
        SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as house_profit
    FROM GAME g
    LEFT JOIN BET b ON g.game_id = b.game_id
    WHERE g.start_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(g.start_time), g.game_type
),
summary AS (
    SELECT
        game_date,
        SUM(total_games) as daily_games,
        SUM(unique_players) as daily_players,
        SUM(total_bets) as daily_bets,
        SUM(total_wagered) as daily_revenue,
        SUM(total_payouts) as daily_payouts,
        SUM(house_profit) as daily_profit
    FROM daily_stats
    GROUP BY game_date
)
SELECT 
    ds.*,
    s.daily_games,
    s.daily_profit,
    ROUND((ds.total_wagered / NULLIF(s.daily_revenue, 0) * 100), 2) as game_type_contribution_pct
FROM daily_stats ds
JOIN summary s ON ds.game_date = s.game_date
ORDER BY ds.game_date DESC, ds.total_wagered DESC;

-- =====================================================
-- QUERY 3: Nested Query - High Rollers (Top Spenders)
-- =====================================================

SELECT 
    p.player_id,
    p.name,
    p.email,
    w.balance as current_balance,
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
        SUM(amount) as total_wagered,
        COUNT(*) as total_bets,
        ROUND(
            COUNT(CASE WHEN outcome = 'WON' THEN 1 END)::DECIMAL * 100 / 
            NULLIF(COUNT(CASE WHEN outcome IN ('WON', 'LOST') THEN 1 END), 0),
            2
        ) as win_rate,
        ROUND(AVG(amount), 2) as avg_bet_size,
        MAX(CASE WHEN outcome = 'WON' THEN payout ELSE 0 END) as biggest_win
    FROM BET
    WHERE bet_time >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY player_id
    HAVING SUM(amount) > (
        SELECT AVG(total_wagered) * 2
        FROM (
            SELECT SUM(amount) as total_wagered
            FROM BET
            WHERE bet_time >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY player_id
        ) as player_totals
    )
) as total_stats ON p.player_id = total_stats.player_id
WHERE p.status = 'ACTIVE'
ORDER BY total_stats.total_wagered DESC
LIMIT 50;

-- =====================================================
-- QUERY 4: Complex Join - Game Performance with Dealer Info
-- =====================================================

SELECT 
    g.game_id,
    g.game_type,
    ct.table_number,
    d.name as dealer_name,
    d.employee_id,
    g.start_time,
    g.end_time,
    g.end_time - g.start_time as duration,
    COUNT(DISTINCT b.player_id) as unique_players,
    COUNT(b.bet_id) as total_bets,
    COALESCE(SUM(b.amount), 0) as total_wagered,
    COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_payouts,
    COALESCE(SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as house_profit,
    ROUND(
        COALESCE(
            (SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END)) * 100.0 / 
            NULLIF(SUM(b.amount), 0),
            0
        ),
        2
    ) as profit_margin_pct
FROM GAME g
JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
JOIN DEALER d ON g.dealer_id = d.dealer_id
LEFT JOIN BET b ON g.game_id = b.game_id
WHERE g.status = 'COMPLETED'
AND g.start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY g.game_id, g.game_type, ct.table_number, d.name, d.employee_id, 
         g.start_time, g.end_time
HAVING COUNT(b.bet_id) > 0
ORDER BY house_profit DESC;

-- =====================================================
-- QUERY 5: CTE with Window Functions - Player Rankings
-- =====================================================

WITH player_metrics AS (
    SELECT 
        p.player_id,
        p.name,
        COUNT(b.bet_id) as total_bets,
        SUM(b.amount) as total_wagered,
        SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as total_winnings,
        SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) - SUM(b.amount) as net_profit,
        ROUND(
            COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END)::DECIMAL * 100 / 
            NULLIF(COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END), 0),
            2
        ) as win_rate
    FROM PLAYER p
    LEFT JOIN BET b ON p.player_id = b.player_id
    WHERE p.status = 'ACTIVE'
    GROUP BY p.player_id, p.name
)
SELECT 
    player_id,
    name,
    total_bets,
    total_wagered,
    total_winnings,
    net_profit,
    win_rate,
    ROW_NUMBER() OVER (ORDER BY total_wagered DESC) as wagered_rank,
    ROW_NUMBER() OVER (ORDER BY net_profit DESC) as profit_rank,
    ROW_NUMBER() OVER (ORDER BY win_rate DESC NULLS LAST) as win_rate_rank,
    NTILE(4) OVER (ORDER BY total_wagered DESC) as player_tier,
    PERCENT_RANK() OVER (ORDER BY total_wagered) as wagered_percentile
FROM player_metrics
WHERE total_bets > 0
ORDER BY total_wagered DESC;

-- =====================================================
-- QUERY 6: Nested Subquery - Tables with Best Performance
-- =====================================================

SELECT 
    ct.table_id,
    ct.table_number,
    ct.game_type,
    ct.minimum_bet,
    ct.maximum_bet,
    table_stats.total_games,
    table_stats.avg_game_duration,
    table_stats.total_revenue,
    table_stats.avg_revenue_per_game,
    CASE 
        WHEN table_stats.avg_revenue_per_game > (
            SELECT AVG(game_revenue)
            FROM (
                SELECT 
                    g.table_id,
                    SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as game_revenue
                FROM GAME g
                LEFT JOIN BET b ON g.game_id = b.game_id
                WHERE g.status = 'COMPLETED'
                GROUP BY g.table_id, g.game_id
            ) as all_games
        ) THEN 'High Performer'
        ELSE 'Average'
    END as performance_rating
FROM CASINO_TABLE ct
JOIN (
    SELECT 
        g.table_id,
        COUNT(g.game_id) as total_games,
        AVG(g.end_time - g.start_time) as avg_game_duration,
        SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as total_revenue,
        (SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END)) / COUNT(DISTINCT g.game_id) as avg_revenue_per_game
    FROM GAME g
    LEFT JOIN BET b ON g.game_id = b.game_id
    WHERE g.status = 'COMPLETED'
    AND g.start_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY g.table_id
) as table_stats ON ct.table_id = table_stats.table_id
ORDER BY table_stats.total_revenue DESC;

-- =====================================================
-- QUERY 7: CTE - Player Retention Analysis
-- =====================================================

WITH player_activity AS (
    SELECT 
        p.player_id,
        p.name,
        p.registration_date,
        DATE_TRUNC('week', p.registration_date) as registration_week,
        MAX(b.bet_time) as last_bet_date,
        COUNT(DISTINCT DATE(b.bet_time)) as days_active,
        COUNT(b.bet_id) as total_bets,
        SUM(b.amount) as total_wagered
    FROM PLAYER p
    LEFT JOIN BET b ON p.player_id = b.player_id
    WHERE p.registration_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY p.player_id, p.name, p.registration_date
),
cohort_analysis AS (
    SELECT 
        registration_week,
        COUNT(DISTINCT player_id) as cohort_size,
        AVG(days_active) as avg_days_active,
        AVG(total_bets) as avg_bets_per_player,
        AVG(total_wagered) as avg_wagered_per_player,
        COUNT(CASE WHEN last_bet_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_last_week,
        COUNT(CASE WHEN last_bet_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_last_month
    FROM player_activity
    GROUP BY registration_week
)
SELECT 
    registration_week,
    cohort_size,
    ROUND(avg_days_active, 2) as avg_days_active,
    ROUND(avg_bets_per_player, 2) as avg_bets_per_player,
    ROUND(avg_wagered_per_player, 2) as avg_revenue_per_player,
    active_last_week,
    ROUND(active_last_week::DECIMAL * 100 / cohort_size, 2) as retention_7_day_pct,
    active_last_month,
    ROUND(active_last_month::DECIMAL * 100 / cohort_size, 2) as retention_30_day_pct
FROM cohort_analysis
ORDER BY registration_week DESC;

-- =====================================================
-- QUERY 8: Complex Join - Dealer Efficiency Report
-- =====================================================

SELECT 
    d.dealer_id,
    d.name as dealer_name,
    d.employee_id,
    d.shift,
    COUNT(DISTINCT g.game_id) as games_conducted,
    COUNT(DISTINCT DATE(g.start_time)) as days_worked,
    SUM(EXTRACT(EPOCH FROM (g.end_time - g.start_time)) / 3600) as total_hours_worked,
    AVG(EXTRACT(EPOCH FROM (g.end_time - g.start_time)) / 3600) as avg_game_duration_hours,
    COUNT(b.bet_id) as total_bets_handled,
    SUM(b.amount) as total_wagered,
    SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as revenue_generated,
    ROUND(
        (SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END)) / 
        NULLIF(SUM(EXTRACT(EPOCH FROM (g.end_time - g.start_time)) / 3600), 0),
        2
    ) as revenue_per_hour
FROM DEALER d
LEFT JOIN GAME g ON d.dealer_id = g.dealer_id AND g.status = 'COMPLETED'
LEFT JOIN BET b ON g.game_id = b.game_id
WHERE d.status = 'ACTIVE'
AND g.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.dealer_id, d.name, d.employee_id, d.shift
HAVING COUNT(g.game_id) > 0
ORDER BY revenue_generated DESC;

-- =====================================================
-- QUERY 9: CTE - Transaction Audit Trail
-- =====================================================

WITH transaction_summary AS (
    SELECT 
        t.wallet_id,
        p.player_id,
        p.name as player_name,
        t.transaction_type,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount,
        MIN(t.timestamp) as first_transaction,
        MAX(t.timestamp) as last_transaction
    FROM TRANSACTION t
    JOIN WALLET w ON t.wallet_id = w.wallet_id
    JOIN PLAYER p ON w.player_id = p.player_id
    WHERE t.timestamp >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY t.wallet_id, p.player_id, p.name, t.transaction_type
),
player_transaction_summary AS (
    SELECT 
        player_id,
        player_name,
        SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN total_amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN ABS(total_amount) ELSE 0 END) as total_withdrawals,
        SUM(CASE WHEN transaction_type = 'BET' THEN ABS(total_amount) ELSE 0 END) as total_bets,
        SUM(CASE WHEN transaction_type = 'PAYOUT' THEN total_amount ELSE 0 END) as total_payouts,
        SUM(transaction_count) as total_transactions
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
    total_deposits - total_withdrawals as net_deposits,
    total_payouts - total_bets as net_winnings,
    total_transactions
FROM player_transaction_summary
ORDER BY total_deposits DESC;

-- =====================================================
-- QUERY 10: Advanced Join - Game Type Profitability
-- =====================================================

SELECT 
    ct.game_type,
    COUNT(DISTINCT ct.table_id) as tables_count,
    COUNT(DISTINCT g.game_id) as games_played,
    COUNT(DISTINCT b.player_id) as unique_players,
    COUNT(b.bet_id) as total_bets,
    ROUND(AVG(b.amount), 2) as avg_bet_size,
    SUM(b.amount) as total_wagered,
    SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as total_payouts,
    SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END) as house_profit,
    ROUND(
        (SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END)) * 100.0 / 
        NULLIF(SUM(b.amount), 0),
        2
    ) as house_edge_pct,
    ROUND(
        COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END)::DECIMAL * 100 / 
        NULLIF(COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END), 0),
        2
    ) as player_win_rate_pct,
    ROUND(
        (SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END)) / 
        NULLIF(COUNT(DISTINCT g.game_id), 0),
        2
    ) as avg_profit_per_game
FROM CASINO_TABLE ct
LEFT JOIN GAME g ON ct.table_id = g.table_id
LEFT JOIN BET b ON g.game_id = b.game_id
WHERE g.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ct.game_type
HAVING COUNT(b.bet_id) > 0
ORDER BY house_profit DESC;

-- End of queries.sql
