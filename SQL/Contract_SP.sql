delete FROM salamatiancrm.contacrt_contractfile;
delete FROM salamatiancrm.contract_colors;
delete FROM salamatiancrm.contract_contracts;
delete FROM salamatiancrm.contract_customers;
delete FROM salamatiancrm.contract_dealerships;
delete FROM salamatiancrm.contract_payment_methods;
delete FROM salamatiancrm.contract_raw;
delete FROM salamatiancrm.contract_sales_licenses;
delete FROM salamatiancrm.contract_vehicle_types;

drop PROCEDURE `sp_contract_process_file`;

DELIMITER $$
DROP PROCEDURE IF EXISTS `sp_contract_process_file`$$
CREATE PROCEDURE `sp_contract_process_file`(IN p_ContractFileID BIGINT)
BEGIN
  -- handler for cursor end
  DECLARE done INT DEFAULT FALSE;

  -- cursor row columns we need for lookups (keep to a reasonable subset)
  DECLARE v_id BIGINT;
  DECLARE v_cni VARCHAR(100);  -- customer national id
  DECLARE v_cnf VARCHAR(255);  -- customer full name
  DECLARE v_cty VARCHAR(255);  -- customer type?
  DECLARE v_ccy VARCHAR(255);  -- city
  DECLARE v_pcd VARCHAR(100);  -- postal code

  DECLARE v_dcd VARCHAR(100);  -- dealership code
  DECLARE v_dnm VARCHAR(255);  -- dealership name
  DECLARE v_dcy VARCHAR(255);  -- dealership city
  DECLARE v_dpr VARCHAR(255);  -- dealership province
  DECLARE v_dda TEXT;          -- dealership address

  DECLARE v_ccd VARCHAR(100);  -- color code
  DECLARE v_vcl VARCHAR(255);  -- color name

  DECLARE v_sln VARCHAR(100);  -- sales license number
  DECLARE v_sld VARCHAR(255);  -- sales license description

  DECLARE v_pmc VARCHAR(100);  -- payment method code
  DECLARE v_pmd VARCHAR(255);  -- payment method description

  DECLARE v_vty VARCHAR(255);  -- vehicle type
  DECLARE v_vmd VARCHAR(255);  -- vehicle model

  DECLARE v_ddc VARCHAR(100);  -- delivery dealership code (may be equal to v_dcd)
  DECLARE v_ddn VARCHAR(255);  -- delivery dealership name

  DECLARE v_gni VARCHAR(100);  -- guarantor national id
  DECLARE v_ani VARCHAR(100);  -- assignor national id

  -- local ids (use local variables, not @session variables)
  DECLARE customer_id BIGINT DEFAULT NULL;
  DECLARE guarantor_id BIGINT DEFAULT NULL;
  DECLARE assignor_id BIGINT DEFAULT NULL;
  DECLARE dealership_id BIGINT DEFAULT NULL;
  DECLARE delivery_dealership_id BIGINT DEFAULT NULL;
  DECLARE color_id BIGINT DEFAULT NULL;
  DECLARE sales_license_id BIGINT DEFAULT NULL;
  DECLARE payment_method_id BIGINT DEFAULT NULL;
  DECLARE vehicle_type_id BIGINT DEFAULT NULL;

  DECLARE existing_contract_id BIGINT DEFAULT NULL;
  DECLARE v_con VARCHAR(255); -- contract number (to check contract existence)

  -- cursor over contract_raw rows for provided file_upload_id
  DECLARE cur CURSOR FOR 
    SELECT id,
           TRIM(cni), TRIM(cnf), TRIM(cty), TRIM(ccy), TRIM(pcd),
           TRIM(dcd), TRIM(dnm), TRIM(dcy), TRIM(dpr), TRIM(dda),
           TRIM(ccd), TRIM(vcl), TRIM(sln), TRIM(sld),
           TRIM(pmc), TRIM(pmd),
           TRIM(vty), TRIM(vmd), TRIM(ddc), TRIM(ddn),
           TRIM(gni), TRIM(ani)
    FROM contract_raw
    WHERE file_upload_id = p_ContractFileID;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO v_id, v_cni, v_cnf, v_cty, v_ccy, v_pcd,
                   v_dcd, v_dnm, v_dcy, v_dpr, v_dda,
                   v_ccd, v_vcl, v_sln, v_sld,
                   v_pmc, v_pmd,
                   v_vty, v_vmd, v_ddc, v_ddn,
                   v_gni, v_ani;
    IF done THEN
      LEAVE read_loop;
    END IF;

    -- Read contract number (and any other fields we prefer to check) directly from contract_raw for this id
    SET v_con := (SELECT TRIM(con) FROM contract_raw WHERE id = v_id LIMIT 1);

    -- If contract with same Number already exists --> skip entire raw row (do not insert customer or contract).
    SET existing_contract_id := (SELECT ID FROM contract_contracts WHERE TRIM(Number) = v_con LIMIT 1);
    IF existing_contract_id IS NOT NULL THEN
      -- skip this row: contract already exists exactly (برابر عیناً)
      ITERATE read_loop;
    END IF;

    -- -----------------------
    -- Process Customer
    -- If National ID provided and customer not exists, insert (ON DUPLICATE KEY UPDATE to allow safe idempotence)
    -- If exists, we keep the existing one (we also optionally update fields by ON DUPLICATE).
    -- -----------------------
    IF v_cni IS NOT NULL AND v_cni <> '' THEN
      SET customer_id := (SELECT ID FROM contract_customers WHERE National_ID = v_cni LIMIT 1);

      IF customer_id IS NULL THEN
        INSERT INTO contract_customers (National_ID, Full_Name, `Type`, City, Postal_Code)
        VALUES (v_cni, v_cnf, v_cty, v_ccy, v_pcd)
        ON DUPLICATE KEY UPDATE 
          Full_Name = VALUES(Full_Name), `Type` = VALUES(`Type`), City = VALUES(City), Postal_Code = VALUES(Postal_Code);
        SET customer_id := (SELECT ID FROM contract_customers WHERE National_ID = v_cni LIMIT 1);
      END IF;
    ELSE
      SET customer_id := NULL;
    END IF;

    -- -----------------------
    -- Process Guarantor & Assignor (lookup only, do not insert new customers for these)
    -- -----------------------
    IF v_gni IS NOT NULL AND v_gni <> '' THEN
      SET guarantor_id := (SELECT ID FROM contract_customers WHERE National_ID = v_gni LIMIT 1);
    ELSE
      SET guarantor_id := NULL;
    END IF;

    IF v_ani IS NOT NULL AND v_ani <> '' THEN
      SET assignor_id := (SELECT ID FROM contract_customers WHERE National_ID = v_ani LIMIT 1);
    ELSE
      SET assignor_id := NULL;
    END IF;

    -- -----------------------
    -- Process Dealership
    -- -----------------------
    IF v_dcd IS NOT NULL AND v_dcd <> '' THEN
      SET dealership_id := (SELECT ID FROM contract_dealerships WHERE Code = v_dcd LIMIT 1);
      IF dealership_id IS NULL THEN
        INSERT INTO contract_dealerships (Code, Name, City, Province, Address)
        VALUES (v_dcd, v_dnm, v_dcy, v_dpr, v_dda)
        ON DUPLICATE KEY UPDATE 
          Name = VALUES(Name), City = VALUES(City), Province = VALUES(Province), Address = VALUES(Address);
        SET dealership_id := (SELECT ID FROM contract_dealerships WHERE Code = v_dcd LIMIT 1);
      END IF;
    ELSE
      SET dealership_id := NULL;
    END IF;

    -- -----------------------
    -- Process Delivery Dealership (if different code)
    -- -----------------------
    IF v_ddc IS NOT NULL AND v_ddc <> '' AND v_ddc <> v_dcd THEN
      SET delivery_dealership_id := (SELECT ID FROM contract_dealerships WHERE Code = v_ddc LIMIT 1);
      IF delivery_dealership_id IS NULL THEN
        INSERT INTO contract_dealerships (Code, Name)
        VALUES (v_ddc, v_ddn)
        ON DUPLICATE KEY UPDATE Name = VALUES(Name);
        SET delivery_dealership_id := (SELECT ID FROM contract_dealerships WHERE Code = v_ddc LIMIT 1);
      END IF;
    ELSE
      SET delivery_dealership_id := dealership_id;
    END IF;

    -- -----------------------
    -- Process Color
    -- -----------------------
    IF v_ccd IS NOT NULL AND v_ccd <> '' THEN
      SET color_id := (SELECT ID FROM contract_colors WHERE Code = v_ccd LIMIT 1);
      IF color_id IS NULL THEN
        INSERT INTO contract_colors (Code, Name)
        VALUES (v_ccd, v_vcl)
        ON DUPLICATE KEY UPDATE Name = VALUES(Name);
        SET color_id := (SELECT ID FROM contract_colors WHERE Code = v_ccd LIMIT 1);
      END IF;
    ELSE
      SET color_id := NULL;
    END IF;

    -- -----------------------
    -- Process Sales License
    -- -----------------------
    IF v_sln IS NOT NULL AND v_sln <> '' THEN
      SET sales_license_id := (SELECT ID FROM contract_sales_licenses WHERE Number = v_sln LIMIT 1);
      IF sales_license_id IS NULL THEN
        INSERT INTO contract_sales_licenses (Number, Description)
        VALUES (v_sln, v_sld)
        ON DUPLICATE KEY UPDATE Description = VALUES(Description);
        SET sales_license_id := (SELECT ID FROM contract_sales_licenses WHERE Number = v_sln LIMIT 1);
      END IF;
    ELSE
      SET sales_license_id := NULL;
    END IF;

    -- -----------------------
    -- Process Payment Method
    -- -----------------------
    IF v_pmc IS NOT NULL AND v_pmc <> '' THEN
      SET payment_method_id := (SELECT ID FROM contract_payment_methods WHERE Code = v_pmc LIMIT 1);
      IF payment_method_id IS NULL THEN
        INSERT INTO contract_payment_methods (Code, Description)
        VALUES (v_pmc, v_pmd)
        ON DUPLICATE KEY UPDATE Description = VALUES(Description);
        SET payment_method_id := (SELECT ID FROM contract_payment_methods WHERE Code = v_pmc LIMIT 1);
      END IF;
    ELSE
      SET payment_method_id := NULL;
    END IF;

    -- -----------------------
    -- Process Vehicle Type
    -- -----------------------
    IF v_vty IS NOT NULL AND v_vty <> '' THEN
      SET vehicle_type_id := (SELECT ID FROM contract_vehicle_types WHERE `Type` = v_vty LIMIT 1);
      IF vehicle_type_id IS NULL THEN
        INSERT INTO contract_vehicle_types (`Type`, Model)
        VALUES (v_vty, v_vmd)
        ON DUPLICATE KEY UPDATE Model = VALUES(Model);
        SET vehicle_type_id := (SELECT ID FROM contract_vehicle_types WHERE `Type` = v_vty LIMIT 1);
      END IF;
    ELSE
      SET vehicle_type_id := NULL;
    END IF;

    -- -----------------------
    -- Finally: Insert into contract_contracts only if contract did not exist earlier
    -- We check again safety conditions (you can relax these if you want contracts inserted with NULL FKs)
    -- -----------------------
    IF existing_contract_id IS NULL THEN
      -- require certain foreign keys (same as original logic). Adjust if you want to allow NULLs.
      IF customer_id IS NOT NULL AND dealership_id IS NOT NULL AND vehicle_type_id IS NOT NULL
         AND color_id IS NOT NULL AND sales_license_id IS NOT NULL AND payment_method_id IS NOT NULL THEN

        INSERT INTO contract_contracts (
          Number, `Date`, Gregorian_Date, Request_Number, Request_Date, Request_Gregorian_Date,
          Customer_ID, Dealership_ID, Vehicle_Type_ID, Color_ID, Gateway, Region,
          Sales_License_ID, Payment_Method_ID, Delivery_Date, Delivery_Due_Days,
          Assignable_Chassis_10th_Digit, Chassis_Number, Delivery_Month,
          Delivery_Dealership_ID, Delivery_Location, Registration_Documents_Delivery_Status,
          Final_Payment_Documents_Delivery_Status, Invoice_Not_Issued_Status, Verification_Documents_Status,
          Chassis_Status, Allocation_Date, Allocation_Gregorian_Date, Plating_Date,
          Plating_Gregorian_Date, Plating_Gregorian_Date1, Document_Date, Document_Status,
          Physical_Delivery_Date, Plate_Number, Cancellation_Date, Contract_Status,
          Sale_Type, Customer_Payment_Date, Final_Payment_Date, Accounting_Approval_Date,
          Invitation_Number, Request_Timestamp, Approved_Price, Price_Type,
          Guarantor_Customer_ID, Discount_Amount, Total_Amount_Received, Contract_Format_Type,
          Assignor_Customer_ID, Assignment_Status, Status, Cancellation, Organization,
          Kardex_Number, Kardex_Date, Cancellation_IBAN, Total_Checks_Amount,
          Number_of_Checks, Organization1, Request_Creator_User, Document_Type,
          Is_Contract_Blacklisted, Is_Customer_Blacklisted, Last_Issued_Invitation,
          Last_Completed_Payment_Invitation, First_Signature_Date, First_Signatory,
          Second_Signature_Date, Second_Signatory, Customer_Outstanding_Balance,
          Checks_Count_After_Kardex, Scrapping_Certificate_Date, ContractFileID
        )
        SELECT 
          TRIM(con) AS Number, TRIM(cdt) AS `Date`, TRIM(cdg) AS Gregorian_Date, TRIM(rqn) AS Request_Number, TRIM(rqd) AS Request_Date, TRIM(rdg) AS Request_Gregorian_Date,
          customer_id AS Customer_ID, dealership_id AS Dealership_ID, vehicle_type_id AS Vehicle_Type_ID, color_id AS Color_ID, TRIM(gtw) AS Gateway, TRIM(reg) AS Region,
          sales_license_id AS Sales_License_ID, payment_method_id AS Payment_Method_ID, TRIM(dld) AS Delivery_Date, TRIM(ddd) AS Delivery_Due_Days,
          TRIM(acd) AS Assignable_Chassis_10th_Digit, TRIM(chn) AS Chassis_Number, TRIM(dlm) AS Delivery_Month,
          delivery_dealership_id AS Delivery_Dealership_ID, TRIM(dll) AS Delivery_Location, TRIM(rds) AS Registration_Documents_Delivery_Status,
          TRIM(fds) AS Final_Payment_Documents_Delivery_Status, TRIM(ins) AS Invoice_Not_Issued_Status, TRIM(vds) AS Verification_Documents_Status,
          TRIM(chs) AS Chassis_Status, TRIM(ald) AS Allocation_Date, TRIM(alg) AS Allocation_Gregorian_Date, TRIM(pld) AS Plating_Date,
          TRIM(plg) AS Plating_Gregorian_Date, TRIM(pl1) AS Plating_Gregorian_Date1, TRIM(dmd) AS Document_Date, TRIM(dms) AS Document_Status,
          TRIM(pdd) AS Physical_Delivery_Date, TRIM(pln) AS Plate_Number, TRIM(cnd) AS Cancellation_Date, TRIM(cns) AS Contract_Status,
          TRIM(sly) AS Sale_Type, TRIM(cpd) AS Customer_Payment_Date, TRIM(fpd) AS Final_Payment_Date, TRIM(aad) AS Accounting_Approval_Date,
          TRIM(inv) AS Invitation_Number, TRIM(rts) AS Request_Timestamp, TRIM(apr) AS Approved_Price, TRIM(prt) AS Price_Type,
          guarantor_id AS Guarantor_Customer_ID, TRIM(dma) AS Discount_Amount, TRIM(tar) AS Total_Amount_Received, TRIM(cft) AS Contract_Format_Type,
          assignor_id AS Assignor_Customer_ID, TRIM(ass) AS Assignment_Status, '' AS Status, TRIM(cst) AS Cancellation, TRIM(org) AS Organization,
          TRIM(knm) AS Kardex_Number, TRIM(kdt) AS Kardex_Date, TRIM(cib) AS Cancellation_IBAN, TRIM(tca) AS Total_Checks_Amount,
          TRIM(noc) AS Number_of_Checks, '' AS Organization1, TRIM(rcu) AS Request_Creator_User, TRIM(dty) AS Document_Type,
          TRIM(icb) AS Is_Contract_Blacklisted, TRIM(icl) AS Is_Customer_Blacklisted, TRIM(lii) AS Last_Issued_Invitation,
          TRIM(lcp) AS Last_Completed_Payment_Invitation, TRIM(fsd) AS First_Signature_Date, TRIM(fsg) AS First_Signatory,
          TRIM(ssd) AS Second_Signature_Date, TRIM(ssg) AS Second_Signatory, TRIM(cob) AS Customer_Outstanding_Balance,
          TRIM(cca) AS Checks_Count_After_Kardex, TRIM(scd) AS Scrapping_Certificate_Date, p_ContractFileID AS ContractFileID
        FROM contract_raw
        WHERE id = v_id;
        -- after insert, existing_contract_id can be set if you want to use it later:
        SET existing_contract_id := (SELECT ID FROM contract_contracts WHERE TRIM(Number) = v_con LIMIT 1);
      ELSE
        -- اگر FK های ضروری وجود ندارند، تصمیم با شماست:
        -- فعلاً این ردیف contract درج نمی‌شود تا از شکست به خاطر FK جلوگیری شود.
        -- اگر می‌خواهی با NULLها درج شود بگو تا این رفتار تغییر کند.
        ITERATE read_loop;
      END IF;
    END IF;

  END LOOP;

  CLOSE cur;

  -- optionally: پاک کردن ردیف‌های پردازش‌شده از contract_raw
  DELETE FROM contract_raw WHERE file_upload_id = p_ContractFileID;

END$$
DELIMITER ;
