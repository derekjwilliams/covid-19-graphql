\connect covid

SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA johns_hopkins;

SET default_tablespace = '';

SET default_with_oids = false;

CREATE SCHEMA johns_hopkins;

CREATE TABLE johns_hopkins.location (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    name text
);

CREATE TABLE johns_hopkins.case_count (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT8
 );
ALTER TABLE johns_hopkins.case_count ADD CONSTRAINT casecount_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.case_count IS
'Confirmed Counts';

COMMENT ON COLUMN johns_hopkins.case_count.count IS
'Number of confirmed cases, if null also check missing and missing_reason';


CREATE TABLE johns_hopkins.missing_case_count (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    location_id INT4,
    "missing" Bool default false,
    "missing_reason" varchar (32)
);

COMMENT ON COLUMN johns_hopkins.missing_case_count.missing IS
'Indicates if if data is missing, false if valid data is present';

COMMENT ON COLUMN johns_hopkins.missing_case_count.missing_reason IS
'Reason for missing data';


CREATE TABLE johns_hopkins.death_count (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT8
 );
ALTER TABLE johns_hopkins.death_count ADD CONSTRAINT deathcount_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.death_count IS
'Number of deaths';

COMMENT ON COLUMN johns_hopkins.death_count.count IS
'Number of deaths, if missing also check missing and missing_reason';


CREATE TABLE johns_hopkins.missing_death_count (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    location_id INT4,
    "missing" Bool default false,
    "missing_reason" varchar (32)
);

COMMENT ON COLUMN johns_hopkins.missing_death_count.missing IS
'Indicates if if data is missing, false if valid data is present';

COMMENT ON COLUMN johns_hopkins.missing_death_count.missing_reason IS
'Reason for missing data';

CREATE TABLE johns_hopkins.recovered_count (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    location_id uuid,
    "time" TIMESTAMPTZ not NULL,
    "count" INT8
 );
ALTER TABLE johns_hopkins.recovered_count ADD CONSTRAINT recoveredcount_location_id_fkey FOREIGN KEY (location_id) REFERENCES johns_hopkins.location(id) ON UPDATE CASCADE;


COMMENT ON TABLE johns_hopkins.recovered_count IS
'Number of recovered';

COMMENT ON COLUMN johns_hopkins.recovered_count.count IS
'Number of recovered, if missing also check missing and missing_reason';


CREATE TABLE johns_hopkins.missing_recovered_count (
    id uuid DEFAULT mimi.uuid_generate_v4() NOT NULL,
    location_id INT4,
    "missing" Bool default false,
    "missing_reason" varchar (32)
);

COMMENT ON COLUMN johns_hopkins.missing_recovered_count.missing IS
'Indicates if if data is missing, false if valid data is present';

COMMENT ON COLUMN johns_hopkins.missing_recovered_count.missing_reason IS
'Reason for missing data';

