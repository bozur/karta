-- Add approval field to korisnik table for upload permissions
-- Run this SQL to add the upload approval field

ALTER TABLE korisnik
ADD moze_ucitati BIT DEFAULT 0;

-- Set existing users to approved (optional)
-- UPDATE korisnik SET moze_ucitati = 1;

-- Add comment
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Indicates if user is approved to upload files (1=yes, 0=no)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'korisnik',
    @level2type = N'COLUMN', @level2name = 'moze_ucitati';
