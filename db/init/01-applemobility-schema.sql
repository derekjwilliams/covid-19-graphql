/*Connecting to the database automatically creates it*/
\connect covid

CREATE SCHEMA apple_mobility;

CREATE EXTENSION IF NOT EXISTS postgis schema public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema public;

CREATE TABLE apple_mobility.mobility_location_type (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    geo_type varchar(64),
    region varchar(64),
    transportation_type varchar(64)
);

-- See https://www.apple.com/covid19/mobility for more information