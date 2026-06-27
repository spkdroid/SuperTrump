-- ============================================================
-- Super Trump Scoring System – Database Schema
-- ============================================================

-- Players
CREATE TABLE IF NOT EXISTS players (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    avatar_color  VARCHAR(20)  NOT NULL DEFAULT '#4CAF50',
    total_score   INTEGER      NOT NULL DEFAULT 0,
    games_played  INTEGER      NOT NULL DEFAULT 0,
    games_won     INTEGER      NOT NULL DEFAULT 0,
    rounds_played INTEGER      NOT NULL DEFAULT 0,
    rounds_as_bidder          INTEGER NOT NULL DEFAULT 0,
    rounds_won_as_bidder      INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Games
CREATE TABLE IF NOT EXISTS games (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL DEFAULT 'New Game',
    num_players    INTEGER      NOT NULL CHECK (num_players BETWEEN 3 AND 10),
    status         VARCHAR(20)  NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'completed')),
    winner_id      INTEGER REFERENCES players(id),
    current_round  INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Players in a Game (scores accumulate here per game)
CREATE TABLE IF NOT EXISTS game_players (
    id            SERIAL PRIMARY KEY,
    game_id       INTEGER NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
    player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    seat_number   INTEGER NOT NULL,
    current_score INTEGER NOT NULL DEFAULT 0,
    final_rank    INTEGER,
    UNIQUE (game_id, player_id),
    UNIQUE (game_id, seat_number)
);

-- Rounds
CREATE TABLE IF NOT EXISTS rounds (
    id                          SERIAL PRIMARY KEY,
    game_id                     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_number                INTEGER NOT NULL,
    bidder_id                   INTEGER NOT NULL REFERENCES players(id),
    bid_amount                  INTEGER NOT NULL CHECK (bid_amount BETWEEN 28 AND 56),
    bid_type                    VARCHAR(20) NOT NULL
                                    CHECK (bid_type IN ('normal','honors','initial_56','upgraded_56')),
    trump_suit                  VARCHAR(20)
                                    CHECK (trump_suit IN ('hearts','diamonds','clubs','spades','no_trump')),
    partner_cards_asked         TEXT,          -- e.g. "Jack of Hearts, Joker"
    points_won_by_bidding_team  INTEGER NOT NULL CHECK (points_won_by_bidding_team BETWEEN 0 AND 56),
    bid_won                     BOOLEAN NOT NULL,
    bidder_score                INTEGER NOT NULL,
    partner_score_each          INTEGER NOT NULL,
    partner_total_score         INTEGER NOT NULL,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (game_id, round_number)
);

-- Per-player score entry for each round
CREATE TABLE IF NOT EXISTS round_players (
    id         SERIAL PRIMARY KEY,
    round_id   INTEGER NOT NULL REFERENCES rounds(id)  ON DELETE CASCADE,
    player_id  INTEGER NOT NULL REFERENCES players(id),
    game_id    INTEGER NOT NULL REFERENCES games(id)   ON DELETE CASCADE,
    team       VARCHAR(10) NOT NULL CHECK (team  IN ('bidding','opposing')),
    role       VARCHAR(10) NOT NULL CHECK (role  IN ('bidder','partner','opponent')),
    score      INTEGER NOT NULL,
    UNIQUE (round_id, player_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_rounds_game_id           ON rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_round_players_round_id   ON round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_round_players_player_id  ON round_players(player_id);
CREATE INDEX IF NOT EXISTS idx_round_players_game_id    ON round_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id     ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id   ON game_players(player_id);

-- Seed some avatar colours (no data, just ensuring schema is ready)
-- INSERT INTO players (name, avatar_color) VALUES ('Sample', '#4CAF50');
