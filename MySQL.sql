-- :) ----------------------------------------------------------------------------------------------------

USE SalamatianCRM;
ALTER TABLE lead_potentiallevel
ADD COLUMN IsActive TINYINT(1) DEFAULT 1,
ADD COLUMN IsSystemic TINYINT(1) DEFAULT 0,
ADD COLUMN Description  NVARCHAR(255),
ADD COLUMN CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- :) ----------------------------------------------------------------------------------------------------

USE SalamatianCRM;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE Region_Location  
MODIFY COLUMN LocationID INT NOT NULL AUTO_INCREMENT;

SET FOREIGN_KEY_CHECKS = 1;

-- :) ----------------------------------------------------------------------------------------------------

UPDATE Car_Car SET IsSystemic = 0;

-- :) ----------------------------------------------------------------------------------------------------

DELETE FROM User_User;

-- :) ----------------------------------------------------------------------------------------------------