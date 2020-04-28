/*Connecting to the database automatically creates it*/
\connect covid

CREATE SCHEMA johns_hopkins;

CREATE EXTENSION IF NOT EXISTS postgis schema public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema public;

CREATE TABLE johns_hopkins.location (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    uid int8,
    iso2 varchar(2),
    iso3 varchar(3),
    code3 int4,
    fips varchar(8),
    admin2 varchar(128),
    province_state varchar(128),
    country_region varchar(128),
    combined_key varchar(256),
    centroid geometry(POINT, 4326),
    population int4
);

COMMENT ON TABLE johns_hopkins.location IS
'A bit denormalized, matches the columns in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.uid IS
'This is a unique ID in Johns Hopkins time series data, can be used to match the rows from the Johns Hopkins data sets, Same column as uid in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.iso2 IS
'Same column as iso2 in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.iso3 IS
'Same column as iso3 in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.code3 IS
'Same column as code3 in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.fips IS
'Same column as fips in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.admin2 IS
'Same column as admin2 in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.province_state IS
'Same column as province_state in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.country_region IS
'Same column as country_region in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

COMMENT ON COLUMN johns_hopkins.location.combined_key IS
'Same column as combined_key in https://github.com/derekjwilliams/COVID-19/blob/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv';

ALTER TABLE johns_hopkins.location ADD CONSTRAINT location_pkey PRIMARY KEY (id);

CREATE TABLE johns_hopkins.case_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT4
 );
ALTER TABLE johns_hopkins.case_count ADD CONSTRAINT case_count_pkey PRIMARY KEY (id);

ALTER TABLE johns_hopkins.case_count ADD CONSTRAINT case_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;

COMMENT ON TABLE johns_hopkins.case_count IS
'Confirmed Counts';

COMMENT ON COLUMN johns_hopkins.case_count.count IS
'Number of confirmed cases';


CREATE TABLE johns_hopkins.death_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT4
 );

ALTER TABLE johns_hopkins.death_count ADD CONSTRAINT death_count_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.death_count ADD CONSTRAINT death_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.death_count IS
'Number of deaths';

COMMENT ON COLUMN johns_hopkins.death_count.count IS
'Number of deaths';

CREATE TABLE johns_hopkins.recovered_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT4
 );
ALTER TABLE johns_hopkins.recovered_count ADD CONSTRAINT recovered_count_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.recovered_count ADD CONSTRAINT recovered_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.recovered_count IS
'Number of recovered';

COMMENT ON COLUMN johns_hopkins.recovered_count.count IS
'Number of recovered';

-- other indices

CREATE INDEX death_time_idx ON johns_hopkins.death_count USING BTREE(time);
CREATE INDEX case_time_idx ON johns_hopkins.case_count USING BTREE(time);
CREATE INDEX recovered_time_idx ON johns_hopkins.recovered_count USING BTREE(time);

CREATE INDEX location_centroid_idx ON johns_hopkins.location USING GIST (centroid);

-- jsonb tables

CREATE TABLE johns_hopkins.case_count_jsonb (
  id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
  location_id uuid NULL,
  "counts" jsonb NOT NULL
);

CREATE INDEX case_count_jsonb_idx ON johns_hopkins.case_count_jsonb USING GIN ("counts" jsonb_path_ops);

CREATE TABLE johns_hopkins.death_count_jsonb (
  id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
  location_id uuid NULL,
  "counts" jsonb NOT NULL
);

CREATE INDEX death_count_jsonb_idx ON johns_hopkins.death_count_jsonb USING GIN ("counts" jsonb_path_ops);

CREATE TABLE johns_hopkins.recovered_count_jsonb (
  id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
  location_id uuid NULL,
  "counts" jsonb NOT NULL
);

CREATE INDEX recovered_count_jsonb_idx ON johns_hopkins.recovered_count_jsonb USING GIN ("counts" jsonb_path_ops);

ALTER TABLE johns_hopkins.case_count_jsonb ADD CONSTRAINT case_count_jsonb_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.case_count_jsonb ADD CONSTRAINT case_count_jsonb_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;
ALTER TABLE johns_hopkins.death_count_jsonb ADD CONSTRAINT death_count_jsonb_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.death_count_jsonb ADD CONSTRAINT death_count_jsonb_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;
ALTER TABLE johns_hopkins.recovered_count_jsonb ADD CONSTRAINT recovered_count_jsonb_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.recovered_count_jsonb ADD CONSTRAINT recovered_count_jsonb_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;

