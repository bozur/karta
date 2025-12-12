-- ============================================
-- Populate teme table with initial themes
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

-- Insert the existing themes
INSERT INTO teme (naziv) VALUES (N'напади на објекте СПЦ');
INSERT INTO teme (naziv) VALUES (N'промјена назива');
INSERT INTO teme (naziv) VALUES (N'распрострањеност топонима');
INSERT INTO teme (naziv) VALUES (N'логори за Србе');
INSERT INTO teme (naziv) VALUES (N'страдања Срба');
INSERT INTO teme (naziv) VALUES (N'границе');

-- Verify insertion
SELECT * FROM teme ORDER BY id;
