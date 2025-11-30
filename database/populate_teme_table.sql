-- ============================================
-- Populate teme table with initial themes
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

-- Insert the three existing themes
INSERT INTO teme (naziv) VALUES (N'напади на објекте СПЦ');
INSERT INTO teme (naziv) VALUES (N'промјена назива');
INSERT INTO teme (naziv) VALUES (N'распрострањеност топонима');

-- Verify insertion
SELECT * FROM teme ORDER BY id;
