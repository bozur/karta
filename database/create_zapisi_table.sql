-- ============================================
-- Table: zapisi
-- Description: Stores file records with metadata
-- Database: MSSQL (SQL Server)
-- Created: 2025-11-30
-- ============================================

CREATE TABLE zapisi (
    -- Primary key
    id INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Record metadata
    naziv NVARCHAR(255) NOT NULL,  -- File/record name
    opis NVARCHAR(MAX),             -- Description of the file/record
    tema NVARCHAR(255),             -- Theme/category
    korisnik NVARCHAR(255) NOT NULL, -- Username who uploaded the file
    tagovi NVARCHAR(MAX),           -- Comma-separated tags
    
    -- File information
    file_path NVARCHAR(500) NOT NULL, -- Path to the uploaded file
    file_type NVARCHAR(10) NOT NULL,  -- File extension (pdf, jpg, png)
    file_size INT,                    -- File size in bytes
    
    -- Timestamps
    created_at DATETIME2 DEFAULT GETDATE() -- Upload timestamp
);

-- Create indexes for better query performance
CREATE INDEX idx_naziv ON zapisi(naziv);
CREATE INDEX idx_tema ON zapisi(tema);
CREATE INDEX idx_korisnik ON zapisi(korisnik);
CREATE INDEX idx_created ON zapisi(created_at);

-- Add table description
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'File records storage with metadata and search capabilities',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'zapisi';
