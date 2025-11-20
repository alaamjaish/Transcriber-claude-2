#!/bin/bash

# Script to copy production data to dev database
# Run this ONE TIME to populate dev with production data

echo "🔄 Copying production data to dev database..."

# Export from production
npx supabase db dump --db-url "postgresql://postgres:[YOUR_PROD_PASSWORD]@db.[YOUR_PROD_REF].supabase.co:5432/postgres" --data-only -f prod-data.sql

# Import to dev
psql "postgresql://postgres:[YOUR_DEV_PASSWORD]@db.[YOUR_DEV_REF].supabase.co:5432/postgres" -f prod-data.sql

echo "✅ Done! Dev database now has production data"
echo "⚠️  Remember: Changes to dev won't affect production"
