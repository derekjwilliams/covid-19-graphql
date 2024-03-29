\connect covid
CREATE SCHEMA apple_mobility;

CREATE EXTENSION IF NOT EXISTS postgis schema public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema public;

CREATE TABLE apple_mobility.mobility_location (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    geo_type varchar(64),
    region varchar(64),
    transportation_type varchar(64),
    alternative_name varchar(64),
    subregion varchar(64),
    country varchar(64),
    iso2 varchar(2),
    iso3 varchar(3),
    code3 int4,
    fips varchar(8),
    centroid geometry(POINT, 4326)
);

ALTER TABLE apple_mobility.mobility_location ADD CONSTRAINT location_pkey PRIMARY KEY (id);

CREATE TABLE apple_mobility.value (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "value" real
 );

ALTER TABLE apple_mobility.value ADD CONSTRAINT value_pkey PRIMARY KEY (id);

ALTER TABLE apple_mobility.value ADD CONSTRAINT value_location_id_fkey FOREIGN KEY (location_id) REFERENCES apple_mobility.mobility_location(id) ON UPDATE CASCADE;