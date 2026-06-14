#!/usr/bin/env python3
import base64
import sys

# Read batch files and output them in a way that can be captured
for batch_num in [1, 2, 3, 4, 5]:
    file_path = f'/tmp/wc_batch_{batch_num}.sql'
    try:
        with open(file_path, 'rb') as f:
            content = f.read().decode('utf-8')
        print(f"BATCH_{batch_num}={repr(content)}", file=sys.stderr)
        print(content)
    except Exception as e:
        print(f"Error reading batch {batch_num}: {e}", file=sys.stderr)
        sys.exit(1)
