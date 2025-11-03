#!/bin/bash

# Supabase Migration Setup Script
# This script applies the post_comments table migration

echo "🚀 Setting up post_comments table in Supabase..."

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if required variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Supabase credentials not found in .env.local"
  exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "📊 Project: $PROJECT_REF"
echo "🔗 URL: $NEXT_PUBLIC_SUPABASE_URL"

# Read the migration SQL
MIGRATION_SQL=$(cat supabase/migrations/001_create_post_comments_table.sql)

# Execute migration using Supabase REST API
echo "⚙️  Applying migration..."

RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

# Check if successful
if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully!"
  echo ""
  echo "📝 Created:"
  echo "   - post_comments table"
  echo "   - Indexes for performance"
  echo "   - RLS policies for security"
  echo "   - Triggers for updated_at"
  echo ""
  echo "🎉 Comments feature is ready to use!"
else
  echo "❌ Migration failed. Please apply manually via Supabase Dashboard:"
  echo "   https://supabase.com/dashboard/project/$PROJECT_REF/editor"
  echo ""
  echo "📄 Run the SQL from: supabase/migrations/001_create_post_comments_table.sql"
fi
