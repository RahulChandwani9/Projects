from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict
import itertools, math, random

from database import get_db, init_db
from models import Tournament, Team, Player, Match, Delivery, PlayerStats
from schemas import (
    TournamentCreate, TournamentOut, TeamOut, MatchOut,
    TossInput, DeliveryInput, DeliveryOut, InningsTransition,
    ScorecardOut, BatterLine, BowlerLine, LiveState,
    PointsRow, LeaderboardOut, LeaderEntry
)

app = FastAPI(title="CricManager Pro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# ─────────────────────────────────────────────
#  TOURNAMENT
# ─────────────────────────────────────────────

@app.post("/tournaments", response_model=TournamentOut)
def create_tournament(data: TournamentCreate, db: Session = Depends(get_db)):
    t = Tournament(name=data.name, matches_per_team=data.matches_per_team,
                   overs_per_match=data.overs_per_match, status="setup")
    db.add(t); db.flush()

    team_objs = []
    for td in data.teams:
        team = Team(name=td.name, short_name=td.short_name, color=td.color, tournament_id=t.id)
        db.add(team); db.flush()
        for pd in td.players:
            p = Player(name=pd.name, role=pd.role, jersey_number=pd.jersey_number, team_id=team.id)
            db.add(p)
        team_objs.append(team)

    db.flush()
    _generate_schedule(t, team_objs, data.matches_per_team, data.overs_per_match, db)
    t.status = "ongoing"
    db.commit(); db.refresh(t)
    return t

def _generate_schedule(tournament, teams, matches_per_team, overs, db):
    n = len(teams)
    all_pairs = list(itertools.combinations(teams, 2))
    # Build team match counters
    counts = {t.id: 0 for t in teams}
    scheduled = []
    random.shuffle(all_pairs)
    # Repeat pairs to fill matches_per_team quota
    pool = all_pairs * max(1, math.ceil(matches_per_team * n // max(len(all_pairs),1) + 1))
    for (t1, t2) in pool:
        if counts[t1.id] >= matches_per_team or counts[t2.id] >= matches_per_team:
            continue
        scheduled.append((t1, t2))
        counts[t1.id] += 1
        counts[t2.id] += 1
        if all(v >= matches_per_team for v in counts.values()):
            break

    for idx, (t1, t2) in enumerate(scheduled, 1):
        m = Match(tournament_id=tournament.id, team1_id=t1.id, team2_id=t2.id,
                  match_number=idx, overs=overs, status="scheduled")
        db.add(m)

@app.get("/tournaments", response_model=List[TournamentOut])
def list_tournaments(db: Session = Depends(get_db)):
    return db.query(Tournament).order_by(Tournament.created_at.desc()).all()

@app.get("/tournaments/{tid}", response_model=TournamentOut)
def get_tournament(tid: int, db: Session = Depends(get_db)):
    t = db.query(Tournament).filter(Tournament.id == tid).first()
    if not t: raise HTTPException(404, "Tournament not found")
    return t

@app.get("/tournaments/{tid}/matches", response_model=List[MatchOut])
def get_matches(tid: int, db: Session = Depends(get_db)):
    return db.query(Match).filter(Match.tournament_id == tid).order_by(Match.match_number).all()

# ─────────────────────────────────────────────
#  MATCH FLOW
# ─────────────────────────────────────────────

@app.post("/matches/{mid}/toss")
def set_toss(mid: int, data: TossInput, db: Session = Depends(get_db)):
    m = _get_match(mid, db)
    if m.status != "scheduled": raise HTTPException(400, "Match already started")
    batting_id = data.toss_winner_id if data.toss_decision == "bat" else (
        m.team2_id if data.toss_winner_id == m.team1_id else m.team1_id
    )
    bowling_id = m.team2_id if batting_id == m.team1_id else m.team1_id
    m.toss_winner_id = data.toss_winner_id
    m.toss_decision = data.toss_decision
    m.batting_team_id = batting_id
    m.bowling_team_id = bowling_id
    m.status = "live"
    db.flush()
    # init player stats for striker, non-striker, bowler
    _ensure_stats(data.striker_id, mid, m.tournament_id, 1, db)
    _ensure_stats(data.non_striker_id, mid, m.tournament_id, 1, db)
    _ensure_stats(data.bowler_id, mid, m.tournament_id, 1, db)
    # store live state as extra meta on match (reuse result_text col temporarily)
    _set_live_meta(m, data.striker_id, data.non_striker_id, data.bowler_id, db)
    db.commit()
    return {"ok": True}

@app.get("/matches/{mid}/live", response_model=LiveState)
def live_state(mid: int, db: Session = Depends(get_db)):
    m = _get_match(mid, db)
    meta = _get_live_meta(m)
    innings = m.current_innings
    score = m.innings1_score if innings == 1 else m.innings2_score
    wkts  = m.innings1_wickets if innings == 1 else m.innings2_wickets
    overs = m.innings1_overs if innings == 1 else m.innings2_overs
    balls_done = int(overs) * 6 + round((overs - int(overs)) * 10)
    total_balls = m.overs * 6
    crr = (score / (balls_done/6)) if balls_done > 0 else 0.0
    target = (m.innings1_score + 1) if innings == 2 else None
    req_runs = (target - score) if target else None
    balls_left = (total_balls - balls_done) if innings == 2 else None
    rrr = ((req_runs / (balls_left/6)) if balls_left and balls_left > 0 else None) if innings == 2 else None

    last5 = _last5_balls(mid, innings, db)
    return LiveState(
        match_id=mid, status=m.status,
        current_innings=innings,
        batting_team_id=m.batting_team_id or 0,
        bowling_team_id=m.bowling_team_id or 0,
        score=score, wickets=wkts, overs=overs,
        target=target, required_runs=req_runs, required_balls=balls_left,
        crr=round(crr,2), rrr=round(rrr,2) if rrr else None,
        striker_id=meta.get("striker"), non_striker_id=meta.get("non_striker"),
        current_bowler_id=meta.get("bowler"),
        last_5_balls=last5,
        innings1_score=m.innings1_score, innings1_wickets=m.innings1_wickets,
        innings2_score=m.innings2_score, innings2_wickets=m.innings2_wickets,
        result_text=m.result_text, winner_id=m.winner_id
    )

@app.post("/matches/{mid}/delivery", response_model=dict)
def record_delivery(mid: int, data: DeliveryInput, db: Session = Depends(get_db)):
    m = _get_match(mid, db)
    if m.status != "live": raise HTTPException(400, "Match not live")
    meta = _get_live_meta(m)
    innings = m.current_innings

    # Current over/ball
    deliveries = db.query(Delivery).filter(
        Delivery.match_id == mid, Delivery.innings == innings
    ).all()
    legal_balls = sum(1 for d in deliveries if not d.extra_type in ("wide","noball"))
    over_num = legal_balls // 6
    ball_in_over = legal_balls % 6

    is_extra = data.extra_type in ("wide", "noball")
    is_boundary = data.runs_off_bat in (4,) and not is_extra
    is_six = data.runs_off_bat == 6 and not is_extra

    d = Delivery(
        match_id=mid, innings=innings, over_number=over_num,
        ball_number=ball_in_over + 1,
        batsman_id=data.batsman_id, bowler_id=data.bowler_id,
        runs_off_bat=data.runs_off_bat, extras=data.extras,
        extra_type=data.extra_type, is_wicket=data.is_wicket,
        wicket_type=data.wicket_type, fielder_id=data.fielder_id,
        dismissed_player_id=data.dismissed_player_id,
        is_boundary=is_boundary, is_six=is_six
    )
    db.add(d)

    total_runs = data.runs_off_bat + data.extras
    wickets_delta = 1 if data.is_wicket else 0

    # Update match score
    if innings == 1:
        m.innings1_score += total_runs
        m.innings1_wickets += wickets_delta
    else:
        m.innings2_score += total_runs
        m.innings2_wickets += wickets_delta

    # Update overs (only legal deliveries advance over count)
    if not is_extra:
        new_legal = legal_balls + 1
        new_over = new_legal // 6
        new_ball = new_legal % 6
        ov_decimal = new_over + new_ball * 0.1
        if innings == 1: m.innings1_overs = ov_decimal
        else: m.innings2_overs = ov_decimal

    # Update player stats
    _update_batting_stats(data.batsman_id, mid, m.tournament_id, innings,
                          data.runs_off_bat, is_boundary, is_six, data.is_wicket and data.dismissed_player_id == data.batsman_id,
                          is_extra, db)
    _update_bowling_stats(data.bowler_id, mid, m.tournament_id, innings,
                          data.runs_off_bat + data.extras, data.is_wicket, is_extra, db)
    if data.is_wicket and data.fielder_id:
        _update_fielding_stats(data.fielder_id, mid, m.tournament_id, innings,
                               data.wicket_type, db)

    # Rotate strike on odd runs (non-extra)
    if not is_extra and data.runs_off_bat % 2 == 1:
        meta["striker"], meta["non_striker"] = meta["non_striker"], meta["striker"]

    # End of over: rotate strike + need new bowler
    new_legal_count = legal_balls + (0 if is_extra else 1)
    end_of_over = (not is_extra) and (new_legal_count % 6 == 0)
    if end_of_over:
        meta["striker"], meta["non_striker"] = meta["non_striker"], meta["striker"]
        meta["need_bowler"] = True

    # Wicket: need next batsman
    if data.is_wicket:
        meta["need_batsman"] = True
        if data.next_batsman_id:
            meta["striker"] = data.next_batsman_id
            meta["need_batsman"] = False
            _ensure_stats(data.next_batsman_id, mid, m.tournament_id, innings, db)

    # Check innings/match end
    score = m.innings1_score if innings == 1 else m.innings2_score
    wkts  = m.innings1_wickets if innings == 1 else m.innings2_wickets
    overs_done_legal = new_legal_count
    max_legal = m.overs * 6
    all_out = (wkts >= 10)
    overs_up = (overs_done_legal >= max_legal)

    result = {"ok": True, "end_of_over": end_of_over,
              "need_batsman": meta.get("need_batsman", False),
              "need_bowler": meta.get("need_bowler", False),
              "innings_over": False, "match_over": False}

    if (all_out or overs_up) and innings == 1:
        m.current_innings = 2
        batting_t = m.batting_team_id
        bowling_t = m.bowling_team_id
        m.batting_team_id = bowling_t
        m.bowling_team_id = batting_t
        meta["need_innings_transition"] = True
        result["innings_over"] = True

    elif (all_out or overs_up) and innings == 2:
        _finish_match(m, db)
        result["match_over"] = True
        result["winner_id"] = m.winner_id
        result["result_text"] = m.result_text
        meta["need_innings_transition"] = False

    elif innings == 2:
        # Chase complete?
        target = m.innings1_score + 1
        if m.innings2_score >= target:
            _finish_match(m, db)
            result["match_over"] = True
            result["winner_id"] = m.winner_id
            result["result_text"] = m.result_text

    _set_live_meta(m, meta["striker"], meta["non_striker"], meta.get("bowler"), db, meta)
    db.commit()
    return result

@app.post("/matches/{mid}/innings_transition")
def innings_transition(mid: int, data: InningsTransition, db: Session = Depends(get_db)):
    m = _get_match(mid, db)
    _ensure_stats(data.new_striker_id, mid, m.tournament_id, 2, db)
    _ensure_stats(data.new_non_striker_id, mid, m.tournament_id, 2, db)
    _ensure_stats(data.new_bowler_id, mid, m.tournament_id, 2, db)
    meta = _get_live_meta(m)
    meta["striker"] = data.new_striker_id
    meta["non_striker"] = data.new_non_striker_id
    meta["bowler"] = data.new_bowler_id
    meta["need_innings_transition"] = False
    _set_live_meta(m, data.new_striker_id, data.new_non_striker_id, data.new_bowler_id, db, meta)
    db.commit()
    return {"ok": True}

@app.post("/matches/{mid}/set_bowler")
def set_bowler(mid: int, bowler_id: int, db: Session = Depends(get_db)):
    m = _get_match(mid, db)
    meta = _get_live_meta(m)
    meta["bowler"] = bowler_id
    meta["need_bowler"] = False
    _ensure_stats(bowler_id, mid, m.tournament_id, m.current_innings, db)
    _set_live_meta(m, meta["striker"], meta["non_striker"], bowler_id, db, meta)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────
#  SCORECARD
# ─────────────────────────────────────────────

@app.get("/matches/{mid}/scorecard/{innings}", response_model=ScorecardOut)
def scorecard(mid: int, innings: int, db: Session = Depends(get_db)):
    m = _get_match(mid, db)
    batting_team_id = m.team1_id if innings == 1 else (m.batting_team_id or m.team2_id)
    # For innings 1 we know batting team from toss; for innings2 it swapped
    if m.batting_team_id:
        if innings == 1:
            bt_id = m.batting_team_id if m.current_innings == 1 else m.bowling_team_id
            # After match started: innings1 batting = original batting team
            # We stored who bats in innings1 via first toss assignment
            # Simplify: get from deliveries
            first_d = db.query(Delivery).filter(Delivery.match_id==mid, Delivery.innings==1).first()
            if first_d:
                p = db.query(Player).filter(Player.id==first_d.batsman_id).first()
                bt_id = p.team_id if p else m.batting_team_id
            else:
                bt_id = m.batting_team_id
        else:
            first_d = db.query(Delivery).filter(Delivery.match_id==mid, Delivery.innings==2).first()
            if first_d:
                p = db.query(Player).filter(Player.id==first_d.batsman_id).first()
                bt_id = p.team_id if p else m.bowling_team_id
            else:
                bt_id = m.bowling_team_id or m.team2_id
    else:
        bt_id = m.team1_id if innings == 1 else m.team2_id

    team = db.query(Team).filter(Team.id==bt_id).first()
    deliveries = db.query(Delivery).filter(Delivery.match_id==mid, Delivery.innings==innings).all()

    # aggregate batting
    bat_stats: Dict[int, dict] = {}
    for d in deliveries:
        pid = d.batsman_id
        if pid not in bat_stats:
            bat_stats[pid] = {"runs":0,"balls":0,"fours":0,"sixes":0,"out":False,"dismissal":"not out"}
        if d.extra_type not in ("wide",):
            bat_stats[pid]["balls"] += 1
        bat_stats[pid]["runs"] += d.runs_off_bat
        if d.is_boundary: bat_stats[pid]["fours"] += 1
        if d.is_six: bat_stats[pid]["sixes"] += 1
        if d.is_wicket and d.dismissed_player_id == pid:
            bat_stats[pid]["out"] = True
            bat_stats[pid]["dismissal"] = d.wicket_type or "out"

    batters = []
    for pid, s in bat_stats.items():
        p = db.query(Player).filter(Player.id==pid).first()
        sr = round(s["runs"]/s["balls"]*100,1) if s["balls"] > 0 else 0
        batters.append(BatterLine(
            player_id=pid, player_name=p.name if p else str(pid),
            runs=s["runs"], balls=s["balls"], fours=s["fours"], sixes=s["sixes"],
            sr=sr, is_out=s["out"], dismissal=s["dismissal"]
        ))

    # aggregate bowling
    bowl_stats: Dict[int, dict] = {}
    for d in deliveries:
        pid = d.bowler_id
        if pid not in bowl_stats:
            bowl_stats[pid] = {"legal":0,"runs":0,"wickets":0,"maidens":0}
        if d.extra_type not in ("wide","noball"):
            bowl_stats[pid]["legal"] += 1
        bowl_stats[pid]["runs"] += d.runs_off_bat + d.extras
        if d.is_wicket and d.wicket_type not in ("runout",):
            bowl_stats[pid]["wickets"] += 1

    bowlers = []
    for pid, s in bowl_stats.items():
        p = db.query(Player).filter(Player.id==pid).first()
        ov = s["legal"] // 6 + (s["legal"] % 6) * 0.1
        eco = round(s["runs"] / (s["legal"]/6), 2) if s["legal"] >= 6 else round(s["runs"] / max(s["legal"]/6, 0.1), 2)
        bowlers.append(BowlerLine(
            player_id=pid, player_name=p.name if p else str(pid),
            overs=ov, runs=s["runs"], wickets=s["wickets"], economy=eco, maidens=s["maidens"]
        ))

    score = m.innings1_score if innings == 1 else m.innings2_score
    wkts  = m.innings1_wickets if innings == 1 else m.innings2_wickets
    overs = m.innings1_overs if innings == 1 else m.innings2_overs
    extras = sum(d.extras for d in deliveries)

    return ScorecardOut(
        match_id=mid, innings=innings,
        team_id=bt_id, team_name=team.name if team else "",
        total_runs=score, total_wickets=wkts, total_overs=overs,
        batters=batters, bowlers=bowlers, extras=extras
    )

# ─────────────────────────────────────────────
#  POINTS TABLE
# ─────────────────────────────────────────────

@app.get("/tournaments/{tid}/points", response_model=List[PointsRow])
def points_table(tid: int, db: Session = Depends(get_db)):
    teams = db.query(Team).filter(Team.tournament_id == tid).all()
    matches = db.query(Match).filter(Match.tournament_id == tid, Match.status == "completed").all()
    rows = {}
    for t in teams:
        rows[t.id] = {"team_id":t.id,"team_name":t.name,"short_name":t.short_name,
                      "color":t.color,"played":0,"won":0,"lost":0,"tied":0,"nrr":0.0,"points":0,
                      "runs_for":0,"balls_for":0,"runs_against":0,"balls_against":0}
    for m in matches:
        if m.team1_id not in rows or m.team2_id not in rows: continue
        for tid2 in [m.team1_id, m.team2_id]:
            rows[tid2]["played"] += 1
        overs = m.overs
        if m.winner_id:
            rows[m.winner_id]["won"] += 1
            rows[m.winner_id]["points"] += 2
            loser = m.team2_id if m.winner_id == m.team1_id else m.team1_id
            rows[loser]["lost"] += 1
        else:
            for tid2 in [m.team1_id, m.team2_id]:
                rows[tid2]["tied"] += 1
                rows[tid2]["points"] += 1

        # NRR calc (simplified)
        rows[m.team1_id]["runs_for"] += m.innings1_score
        rows[m.team1_id]["balls_for"] += int(m.innings1_overs)*6 + round((m.innings1_overs % 1)*10)
        rows[m.team1_id]["runs_against"] += m.innings2_score
        rows[m.team1_id]["balls_against"] += int(m.innings2_overs)*6 + round((m.innings2_overs % 1)*10)

        rows[m.team2_id]["runs_for"] += m.innings2_score
        rows[m.team2_id]["balls_for"] += int(m.innings2_overs)*6 + round((m.innings2_overs % 1)*10)
        rows[m.team2_id]["runs_against"] += m.innings1_score
        rows[m.team2_id]["balls_against"] += int(m.innings1_overs)*6 + round((m.innings1_overs % 1)*10)

    result = []
    for r in rows.values():
        rf_ov = r["balls_for"]/6 if r["balls_for"] > 0 else 0.0001
        ra_ov = r["balls_against"]/6 if r["balls_against"] > 0 else 0.0001
        nrr = round((r["runs_for"]/rf_ov) - (r["runs_against"]/ra_ov), 3)
        result.append(PointsRow(
            team_id=r["team_id"],team_name=r["team_name"],short_name=r["short_name"],
            color=r["color"],played=r["played"],won=r["won"],lost=r["lost"],
            tied=r["tied"],nrr=nrr,points=r["points"]
        ))
    result.sort(key=lambda x: (-x.points, -x.nrr))
    return result

# ─────────────────────────────────────────────
#  LEADERBOARD
# ─────────────────────────────────────────────

@app.get("/tournaments/{tid}/leaderboard", response_model=LeaderboardOut)
def leaderboard(tid: int, db: Session = Depends(get_db)):
    stats = db.query(PlayerStats).filter(PlayerStats.tournament_id == tid).all()
    # Aggregate per player
    agg: Dict[int, dict] = {}
    for s in stats:
        pid = s.player_id
        if pid not in agg:
            agg[pid] = {"runs":0,"balls":0,"wkts":0,"overs":0.0,"catches":0,"runouts":0,"stumpings":0,"motm":0,"matches":set()}
        agg[pid]["runs"] += s.runs_scored
        agg[pid]["balls"] += s.balls_faced
        agg[pid]["wkts"] += s.wickets_taken
        agg[pid]["overs"] += s.overs_bowled
        agg[pid]["catches"] += s.catches
        agg[pid]["runouts"] += s.run_outs
        agg[pid]["stumpings"] += s.stumpings
        agg[pid]["motm"] += 1 if s.is_motm else 0
        agg[pid]["matches"].add(s.match_id)

    def get_info(pid):
        p = db.query(Player).filter(Player.id==pid).first()
        t = db.query(Team).filter(Team.id==p.team_id).first() if p else None
        return (p.name if p else "?", t.name if t else "?")

    # Top batsmen by runs
    bat_sorted = sorted(agg.items(), key=lambda x: x[1]["runs"], reverse=True)[:5]
    top_bat = []
    for pid, a in bat_sorted:
        pn, tn = get_info(pid)
        sr = round(a["runs"]/a["balls"]*100,1) if a["balls"] > 0 else 0
        top_bat.append(LeaderEntry(player_id=pid,player_name=pn,team_name=tn,
                                   value=a["runs"],extra=f"SR: {sr}"))

    # Top bowlers by wickets
    bowl_sorted = sorted(agg.items(), key=lambda x: x[1]["wkts"], reverse=True)[:5]
    top_bowl = []
    for pid, a in bowl_sorted:
        pn, tn = get_info(pid)
        eco = round(a["runs_conceded"]/a["overs"],2) if a["overs"] > 0 else 0 if False else 0
        top_bowl.append(LeaderEntry(player_id=pid,player_name=pn,team_name=tn,
                                    value=a["wkts"],extra=f"Overs: {round(a['overs'],1)}"))

    # Top fielders: catches + runouts + stumpings
    field_sorted = sorted(agg.items(), key=lambda x: x[1]["catches"]+x[1]["runouts"]+x[1]["stumpings"], reverse=True)[:5]
    top_field = []
    for pid, a in field_sorted:
        pn, tn = get_info(pid)
        total = a["catches"]+a["runouts"]+a["stumpings"]
        top_field.append(LeaderEntry(player_id=pid,player_name=pn,team_name=tn,
                                     value=total,extra=f"C:{a['catches']} RO:{a['runouts']} St:{a['stumpings']}"))

    # MVP: composite score
    def mvp_score(a):
        bat = a["runs"] * 0.5
        bowl = a["wkts"] * 20
        field = (a["catches"]+a["runouts"]+a["stumpings"]) * 10
        motm = a["motm"] * 15
        return bat + bowl + field + motm

    mvp_sorted = sorted(agg.items(), key=lambda x: mvp_score(x[1]), reverse=True)[:5]
    top_mvp = []
    for pid, a in mvp_sorted:
        pn, tn = get_info(pid)
        sc = round(mvp_score(a),1)
        top_mvp.append(LeaderEntry(player_id=pid,player_name=pn,team_name=tn,
                                   value=sc,extra=f"Matches: {len(a['matches'])}"))

    return LeaderboardOut(top_batsmen=top_bat,top_bowlers=top_bowl,
                          top_fielders=top_field,mvp=top_mvp)

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _get_match(mid, db):
    m = db.query(Match).filter(Match.id == mid).first()
    if not m: raise HTTPException(404, "Match not found")
    return m

def _ensure_stats(player_id, match_id, tournament_id, innings, db):
    existing = db.query(PlayerStats).filter(
        PlayerStats.player_id==player_id,
        PlayerStats.match_id==match_id,
        PlayerStats.innings==innings
    ).first()
    if not existing:
        s = PlayerStats(player_id=player_id,match_id=match_id,
                        tournament_id=tournament_id,innings=innings)
        db.add(s)

def _update_batting_stats(pid, mid, tid, innings, runs, is_4, is_6, dismissed, is_extra, db):
    s = db.query(PlayerStats).filter(
        PlayerStats.player_id==pid, PlayerStats.match_id==mid, PlayerStats.innings==innings
    ).first()
    if not s:
        s = PlayerStats(player_id=pid,match_id=mid,tournament_id=tid,innings=innings)
        db.add(s); db.flush()
    s.runs_scored += runs
    if not is_extra: s.balls_faced += 1
    if is_4: s.fours += 1
    if is_6: s.sixes += 1
    if dismissed: s.is_out = True

def _update_bowling_stats(pid, mid, tid, innings, total_runs, is_wicket, is_extra, db):
    s = db.query(PlayerStats).filter(
        PlayerStats.player_id==pid, PlayerStats.match_id==mid, PlayerStats.innings==innings
    ).first()
    if not s:
        s = PlayerStats(player_id=pid,match_id=mid,tournament_id=tid,innings=innings)
        db.add(s); db.flush()
    s.runs_conceded = getattr(s,'runs_conceded',0) + total_runs
    if not is_extra:
        legal = int(s.overs_bowled * 10 % 10) + int(s.overs_bowled) * 6 + 1
        s.overs_bowled = (legal // 6) + (legal % 6) * 0.1
    if is_wicket: s.wickets_taken += 1

def _update_fielding_stats(pid, mid, tid, innings, wkt_type, db):
    s = db.query(PlayerStats).filter(
        PlayerStats.player_id==pid, PlayerStats.match_id==mid, PlayerStats.innings==innings
    ).first()
    if not s:
        s = PlayerStats(player_id=pid,match_id=mid,tournament_id=tid,innings=innings)
        db.add(s); db.flush()
    if wkt_type == "caught": s.catches += 1
    elif wkt_type == "runout": s.run_outs += 1
    elif wkt_type == "stumped": s.stumpings += 1

import json
def _set_live_meta(match, striker, non_striker, bowler, db, existing=None):
    d = existing or {}
    d["striker"] = striker
    d["non_striker"] = non_striker
    d["bowler"] = bowler
    match.win_margin = json.dumps(d)

def _get_live_meta(match):
    try:
        if match.win_margin and match.win_margin.startswith("{"):
            return json.loads(match.win_margin)
    except: pass
    return {"striker": None, "non_striker": None, "bowler": None}

def _last5_balls(mid, innings, db):
    deliveries = db.query(Delivery).filter(
        Delivery.match_id==mid, Delivery.innings==innings
    ).order_by(Delivery.id.desc()).limit(6).all()
    result = []
    for d in reversed(deliveries):
        if d.is_wicket: result.append("W")
        elif d.extra_type == "wide": result.append("Wd")
        elif d.extra_type == "noball": result.append(f"Nb+{d.runs_off_bat}")
        elif d.is_six: result.append("6")
        elif d.is_boundary: result.append("4")
        else: result.append(str(d.runs_off_bat))
    return result[-6:]

def _finish_match(match, db):
    if match.innings2_score > match.innings1_score:
        wid = match.batting_team_id
        wkts_left = 10 - match.innings2_wickets
        match.result_text = f"Won by {wkts_left} wickets"
    elif match.innings1_score > match.innings2_score:
        # Find innings1 batting team
        first_d = db.query(Delivery).filter(Delivery.match_id==match.id, Delivery.innings==1).first()
        if first_d:
            p = db.query(Player).filter(Player.id==first_d.batsman_id).first()
            wid = p.team_id if p else match.bowling_team_id
        else:
            wid = match.bowling_team_id
        margin = match.innings1_score - match.innings2_score
        match.result_text = f"Won by {margin} runs"
    else:
        wid = None
        match.result_text = "Match tied"

    match.winner_id = wid
    # Store win_margin text safely (repurpose field)
    meta = _get_live_meta(match)
    meta["match_over"] = True
    match.win_margin = json.dumps(meta)
    match.status = "completed"
    # Set MOTM: highest scorer in winning team or best all-round
    if wid:
        stats = db.query(PlayerStats).filter(PlayerStats.match_id==match.id).all()
        best = sorted(stats, key=lambda s: s.runs_scored + s.wickets_taken*20, reverse=True)
        if best:
            best[0].is_motm = True

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
