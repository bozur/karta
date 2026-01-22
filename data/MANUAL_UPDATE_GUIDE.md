# Manual Data Update Guide (Remote Server)

To update data on your remote server (e.g., hosting), follow these steps using the scripts provided.

## Prerequisites
- Access to the hosting server's shell (SSH). **Note: These are Node.js scripts and cannot be run by opening them in a browser (Chrome).**
- Node.js installed on the server.
- The `node_modules` and `.env` file must be correctly configured on the server.

## Steps (General)
1. **Upload Files**: Transfer `data/tvrdjave.geojson`, `data/theme7.js`, `data/table7.js`, and `data/import7.js` to your server.
2. **Run Scripts**:
   ```bash
   node data/theme7.js   # Adds theme to "teme" and "teme_opcije"
   node data/table7.js   # Recreates "table_7" schema
   node data/import7.js  # Imports GeoJSON data
   ```

## Special Instructions for Render.com
Since you are using **Render.com**, you have two efficient ways to do this:

### Option A: Use the Render Shell Tab
1. Select your **Web Service** in the Render Dashboard.
2. Click on the **Shell** tab in the left menu.
3. Run the scripts directly in the shell:
   ```bash
   node data/theme7.js
   node data/table7.js
   node data/import7.js
   ```

### Option B: Run Locally against Production DB (Easiest)
You can run the update from your local computer while pointing to the remote Render database:
1. Find your **Database** in the Render Dashboard.
2. Copy the **External Connection String**.
3. Temporarily update your local `.env` file's `DATABASE_URL` with this External String.
4. Run the scripts from your local terminal:
   ```powershell
   node data/theme7.js
   node data/table7.js
   node data/import7.js
   ```
5. **CRITICAL**: Change your local `.env` back to your local database once finished!

## Why this approach?
- **Exact Consistency**: The scripts create `table_7` as an exact replica of `table_1` and populate geometry columns (`prostorno`, `prostorno2`) in the project's internal format.
- **Automation**: It's faster and less error-prone than manual SQL commands.
- **Portability**: The scripts handle the connection details via your `.env` file.
