# Database scripts

These sql scripts create the johns_hopkins schema and populate the database

## Run All

The bash script `load-data.sh` will run all of the sql scripts to create the schema and add the data.

Update this script to set the appropriate psql arguments

Delete any existing johns_hopkins schema prior to running, i.e.: `delete schema johns_hopkins cascade`

## Complete backups from pg_dump

There are two backups, one plain and one custom/compressed

These are `backup.sql` and `backup.dmp` respectively

These are created with the following commands


`pg_dump --verbose --host=localhost --port=5432 --username=myusername --format=p --no-privileges --no-owner -n "johns_hopkins" covid`

`pg_dump --verbose --host=localhost --port=5432 --username=myusername --format=c --compress=9 --no-privileges --no-owner -n "johns_hopkins" covid`