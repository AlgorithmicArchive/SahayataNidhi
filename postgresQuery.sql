WITH raw_data AS (
    SELECT 'jk_data_1888_01_2025' AS tablename, push_application_processing_data::json AS data FROM jk_data_1888_01_2025
    UNION ALL SELECT 'jk_data_1888_02_2025', push_application_processing_data::json FROM jk_data_1888_02_2025
    UNION ALL SELECT 'jk_data_1888_03_2025', push_application_processing_data::json FROM jk_data_1888_03_2025
    UNION ALL SELECT 'jk_data_1888_04_2025', push_application_processing_data::json FROM jk_data_1888_04_2025
    UNION ALL SELECT 'jk_data_1888_05_2025', push_application_processing_data::json FROM jk_data_1888_05_2025
    UNION ALL SELECT 'jk_data_1888_06_2025', push_application_processing_data::json FROM jk_data_1888_06_2025
    UNION ALL SELECT 'jk_data_1888_07_2025', push_application_processing_data::json FROM jk_data_1888_07_2025
    UNION ALL SELECT 'jk_data_1888_08_2025', push_application_processing_data::json FROM jk_data_1888_08_2025
    UNION ALL SELECT 'jk_data_1888_09_2025', push_application_processing_data::json FROM jk_data_1888_09_2025
    UNION ALL SELECT 'jk_data_1888_10_2025', push_application_processing_data::json FROM jk_data_1888_10_2025
    UNION ALL SELECT 'jk_data_1888_11_2025', push_application_processing_data::json FROM jk_data_1888_11_2025
    UNION ALL SELECT 'jk_data_1888_2_11_2025', push_application_processing_data::json FROM jk_data_1888_2_11_2025
),
delivered_nov_2025 AS (
    SELECT DISTINCT
        r.tablename,
        (elem->'task_details'->>'appl_id')::bigint AS appl_id,
        elem->'task_details'->>'executed_time' AS delivered_time
    FROM raw_data r
    CROSS JOIN LATERAL jsonb_array_elements(
        (r.data->'execution_data')::jsonb    -- force jsonb here
    ) elem
    WHERE elem ? 'task_details'
      AND elem->'task_details'->>'task_action_detail' = 'Deliver'
      AND to_timestamp(elem->'task_details'->>'executed_time', 'DD-MM-YYYY HH24:MI:SS')
          BETWEEN '2025-11-01' AND '2025-11-30 23:59:59'
),
final_result AS (
    SELECT DISTINCT ON (da.appl_id)
        da.appl_id,
        da.delivered_time AS "Delivered On",
        da.tablename AS "Execution Table",
        init_elem->>'appl_ref_no' AS "Application Ref No",
        init_elem->>'submission_date' AS "Submitted On",
        init_elem->'attribute_details'->>'140853' AS "Applicant Name",
        init_elem->'attribute_details'->>'140861' AS "Mobile No",
        init_elem->'attribute_details'->>'140855' AS "Date of Birth",
        init_elem->'attribute_details'->>'140856' AS "Age",
        init_elem->'attribute_details'->>'141683' AS "Pension Type",
        init_elem->'attribute_details'->>'140863' AS "Village",
        init_elem->'attribute_details'->>'143034' AS "Tehsil",
        init_elem->'attribute_details'->>'140871' AS "District (Raw)",
        split_part(init_elem->'attribute_details'->>'140871', '~', 2) AS "District",
        init_elem->'attribute_details'->>'140875' AS "Bank Account No",
        init_elem->'attribute_details'->>'140874' AS "IFSC Code",
        init_elem->'attribute_details'->>'140873' AS "Bank Name",
        r.tablename AS "Initiated Table"
    FROM delivered_nov_2025 da
    CROSS JOIN raw_data r
    CROSS JOIN LATERAL jsonb_array_elements(
        (r.data->'initiated_data')::jsonb     -- force jsonb here too
    ) init_elem
    WHERE init_elem->>'appl_id' = da.appl_id::text
      AND (init_elem->'attribute_details'->>'140864') ILIKE '%Ganderbal%'   -- change district filter
)
SELECT
    "Application Ref No",
    -- appl_id AS "Application ID" ,
    -- "Applicant Name",
    -- "Mobile No",
    -- "Date of Birth",
    -- "Age",
    -- "Pension Type",
    -- "Village",
    -- "Tehsil",
    "District",
    -- "Bank Account No",
    -- "IFSC Code",
    -- "Bank Name",
    -- "Submitted On",
    "Delivered On"
FROM final_result
ORDER BY "Application Ref No" ASC;