# Supabase Migrations

This directory contains database migrations for the Supabase backend.

## Running Migrations

You can run these migrations using the Supabase SQL Editor or the Supabase CLI.

### Using SQL Editor

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open each migration file in order and run them

### Using Supabase CLI

1. Install the Supabase CLI: `npm install -g supabase`
2. Link your project: `supabase link --project-ref your-project-ref`
3. Run migrations: `supabase db push`

## Migration Files

- `schema.sql` - Initial schema setup with tables and policies
- `20230101000000_add_language_column.sql` - Adds language column to transcripts table

## Troubleshooting Authentication Issues

If you encounter "Invalid user ID" errors, try these steps:

1. Log out and log back in to refresh your authentication token
2. Check the Supabase RLS policies to ensure they're configured correctly
3. Ensure your database schema matches the expected structure

To manually verify access in the SQL Editor:

```sql
-- Check if a user exists
SELECT * FROM auth.users WHERE id = 'your-user-id';

-- Test if you can insert a record
INSERT INTO transcripts (user_id, title) 
VALUES ('your-user-id', 'Test Transcript')
RETURNING *;
``` 