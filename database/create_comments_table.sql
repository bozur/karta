
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'comments')
BEGIN
    CREATE TABLE comments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        parent INT NULL,
        target_type NVARCHAR(50) NOT NULL, -- 'dogadjaji', 'Table_1', etc.
        target_id INT NOT NULL,
        created DATETIME DEFAULT GETUTCDATE(),
        modified DATETIME DEFAULT GETUTCDATE(),
        content NVARCHAR(MAX),
        creator INT, -- FK to korisnik
        fullname NVARCHAR(255),
        profile_picture_url NVARCHAR(255),
        upvote_count INT DEFAULT 0,
        user_has_upvoted BIT DEFAULT 0, -- Legacy field from plugin, kept for structure but ignored in logic
        is_new BIT DEFAULT 1,
        created_by_admin BIT DEFAULT 0,
        created_by_current_user BIT DEFAULT 0 -- Legacy field
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'comment_upvotes')
BEGIN
    CREATE TABLE comment_upvotes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        comment_id INT NOT NULL,
        user_id INT NOT NULL,
        CONSTRAINT UK_CommentDate UNIQUE (comment_id, user_id)
    );
END
