-- Migration v6: Multi-image galleries for Turfs and Review photos

-- Multi-image gallery for turfs
CREATE TABLE IF NOT EXISTS TurfImages (
  ImageID INT AUTO_INCREMENT PRIMARY KEY,
  TurfID INT NOT NULL,
  ImageURL VARCHAR(500) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (TurfID) REFERENCES Turfs(TurfID) ON DELETE CASCADE
);

-- Migrate existing single images to the gallery table
INSERT INTO TurfImages (TurfID, ImageURL)
SELECT TurfID, ImageURL FROM Turfs WHERE ImageURL IS NOT NULL AND ImageURL != '';

-- Review photos
CREATE TABLE IF NOT EXISTS ReviewImages (
  ImageID INT AUTO_INCREMENT PRIMARY KEY,
  ReviewID INT NOT NULL,
  ImageURL VARCHAR(500) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ReviewID) REFERENCES Reviews(ReviewID) ON DELETE CASCADE
);
