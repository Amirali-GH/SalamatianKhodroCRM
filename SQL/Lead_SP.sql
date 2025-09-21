delete FROM salamatiancrm.lead_resultcontactcustomer;
delete FROM salamatiancrm.lead_resultcontactcustomer_raw;
delete FROM salamatiancrm.lead_fileresultcontactcustomer;
delete FROM salamatiancrm.customer_customer;

DROP PROCEDURE IF EXISTS SP_Lead_StoreRawData;

DELIMITER $$
CREATE DEFINER=`AmirAli`@`localhost` PROCEDURE `SP_Lead_StoreRawData`(
    IN p_CreatedByUserID INT,
    IN p_FileUploadID BIGINT
)
BEGIN
    DECLARE v_RawID BIGINT;
    DECLARE v_phn VARCHAR(20);
    DECLARE v_fnm VARCHAR(255);
    DECLARE v_ncd VARCHAR(20);
    DECLARE v_rcr VARCHAR(255);
    DECLARE v_brn VARCHAR(255);
    DECLARE v_agt VARCHAR(255);
    DECLARE v_lcn VARCHAR(10);
    DECLARE v_cst VARCHAR(255);
    DECLARE v_ds1 TEXT;
    DECLARE v_ds2 TEXT;
    DECLARE v_ds3 TEXT;
    DECLARE v_ptn VARCHAR(10);
    DECLARE v_cmp VARCHAR(255);

    DECLARE v_CustomerID BIGINT;
    DECLARE v_BranchID INT;
    DECLARE v_EmployeeID INT;
    DECLARE v_CustomerStatusID INT;
    DECLARE v_RequestedCarID INT;
    DECLARE v_CampaignID INT;
    DECLARE v_LeadPotentialID INT;
    -- we intentionally don't use ResultContactRefrenceID column as requested

    DECLARE v_FirstName VARCHAR(50);
    DECLARE v_LastName VARCHAR(50);

    DECLARE v_LastContactDate_Shams VARCHAR(10);
    DECLARE v_LastContactDate_Milad DATE;

    DECLARE v_y INT;
    DECLARE v_m INT;
    DECLARE v_d INT;
    DECLARE v_days_in_years_past INT;
    DECLARE v_days_in_this_year INT;
    DECLARE v_total_days INT;
    DECLARE v_is_leap TINYINT;
    DECLARE v_serial INT;

    DECLARE v_has_error TINYINT DEFAULT 0;

    DECLARE v_LastResultID BIGINT;

    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR
        SELECT RawID, phn, fnm, ncd, rcr, brn, agt, lcn, cst, ds1, ds2, ds3, ptn, cmp
        FROM Lead_ResultContactCustomer_Raw
        WHERE FileUploadID = p_FileUploadID;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_has_error = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_RawID, v_phn, v_fnm, v_ncd, v_rcr, v_brn, v_agt, v_lcn, v_cst, v_ds1, v_ds2, v_ds3, v_ptn, v_cmp;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- reset
        SET v_CustomerID = NULL;
        SET v_BranchID = NULL;
        SET v_EmployeeID = NULL;
        SET v_CustomerStatusID = NULL;
        SET v_RequestedCarID = NULL;
        SET v_CampaignID = NULL;
        SET v_LeadPotentialID = NULL;
        SET v_LastContactDate_Milad = NULL;
        SET v_LastResultID = NULL;

        -- Normalize phone (empty -> NULL) and remove leading zero
        SET v_phn = IF(v_phn IS NOT NULL AND TRIM(v_phn) = '', NULL, v_phn);
        SET v_phn = IF(v_phn IS NOT NULL AND LEFT(TRIM(v_phn),1) = '0', SUBSTRING(TRIM(v_phn),2), TRIM(v_phn));

        -- split name
        SET v_fnm = TRIM(COALESCE(v_fnm,''));
        SET v_FirstName = NULL;
        SET v_LastName = NULL;
        IF v_fnm <> '' THEN
            SET v_FirstName = SUBSTRING_INDEX(v_fnm, ' ', 1);
            SET v_LastName = IF(LOCATE(' ', v_fnm) > 0, TRIM(SUBSTRING(v_fnm, LOCATE(' ', v_fnm) + 1)), NULL);
        END IF;

        -- campaign lookup
        SET v_CampaignID = (SELECT CampaignID FROM sale_campaign WHERE MainName = v_cmp LIMIT 1);

        -- find existing customer by phone (if phone present)
        IF v_phn IS NOT NULL THEN
            SET v_CustomerID = (
                SELECT CustomerID FROM customer_customer WHERE Phone = v_phn LIMIT 1
            );
        ELSE
            SET v_CustomerID = NULL;
        END IF;

        -- insert new customer if not found (even if phone NULL)
        IF v_CustomerID IS NULL THEN
            INSERT INTO customer_customer
                (FirstName, LastName, Phone, NationalID, CampaignID, CreatedByUserID)
            VALUES
                (v_FirstName, v_LastName, v_phn, NULLIF(TRIM(v_ncd),''), v_CampaignID, p_CreatedByUserID);
            SET v_CustomerID = LAST_INSERT_ID();
        ELSE
            -- update existing customer: only when new value exists (شرطی)
            UPDATE customer_customer
            SET
                FirstName  = CASE WHEN v_FirstName IS NOT NULL AND TRIM(v_FirstName) <> '' THEN v_FirstName ELSE FirstName END,
                LastName   = CASE WHEN v_LastName  IS NOT NULL AND TRIM(v_LastName) <> ''  THEN v_LastName  ELSE LastName  END,
                Phone      = CASE WHEN v_phn IS NOT NULL AND TRIM(v_phn) <> ''                  THEN v_phn      ELSE Phone      END,
                NationalID = CASE WHEN v_ncd IS NOT NULL AND TRIM(v_ncd) <> ''                  THEN v_ncd      ELSE NationalID END,
                CampaignID = CASE WHEN v_CampaignID IS NOT NULL                                  THEN v_CampaignID ELSE CampaignID END
            WHERE CustomerID = v_CustomerID;
        END IF;

        -- get latest ResultContactID for this customer (if any)
        SELECT MAX(ResultContactID) INTO v_LastResultID
        FROM lead_resultcontactcustomer
        WHERE CustomerID = v_CustomerID;

        -- other lookups
        SET v_BranchID = (SELECT BranchID FROM branch_branch WHERE MainName = v_brn LIMIT 1);

        SET v_EmployeeID = (
            SELECT EmployeeID
            FROM organization_employee
            WHERE CONCAT(FirstName, ' ', IFNULL(LastName,'')) LIKE CONCAT(TRIM(SUBSTRING_INDEX(v_agt,' ',2)), '%')
            LIMIT 1
        );

        SET v_CustomerStatusID = (
            SELECT CustomerStatusID
            FROM lead_customerstatus
            WHERE Name = IF(LOCATE('.', v_cst) > 0, TRIM(SUBSTRING_INDEX(v_cst, '.', -1)), TRIM(v_cst))
            LIMIT 1
        );

        SET v_RequestedCarID = (SELECT CarID FROM car_car WHERE MainName = v_rcr LIMIT 1);

        SET v_LeadPotentialID = (SELECT PotentialLevelID FROM lead_potentiallevel WHERE Code = v_ptn LIMIT 1);

        IF v_CampaignID IS NULL THEN
            SET v_CampaignID = (SELECT CampaignID FROM sale_campaign WHERE MainName = v_cmp LIMIT 1);
        END IF;

        -- convert shams -> milad (approx)
        SET v_LastContactDate_Shams = v_lcn;
        SET v_LastContactDate_Milad = NULL;
        IF v_lcn IS NOT NULL AND v_lcn REGEXP '^[0-9]{4}/[0-9]{1,2}/[0-9]{1,2}$' THEN
            SET v_y = CAST(SUBSTRING_INDEX(v_lcn, '/', 1) AS SIGNED);
            SET v_m = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(v_lcn, '/', 2), '/', -1) AS SIGNED);
            SET v_d = CAST(SUBSTRING_INDEX(v_lcn, '/', -1) AS SIGNED);

            IF v_y BETWEEN 1300 AND 1499 AND v_m BETWEEN 1 AND 12 AND v_d BETWEEN 1 AND 31 THEN
                SET v_days_in_years_past = (v_y - 1) * 365 + FLOOR((v_y - 1) / 4);
                SET v_days_in_this_year = CASE
                    WHEN (v_m - 1) < 7 THEN (v_m - 1) * 31
                    ELSE (v_m - 1) * 30 + 6
                END + v_d;
                SET v_total_days = v_days_in_years_past + v_days_in_this_year;
                SET v_is_leap = IF(MOD(v_y, 4) = 0, 1, 0);
                SET v_serial = v_total_days + v_is_leap - 466710;
                SET v_LastContactDate_Milad = DATE_ADD('1899-12-30', INTERVAL v_serial DAY);
            END IF;
        END IF;

        -- If we have a previous (latest) lead row -> update it conditionally
        IF v_LastResultID IS NOT NULL THEN
            UPDATE lead_resultcontactcustomer
            SET
                LeadPotentialID       = CASE WHEN v_LeadPotentialID IS NOT NULL THEN v_LeadPotentialID ELSE LeadPotentialID END,
                CampaignID            = CASE WHEN v_CampaignID IS NOT NULL THEN v_CampaignID ELSE CampaignID END,
                BranchID              = CASE WHEN v_BranchID IS NOT NULL THEN v_BranchID ELSE BranchID END,
                EmployeeID            = CASE WHEN v_EmployeeID IS NOT NULL THEN v_EmployeeID ELSE EmployeeID END,
                CustomerStatusID      = CASE WHEN v_CustomerStatusID IS NOT NULL THEN v_CustomerStatusID ELSE CustomerStatusID END,
                RequestedCarID        = CASE WHEN v_RequestedCarID IS NOT NULL THEN v_RequestedCarID ELSE RequestedCarID END,
                RequestedCarName      = CASE WHEN v_rcr IS NOT NULL AND TRIM(v_rcr) <> '' THEN v_rcr ELSE RequestedCarName END,
                LastContactDate_Shams = CASE WHEN v_LastContactDate_Shams IS NOT NULL AND TRIM(v_LastContactDate_Shams) <> '' THEN v_LastContactDate_Shams ELSE LastContactDate_Shams END,
                LastContactDate_Milad = CASE WHEN v_LastContactDate_Milad IS NOT NULL THEN v_LastContactDate_Milad ELSE LastContactDate_Milad END,
                Notes1                = CASE WHEN v_ds1 IS NOT NULL AND TRIM(v_ds1) <> '' THEN v_ds1 ELSE Notes1 END,
                Notes2                = CASE WHEN v_ds2 IS NOT NULL AND TRIM(v_ds2) <> '' THEN v_ds2 ELSE Notes2 END,
                Notes3                = CASE WHEN v_ds3 IS NOT NULL AND TRIM(v_ds3) <> '' THEN v_ds3 ELSE Notes3 END
            WHERE ResultContactID = v_LastResultID;
        ELSE
            -- Otherwise insert a new lead row. Note: ResultContactRefrenceID kept NULL as requested.
            INSERT INTO lead_resultcontactcustomer (
                CustomerID, FielUploadID, LeadPotentialID, CampaignID, ResultContactRefrenceID,
                BranchID, EmployeeID, CustomerStatusID, RequestedCarID, RequestedCarName,
                LastContactDate_Shams, LastContactDate_Milad, Notes1, Notes2, Notes3
            ) VALUES (
                v_CustomerID,
                p_FileUploadID,
                v_LeadPotentialID,
                v_CampaignID,
                NULL, -- intentionally left NULL
                v_BranchID,
                v_EmployeeID,
                v_CustomerStatusID,
                v_RequestedCarID,
                NULLIF(TRIM(v_rcr), ''),
                NULLIF(TRIM(v_LastContactDate_Shams), ''),
                v_LastContactDate_Milad,
                NULLIF(TRIM(v_ds1), ''),
                NULLIF(TRIM(v_ds2), ''),
                NULLIF(TRIM(v_ds3), '')
            );
        END IF;

    END LOOP;

    CLOSE cur;

    -- Update HasError_SunSP on upload file record
    UPDATE lead_fileresultcontactcustomer
    SET HasError_SunSP = v_has_error
    WHERE FileUploadID = p_FileUploadID;

END $$
DELIMITER ;

