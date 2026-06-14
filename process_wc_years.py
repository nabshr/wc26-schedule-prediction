#!/usr/bin/env python3

years = [1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]

for year in years:
    with open(f"/tmp/cc-agent/67833408/project/wc_simple_{year}.sql", "r") as f:
        content = f.read()
    
    # Replace year 2022 with the actual year
    content = content.replace("WHERE year = 2022", f"WHERE year = {year}")
    
    # Flatten to single line (join all lines with space, removing line numbers)
    lines = content.strip().split('\n')
    sql_statements = []
    for line in lines:
        # Remove line numbers added by Read tool
        parts = line.split('\t', 1)
        if len(parts) > 1:
            sql_statements.append(parts[1])
        else:
            sql_statements.append(line)
    
    flattened_sql = ' '.join(sql_statements)
    
    # Write flattened SQL
    with open(f"/tmp/cc-agent/67833408/project/wc_simple_{year}_flat.sql", "w") as f:
        f.write(flattened_sql)
    
    print(f"Year {year}: flattened SQL created ({len(flattened_sql)} chars)")

