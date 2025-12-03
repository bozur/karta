-- ============================================
-- Table: dogadjaji
-- Description: Stores events/occurrences with temporal and spatial data
-- Database: MSSQL (SQL Server)
-- Created: 2025-12-02
-- ============================================

CREATE TABLE dogadjaji (
    -- Primary key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Temporal data
    pocetak DATETIME2 NOT NULL,              -- Start date/time (required)
    kraj DATETIME2 NULL,                     -- End date/time (optional, defaults to pocetak)
    
    -- Event details
    opis NVARCHAR(255) NOT NULL,             -- Description (min 10 chars, max 255)
    izvor NVARCHAR(50) NULL,                 -- Source description
    
    -- References
    korisnik_id INT NOT NULL,                -- User who created the event
    zapis INT NULL,                          -- Reference to zapisi table (no FK constraint)
    
    -- Spatial data
    koordinate NVARCHAR(100) NULL,           -- Coordinates in POINT format: "POINT (longitude latitude)"
    
    -- Metadata
    unos DATETIME2 DEFAULT GETDATE(),        -- Insertion timestamp
    
    -- Foreign key constraint
    CONSTRAINT FK_dogadjaji_korisnik FOREIGN KEY (korisnik_id) 
        REFERENCES korisnik(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_dogadjaji_korisnik ON dogadjaji(korisnik_id);
CREATE INDEX idx_dogadjaji_pocetak ON dogadjaji(pocetak);
CREATE INDEX idx_dogadjaji_unos ON dogadjaji(unos);

-- Create trigger to auto-populate kraj from pocetak when NULL
GO
CREATE TRIGGER trg_dogadjaji_default_kraj
ON dogadjaji
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dogadjaji
    SET kraj = i.pocetak
    FROM dogadjaji d
    INNER JOIN inserted i ON d.id = i.id
    WHERE d.kraj IS NULL;
END;
GO

-- Add table description
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Events and occurrences with temporal and spatial data',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'dogadjaji';

-- Add column descriptions
EXEC sp_addextendedproperty 
    @name = N'MS_Description', @value = N'Unique event identifier',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'dogadjaji',
    @level2type = N'COLUMN', @level2name = 'id';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', @value = N'Event start date/time',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'dogadjaji',
    @level2type = N'COLUMN', @level2name = 'pocetak';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', @value = N'Event end date/time (defaults to pocetak if NULL)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'dogadjaji',
    @level2type = N'COLUMN', @level2name = 'kraj';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', @value = N'Event description (10-255 characters)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'dogadjaji',
    @level2type = N'COLUMN', @level2name = 'opis';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', @value = N'Coordinates as latitude, longitude text',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'dogadjaji',
    @level2type = N'COLUMN', @level2name = 'koordinate';
