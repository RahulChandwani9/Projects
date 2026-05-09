from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# ── Player ──
class PlayerCreate(BaseModel):
    name: str
    role: str = "All-Rounder"
    jersey_number: int = 0

class PlayerOut(BaseModel):
    id: int
    name: str
    role: str
    jersey_number: int
    team_id: int
    class Config: from_attributes = True

# ── Team ──
class TeamCreate(BaseModel):
    name: str
    short_name: str
    color: str = "#22c55e"
    players: List[PlayerCreate] = []

class TeamOut(BaseModel):
    id: int
    name: str
    short_name: str
    color: str
    tournament_id: int
    players: List[PlayerOut] = []
    class Config: from_attributes = True

# ── Tournament ──
class TournamentCreate(BaseModel):
    name: str
    matches_per_team: int = 2
    overs_per_match: int = 10
    teams: List[TeamCreate]

class TournamentOut(BaseModel):
    id: int
    name: str
    matches_per_team: int
    overs_per_match: int
    status: str
    created_at: datetime
    teams: List[TeamOut] = []
    class Config: from_attributes = True

# ── Match ──
class MatchOut(BaseModel):
    id: int
    tournament_id: int
    team1_id: int
    team2_id: int
    match_number: int
    overs: int
    status: str
    toss_winner_id: Optional[int]
    toss_decision: Optional[str]
    batting_team_id: Optional[int]
    bowling_team_id: Optional[int]
    current_innings: int
    innings1_score: int
    innings1_wickets: int
    innings1_overs: float
    innings2_score: int
    innings2_wickets: int
    innings2_overs: float
    winner_id: Optional[int]
    win_margin: Optional[str]
    result_text: Optional[str]
    class Config: from_attributes = True

# ── Toss ──
class TossInput(BaseModel):
    toss_winner_id: int
    toss_decision: str  # bat | field
    striker_id: int
    non_striker_id: int
    bowler_id: int

# ── Delivery ──
class DeliveryInput(BaseModel):
    batsman_id: int
    bowler_id: int
    runs_off_bat: int = 0
    extras: int = 0
    extra_type: Optional[str] = None
    is_wicket: bool = False
    wicket_type: Optional[str] = None
    fielder_id: Optional[int] = None
    dismissed_player_id: Optional[int] = None
    next_batsman_id: Optional[int] = None

class DeliveryOut(BaseModel):
    id: int
    match_id: int
    innings: int
    over_number: int
    ball_number: int
    batsman_id: int
    bowler_id: int
    runs_off_bat: int
    extras: int
    extra_type: Optional[str]
    is_wicket: bool
    wicket_type: Optional[str]
    fielder_id: Optional[int]
    is_boundary: bool
    is_six: bool
    class Config: from_attributes = True

# ── Innings transition ──
class InningsTransition(BaseModel):
    new_striker_id: int
    new_non_striker_id: int
    new_bowler_id: int

# ── Scorecard ──
class BatterLine(BaseModel):
    player_id: int
    player_name: str
    runs: int
    balls: int
    fours: int
    sixes: int
    sr: float
    is_out: bool
    dismissal: str = ""

class BowlerLine(BaseModel):
    player_id: int
    player_name: str
    overs: float
    runs: int
    wickets: int
    economy: float
    maidens: int

class ScorecardOut(BaseModel):
    match_id: int
    innings: int
    team_id: int
    team_name: str
    total_runs: int
    total_wickets: int
    total_overs: float
    batters: List[BatterLine]
    bowlers: List[BowlerLine]
    extras: int

# ── Live State ──
class LiveState(BaseModel):
    match_id: int
    status: str
    current_innings: int
    batting_team_id: int
    bowling_team_id: int
    score: int
    wickets: int
    overs: float
    target: Optional[int]
    required_runs: Optional[int]
    required_balls: Optional[int]
    crr: float
    rrr: Optional[float]
    striker_id: Optional[int]
    non_striker_id: Optional[int]
    current_bowler_id: Optional[int]
    last_5_balls: List[str]
    innings1_score: int
    innings1_wickets: int
    innings2_score: int
    innings2_wickets: int
    result_text: Optional[str]
    winner_id: Optional[int]

# ── Points Table ──
class PointsRow(BaseModel):
    team_id: int
    team_name: str
    short_name: str
    color: str
    played: int
    won: int
    lost: int
    tied: int
    nrr: float
    points: int

# ── Leaderboard ──
class LeaderEntry(BaseModel):
    player_id: int
    player_name: str
    team_name: str
    value: float
    extra: str = ""

class LeaderboardOut(BaseModel):
    top_batsmen: List[LeaderEntry]
    top_bowlers: List[LeaderEntry]
    top_fielders: List[LeaderEntry]
    mvp: List[LeaderEntry]
