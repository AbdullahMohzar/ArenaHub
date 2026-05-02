-- Migration v5: Add IsRead column for chat sidebar unread badges
ALTER TABLE Messages ADD COLUMN IsRead BOOLEAN DEFAULT FALSE;

-- Mark all existing messages as read
UPDATE Messages SET IsRead = TRUE;
