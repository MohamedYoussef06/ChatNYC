import time
import zipfile
from collections import defaultdict

from google.transit import gtfs_realtime_pb2

from app.feeds.realtime import LiveSnapshot, _feed_url, _parse_alerts, _parse_trip_updates
from app.feeds.static_gtfs import Station, TransitGraph, _build_graph


def test_recent_snapshot_is_fresh_without_arrivals():
    assert LiveSnapshot(updated_at=time.time(), arrivals={}).fresh is True
    assert LiveSnapshot().fresh is False
    assert LiveSnapshot(updated_at=time.time() - 10_000, arrivals={("A", "B", "N"): (1,)}).fresh is False


def test_feed_url_encodes_the_slash():
    assert _feed_url("nyct/gtfs").endswith("/nyct%2Fgtfs")
    assert _feed_url("camsys/all-alerts").endswith("/camsys%2Fall-alerts")


def test_static_zip_builds_parent_stations_and_a_ride(tmp_path):
    zip_path = tmp_path / "google_transit.zip"
    tables = {
        "stops.txt": (
            "stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\n"
            "A,Alpha Sq,40.75,-73.99,1,\n"
            "A1,Alpha Sq,40.75,-73.99,0,A\n"
            "B,Beta Sq,40.73,-73.99,1,\n"
            "B1,Beta Sq,40.73,-73.99,0,B\n"
        ),
        "routes.txt": "route_id,route_short_name,route_long_name,route_type\nN,N,Broadway,1\n",
        "trips.txt": "route_id,service_id,trip_id,direction_id\nN,WKD,T1,0\n",
        "stop_times.txt": (
            "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n"
            "T1,08:00:00,08:00:00,A1,1\n"
            "T1,08:05:00,08:05:00,B1,2\n"
        ),
    }
    with zipfile.ZipFile(zip_path, "w") as archive:
        for name, text in tables.items():
            archive.writestr(name, text)

    graph = _build_graph(zip_path)
    assert set(graph.stations) == {"A", "B"}
    assert graph.parent_of("A1") == "A"
    assert graph.route_label("N") == "N"
    assert graph.rides[("A", "N")][0].to_station == "B"
    assert graph.rides[("A", "N")][0].seconds == 300
    assert graph.departures[("A", "B", "N")] == [8 * 3600]
    assert graph.search("beta")[0].id == "B"


def _feed() -> gtfs_realtime_pb2.FeedMessage:
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.header.gtfs_realtime_version = "2.0"
    return feed


def test_trip_update_indexes_the_boarding_stop_and_next_stop():
    feed = _feed()
    entity = feed.entity.add()
    entity.id = "trip-1"
    entity.trip_update.trip.route_id = "N"
    entity.trip_update.trip.trip_id = "T1"
    first = entity.trip_update.stop_time_update.add()
    first.stop_id = "A1"
    first.arrival.time = 1_700_000_000
    second = entity.trip_update.stop_time_update.add()
    second.stop_id = "B1"
    second.arrival.time = 1_700_000_300

    graph = TransitGraph()
    graph.stations = {
        "A": Station("A", "Alpha Sq", 40.75, -73.99),
        "B": Station("B", "Beta Sq", 40.73, -73.99),
    }
    graph.stop_to_parent = {"A1": "A", "B1": "B", "A": "A", "B": "B"}
    arrivals: dict[tuple[str, str, str], list[int]] = defaultdict(list)
    _parse_trip_updates(feed.SerializeToString(), graph, arrivals)
    assert arrivals[("A", "B", "N")] == [1_700_000_000]


def test_alerts_keep_subway_routes_only(monkeypatch):
    graph = TransitGraph()
    graph.route_names = {"N": "N", "SI": "SIR"}
    monkeypatch.setattr("app.feeds.realtime.current_graph", lambda: graph)

    feed = _feed()
    subway = feed.entity.add()
    subway.id = "subway-alert"
    subway.alert.header_text.translation.add(text="Delays on the N", language="en")
    subway_route = subway.alert.informed_entity.add()
    subway_route.agency_id = "MTASBWY"
    subway_route.route_id = "N"

    bus = feed.entity.add()
    bus.id = "bus-alert"
    bus.alert.header_text.translation.add(text="M15 delays", language="en")
    bus_route = bus.alert.informed_entity.add()
    bus_route.agency_id = "MTABC"
    bus_route.route_id = "M15"

    notices = _parse_alerts(feed.SerializeToString())
    assert [notice.header for notice in notices] == ["Delays on the N"]
    assert notices[0].routes == ("N",)
