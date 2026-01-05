import pandas as pd
import json
import os
import glob
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(BASE_DIR, 'data', 'downloads')
DATA_DIR = os.path.join(BASE_DIR, 'data')
PROCESSED_FILE = os.path.join(DATA_DIR, 'processed.json')

def main():
    print("Starting Python Excel Processor...")

    # 1. Find latest Excel file
    files = glob.glob(os.path.join(DOWNLOADS_DIR, "*.xls*"))
    if not files:
        print("No Excel files found in downloads directory.")
        return

    # Sort by modification time
    latest_file = max(files, key=os.path.getmtime)
    print(f"Processing file: {latest_file}")

    try:
        # 2. Load Excel
        # Read first 20 rows to find the one with "תאריך"
        print("Reading Excel to find header row...")
        df_preview = pd.read_excel(latest_file, header=None, nrows=20)
        
        header_row_idx = -1
        for idx, row in df_preview.iterrows():
            # Check if row contains "תאריך" and "זכות" (Credit) to be sure
            row_str = row.astype(str).values
            if any("תאריך" in s for s in row_str) and any("זכות" in s for s in row_str):
                header_row_idx = idx
                print(f"Found header at row index: {header_row_idx}")
                print(f"Row content: {row.values}")
                break
        
        if header_row_idx == -1:
            print("Could not find header row with 'תאריך' and 'זכות'.")
            return
            
        # Reload with correct header
        df = pd.read_excel(latest_file, header=header_row_idx)

        # 3. Filter and Select Columns
        # Expecting: 'תאריך', 'הפעולה', 'פרטים', 'אסמכתא', 'חובה', 'זכות', 'יתרה בש''ח', 'תאריך ערך', 'לטובת', 'עבור'
        
        # Normalize columns: strip whitespace
        df.columns = df.columns.str.strip()
        print("Columns found:", df.columns.tolist())

        # Find "עבור" column
        avur_col = next((c for c in df.columns if "עבור" in c), None)
        if not avur_col:
             avur_col = next((c for c in df.columns if "לטובת" in c), None) # Fallback
        
        if not avur_col:
            print("Warning: Could not find column 'עבור' or 'לטובת'.")
            return

        print(f"Filtering by column: {avur_col}")

        # Filter rows where 'avur_col' contains "ועד"
        df_filtered = df[df[avur_col].astype(str).str.contains("ועד", na=False)]
        
        if df_filtered.empty:
            print("No transactions found with 'ועד' in 'עבור' column.")
            return

        print(f"Found {len(df_filtered)} matching transactions.")
        
        # Select specific columns
        # תאריך, הפעולה, אסמכתא, זכות, לטובת, עבור
        target_cols = [c for c in df.columns if c in ["תאריך", "הפעולה", "אסמכתא", "זכות", "לטובת", "עבור"]]
        
        final_df = df_filtered[target_cols].copy()
        
        # Convert Data to Dictionary Records
        final_df['תאריך'] = final_df['תאריך'].astype(str) # Simplify dates
        
        new_records = final_df.to_dict(orient='records')
        
        # 4. Update processed.json
        current_data = []
        if os.path.exists(PROCESSED_FILE):
            with open(PROCESSED_FILE, 'r', encoding='utf-8') as f:
                try:
                    current_data = json.load(f)
                    # Handle legacy ID list format
                    if current_data and isinstance(current_data[0], str):
                         print("Migrating processed.json from IDs to Objects...")
                         current_data = [{"id": uid, "migrated": True} for uid in current_data]
                except json.JSONDecodeError:
                    current_data = []

        # Deduplicate using 'אסמכתא'
        existing_refs = set()
        for item in current_data:
            unique_key = str(item.get('אסמכתא') or item.get('_id') or item.get('id') or '')
            if unique_key:
                existing_refs.add(unique_key)

        added_count = 0
        for record in new_records:
            ref_val = str(record.get('אסמכתא', ''))
            
            # If no ref or nan, create synthetic
            if not ref_val or ref_val == "nan":
                 date_val = str(record.get('תאריך', ''))
                 credit_val = str(record.get('זכות', ''))
                 ref_val = f"{date_val}-{credit_val}-synthetic"
            
            if ref_val not in existing_refs:
                # Add
                clean_record = {k: (v if pd.notna(v) else "") for k, v in record.items()}
                clean_record['_id'] = ref_val
                
                current_data.append(clean_record)
                existing_refs.add(ref_val)
                added_count += 1

        # Save
        if added_count > 0:
            with open(PROCESSED_FILE, 'w', encoding='utf-8') as f:
                json.dump(current_data, f, ensure_ascii=False, indent=2)
            print(f"Added {added_count} new transactions to processed.json.")
        else:
            print("No new unique transactions to add.")

    except Exception as e:
        print(f"Error processing Excel: {e}")

if __name__ == "__main__":
    main()
