# Database scripts

These sql scripts create the johns_hopkins schema and populate the database

## Run All

The bash script `load-data.sh` will run all of the sql scripts to create the schema and add the data.

Update this script to set the appropriate psql arguments

Delete any existing johns_hopkins schema prior to running, i.e.: `delete schema johns_hopkins cascade`

## Complete backups from pg_dump

There are two backups, one plain and one custom/compressed

These are `backup.sql` and `backup.dmp` respectively