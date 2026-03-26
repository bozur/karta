-- ============================================
-- Table: teme
-- Description: Stores theme/category names for zapisi
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

CREATE TABLE teme (
    -- Primary key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Theme name
    naziv NVARCHAR(50) NOT NULL UNIQUE
);

-- Create index for better query performance
CREATE INDEX idx_naziv ON teme(naziv);

-- Add table description
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Theme/category storage for zapisi records',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'teme';
