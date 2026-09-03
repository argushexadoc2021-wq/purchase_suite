import subprocess
import sys
import os

# ==========================================
# SUPABASE DATABASE DUMP SCRIPT
# ==========================================
# INSTRUCTIONS:
# 1. Replace the DB_URL below with your OLD Supabase project's connection string.
#    You can find this in your Supabase Dashboard -> Settings -> Database -> Connection string (URI)
# 2. Ensure you have PostgreSQL client tools (specifically pg_dump) installed on your machine.
#    If you don't have it, it is highly recommended to use the Supabase CLI instead:
#    `supabase db dump --data-only -f data.sql`
# ==========================================

DB_URL = "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

def dump_database():
    print("Starting Supabase database dump...")
    
    if "[PROJECT-REF]" in DB_URL:
        print("ERROR: Please update the DB_URL variable with your actual Supabase connection string.")
        sys.exit(1)
        
    try:
        # 1. Dump Schema (Table structures, functions, policies)
        print("Dumping schema...")
        subprocess.run([
            "pg_dump", 
            DB_URL, 
            "--schema-only", 
            "-f", "supabase_schema.sql"
        ], check=True)
        print("✅ Schema successfully dumped to 'supabase_schema.sql'")
        
        # 2. Dump Data (The actual rows in your tables)
        print("\nDumping data...")
        subprocess.run([
            "pg_dump", 
            DB_URL, 
            "--data-only", 
            "--inserts", # Use INSERT statements instead of COPY for easier importing
            "-f", "supabase_data.sql"
        ], check=True)
        print("✅ Data successfully dumped to 'supabase_data.sql'")
        
        print("\n🎉 Dump Complete!")
        print("To import into your new Supabase project:")
        print("1. Go to the SQL Editor in your NEW Supabase dashboard.")
        print("2. Copy and paste the contents of 'supabase_schema.sql' and run it.")
        print("3. Copy and paste the contents of 'supabase_data.sql' and run it.")
        
    except FileNotFoundError:
        print("\n❌ ERROR: 'pg_dump' command not found.")
        print("This script requires PostgreSQL client tools to be installed on your system.")
        print("Alternatively, you can use the Supabase CLI to dump your database:")
        print("  supabase db dump --data-only -f data.sql")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ ERROR during dump process: {e}")
        print("Please check your DB_URL and ensure your database is accessible.")

if __name__ == "__main__":
    dump_database()
