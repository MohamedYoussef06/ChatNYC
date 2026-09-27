INSERT INTO users (id, name, neighborhood)
VALUES ('11111111-1111-1111-1111-111111111111', 'Alex Rivera', 'Prospect Heights');

INSERT INTO preferences (id, user_id, key, value)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'transit',
    'subway'
);

INSERT INTO places (id, name, neighborhood, summary, latitude, longitude)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Prospect Park',
    'Brooklyn',
    'Hello-world place seed.',
    40.6602,
    -73.9690
);

INSERT INTO trips (id, user_id, place_id, title, origin, destination, summary)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Saturday in Brooklyn',
    'Atlantic Av-Barclays Ctr',
    'Prospect Park',
    'Take the subway from Atlantic Av-Barclays Ctr toward Prospect Park.'
);
