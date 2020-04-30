#!/bin/bash
sql_path='./'
echo ${sql_path}
psql postgres -h 10.0.1.146 -d covid -f ${sql_path}'00-johnshopkins-schema.sql'
psql postgres -h 10.0.1.146 -d covid -f 50-johnshopkins-us-location-data.sql
psql postgres -h 10.0.1.146 -d covid -f 51-johnshopkins-us-deaths-data.sql
psql postgres -h 10.0.1.146 -d covid -f 52-johnshopkins-us-confirmed-data.sql
psql postgres -h 10.0.1.146 -d covid -f 54-johnshopkins-us-death-data-jsonb.sql
psql postgres -h 10.0.1.146 -d covid -f 55-johnshopkins-us-confirmed-data-jsonb.sql
psql postgres -h 10.0.1.146 -d covid -f 60-johnshopkins-global-location-data.sql
psql postgres -h 10.0.1.146 -d covid -f 61-johnshopkins-global-deaths-data.sql
psql postgres -h 10.0.1.146 -d covid -f 62-johnshopkins-global-confirmed-data.sql
psql postgres -h 10.0.1.146 -d covid -f 63-johnshopkins-global-recovered-data.sql
psql postgres -h 10.0.1.146 -d covid -f 64-johnshopkins-global-death-data-jsonb.sql
psql postgres -h 10.0.1.146 -d covid -f 65-johnshopkins-global-confirmed-data-jsonb.sql
psql postgres -h 10.0.1.146 -d covid -f 66-johnshopkins-global-recovered-data-jsonb.sql