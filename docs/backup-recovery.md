# Backup and recovery

Supabase PostgreSQL is the system of record. Storage objects and Auth users must be considered alongside database backups.

## Backup

1. Confirm the intended Supabase project reference before any operation.
2. Use the Supabase dashboard's managed backups/PITR for the subscribed plan and periodically export a logical database backup with the provider-supported `supabase db dump` workflow.
3. Export Storage objects separately; the database stores paths, not image bytes.
4. Keep backups encrypted, access-controlled, outside the application repository, and test restoration on a non-production project.
5. Record the migration revision, backup timestamp, project reference, and Storage export timestamp together.

Never place database dumps, Auth exports, service-role keys, or customer data in Git.

## Recovery drill

1. Create or select an empty, non-production Supabase project.
2. Restore the logical backup using Supabase's documented restore process.
3. Restore Storage objects to their original bucket paths.
4. Apply only migrations newer than the recorded backup revision.
5. configure new local/staging secrets and Auth redirect URLs; do not reuse production secrets unnecessarily.
6. Run database/RLS checks and every hosted smoke script.
7. Compare table counts, sample booking histories, Storage object availability, and report totals with the recorded backup evidence.
8. Switch traffic only after customer/admin journeys pass. Preserve the failed environment for diagnosis rather than overwriting the last known-good backup.

Schema roll-forward is preferred. If a migration must be reversed, restore into a new project from the last verified backup and validate it before changing application endpoints.
