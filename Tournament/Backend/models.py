from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    matches_per_team = Column(Integer, default=2)
    overs_per_match = Column(Integer, default=10)
    status = Column(String, default="setup")  # setup | ongoing | completed
    created_at = Column(DateTime, default=datetime.utcnow)
    teams = relationship("Team", back_populates="tournament", cascade="all,delete")
    matches = relationship("Match", back_populates="tournament", cascade="all,delete")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=False)
    color = Column(String, default="#22c55e")
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    tournament = relationship("Tournament", back_populates="teams")
    players = relationship("Player", back_populates="team", cascade="all,delete")

class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, default="All-Rounder")  # Batsman|Bowler|All-Rounder|WK
    jersey_number = Column(Integer, default=0)
    team_id = Column(Integer, ForeignKey("teams.id"))
    team = relationship("Team", back_populates="players")

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    team1_id = Column(Integer, ForeignKey("teams.id"))
    team2_id = Column(Integer, ForeignKey("teams.id"))
    match_number = Column(Integer)
    overs = Column(Integer, default=10)
    status = Column(String, default="scheduled")  # scheduled|live|completed
    toss_winner_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    toss_decision = Column(String, nullable=True)  # bat|field
    batting_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    bowling_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    current_innings = Column(Integer, default=1)
    innings1_score = Column(Integer, default=0)
    innings1_wickets = Column(Integer, default=0)
    innings1_overs = Column(Float, default=0.0)
    innings2_score = Column(Integer, default=0)
    innings2_wickets = Column(Integer, default=0)
    innings2_overs = Column(Float, default=0.0)
    winner_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    win_margin = Column(String, nullable=True)
    result_text = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tournament = relationship("Tournament", back_populates="matches")
    deliveries = relationship("Delivery", back_populates="match", cascade="all,delete")

class Delivery(Base):
    __tablename__ = "deliveries"
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    innings = Column(Integer)
    over_number = Column(Integer)
    ball_number = Column(Integer)
    batsman_id = Column(Integer, ForeignKey("players.id"))
    bowler_id = Column(Integer, ForeignKey("players.id"))
    runs_off_bat = Column(Integer, default=0)
    extras = Column(Integer, default=0)
    extra_type = Column(String, nullable=True)  # wide|noball|bye|legbye
    is_wicket = Column(Boolean, default=False)
    wicket_type = Column(String, nullable=True)  # caught|bowled|lbw|runout|stumped|hitwicket
    fielder_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    dismissed_player_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    is_boundary = Column(Boolean, default=False)
    is_six = Column(Boolean, default=False)
    match = relationship("Match", back_populates="deliveries")

class PlayerStats(Base):
    __tablename__ = "player_stats"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    innings = Column(Integer, default=1)
    # batting
    runs_scored = Column(Integer, default=0)
    balls_faced = Column(Integer, default=0)
    fours = Column(Integer, default=0)
    sixes = Column(Integer, default=0)
    is_out = Column(Boolean, default=False)
    # bowling
    overs_bowled = Column(Float, default=0.0)
    runs_conceded = Column(Integer, default=0)
    wickets_taken = Column(Integer, default=0)
    maidens = Column(Integer, default=0)
    # fielding
    catches = Column(Integer, default=0)
    run_outs = Column(Integer, default=0)
    stumpings = Column(Integer, default=0)
    is_motm = Column(Boolean, default=False)
