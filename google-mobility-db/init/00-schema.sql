\connect covid

CREATE SCHEMA IF NOT EXISTS google_mobility;

CREATE EXTENSION IF NOT EXISTS postgis schema public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema public;

CREATE TABLE google_mobility.mobility_change_location (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    country_region_code varchar(128),
    country_region varchar(128),
    sub_region_1 varchar(128),
    sub_region_2 varchar(128),
    iso2 varchar(2),
    iso3 varchar(3),
    code3 int4,
    fips varchar(8),
    centroid geometry(POINT, 4326)
);

ALTER TABLE google_mobility.mobility_change_location ADD CONSTRAINT location_pkey PRIMARY KEY (id);

CREATE TABLE google_mobility.mobility_change (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    retail_and_recreation real,
    grocery_and_pharmacy real,
    parks real,
    transit_stations real,
    workplaces real,
    residential real 
 );

ALTER TABLE google_mobility.mobility_change ADD CONSTRAINT value_pkey PRIMARY KEY (id);

ALTER TABLE google_mobility.mobility_change ADD CONSTRAINT value_location_id_fkey FOREIGN KEY (location_id) REFERENCES google_mobility.mobility_change_location(id) ON UPDATE CASCADE;