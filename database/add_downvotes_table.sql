
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'comment_downvotes')
BEGIN
    CREATE TABLE comment_downvotes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        comment_id INT NOT NULL,
        user_id INT NOT NULL,
        CONSTRAINT UK_CommentDownvote UNIQUE (comment_id, user_id)
    );
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'downvote_count' AND Object_ID = Object_ID(N'comments'))
BEGIN
    ALTER TABLE comments ADD downvote_count INT DEFAULT 0;
END
