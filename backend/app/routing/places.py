from __future__ import annotations

import math
import re

from app.feeds.static_gtfs import Station, TransitGraph

# spell things the way MTA station names do
_ABBREV = {
    "street": "st",
    "str": "st",
    "avenue": "av",
    "ave": "av",
    "square": "sq",
    "center": "ctr",
    "centre": "ctr",
    "boulevard": "blvd",
    "road": "rd",
    "place": "pl",
    "parkway": "pkwy",
    "heights": "hts",
    "east": "e",
    "west": "w",
    "fort": "ft",
    "mount": "mt",
    "saint": "st",
    "washington": "wash",
    "park": "pk",
}
_FILLER = {"the", "station", "subway", "stop", "train", "nyc", "and", "of", "at", "in", "ny"}
# a query of only these matches half the system
_GENERIC = {"st", "av", "sq", "pl", "rd", "blvd", "e", "w", "n", "s"}
CLUSTER_METERS = 800


def tokens(text: str) -> list[str]:
    text = text.lower().replace("'", "").replace("’", "")
    text = re.sub(r"\b(\d+)(st|nd|rd|th)\b", r"\1", text)
    out = []
    for word in re.findall(r"[a-z0-9]+", text):
        word = _ABBREV.get(word, word)
        if word not in _FILLER:
            out.append(word)
    return out


def match_stations(graph: TransitGraph, text: str) -> list[Station]:
    wanted = set(tokens(text))
    if not wanted or wanted <= _GENERIC:
        return []
    hits = []
    for station in graph.stations.values():
        have = tokens(station.name)
        if wanted <= set(have):
            hits.append((len(have) - len(wanted), station.name, station))
    hits.sort(key=lambda hit: (hit[0], hit[1]))
    return [hit[2] for hit in hits]


def clustered(stations: list[Station]) -> bool:
    # like the two Wall St stations
    first = stations[0]
    return all(distance_m(first.lat, first.lon, s.lat, s.lon) <= CLUSTER_METERS for s in stations[1:])


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lon / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(a))
