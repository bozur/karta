# Manual Data Update Guide (Remote Server)

To update data on your remote server (e.g., hosting), follow these steps using the scripts provided.

## Prerequisites
1. **Push to Deployment**: You MUST commit and push the new files (`data/theme7.js`, `data/table7.js`, `data/import7.js`, and `data/tvrdjave.geojson`) to your Git repository (GitHub/GitLab) so that Render.com "sees" them.
2. **Access**: Access to your Render.com dashboard.
3. **Node.js**: These are Node.js scripts and cannot be run by opening them in a browser.

## Steps (General SSH)
1. **Upload Files**: Transfer the files to your server.
2. **Run Scripts**:
   ```bash
   node data/theme7.js   # Adds theme to "teme" and "teme_opcije"
   node data/table7.js   # Recreates "table_7" schema
   node data/import7.js  # Imports GeoJSON data
   ```

## Special Instructions for Render.com
Since you are using **Render.com**, follow these exact steps:

### Option A: Use the Render Shell Tab (Recommended)
1. **Wait for Deploy**: Ensure your latest push (containing the new scripts) is finished deploying.
2. **Open Shell**: Select your **Web Service** in the Render Dashboard and click the **Shell** tab in the left menu.
3. **Run Commands One-by-One**: Copy and paste each line below individually, and press **ENTER** after each one:
   
   First, run the theme script:
   ```bash
   node data/theme7.js
   ```
   *Wait for it to say "Theme added successfully"*
   
   Second, run the table script:
   ```bash
   node data/table7.js
   ```
   *Wait for it to say "Table created successfully"*
   
   Third, run the import script:
   ```bash
   node data/import7.js
   ```
   *Wait for it to say "Data import completed successfully"*

### Option B: Run Locally against Production DB
You can run the update from your local computer while pointing to the remote Render database:
1. Find your **Database** in the Render Dashboard.
2. Copy the **External Connection String**.
3. Temporarily update your local `.env` file's `DATABASE_URL` with this External String.
4. Run the scripts from your local terminal:
   ```bash
   node data/theme7.js
   node data/table7.js
   node data/import7.js
   ```
5. **CRITICAL**: Change your local `.env` back to your local database once finished!

## Why this approach?
- **Exact Consistency**: The scripts create `table_7` as an exact replica of `table_1` and populate geometry columns (`prostorno`, `prostorno2`) in the project's internal format.
- **Automation**: It's faster and less error-prone than manual SQL commands.
