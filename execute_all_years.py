#!/usr/bin/env python3
import subprocess
import json

years = [1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]

results = []

for year in years:
    filepath = f"/tmp/cc-agent/67833408/project/wc_simple_{year}_flat.sql"
    
    with open(filepath, "r") as f:
        sql_content = f.read()
    
    # Call the mcp tool via Python
    try:
        # We'll generate a command that will call the tool
        tool_call = {
            "tool": "mcp__supabase__execute_sql",
            "query": sql_content
        }
        results.append({"year": year, "status": "prepared", "tool_call": tool_call})
        print(f"Year {year}: SQL prepared for execution ({len(sql_content)} chars)")
    except Exception as e:
        print(f"Year {year}: ERROR - {e}")
        results.append({"year": year, "status": "error", "message": str(e)})

# Print all results for processing
print("\n" + "="*60)
print("All years prepared. Ready for sequential execution.")
print("="*60)

