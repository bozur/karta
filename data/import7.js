const fs = require('fs');
const path = require('path');
const { poolPromise, sql } = require('../db');

async function importData() {
    try {
        const geojsonPath = path.join(__dirname, 'tvrdjave.geojson');
        const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
        const pool = await poolPromise;

        console.log(`Importing ${data.features.length} features into "Table_7"...`);

        for (const feature of data.features) {
            const props = feature.properties;
            const geom = feature.geometry;
            const request = new sql.Request();

            // Coordinates Conversion (GeoJSON -> WKT)
            let wkt = null;
            let type = geom.type.toUpperCase();
            let coords = geom.coordinates;

            if (type === 'POINT') {
                wkt = `POINT (${coords[0]} ${coords[1]})`;
            } else if (type === 'LINESTRING') {
                const points = coords.map(c => `${c[0]} ${c[1]}`).join(', ');
                wkt = `LINESTRING (${points})`;
            } else if (type === 'POLYGON') {
                let ring = coords[0];
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                    ring.push(first);
                }
                const points = ring.map(c => `${c[0]} ${c[1]}`).join(', ');
                wkt = `POLYGON ((${points}))`;
            }

            // Mapping properties - Note: dodao_vrijeme is fixed as requested
            // Ensure VARCHAR(2) and VARCHAR(255) limits are respected
            request.input('vrsta', sql.NVarChar, (props.vrsta || '0').toString().substring(0, 2));
            request.input('podvrsta', sql.NVarChar, (props.podvrsta || '0').toString().substring(0, 2));
            request.input('razred', sql.NVarChar, (props.razred || '0').toString().substring(0, 2));
            request.input('tp', sql.NVarChar, (props.tp || '1').toString().substring(0, 2));
            request.input('vrijeme0', sql.DateTime2, props.vrijeme0 || null);
            request.input('vrijeme1', sql.DateTime2, props.vrijeme1 || props.vrijeme0 || null);
            request.input('tv', sql.NVarChar, (props.tv || '0').toString().substring(0, 2));
            request.input('opis', sql.NVarChar, (props.opis || '').toString().substring(0, 255));
            request.input('izvor', sql.NVarChar, (props.izvor || null)?.toString().substring(0, 255));
            request.input('dodao', sql.Int, props.dodao || 1);
            request.input('stanje', sql.NVarChar, (props.stanje || '1').toString().substring(0, 2));
            request.input('tacke', sql.NVarChar, JSON.stringify(coords));
            request.input('tacke0', sql.NVarChar, geom.type);
            request.input('dodao_vrijeme', sql.DateTime2, '2026-01-22 00:00:00+00');

            // Serialization for "prostorno" (JSON representation of geometry)
            const prostornoJson = {
                srid: 4326,
                version: 1,
                points: [{ x: coords[0], y: coords[1], z: null, m: null }],
                figures: [{ attribute: 1, pointOffset: 0 }],
                shapes: [{ parentOffset: -1, figureOffset: 0, type: 1 }],
                segments: []
            };
            request.input('prostorno', sql.Text, JSON.stringify(prostornoJson));
            request.input('prostorno2', sql.Text, wkt);

            const tableName = 'table_7';
            const query = `
                INSERT INTO "${tableName}" 
                (vrsta, podvrsta, razred, prostorno, prostorno2, tp, vrijeme0, vrijeme1, tv, opis, izvor, dodao, dodao_vrijeme, stanje, tacke, tacke0)
                VALUES 
                (@vrsta, @podvrsta, @razred, @prostorno, @prostorno2, @tp, @vrijeme0, @vrijeme1, @tv, @opis, @izvor, @dodao, @dodao_vrijeme, @stanje, @tacke, @tacke0)
            `;
            await request.query(query);
        }

        console.log('Data import completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error importing data:', err);
        process.exit(1);
    }
}

importData();
