from array import array
from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from app.feeds import live_trips
from app.feeds.realtime import live_store
from app.feeds.static_gtfs import Station, TransitGraph
from app.main import app
from app.routing import timetable
from app.routing.places import clustered, match_stations, tokens
from app.routing.planner import add_summary
from app.routing.router import plan_trip
from app.routing.timetable import Timetable, TripInfo, service_base

DAY = date(2026, 9, 26)
NY = timetable.NY


def _clock(hour: int, minute: int = 0) -> int:
    return hour * 3600 + minute * 60


def _graph() -> TransitGraph:
    graph = TransitGraph()
    graph.stations = {
        "A": Station("A", "Alpha Sq", 40.75529, -73.987495),
        "B": Station("B", "Beta Sq", 40.73000, -73.99000),
        "C": Station("C", "Gamma Sq", 40.71000, -73.99000),
    }
    graph.stop_to_parent = {key: key for key in graph.stations}
    graph.route_names = {"N": "N", "R": "R", "Q": "Q"}
    return graph


def _table(graph: TransitGraph, trips: list[tuple[str, list[str], list[int]]]) -> Timetable:
    table = Timetable(graph)
    for index, (route, stops, departs) in enumerate(trips):
        times = array("i")
        for t in departs:
            times.extend((t, t))
        table.trips.append(TripInfo(f"T{index}", route, "", f"{route} end", "S"))
        table.stops.append(tuple(stops))
        table.times.append(times)
    return table


@pytest.fixture
def use_table(monkeypatch):
    def install(trips):
        graph = _graph()
        table = _table(graph, trips)
        monkeypatch.setattr("app.feeds.static_gtfs._graph", graph)
        monkeypatch.setattr("app.routing.timetable._timetable", table)
        return graph, table

    return install


def _plan(depart: datetime, **kwargs) -> dict:
    return plan_trip("Start", 40.75529, -73.987495, "End", 40.71000, -73.99000, depart, **kwargs)


def test_skips_a_line_that_is_not_running_yet(use_table):
    # the old router picked the N here and waited until 11 pm
    use_table(
        [
            ("N", ["A", "C"], [_clock(23), _clock(23, 5)]),
            ("R", ["A", "B", "C"], [_clock(12, 10), _clock(12, 14), _clock(12, 20)]),
        ]
    )
    plan = _plan(datetime(2026, 9, 26, 12, 0, tzinfo=NY))
    subway = [leg for leg in plan["legs"] if leg["type"] == "subway"]
    assert [leg["route"] for leg in subway] == ["R"]
    assert subway[0]["departure"].startswith("2026-09-26T12:10")
    assert subway[0]["stops"] == 2
    assert subway[0]["headsign"] == "R end"


def test_prefers_one_seat_ride_over_a_close_transfer(use_table):
    use_table(
        [
            ("R", ["A", "C"], [_clock(12, 5), _clock(12, 30)]),
            ("N", ["A", "B"], [_clock(12, 1), _clock(12, 10)]),
            ("Q", ["B", "C"], [_clock(12, 14), _clock(12, 29)]),
        ]
    )
    plan = _plan(datetime(2026, 9, 26, 12, 0, tzinfo=NY))
    assert [leg["route"] for leg in plan["legs"] if leg["type"] == "subway"] == ["R"]


def test_takes_the_transfer_when_it_is_much_faster(use_table):
    use_table(
        [
            ("R", ["A", "C"], [_clock(12, 5), _clock(13, 0)]),
            ("N", ["A", "B"], [_clock(12, 1), _clock(12, 10)]),
            ("Q", ["B", "C"], [_clock(12, 14), _clock(12, 29)]),
        ]
    )
    plan = add_summary(_plan(datetime(2026, 9, 26, 12, 0, tzinfo=NY)))
    assert [leg["type"] for leg in plan["legs"]] == ["walk", "subway", "transfer", "subway", "walk"]
    assert plan["transfers"] == 1
    assert plan["summary"] == "Take the N to Beta Sq, then the Q to Gamma Sq"


def test_live_train_replaces_the_scheduled_one(use_table):
    graph, _ = use_table([("R", ["A", "C"], [_clock(12, 5), _clock(12, 20)])])
    base = service_base(DAY)
    trips = [("rt-1", "R", [["A", base + _clock(12, 9), base + _clock(12, 9)], ["C", base + _clock(12, 25), base + _clock(12, 25)]])]
    connections, info = live_trips.build(trips, graph, base + _clock(11))
    live_store.publish({}, (), connections, info)
    plan = _plan(datetime(2026, 9, 26, 12, 0, tzinfo=NY))
    subway = [leg for leg in plan["legs"] if leg["type"] == "subway"]
    assert plan["live"] is True
    assert len(subway) == 1 and subway[0]["live"] is True
    assert subway[0]["departure"].startswith("2026-09-26T12:09")


def test_arrive_by_leaves_as_late_as_possible(use_table):
    use_table(
        [
            ("R", ["A", "C"], [_clock(12, 5), _clock(12, 20)]),
            ("R", ["A", "C"], [_clock(12, 35), _clock(12, 50)]),
            ("R", ["A", "C"], [_clock(13, 5), _clock(13, 20)]),
        ]
    )
    deadline = datetime(2026, 9, 26, 13, 0, tzinfo=NY)
    plan = add_summary(_plan(datetime(2026, 9, 26, 11, 0, tzinfo=NY), arrive_by=deadline, buffer_seconds=300), deadline, 300)
    subway = [leg for leg in plan["legs"] if leg["type"] == "subway"]
    assert subway[0]["departure"].startswith("2026-09-26T12:35")
    assert plan["on_time"] is True
    assert plan["slack_seconds"] >= 300


def test_short_hop_is_a_walk(use_table):
    use_table([("R", ["A", "B"], [_clock(12, 5), _clock(12, 10)])])
    plan = plan_trip("Start", 40.75529, -73.987495, "Nearby", 40.7540, -73.9880, datetime(2026, 9, 26, 12, 0, tzinfo=NY))
    assert [leg["type"] for leg in plan["legs"]] == ["walk"]


def test_station_name_matching():
    graph = TransitGraph()
    graph.stations = {
        "D24": Station("D24", "Atlantic Av-Barclays Ctr", 40.6843, -73.9772),
        "626": Station("626", "86 St", 40.7795, -73.9557),
        "R44": Station("R44", "86 St", 40.6226, -74.0283),
        "419": Station("419", "Wall St", 40.7074, -74.0116),
        "230": Station("230", "Wall St", 40.7068, -74.0091),
    }
    assert tokens("116th Street") == ["116", "st"]
    assert [s.id for s in match_stations(graph, "Barclay's Center")] == ["D24"]
    assert not clustered(match_stations(graph, "86th st"))
    assert clustered(match_stations(graph, "wall street"))
    assert match_stations(graph, "street") == []


def test_trip_list_matches_the_frontend_trip_type(monkeypatch):
    graph = _graph()

    def fake_load() -> None:
        import app.feeds.static_gtfs as static_gtfs

        static_gtfs._graph = graph

    async def idle(stop) -> None:
        await stop.wait()

    monkeypatch.setattr("app.main.load", fake_load)
    monkeypatch.setattr("app.main.live_store.poll_loop", idle)
    monkeypatch.setattr("app.routing.timetable.after_load", lambda: None)
    monkeypatch.setattr("app.routing.timetable._timetable", _table(graph, [("R", ["A", "C"], [_clock(12, 5), _clock(12, 20)])]))
    with TestClient(app) as client:
        created = client.post(
            "/api/trips",
            json={
                "origin": {"label": "Start", "lat": 40.75529, "lon": -73.987495},
                "destination": {"label": "End", "lat": 40.71000, "lon": -73.99000},
                "depart_at": "2026-09-26T12:00:00-04:00",
            },
        )
        assert created.status_code == 200, created.text
        assert created.json()["breakdown"]["ride_seconds"] == 15 * 60
        cards = client.get("/api/trips").json()
        assert {"id", "title", "origin", "destination", "summary"} <= set(cards[0])
        assert cards[0]["origin"] == "Start"
        assert cards[0]["summary"] == "Take the R to Gamma Sq"


def test_running_train_missing_from_a_healthy_feed_is_skipped(use_table):
    graph, _ = use_table(
        [
            ("R", ["A", "C"], [_clock(11, 50), _clock(12, 20)]),
            ("Q", ["A", "C"], [_clock(12, 15), _clock(12, 40)]),
        ]
    )
    # R already left its terminal but the feed has no R trains
    live_store.publish({}, (), (), {}, frozenset({"R", "Q"}))
    monkey_now = service_base(DAY) + _clock(12)
    live_store._snapshot.updated_at = monkey_now
    live = live_store.snapshot()
    conns = timetable.connections(timetable.current(), monkey_now, monkey_now + 3600, live)
    assert {c[5] for c in conns} == {"Q"}
