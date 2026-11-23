-- ============================================
-- Table: teme_opcije
-- Description: Stores dropdown options for themes (razred, vrsta, podvrsta)
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

CREATE TABLE teme_opcije (
    -- Primary key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Foreign key to teme table
    tema_id INT NOT NULL,
    
    -- Type of option: 'razred', 'vrsta', or 'podvrsta'
    tip NVARCHAR(20) NOT NULL,
    
    -- Order/position in dropdown (0-based index)
    redosled INT NOT NULL,
    
    -- The actual option value/text
    vrednost NVARCHAR(100) NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT FK_teme_opcije_tema FOREIGN KEY (tema_id) 
        REFERENCES teme(id) ON DELETE CASCADE,
    
    -- Check constraint for tip values
    CONSTRAINT CK_teme_opcije_tip CHECK (tip IN ('razred', 'vrsta', 'podvrsta')),
    
    -- Unique constraint: each tema_id + tip + redosled combination must be unique
    CONSTRAINT UQ_teme_opcije_tema_tip_redosled UNIQUE (tema_id, tip, redosled)
);

-- Create indexes for better query performance
CREATE INDEX idx_tema_id ON teme_opcije(tema_id);
CREATE INDEX idx_tema_tip ON teme_opcije(tema_id, tip);

-- Add table description
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Dropdown options for theme search filters (razred, vrsta, podvrsta)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'teme_opcije';
