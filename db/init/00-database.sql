/*Connecting to the database automatically creates it*/
\connect covid

CREATE SCHEMA johns_hopkins;

    
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema public;

CREATE TABLE johns_hopkins.location (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text
);
ALTER TABLE johns_hopkins.location ADD CONSTRAINT location_pkey PRIMARY KEY (id);

CREATE TABLE johns_hopkins.case_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT8
 );
ALTER TABLE johns_hopkins.case_count ADD CONSTRAINT case_count_pkey PRIMARY KEY (id);

ALTER TABLE johns_hopkins.case_count ADD CONSTRAINT case_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.case_count IS
'Confirmed Counts';

COMMENT ON COLUMN johns_hopkins.case_count.count IS
'Number of confirmed cases, if null also check missing and missing_reason';


CREATE TABLE johns_hopkins.missing_case_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "missing" Bool default false,
    "missing_reason" varchar (32)
);

ALTER TABLE johns_hopkins.missing_case_count ADD CONSTRAINT missing_case_count_pkey PRIMARY KEY (id);

ALTER TABLE johns_hopkins.missing_case_count ADD CONSTRAINT missing_case_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;

COMMENT ON COLUMN johns_hopkins.missing_case_count.missing IS
'Indicates if if data is missing, false if valid data is present';

COMMENT ON COLUMN johns_hopkins.missing_case_count.missing_reason IS
'Reason for missing data';


CREATE TABLE johns_hopkins.death_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT8
 );

ALTER TABLE johns_hopkins.death_count ADD CONSTRAINT death_count_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.death_count ADD CONSTRAINT death_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.death_count IS
'Number of deaths';

COMMENT ON COLUMN johns_hopkins.death_count.count IS
'Number of deaths, if missing also check missing and missing_reason';

CREATE TABLE johns_hopkins.missing_death_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "missing" Bool default false,
    "missing_reason" varchar (32)
);

ALTER TABLE johns_hopkins.missing_death_count ADD CONSTRAINT missing_death_count_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.missing_death_count ADD CONSTRAINT missing_death_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON COLUMN johns_hopkins.missing_death_count.missing IS
'Indicates if if data is missing, false if valid data is present';

COMMENT ON COLUMN johns_hopkins.missing_death_count.missing_reason IS
'Reason for missing data';

CREATE TABLE johns_hopkins.recovered_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT8
 );
ALTER TABLE johns_hopkins.recovered_count ADD CONSTRAINT recovered_count_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.recovered_count ADD CONSTRAINT recovered_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.recovered_count IS
'Number of recovered';

COMMENT ON COLUMN johns_hopkins.recovered_count.count IS
'Number of recovered, if missing also check missing and missing_reason';


CREATE TABLE johns_hopkins.missing_recovered_count (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "missing" Bool default false,
    "missing_reason" varchar (32)
);

ALTER TABLE johns_hopkins.missing_recovered_count ADD CONSTRAINT missing_recovered_count_pkey PRIMARY KEY (id);
ALTER TABLE johns_hopkins.missing_recovered_count ADD CONSTRAINT missing_recovered_count_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;

COMMENT ON COLUMN johns_hopkins.missing_recovered_count.missing IS
'Indicates if if data is missing, false if valid data is present';

COMMENT ON COLUMN johns_hopkins.missing_recovered_count.missing_reason IS
'Reason for missing data';