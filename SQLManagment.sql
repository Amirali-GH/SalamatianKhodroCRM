delete FROM salamatiancrm.lead_resultcontactcustomer;
delete FROM salamatiancrm.lead_resultcontactcustomer_raw;
delete FROM salamatiancrm.lead_fileresultcontactcustomer;
delete FROM salamatiancrm.customer_customer;
delete FROM salamatiancrm.customer_assignment;


select * FROM salamatiancrm.lead_resultcontactcustomer where CustomerID = 77394;
select * FROM salamatiancrm.lead_resultcontactcustomer_raw where phn = 9192371738;
select * FROM salamatiancrm.lead_fileresultcontactcustomer;
select * FROM salamatiancrm.customer_customer where CustomerID = 77394;
select * FROM salamatiancrm.customer_assignment;

select * FROM salamatiancrm.lead_resultcontactcustomer_raw WHERE phn LIKE '%$%';

select count(*) FROM salamatiancrm.lead_resultcontactcustomer;
select count(*) FROM salamatiancrm.lead_resultcontactcustomer_raw;
select count(*) FROM salamatiancrm.lead_fileresultcontactcustomer;
select count(*) FROM salamatiancrm.customer_customer;
select count(*) FROM salamatiancrm.customer_assignment;

SELECT * FROM salamatiancrm.VW_List_Of_The_Leads;

SELECT SUM(cnt) AS total_duplicates
FROM (
    SELECT COUNT(*) AS cnt
    FROM salamatiancrm.lead_resultcontactcustomer_raw
    GROUP BY phn
    HAVING COUNT(*) > 1
) AS t;




-- :) ----------------------------------------------------------------------------------------------------



delete FROM salamatiancrm.contacrt_contractfile;
delete FROM salamatiancrm.contract_colors;
delete FROM salamatiancrm.contract_contracts;
delete FROM salamatiancrm.contract_customers;
delete FROM salamatiancrm.contract_dealerships;
delete FROM salamatiancrm.contract_payment_methods;
delete FROM salamatiancrm.contract_raw;
delete FROM salamatiancrm.contract_sales_licenses;
delete FROM salamatiancrm.contract_vehicle_types;




select count(*)  FROM salamatiancrm.contacrt_contractfile;
select count(*)  FROM salamatiancrm.contract_colors;
select count(*)  FROM salamatiancrm.contract_contracts;
select count(*)  FROM salamatiancrm.contract_customers;
select count(*)  FROM salamatiancrm.contract_dealerships;
select count(*)  FROM salamatiancrm.contract_payment_methods;
select count(*)  FROM salamatiancrm.contract_raw;
select count(*)  FROM salamatiancrm.contract_sales_licenses;
select count(*)  FROM salamatiancrm.contract_vehicle_types;


select * FROM salamatiancrm.contacrt_contractfile;
select * FROM salamatiancrm.contract_colors;
select * FROM salamatiancrm.contract_contracts;
select * FROM salamatiancrm.contract_customers;
select * FROM salamatiancrm.contract_dealerships;
select * FROM salamatiancrm.contract_payment_methods;
select * FROM salamatiancrm.contract_raw;
select * FROM salamatiancrm.contract_sales_licenses;
select * FROM salamatiancrm.contract_vehicle_types;
