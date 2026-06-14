#!/usr/bin/env python3
import sys

# Read all 6 batch files and output them for execution
batches = [0, 1, 2, 3, 4, 5]

for batch_num in batches:
    file_path = f'/tmp/wc_batch_{batch_num}.sql'
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        print(f"=== BATCH {batch_num} START ===")
        print(content)
        print(f"=== BATCH {batch_num} END ===")
    except Exception as e:
        print(f"Error reading batch {batch_num}: {e}", file=sys.stderr)
