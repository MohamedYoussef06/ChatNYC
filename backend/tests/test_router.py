from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from app.feeds.realtime import AlertNotice, live_store
from app.feeds.static_gtfs import RideEdge, Station, TransitGraph
from app.routing.geocode import TripPlanningError
from app.routing.router import _shortest_path, plan_trip

NY = ZoneInfo("America/New_York")


def _graph() -> TransitGraph:
    graph = TransitGraph()
    graph.stations = {
        "A": Station("A", "Alpha Sq", 40.75529, -73.987495),
        "B": Station("B", "Beta Sq", 40.73000, -73.99000),
        "C": Station("C", "Gamma Sq", 40.71000, -73.99000),
    }
    graph.route_names = {"N": "N", "Q": "Q"}
    graph.rides = {
        ("A", "N"): [RideEdge("B", 120)],
        ("B", "N"): [RideEdge("C", 180)],
        ("A", "Q"): [RideEdge("C", 900)],
    }
    graph.routes_at = {"A": {"N", "Q"}, "B": {"N"}}
    graph.departures = {("A", "B", "N"): [8 * 3600]}
    return graph


def test_shortest_path_prefers_the_quicker_line():
    drafts = _shortest_path(_graph(), "A", "C", 120)
    assert len(drafts) == 1
    assert drafts[0].kind == "subway"
    assert drafts[0].route_id == "N"
    assert drafts[0].seconds == 300
    assert drafts[0].first_hop_to == "B"


def test_shortest_path_inserts_a_platform_transfer():
    graph = TransitGraph()
    graph.rides = {
        ("A", "N"): [RideEdge("B", 100)],
        ("B", "Q"): [RideEdge("C", 100)],
    }
    graph.routes_at = {"A": {"N"}, "B": {"Q"}}
    drafts = _shortest_path(graph, "A", "C", 120)
    assert [draft.kind for draft in drafts] == ["subway", "transfer", "subway"]
    assert drafts[1].seconds == 120


def test_live_arrival_shifts_the_ride(monkeypatch):
    graph = _graph()
    monkeypatch.setattr("app.feeds.static_gtfs._graph", graph)
    live_at = datetime(2026, 9, 26, 12, 10, tzinfo=NY)
    live_store.publish(
        {("A", "B", "N"): (int(live_at.timestamp()),)},
        (AlertNotice("Delays on the N", ("N",)), AlertNotice("Q work", ("Q",))),
    )
    plan = plan_trip(
        "Start",
        40.75529,
        -73.987495,
        "End",
        40.71000,
        -73.99000,
        datetime(2026, 9, 26, 12, 0, tzinfo=NY),
    )
    assert plan["live"] is True
    assert [leg["type"] for leg in plan["legs"]] == ["walk", "subway", "walk"]
    subway = plan["legs"][1]
    assert subway["route"] == "N"
    assert subway["live"] is True
    assert subway["departure"].startswith("2026-09-26T12:10:00")
    assert subway["arrival"].startswith("2026-09-26T12:15:00")
    assert plan["alerts"] == [{"header": "Delays on the N", "routes": ["N"]}]
    assert plan["duration_seconds"] == 15 * 60


def test_only_the_first_subway_leg_is_live(monkeypatch):
    graph = TransitGraph()
    graph.stations = {
        "A": Station("A", "Alpha Sq", 40.75529, -73.987495),
        "B": Station("B", "Beta Sq", 40.73000, -73.99000),
        "C": Station("C", "Gamma Sq", 40.71000, -73.99000),
    }
    graph.route_names = {"N": "N", "Q": "Q"}
    graph.rides = {
        ("A", "N"): [RideEdge("B", 100)],
        ("B", "Q"): [RideEdge("C", 100)],
    }
    graph.routes_at = {"A": {"N"}, "B": {"Q"}}
    monkeypatch.setattr("app.feeds.static_gtfs._graph", graph)
    live_at = datetime(2026, 9, 26, 12, 10, tzinfo=NY)
    live_store.publish({("A", "B", "N"): (int(live_at.timestamp()),)}, ())
    plan = plan_trip(
        "Start",
        40.75529,
        -73.987495,
        "End",
        40.71000,
        -73.99000,
        datetime(2026, 9, 26, 12, 0, tzinfo=NY),
    )
    subway = [leg for leg in plan["legs"] if leg["type"] == "subway"]
    assert plan["live"] is True
    assert [leg["route"] for leg in subway] == ["N", "Q"]
    assert subway[0]["live"] is True
    assert subway[1]["live"] is False


def test_static_schedule_when_live_cache_is_empty(monkeypatch):
    monkeypatch.setattr("app.feeds.static_gtfs._graph", _graph())
    plan = plan_trip(
        "Start",
        40.75529,
        -73.987495,
        "End",
        40.71000,
        -73.99000,
        datetime(2026, 9, 26, 12, 0, tzinfo=NY),
    )
    assert plan["live"] is False
    assert plan["legs"][1]["departure"].startswith("2026-09-27T08:00:00")
    assert plan["alerts"] == []


def test_point_outside_the_subway_set_is_rejected(monkeypatch):
    monkeypatch.setattr("app.feeds.static_gtfs._graph", _graph())
    with pytest.raises(TripPlanningError) as raised:
        plan_trip(
            "Boston",
            42.3601,
            -71.0589,
            "End",
            40.71000,
            -73.99000,
            datetime(2026, 9, 26, 12, 0, tzinfo=NY),
        )
    assert raised.value.status_code == 400


def test_same_station_is_a_walk(monkeypatch):
    monkeypatch.setattr("app.feeds.static_gtfs._graph", _graph())
    plan = plan_trip(
        "Start",
        40.75529,
        -73.987495,
        "Nearby",
        40.75530,
        -73.98750,
        datetime(2026, 9, 26, 12, 0, tzinfo=NY),
    )
    assert plan["live"] is False
    assert [leg["type"] for leg in plan["legs"]] == ["walk"]
    assert plan["legs"][0]["route"] is None
