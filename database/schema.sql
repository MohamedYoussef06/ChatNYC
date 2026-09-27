CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id),
    key TEXT NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE places (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    summary TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

CREATE TABLE trips (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id),
    place_id UUID REFERENCES places (id),
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    summary TEXT NOT NULL
);
