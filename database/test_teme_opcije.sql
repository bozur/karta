-- ============================================
-- Test script for teme_opcije implementation
-- Verifies table structure and data integrity
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

-- 1. Verify table exists
SELECT 
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'teme_opcije';

-- 2. Verify table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'teme_opcije'
ORDER BY ORDINAL_POSITION;

-- 3. Verify foreign key constraint
SELECT 
    fk.name AS constraint_name,
    tp.name AS parent_table,
    cp.name AS parent_column,
    tr.name AS referenced_table,
    cr.name AS referenced_column
FROM sys.foreign_keys AS fk
INNER JOIN sys.tables AS tp ON fk.parent_object_id = tp.object_id
INNER JOIN sys.tables AS tr ON fk.referenced_object_id = tr.object_id
INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns AS cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
INNER JOIN sys.columns AS cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
WHERE tp.name = 'teme_opcije';

-- 4. Count total records
SELECT COUNT(*) AS total_options FROM teme_opcije;

-- 5. Count options by theme and type
SELECT 
    t.id,
    t.naziv AS tema,
    o.tip,
    COUNT(*) AS broj_opcija
FROM teme_opcije o
INNER JOIN teme t ON o.tema_id = t.id
GROUP BY t.id, t.naziv, o.tip
ORDER BY t.id, o.tip;

-- 6. Verify all 6 themes have data
SELECT 
    t.id,
    t.naziv,
    COUNT(o.id) AS total_options
FROM teme t
LEFT JOIN teme_opcije o ON t.id = o.tema_id
GROUP BY t.id, t.naziv
ORDER BY t.id;

-- 7. Sample data from each theme
SELECT TOP 5
    t.naziv AS tema,
    o.tip,
    o.redosled,
    o.vrednost
FROM teme_opcije o
INNER JOIN teme t ON o.tema_id = t.id
WHERE t.id = 1
ORDER BY o.tip, o.redosled;

-- 8. Check for duplicate redosled values (should return 0 rows)
SELECT 
    tema_id,
    tip,
    redosled,
    COUNT(*) AS duplicates
FROM teme_opcije
GROUP BY tema_id, tip, redosled
HAVING COUNT(*) > 1;

-- 9. Verify check constraint on tip column
SELECT 
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_NAME LIKE '%teme_opcije%';
