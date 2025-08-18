CREATE PROCEDURE [dbo].[GetAndIncrementCount]
    @DistrictId INT,
    @ServiceId INT,
    @FinancialYear NVARCHAR(20),
    @Type NVARCHAR(30),
    @NewCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;

    BEGIN TRY
        -- Attempt to find the record
        IF EXISTS (SELECT 1 FROM ApplicationPerDistrict 
                   WHERE DistrictId = @DistrictId AND ServiceId = @ServiceId AND [Type] = @Type)
        BEGIN
            -- Update existing and get new count
            UPDATE ApplicationPerDistrict
            SET CountValue = CountValue + 1
            WHERE DistrictId = @DistrictId AND ServiceId = @ServiceId AND [Type] = @Type ;

            SELECT @NewCount = CountValue
            FROM ApplicationPerDistrict
            WHERE DistrictId = @DistrictId AND ServiceId = @ServiceId AND [Type] = @Type;
        END
        ELSE
        BEGIN
            -- Insert new
            INSERT INTO ApplicationPerDistrict ([Type],DistrictId, ServiceId, FinancialYear, CountValue)
            VALUES (@Type,@DistrictId, @ServiceId, @FinancialYear, 1);

            SET @NewCount = 1;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

CREATE PROCEDURE [dbo].[GetApplicationForCorrigendum]
    @ReferenceNumber VARCHAR(50),
    @Role VARCHAR(255),
    @OfficerAccessLevel VARCHAR(50),
    @OfficerAccessCode INT,
    @ServiceId INT,
    @Type VARCHAR(50),
    @Message NVARCHAR(255) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IsSanctioned BIT = 0;
    DECLARE @IsAccessible BIT = 0;
    DECLARE @IsAuthorized BIT = 0;

    -- 1. Check if application is sanctioned
    IF EXISTS (
        SELECT 1 
        FROM [dbo].[Citizen_Applications]
        WHERE ReferenceNumber = @ReferenceNumber AND Status = 'Sanctioned'
    )
    BEGIN
        SET @IsSanctioned = 1;
    END

    -- 2. Validate type vs sanction status
    IF @Type = 'Correction' AND @IsSanctioned = 1
    BEGIN
        SET @Message = 'Error: Correction is not allowed for sanctioned applications.';
    END
    ELSE IF @Type = 'Corrigendum' AND @IsSanctioned = 0
    BEGIN
        SET @Message = 'Error: Corrigendum can only be issued for sanctioned applications.';
    END

    -- 3. Check officer access level
  IF EXISTS (
    SELECT 1
    FROM [dbo].[Citizen_Applications] ca
    OUTER APPLY (
        SELECT *
        FROM OPENJSON(ca.FormDetails, '$.Location') 
        WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        )
    ) AS jsonLocation
    LEFT JOIN [dbo].[District] d ON jsonLocation.name = 'District' AND jsonLocation.value = d.DistrictID
    WHERE ca.ReferenceNumber = @ReferenceNumber
    AND (
        @OfficerAccessLevel = 'State'
        OR (@OfficerAccessLevel = 'District' AND jsonLocation.name = 'District' AND jsonLocation.value = @OfficerAccessCode)
        OR (@OfficerAccessLevel = 'Tehsil' AND jsonLocation.name = 'Tehsil' AND jsonLocation.value = @OfficerAccessCode)
        OR (@OfficerAccessLevel = 'Division' AND jsonLocation.name = 'District' AND d.Division = @OfficerAccessCode)
    )
)
BEGIN
    SET @IsAccessible = 1;
END
ELSE
BEGIN
    SET @Message = 'Error: Application does not belong to the specified access level and code.';
END



    -- 4. Authorization check
    IF @Type = 'Correction'
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM [dbo].[Citizen_Applications] ca
            WHERE ca.ReferenceNumber = @ReferenceNumber
              AND ca.ServiceId = @ServiceId
              AND JSON_PATH_EXISTS(ca.WorkFlow, '$[' + CAST(ca.CurrentPlayer AS NVARCHAR(10)) + '].designation') = 1
              AND JSON_VALUE(ca.WorkFlow, '$[' + CAST(ca.CurrentPlayer AS NVARCHAR(10)) + '].designation') = @Role
        )
        BEGIN
            SET @IsAuthorized = 1;
        END
        ELSE IF @Message IS NULL
        BEGIN
            SET @Message = 'Error: You are not the Current Officer of this Application to perform a Correction.';
        END
    END
    ELSE IF @Type = 'Corrigendum'
    BEGIN
        SET @IsAuthorized = 1;
    END

    -- 5. Set final success message if everything is valid
    IF @IsSanctioned = 1 AND @IsAccessible = 1 AND @IsAuthorized = 1 AND @Type = 'Corrigendum'
        SET @Message = 'Success: Corrigendum data retrieved.';
    ELSE IF @IsSanctioned = 0 AND @IsAccessible = 1 AND @IsAuthorized = 1 AND @Type = 'Correction'
        SET @Message = 'Success: Correction data retrieved.';
    ELSE IF @Message IS NULL
        SET @Message = 'Error: Invalid request or insufficient permissions.';

    -- 6. Always return the result (single row)
    SELECT  
        ca.ReferenceNumber,
        ca.Citizen_id,
        ca.ServiceId,
        ca.DistrictUidForBank,
        ca.FormDetails,
        ca.WorkFlow,
        ca.AdditionalDetails,
        ca.CurrentPlayer,
        ca.Status,
        ca.DataType,
        ca.Created_at,
        c.[type],
        c.CorrigendumFields AS Corrigendum,
        c.Type AS CorrigendumType
    FROM [dbo].[Citizen_Applications] ca
    LEFT JOIN [dbo].[Corrigendum] c 
        ON ca.ReferenceNumber = c.ReferenceNumber AND c.Type = @Type
    WHERE ca.ServiceId = @ServiceId
      AND ca.ReferenceNumber = @ReferenceNumber 
      AND (
          (@Type = 'Corrigendum' AND ca.Status = 'Sanctioned')
          OR (@Type = 'Correction' AND ca.Status != 'Sanctioned' 
              AND JSON_PATH_EXISTS(ca.WorkFlow, '$[' + CAST(ca.CurrentPlayer AS NVARCHAR(10)) + '].designation') = 1
              AND JSON_VALUE(ca.WorkFlow, '$[' + CAST(ca.CurrentPlayer AS NVARCHAR(10)) + '].designation') = @Role)
      );
END
GO

CREATE PROCEDURE GetApplicationsByAccessLevel
     @AccessLevel VARCHAR(50),  -- 'State', 'Division', or 'District'
    @AccessCode INT            -- 0 for State, or actual DivisionId/DistrictId
AS
BEGIN
    SET NOCOUNT ON;
     IF @AccessLevel = 'State'
    BEGIN
        SELECT 
            ca.ReferenceNumber,
            ca.FormDetails,
            ca.Created_at
        FROM Citizen_Applications ca;
    END
     ELSE IF @AccessLevel = 'Division'
    BEGIN
        SELECT 
            ca.ReferenceNumber,
            ca.FormDetails,
            ca.Created_at
        FROM Citizen_Applications ca
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location')
            WITH (
                name VARCHAR(50) '$.name',
                value INT '$.value'
            ) AS loc
        LEFT JOIN TSWOTehsil t ON loc.name = 'Tehsil' AND t.TehsilId = loc.value
        LEFT JOIN District d ON loc.name = 'District' AND d.DistrictId = loc.value
        WHERE (
            (loc.name = 'Tehsil' AND t.DivisionCode = @AccessCode)
            OR (loc.name = 'District' AND d.Division = @AccessCode)
        );
    END
    ELSE IF @AccessLevel = 'District'
    BEGIN
        SELECT 
            ca.ReferenceNumber,
            ca.FormDetails,
            ca.Created_at
        FROM Citizen_Applications ca
       CROSS APPLY OPENJSON(ca.FormDetails, '$.Location')
            WITH (
                name VARCHAR(50) '$.name',
                value INT '$.value'
            ) AS loc
        LEFT JOIN TSWOTehsil t ON loc.name = 'Tehsil' AND t.TehsilId = loc.value
        WHERE (
            (loc.name = 'Tehsil' AND t.DistrictId = @AccessCode)
            OR (loc.name = 'District' AND loc.value = @AccessCode)
        );
    END
END
GO

CREATE PROCEDURE [dbo].[GetApplicationsForOfficer]
    @Role VARCHAR(255),
    @AccessLevel VARCHAR(20),
    @AccessCode INT,
    @ApplicationStatus VARCHAR(50) = NULL,
    @ServiceId INT,
    @PageIndex INT = 0,
    @PageSize INT = 10,
    @IsPaginated BIT = 1,
    @DataType VARCHAR(20) = NULL,
    @TotalRecords INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Step 1: Calculate TotalRecords (no status filter, no pagination)
    SELECT @TotalRecords = COUNT(DISTINCT ca.ReferenceNumber)
    FROM [dbo].[Citizen_Applications] ca
    CROSS APPLY OPENJSON(ca.WorkFlow) AS wf
    OUTER APPLY OPENJSON(ca.FormDetails, '$.Location') 
        WITH (name NVARCHAR(50) '$.name', value INT '$.value') AS jsonLocation
    LEFT JOIN [dbo].[District] d ON jsonLocation.name = 'District' AND jsonLocation.value = d.DistrictID
    WHERE 
        ca.ServiceId = @ServiceId
        AND (
            @DataType = 'legacy' 
            OR JSON_VALUE(wf.value, '$.designation') = @Role
        )
        AND (
            @AccessLevel = 'State'
            OR (@AccessLevel = 'District' AND jsonLocation.name = 'District' AND jsonLocation.value = @AccessCode)
            OR (@AccessLevel = 'Tehsil' AND jsonLocation.name = 'Tehsil' AND jsonLocation.value = @AccessCode)
            OR (@AccessLevel = 'Division' AND jsonLocation.name = 'District' AND d.Division = @AccessCode)
        )
        AND (@DataType IS NULL OR ca.DataType = @DataType);

    -- Step 2: Return paginated and status-filtered records
    WITH FilteredApplications AS (
        SELECT
            ca.ReferenceNumber,
            MAX(ca.Citizen_id) AS Citizen_id,
            MAX(ca.ServiceId) AS ServiceId,
            MAX(ca.DistrictUidForBank) AS DistrictUidForBank,
            MAX(ca.FormDetails) AS FormDetails,
            MAX(ca.WorkFlow) AS WorkFlow,
            MAX(ca.AdditionalDetails) AS AdditionalDetails,
            MAX(ca.CurrentPlayer) AS CurrentPlayer,
            MAX(ca.[Status]) AS [Status],
            MAX(ca.DataType) AS DataType,
            MAX(ca.Created_at) AS Created_at,
            ROW_NUMBER() OVER (
                ORDER BY 
                    TRY_CAST(PARSENAME(REPLACE(ca.ReferenceNumber, '/', '.'), 1) AS INT)
            ) AS RowNum
        FROM
            [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.WorkFlow) AS wf
        OUTER APPLY OPENJSON(ca.FormDetails, '$.Location') 
            WITH (name NVARCHAR(50) '$.name', value INT '$.value') AS jsonLocation
        LEFT JOIN [dbo].[District] d ON jsonLocation.name = 'District' AND jsonLocation.value = d.DistrictID
        WHERE
            ca.ServiceId = @ServiceId
            AND (
                @DataType = 'legacy' 
                OR JSON_VALUE(wf.value, '$.designation') = @Role
            )
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' AND jsonLocation.name = 'District' AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' AND jsonLocation.name = 'Tehsil' AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Division' AND jsonLocation.name = 'District' AND d.Division = @AccessCode)
            )
           AND (
    @ApplicationStatus = 'total'
    OR 
    (
        JSON_VALUE(wf.value, '$.status') = @ApplicationStatus 
        AND 
        (@ApplicationStatus != 'sanctioned' OR ca.Status = 'Sanctioned')
    )
    OR 
    (
        @ApplicationStatus = 'pensionstopped' 
        AND ca.DataType = 'legacy' 
        AND ca.[Status] NOT IN ('rejected', 'sanctioned')
    )
)

            AND JSON_VALUE(wf.value, '$.status') IS NOT NULL
            AND JSON_VALUE(wf.value, '$.status') <> ''
            AND (@DataType IS NULL OR ca.DataType = @DataType)
        GROUP BY
            ca.ReferenceNumber
    )

    SELECT 
        fa.ReferenceNumber,
        fa.Citizen_id,
        fa.ServiceId,
fa.DistrictUidForBank,
        fa.FormDetails,
        fa.WorkFlow,
        fa.AdditionalDetails,
        fa.CurrentPlayer,
        fa.Status,
        fa.DataType,
        fa.Created_at
    FROM FilteredApplications fa
    WHERE 
        (@IsPaginated = 1 AND fa.RowNum BETWEEN (@PageIndex * @PageSize) + 1 AND ((@PageIndex + 1) * @PageSize))
        OR (@IsPaginated = 0)
    ORDER BY fa.RowNum;
END
GO

CREATE PROCEDURE [dbo].[GetApplicationsForReport]
    @AccessCode INT,
    @ServiceId INT,
    @AccessLevel NVARCHAR(10) -- 'District', 'Tehsil', or 'All'
AS
BEGIN
    SET NOCOUNT ON;

    IF @AccessLevel = 'All'
    BEGIN
        -- All Tehsils (State-wide)
        SELECT 
            t.TehsilName,
            COUNT(DISTINCT apps.ReferenceNumber) AS TotalApplicationsSubmitted,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'pending' THEN 1 ELSE 0 END), 0) AS TotalApplicationsPending,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'returntoedit' THEN 1 ELSE 0 END), 0) AS TotalApplicationsReturnToEdit,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'rejected' THEN 1 ELSE 0 END), 0) AS TotalApplicationsRejected,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'sanctioned' THEN 1 ELSE 0 END), 0) AS TotalApplicationsSanctioned
        FROM [dbo].[TSWOTehsil] t
        LEFT JOIN (
            SELECT 
                ca.ReferenceNumber,
                ca.WorkFlow,
                jsonTehsil.value AS TehsilId
            FROM [dbo].[Citizen_Applications] ca
            CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') 
                WITH (name NVARCHAR(50) '$.name', value INT '$.value') AS jsonTehsil
            WHERE ca.ServiceId = @ServiceId AND jsonTehsil.name = 'Tehsil'
        ) AS apps ON apps.TehsilId = t.TehsilId
        OUTER APPLY OPENJSON(apps.WorkFlow) AS wf
        GROUP BY t.TehsilName
        ORDER BY t.TehsilName;
    END
    ELSE IF @AccessLevel = 'District'
    BEGIN
        -- All Tehsils under the given District
        SELECT 
            t.TehsilName,
            COUNT(DISTINCT apps.ReferenceNumber) AS TotalApplicationsSubmitted,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'pending' THEN 1 ELSE 0 END), 0) AS TotalApplicationsPending,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'returntoedit' THEN 1 ELSE 0 END), 0) AS TotalApplicationsReturnToEdit,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'rejected' THEN 1 ELSE 0 END), 0) AS TotalApplicationsRejected,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'sanctioned' THEN 1 ELSE 0 END), 0) AS TotalApplicationsSanctioned
        FROM [dbo].[TSWOTehsil] t
        LEFT JOIN (
            SELECT 
                ca.ReferenceNumber,
                ca.WorkFlow,
                jsonTehsil.value AS TehsilId
            FROM [dbo].[Citizen_Applications] ca
            CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') 
                WITH (name NVARCHAR(50) '$.name', value INT '$.value') AS jsonTehsil
            WHERE ca.ServiceId = @ServiceId AND jsonTehsil.name = 'Tehsil'
        ) AS apps ON apps.TehsilId = t.TehsilId
        OUTER APPLY OPENJSON(apps.WorkFlow) AS wf
        WHERE t.DistrictId = @AccessCode
        GROUP BY t.TehsilName
        ORDER BY t.TehsilName;
    END
    ELSE IF @AccessLevel = 'Tehsil'
    BEGIN
        -- Specific Tehsil
        SELECT 
            COALESCE(t.TehsilName, 'Unknown') AS TehsilName,
            COUNT(DISTINCT apps.ReferenceNumber) AS TotalApplicationsSubmitted,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'pending' THEN 1 ELSE 0 END), 0) AS TotalApplicationsPending,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'returntoedit' THEN 1 ELSE 0 END), 0) AS TotalApplicationsReturnToEdit,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'rejected' THEN 1 ELSE 0 END), 0) AS TotalApplicationsRejected,
            ISNULL(SUM(CASE WHEN JSON_VALUE(wf.value, '$.status') = 'sanctioned' THEN 1 ELSE 0 END), 0) AS TotalApplicationsSanctioned
        FROM [dbo].[TSWOTehsil] t
        LEFT JOIN (
            SELECT 
                ca.ReferenceNumber,
                ca.WorkFlow,
                jsonTehsil.value AS TehsilId
            FROM [dbo].[Citizen_Applications] ca
            CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') 
                WITH (name NVARCHAR(50) '$.name', value INT '$.value') AS jsonTehsil
            WHERE ca.ServiceId = @ServiceId AND jsonTehsil.name = 'Tehsil' AND jsonTehsil.value = @AccessCode
        ) AS apps ON apps.TehsilId = t.TehsilId
        OUTER APPLY OPENJSON(apps.WorkFlow) AS wf
        WHERE t.TehsilId = @AccessCode
        GROUP BY t.TehsilName;
    END
END
GO

CREATE PROCEDURE [dbo].[GetCitizensByAccessLevel]
      @AccessLevel VARCHAR(100),
    @AccessCode INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @AccessLevel ='State'
    BEGIN
        SELECT Name,Username,Email,MobileNumber FROM Users WHERE UserType = 'Citizen';
    END
    ELSE IF @AccessLevel = 'Division'
    BEGIN
        SELECT u.Name,u.Username,u.Email,u.MobileNumber
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                District INT '$.District',
                Tehsil INT '$.Tehsil'
            ) AS ad
        LEFT JOIN District d ON d.DistrictId = ad.District
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.Tehsil
        WHERE u.UserType = 'Citizen'
          AND (
              d.Division = @AccessCode
              OR t.DivisionCode = @AccessCode
          );
    END
    ELSE IF @AccessLevel = 'District'
    BEGIN
        SELECT u.Name,u.Username,u.Email,u.MobileNumber
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                District INT '$.District',
                Tehsil INT '$.Tehsil'
            ) AS ad
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.Tehsil
        WHERE u.UserType = 'Citizen'
          AND (
              ad.District = @AccessCode
              OR t.DistrictId = @AccessCode
          );
    END
END
GO

CREATE PROCEDURE [dbo].[GetCorrigendumByLocationAccess]
    @OfficerAccessLevel VARCHAR(50),
    @OfficerAccessCode INT,
    @ReferenceNumber VARCHAR(50) = NULL,
    @Status VARCHAR(50) = NULL,
    @CorrigendumId VARCHAR(50) = NULL,
    @Type VARCHAR(50) = NULL,
    @OfficerRole VARCHAR(100) = NULL -- NEW PARAM
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CorrigendumId,
        c.ReferenceNumber,
        c.[Location],
        c.CorrigendumFields,
        c.WorkFlow,
        c.CurrentPlayer,
        c.Type,
        c.History,
        c.Status,
        c.CreatedAt
    FROM [dbo].[Corrigendum] c
    OUTER APPLY (
        SELECT name, value
        FROM OPENJSON(c.[Location]) 
        WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        )
    ) AS jsonLocation
    LEFT JOIN [dbo].[District] d
        ON jsonLocation.name = 'District' AND jsonLocation.value = d.DistrictID
    OUTER APPLY (
        SELECT TOP 1 
            JSON_VALUE(value, '$.status') AS OfficerStatus
        FROM OPENJSON(c.WorkFlow)
        WHERE JSON_VALUE(value, '$.designation') = @OfficerRole
    ) wf -- extract officer's own step status
    WHERE
        (
            @OfficerAccessLevel = 'State'
            OR (@OfficerAccessLevel = 'District' AND jsonLocation.name = 'District' AND jsonLocation.value = @OfficerAccessCode)
            OR (@OfficerAccessLevel = 'Tehsil' AND jsonLocation.name = 'Tehsil' AND jsonLocation.value = @OfficerAccessCode)
            OR (@OfficerAccessLevel = 'Division' AND jsonLocation.name = 'District' AND d.Division = @OfficerAccessCode)
        )
        AND (@ReferenceNumber IS NULL OR c.ReferenceNumber = @ReferenceNumber)
        AND (@CorrigendumId IS NULL OR c.CorrigendumId = @CorrigendumId)
        AND (
            @Status IS NULL 
            OR @Status = 'total' 
            OR wf.OfficerStatus = @Status
        )
        AND (@Type IS NULL OR c.Type = @Type);
END
GO

CREATE PROCEDURE [dbo].[GetCountForAdmin]
    @AccessLevel VARCHAR(50),  -- 'State', 'Division', or 'District'
    @AccessCode INT            -- 0 for State, or actual DivisionId/DistrictId
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables to store counts
    DECLARE @TotalOfficers INT = 0;
    DECLARE @TotalCitizens INT = 0;
    DECLARE @TotalApplicationsSubmitted INT = 0;
    DECLARE @TotalServices INT = 0;

    -- Validate AccessLevel
    IF @AccessLevel NOT IN ('State', 'Division', 'District')
    BEGIN
        SELECT 
            -1 AS TotalOfficers, 
            -1 AS TotalCitizens, 
            -1 AS TotalApplicationsSubmitted, 
            -1 AS TotalServices;
        RETURN;
    END;

    -- Get TotalServices (common across all access levels)
    SELECT @TotalServices = COUNT(*) FROM Services;

    IF @AccessLevel = 'State'
    BEGIN
        -- Total Officers
        SELECT @TotalOfficers = COUNT(*) 
        FROM Users 
        WHERE UserType = 'Officer';

        -- Total Citizens
        SELECT @TotalCitizens = COUNT(*) 
        FROM Users 
        WHERE UserType = 'Citizen';

        -- Total Applications
        SELECT @TotalApplicationsSubmitted = COUNT(*) 
        FROM Citizen_Applications;
    END
    ELSE IF @AccessLevel = 'Division'
    BEGIN
        -- Total Officers
        SELECT @TotalOfficers = COUNT(DISTINCT u.UserId)
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                AccessLevel VARCHAR(50) '$.AccessLevel',
                AccessCode INT '$.AccessCode'
            ) AS ad
        LEFT JOIN District d ON d.DistrictId = ad.AccessCode AND ad.AccessLevel = 'District'
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.AccessCode AND ad.AccessLevel = 'Tehsil'
        WHERE u.UserType = 'Officer'
          AND (
              (ad.AccessLevel = 'Division' AND ad.AccessCode = @AccessCode)
              OR (ad.AccessLevel = 'District' AND d.Division = @AccessCode)
              OR (ad.AccessLevel = 'Tehsil' AND t.DivisionCode = @AccessCode)
          );

        -- Total Citizens
        SELECT @TotalCitizens = COUNT(DISTINCT u.UserId)
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                District INT '$.District',
                Tehsil INT '$.Tehsil'
            ) AS ad
        LEFT JOIN District d ON d.DistrictId = ad.District
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.Tehsil
        WHERE u.UserType = 'Citizen'
          AND (
              d.Division = @AccessCode
              OR t.DivisionCode = @AccessCode
          );

        -- Total Applications
        SELECT @TotalApplicationsSubmitted = COUNT(DISTINCT ca.ReferenceNumber)
        FROM Citizen_Applications ca
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location')
            WITH (
                name VARCHAR(50) '$.name',
                value INT '$.value'
            ) AS loc
        LEFT JOIN TSWOTehsil t ON loc.name = 'Tehsil' AND t.TehsilId = loc.value
        LEFT JOIN District d ON loc.name = 'District' AND d.DistrictId = loc.value
        WHERE (
            (loc.name = 'Tehsil' AND t.DivisionCode = @AccessCode)
            OR (loc.name = 'District' AND d.Division = @AccessCode)
        );
    END
    ELSE IF @AccessLevel = 'District'
    BEGIN
        -- Total Officers
        SELECT @TotalOfficers = COUNT(DISTINCT u.UserId)
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                AccessLevel VARCHAR(50) '$.AccessLevel',
                AccessCode INT '$.AccessCode'
            ) AS ad
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.AccessCode AND ad.AccessLevel = 'Tehsil'
        WHERE u.UserType = 'Officer'
          AND (
              (ad.AccessLevel = 'District' AND ad.AccessCode = @AccessCode)
              OR (ad.AccessLevel = 'Tehsil' AND t.DistrictId = @AccessCode)
          );

        -- Total Citizens
        SELECT @TotalCitizens = COUNT(DISTINCT u.UserId)
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                District INT '$.District',
                Tehsil INT '$.Tehsil'
            ) AS ad
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.Tehsil
        WHERE u.UserType = 'Citizen'
          AND (
              ad.District = @AccessCode
              OR t.DistrictId = @AccessCode
          );

        -- Total Applications
        SELECT @TotalApplicationsSubmitted = COUNT(DISTINCT ca.ReferenceNumber)
        FROM Citizen_Applications ca
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location')
            WITH (
                name VARCHAR(50) '$.name',
                value INT '$.value'
            ) AS loc
        LEFT JOIN TSWOTehsil t ON loc.name = 'Tehsil' AND t.TehsilId = loc.value
        WHERE (
            (loc.name = 'Tehsil' AND t.DistrictId = @AccessCode)
            OR (loc.name = 'District' AND loc.value = @AccessCode)
        );
    END

    -- Return results
    SELECT 
        @TotalOfficers AS TotalOfficers,
        @TotalCitizens AS TotalCitizens,
        @TotalApplicationsSubmitted AS TotalApplicationsSubmitted,
        @TotalServices AS TotalServices;
END
GO

CREATE   PROCEDURE [dbo].[GetDisabilityApplications]
    @AccessLevel VARCHAR(20),
    @AccessCode INT,
    @ServiceId INT,
    @TakenBy VARCHAR(50),
    @DivisionCode INT = NULL,
    @ResultType VARCHAR(20), -- 'totalpcpapplication' or 'expiringeligibility'
    @PageNumber INT = 1,
    @PageSize INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate pagination parameters
    IF @PageNumber < 1 SET @PageNumber = 1;
    IF @PageSize < 1 SET @PageSize = 10;

    -- ======== Ranked Workflows Section ========
    WITH RankedStatus AS (
        SELECT 
            ca.*, -- Select all columns from Citizen_Applications
            jsonWorkFlow.status AS WorkflowStatus,
            ROW_NUMBER() OVER (
                PARTITION BY ca.ReferenceNumber 
                ORDER BY COALESCE(jsonWorkFlow.timestamp, '9999-12-31') DESC, jsonWorkFlow.seq DESC
            ) AS rn
        FROM [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            timestamp DATETIME '$.timestamp',
            seq INT '$.seq'
        ) AS jsonWorkFlow
        WHERE 
            jsonWorkFlow.status IS NOT NULL 
            AND jsonWorkFlow.status <> ''
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
    ),
    LatestStatus AS (
        SELECT 
            ReferenceNumber, 
            ServiceId, 
            FormDetails, 
            WorkflowStatus
        FROM RankedStatus
        WHERE rn = 1
    ),
    FilteredApplications AS (
        SELECT 
            rs.*, -- Carry forward all columns from RankedStatus (includes ca.* and WorkflowStatus)
            CASE 
                WHEN @ResultType = 'expiringeligibility' THEN
                    CASE 
                        WHEN EXISTS (
                            SELECT 1
                            FROM OPENJSON(rs.FormDetails, '$."Pension Type"') WITH (
                                value NVARCHAR(100) '$.value',
                                additionalFields NVARCHAR(MAX) '$.additionalFields' AS JSON
                            ) AS pension
                            CROSS APPLY OPENJSON(pension.additionalFields) WITH (
                                name NVARCHAR(100) '$.name',
                                value NVARCHAR(100) '$.value',
                                additionalFields NVARCHAR(MAX) '$.additionalFields' AS JSON
                            ) AS disability
                            CROSS APPLY OPENJSON(disability.additionalFields) WITH (
                                name NVARCHAR(100) '$.name',
                                value NVARCHAR(100) '$.value'
                            ) AS tempDisability
                            WHERE pension.value = 'PHYSICALLY CHALLENGED PERSON'
                                AND disability.name = 'KindOfDisability'
                                AND disability.value = 'TEMPORARY'
                                AND tempDisability.name = 'IfTemporaryDisabilityUdidCardValidUpto'
                                AND tempDisability.value IS NOT NULL
                                AND TRY_CONVERT(DATE, tempDisability.value) IS NOT NULL
                                AND DATEDIFF(MONTH, GETDATE(), TRY_CONVERT(DATE, tempDisability.value)) BETWEEN 0 AND 3
                        ) THEN 1
                        ELSE 0
                    END
                ELSE 1 -- For totalpcpapplication, include all PHYSICALLY CHALLENGED PERSON applications
            END AS IsMatch
        FROM RankedStatus rs
        CROSS APPLY OPENJSON(rs.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE rs.rn = 1
            AND rs.ServiceId = @ServiceId
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM [dbo].[Tehsil] t
                                INNER JOIN [dbo].[District] d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            )
                        )
                    )
                )
            )
            AND (
                @ResultType = 'totalpcpapplication' AND EXISTS (
                    SELECT 1
                    FROM OPENJSON(rs.FormDetails, '$."Pension Type"') WITH (
                        value NVARCHAR(100) '$.value'
                    ) AS pension
                    WHERE pension.value = 'PHYSICALLY CHALLENGED PERSON'
                )
                OR @ResultType = 'expiringeligibility'
            )
    )
    -- ======== Final SELECT with Pagination ========
    SELECT
        fa.*,
        CASE 
            WHEN @ResultType = 'expiringeligibility' THEN
                (SELECT tempDisability.value
                 FROM OPENJSON(fa.FormDetails, '$."Pension Type"') WITH (
                     value NVARCHAR(100) '$.value',
                     additionalFields NVARCHAR(MAX) '$.additionalFields' AS JSON
                 ) AS pension
                 CROSS APPLY OPENJSON(pension.additionalFields) WITH (
                     name NVARCHAR(100) '$.name',
                     value NVARCHAR(100) '$.value',
                     additionalFields NVARCHAR(MAX) '$.additionalFields' AS JSON
                 ) AS disability
                 CROSS APPLY OPENJSON(disability.additionalFields) WITH (
                     name NVARCHAR(100) '$.name',
                     value NVARCHAR(100) '$.value'
                 ) AS tempDisability
                 WHERE pension.value = 'PHYSICALLY CHALLENGED PERSON'
                     AND disability.name = 'KindOfDisability'
                     AND disability.value = 'TEMPORARY'
                     AND tempDisability.name = 'IfTemporaryDisabilityUdidCardValidUpto'
                     AND fa.IsMatch = 1
                ) 
            ELSE NULL
        END AS Expiration_Date
    FROM FilteredApplications fa
    WHERE fa.IsMatch = 1
    ORDER BY fa.ReferenceNumber
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE PROCEDURE [dbo].[GetDuplicateAccNo]
    @AccountNumber VARCHAR(50),
    @BankName VARCHAR(100),
    @IfscCode VARCHAR(11)
AS
BEGIN
    SET NOCOUNT ON;

    -- This CTE extracts bank info regardless of the key name: "Bank Details" or "BankDetails"
    WITH MatchingAccounts AS (
        SELECT 
            ca.*
        FROM 
            [dbo].[Citizen_Applications] ca

        OUTER APPLY (
            SELECT 
                MAX(CASE WHEN bd.name = 'AccountNumber' THEN bd.value END) AS AccountNumber,
                MAX(CASE WHEN bd.name = 'BankName' THEN bd.value END) AS BankName,
                MAX(CASE WHEN bd.name = 'IfscCode' THEN bd.value END) AS IfscCode
            FROM (
                -- Try parsing both keys
                SELECT * FROM OPENJSON(ca.FormDetails, '$."Bank Details"') 
                         WITH (name NVARCHAR(50) '$.name', value NVARCHAR(100) '$.value')
                UNION ALL
                SELECT * FROM OPENJSON(ca.FormDetails, '$.BankDetails') 
                         WITH (name NVARCHAR(50) '$.name', value NVARCHAR(100) '$.value')
            ) AS bd
        ) AS bankInfo

        WHERE 
            bankInfo.AccountNumber = @AccountNumber
            AND bankInfo.IfscCode = @IfscCode
            AND (
                @BankName IS NULL
                OR bankInfo.BankName LIKE '%' + @BankName + '%'
            )
    )

    SELECT 
        *
    FROM 
        MatchingAccounts;
END
GO

CREATE PROCEDURE GetIfscCode
    @BankName VARCHAR(255),
    @BranchName VARCHAR(255)
AS
BEGIN
    SELECT IFSC FROM AllBankDetails WHERE BANK LIKE @BankName+'%' AND BRANCH LIKE @BranchName+'%';
END
GO

CREATE PROCEDURE [dbo].[GetInitiatedApplications]
    @UserId INT,
    @PageIndex INT = 0,
    @PageSize INT = 10,
    @IsPaginated BIT = 1,
    @TotalRecords INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Calculate total records before pagination
    SET @TotalRecords = (
        SELECT COUNT(*)
        FROM Citizen_Applications ca
        WHERE ca.Citizen_id = @UserId
        AND ca.Status <> 'Incomplete'
    );

    -- CTE to assign row numbers for pagination
    WITH OrderedApplications AS
    (
        SELECT 
            ca.ReferenceNumber,
            ca.Citizen_id,
            ca.ServiceId,
            ca.DistrictUidForBank,
            ca.FormDetails,
            ca.WorkFlow,
            ca.AdditionalDetails,
            ca.CurrentPlayer,
            ca.Status,
            ca.DataType,
            ca.Created_at,
            ROW_NUMBER() OVER (
                ORDER BY 
                    TRY_CAST(PARSENAME(REPLACE(ca.ReferenceNumber, '/', '.'), 1) AS INT)
            ) AS RowNum
        FROM 
            Citizen_Applications ca
        WHERE 
            ca.Citizen_id = @UserId
            AND ca.Status <> 'Incomplete'
    )

    SELECT 
        oa.ReferenceNumber,
        oa.Citizen_id,
        oa.ServiceId,
        oa.DistrictUidForBank,
        oa.FormDetails,
        oa.WorkFlow,
        oa.AdditionalDetails,
        oa.CurrentPlayer,
        oa.Status,
        oa.DataType,
        oa.Created_at
    FROM 
        OrderedApplications oa
    WHERE 
        (@IsPaginated = 1 AND oa.RowNum BETWEEN (@PageIndex * @PageSize) + 1 AND ((@PageIndex + 1) * @PageSize))
        OR (@IsPaginated = 0)
    ORDER BY 
        oa.RowNum;
END
GO

CREATE PROCEDURE [dbo].[GetLegacyStatusCount]
    @AccessLevel VARCHAR(20),
    @AccessCode INT,
    @ServiceId INT,
    @DivisionCode INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Step 1: Filter and deduplicate applications
    WITH RankedApplications AS (
        SELECT 
            ca.ReferenceNumber,
            ca.Status,
            ROW_NUMBER() OVER (PARTITION BY ca.ReferenceNumber ORDER BY ca.Created_at DESC) AS rn
        FROM [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') 
            WITH (
                name NVARCHAR(50) '$.name',
                value INT '$.value'
            ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE 
            ca.ServiceId = @ServiceId
            AND ca.DataType = 'legacy'
            AND (
                @AccessLevel = 'State'

                OR (
                    @AccessLevel = 'Division'
                    AND jsonLocation.name = 'District'
                    AND EXISTS (
                        SELECT 1 
                        FROM [dbo].[District] d1 
                        WHERE d1.DistrictID = jsonLocation.value 
                            AND d1.Division = @AccessCode
                    )
                )

                OR (
                    @AccessLevel = 'District'
                    AND jsonLocation.name = 'District'
                    AND jsonLocation.value = @AccessCode
                )

                OR (
                    @AccessLevel = 'Tehsil'
                    AND (
                        (jsonLocation.name = 'Tehsil' AND jsonLocation.value = @AccessCode)
                        OR
                        (jsonLocation.name = 'District' 
                            AND EXISTS (
                                SELECT 1 
                                FROM [dbo].[TSWOTehsil] tt
                                WHERE tt.TehsilId = @AccessCode 
                                  AND tt.DistrictId = jsonLocation.value
                            )
                        )
                    )
                )
            )
    ),
    FilteredApplications AS (
        SELECT ReferenceNumber, Status
        FROM RankedApplications
        WHERE rn = 1  -- Take only one row per ReferenceNumber
    )

    -- Step 2: Final Status Summary
    SELECT
        COUNT(*) AS TotalApplications,
        ISNULL(SUM(CASE WHEN LOWER(Status) = 'sanctioned' THEN 1 ELSE 0 END), 0) AS SanctionedCount,
        ISNULL(SUM(CASE WHEN LOWER(Status) = 'rejected' THEN 1 ELSE 0 END), 0) AS RejectCount,
        ISNULL(SUM(CASE 
            WHEN LOWER(Status) NOT IN ('sanctioned', 'rejected') THEN 1 
            ELSE 0 
        END), 0) AS PensionStoppedCount
    FROM FilteredApplications;
END
GO

CREATE PROCEDURE [dbo].[GetOfficerDetails]
    @UserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.UserId,
        u.Name,
        u.Username,
        u.Email,
        u.MobileNumber,
        u.Profile,
        u.UserType,
        u.IsEmailValid,
        u.RegisteredDate,
        
        -- Extracted from JSON stored in AdditionalDetails column
        JSON_VALUE(u.AdditionalDetails, '$.Role') AS Role,
        JSON_VALUE(u.AdditionalDetails, '$.RoleShort') AS RoleShort,
        JSON_VALUE(u.AdditionalDetails, '$.AccessLevel') AS AccessLevel,
         CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessCode') AS INT) AS AccessCode
    FROM 
        [dbo].[Users] u
    WHERE 
        (@UserId IS NULL OR u.UserId = @UserId);
END
GO

CREATE PROCEDURE [dbo].[GetOfficersByAccessLevel]
    @AccessLevel VARCHAR(100),
    @AccessCode INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @AccessLevel ='State'
    BEGIN
        SELECT Name,Username,Email,MobileNumber,JSON_VALUE(AdditionalDetails,'$.Role') AS Designation,JSON_VALUE(AdditionalDetails,'$.AccessLevel') AS AccessLevel,JSON_VALUE(AdditionalDetails,'$.AccessCode') AS AccessCode, JSON_VALUE(AdditionalDetails,'$.Validate') AS IsValidated  FROM Users WHERE UserType = 'Officer';
    END
    ELSE IF @AccessLevel = 'Division'
    BEGIN
        SELECT u.Name,u.Username,u.Email,u.MobileNumber,JSON_VALUE(u.AdditionalDetails,'$.Role') AS Designation,JSON_VALUE(u.AdditionalDetails,'$.AccessLevel') AS AccessLevel,JSON_VALUE(u.AdditionalDetails,'$.AccessCode') AS AccessCode, JSON_VALUE(u.AdditionalDetails,'$.Validate') AS IsValidated
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                AccessLevel VARCHAR(50) '$.AccessLevel',
                AccessCode INT '$.AccessCode'
            ) AS ad
        LEFT JOIN District d ON d.DistrictId = ad.AccessCode AND ad.AccessLevel = 'District'
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.AccessCode AND ad.AccessLevel = 'Tehsil'
        WHERE u.UserType = 'Officer'
          AND (
              (ad.AccessLevel = 'Division' AND ad.AccessCode = @AccessCode)
              OR (ad.AccessLevel = 'District' AND d.Division = @AccessCode)
              OR (ad.AccessLevel = 'Tehsil' AND t.DivisionCode = @AccessCode)
          );
    END
    ELSE IF @AccessLevel = 'District'
    BEGIN
        SELECT u.Name,u.Username,u.Email,u.MobileNumber,JSON_VALUE(u.AdditionalDetails,'$.Role') AS Designation,JSON_VALUE(u.AdditionalDetails,'$.AccessLevel') AS AccessLevel,JSON_VALUE(u.AdditionalDetails,'$.AccessCode') AS AccessCode, JSON_VALUE(u.AdditionalDetails,'$.Validate') AS IsValidated
        FROM Users u
        CROSS APPLY OPENJSON(u.AdditionalDetails) 
            WITH (
                AccessLevel VARCHAR(50) '$.AccessLevel',
                AccessCode INT '$.AccessCode'
            ) AS ad
        LEFT JOIN TSWOTehsil t ON t.TehsilId = ad.AccessCode AND ad.AccessLevel = 'Tehsil'
        WHERE u.UserType = 'Officer'
          AND (
              (ad.AccessLevel = 'District' AND ad.AccessCode = @AccessCode)
              OR (ad.AccessLevel = 'Tehsil' AND t.DistrictId = @AccessCode)
          );
    END
END
GO

CREATE PROCEDURE [dbo].[GetOfficersToValidate]
    @AccessLevel VARCHAR(100),
    @AccessCode INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @AccessLevel = 'State'
    BEGIN
        SELECT 
            [Name],
            Username,
            [Email],
            [MobileNumber],
            JSON_VALUE(AdditionalDetails, '$.Role') AS Designation,
            TRY_CAST(JSON_VALUE(AdditionalDetails, '$.Validate') AS BIT) AS IsValidated
        FROM Users
        WHERE 
            UserType = 'Officer';
    END

    IF @AccessLevel = 'Division'
    BEGIN
        -- Officers at Division level
        SELECT 
            [Name],
            Username,
            [Email],
            [MobileNumber],
            JSON_VALUE(AdditionalDetails, '$.Role') AS Designation,
            TRY_CAST(JSON_VALUE(AdditionalDetails, '$.Validate') AS BIT) AS IsValidated
        FROM Users
        WHERE 
            UserType = 'Officer'
            AND JSON_VALUE(AdditionalDetails, '$.AccessLevel') = 'Division'
            AND TRY_CAST(JSON_VALUE(AdditionalDetails, '$.AccessCode') AS INT) = @AccessCode

        UNION ALL

        -- Officers at District level under this Division
        SELECT 
            u.[Name],
            u.Username,
            u.[Email],
            u.[MobileNumber],
            JSON_VALUE(u.AdditionalDetails, '$.Role') AS Designation,
            TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.Validate') AS BIT) AS IsValidated
        FROM Users u
        INNER JOIN District d ON 
            TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessLevel') AS VARCHAR) = 'District'
            AND TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessCode') AS INT) = d.DistrictID
        WHERE 
            u.UserType = 'Officer'
            AND d.Division = @AccessCode

        UNION ALL

        -- Officers at Tehsil level under this Division
        SELECT 
            u.[Name],
            u.Username,
            u.[Email],
            u.[MobileNumber],
            JSON_VALUE(u.AdditionalDetails, '$.Role') AS Designation,
            TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.Validate') AS BIT) AS IsValidated
        FROM Users u
        INNER JOIN TSWOTehsil t ON 
            TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessLevel') AS VARCHAR) = 'Tehsil'
            AND TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessCode') AS INT) = t.TehsilId
        WHERE 
            u.UserType = 'Officer'
            AND t.divisionCode = @AccessCode;
    END

    IF @AccessLevel = 'District'
    BEGIN
        -- Officers at District level
        SELECT 
            [Name],
            Username,
            [Email],
            [MobileNumber],
            JSON_VALUE(AdditionalDetails, '$.Role') AS Designation,
            TRY_CAST(JSON_VALUE(AdditionalDetails, '$.Validate') AS BIT) AS IsValidated
        FROM Users
        WHERE 
            UserType = 'Officer'
            AND JSON_VALUE(AdditionalDetails, '$.AccessLevel') = 'District'
            AND TRY_CAST(JSON_VALUE(AdditionalDetails, '$.AccessCode') AS INT) = @AccessCode

        UNION ALL

        -- Officers at Tehsil level under this District
        SELECT 
            u.[Name],
            u.Username,
            u.[Email],
            u.[MobileNumber],
            JSON_VALUE(u.AdditionalDetails, '$.Role') AS Designation,
            TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.Validate') AS BIT) AS IsValidated
        FROM Users u
        INNER JOIN TSWOTehsil t ON 
            TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessLevel') AS VARCHAR) = 'Tehsil'
            AND TRY_CAST(JSON_VALUE(u.AdditionalDetails, '$.AccessCode') AS INT) = t.TehsilId
        WHERE 
            u.UserType = 'Officer'
            AND t.DistrictID = @AccessCode;
    END
END
GO

CREATE PROCEDURE [dbo].[GetRecordsForBankFile]
    @AccessCode INT,
    @ApplicationStatus VARCHAR(50) = NULL,
    @ServiceId INT,
    @Month INT,
    @Year INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Compute the last day of the provided month and year
    DECLARE @LastDayOfMonth DATETIME;
    SET @LastDayOfMonth = EOMONTH(DATEFROMPARTS(@Year, @Month, 1));

    SELECT
        ca.ReferenceNumber,
        MAX(ca.Citizen_id) AS Citizen_id,
        MAX(ca.ServiceId) AS ServiceId,
        MAX(ca.DistrictUidForBank) AS DistrictUidForBank,
        MAX(ca.FormDetails) AS FormDetails,
        MAX(ca.WorkFlow) AS WorkFlow,
        MAX(ca.AdditionalDetails) AS AdditionalDetails,
        MAX(ca.CurrentPlayer) AS CurrentPlayer,
        MAX(ca.[Status]) AS [Status],
        MAX(ca.Created_at) AS Created_at
    FROM
        [dbo].[Citizen_Applications] ca
    CROSS APPLY
        OPENJSON(ca.WorkFlow) AS wf
    OUTER APPLY
        OPENJSON(ca.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
    OUTER APPLY
        (SELECT 
            TRY_CAST(JSON_VALUE(wf.value, '$.completedAt') AS DATETIME) AS CompletedAtDate,
            JSON_VALUE(wf.value, '$.status') AS StatusValue
        ) AS wfParsed
    WHERE
        ca.ServiceId = @ServiceId
        AND (
            (jsonLocation.name = 'District' AND jsonLocation.value = @AccessCode)
            OR (jsonLocation.name = 'Tehsil' AND jsonLocation.value = @AccessCode)
        )
        AND (
            @ApplicationStatus = 'Total Applications' 
            OR wfParsed.StatusValue = @ApplicationStatus
        )
        AND wfParsed.StatusValue <> ''
        AND (
            wfParsed.CompletedAtDate IS NULL OR wfParsed.CompletedAtDate <= @LastDayOfMonth
        )
    GROUP BY
        ca.ReferenceNumber;
END
GO

CREATE PROCEDURE [dbo].[GetRecordsForBankFile_New]
    @AccessCode INT,
    @ApplicationStatus VARCHAR(50) = NULL,
    @ServiceId INT,
    @Month INT,
    @Year INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Variable declarations (unchanged)
    DECLARE @StartOfMonth DATETIME = DATEFROMPARTS(@Year, @Month, 1);
    DECLARE @LastDayOfMonth DATETIME = EOMONTH(@StartOfMonth);
    DECLARE @monthAbbr VARCHAR(3) = UPPER(FORMAT(@StartOfMonth, 'MMM'));
    DECLARE @yearAbbr VARCHAR(2) = RIGHT(CAST(@Year AS VARCHAR), 2);

    DECLARE @districtShort VARCHAR(10), @division VARCHAR(10);
    SELECT @districtShort = DistrictShort,
           @division = CASE WHEN Division = 1 THEN 'Jammu' WHEN Division = 2 THEN 'Kashmir' ELSE NULL END
    FROM District
    WHERE DistrictId = @AccessCode;

    IF @districtShort IS NULL OR @division IS NULL
    BEGIN
        RAISERROR('Invalid District or Division for AccessCode %d.', 16, 1, @AccessCode);
        RETURN;
    END

    DECLARE @bankDetails NVARCHAR(MAX), @department NVARCHAR(100);
    SELECT @bankDetails = BankDetails, @department = Department
    FROM Services
    WHERE ServiceId = @ServiceId;

    IF @bankDetails IS NULL OR ISJSON(@bankDetails) = 0
    BEGIN
        RAISERROR('Invalid Service or BankDetails JSON for ServiceId %d.', 16, 1, @ServiceId);
        RETURN;
    END;

    DECLARE @payingBankAccountNumber NVARCHAR(50) = JSON_VALUE(@bankDetails, CONCAT('$.', @division, '.AccountNumber'));
    DECLARE @payingBankIfscCode NVARCHAR(20) = JSON_VALUE(@bankDetails, CONCAT('$.', @division, '.IfscCode'));
    DECLARE @payingBankName NVARCHAR(100) = JSON_VALUE(@bankDetails, CONCAT('$.', @division, '.BankName'));

    IF @payingBankAccountNumber IS NULL OR @payingBankIfscCode IS NULL OR @payingBankName IS NULL
    BEGIN
        RAISERROR('Missing bank details for division %s in ServiceId %d.', 16, 1, @division, @ServiceId);
        RETURN;
    END;

    -- Validate FormDetails and Bank Details
    IF EXISTS (
        SELECT 1 
        FROM Citizen_Applications ca
        WHERE ca.ServiceId = @ServiceId 
          AND (ISJSON(ca.FormDetails) = 0 OR ca.FormDetails IS NULL)
    )
    BEGIN
        RAISERROR('Invalid or missing JSON in FormDetails for ServiceId %d.', 16, 1, @ServiceId);
        RETURN;
    END;

    -- IF EXISTS (
    --     SELECT 1 
    --     FROM Citizen_Applications ca
    --     WHERE ca.ServiceId = @ServiceId 
    --       AND JSON_VALUE(ca.FormDetails, '$.Bank Details') IS NULL
    -- )
    -- BEGIN
    --     RAISERROR('Missing Bank Details section in some records for ServiceId %d.', 16, 1, @ServiceId);
    --     RETURN;
    -- END;

    -- CTEs to parse JSON
    WITH FormDetailsParsed AS (
        SELECT 
            ca.ReferenceNumber,
            ca.DistrictUidForBank,
            ca.CurrentPlayer,
            ca.WorkFlow,
            ca.FormDetails,
            MAX(CASE WHEN fields.name = 'ApplicantName' THEN fields.value END) AS applicantName,
            MAX(CASE WHEN fields.name = 'IfscCode' THEN fields.value END) AS receivingIfscCode,
            MAX(CASE WHEN fields.name = 'AccountNumber' THEN fields.value END) AS receivingAccountNumber,
            MAX(CASE WHEN fields.name = 'PensionType' THEN fields.value END) AS pensionType
        FROM Citizen_Applications ca
        CROSS APPLY OPENJSON(ca.FormDetails) AS section
        CROSS APPLY OPENJSON(section.value) WITH (
            name NVARCHAR(100) '$.name',
            value NVARCHAR(MAX) '$.value'
        ) AS fields
        WHERE ca.ServiceId = @ServiceId
          AND ISJSON(ca.FormDetails) = 1
        GROUP BY ca.ReferenceNumber, ca.DistrictUidForBank, ca.CurrentPlayer, ca.WorkFlow, ca.FormDetails
    ),
    WorkflowParsed AS (
        SELECT 
            ca.ReferenceNumber,
            JSON_VALUE(ca.WorkFlow, CONCAT('$[', TRY_CAST(LTRIM(RTRIM(ca.CurrentPlayer)) AS INT), '].status')) AS StatusValue,
            TRY_CAST(JSON_VALUE(ca.WorkFlow, CONCAT('$[', TRY_CAST(LTRIM(RTRIM(ca.CurrentPlayer)) AS INT), '].completedAt')) AS DATETIME) AS CompletedAtDate
        FROM Citizen_Applications ca
        WHERE ca.ServiceId = @ServiceId
          AND ISJSON(ca.WorkFlow) = 1
          AND TRY_CAST(LTRIM(RTRIM(ca.CurrentPlayer)) AS INT) IS NOT NULL
    )
    SELECT
        fdp.ReferenceNumber,
        CONCAT(@districtShort, @monthAbbr, @yearAbbr, '00', RIGHT(CONCAT('00000000', ISNULL(fdp.DistrictUidForBank, '')), 8)) AS districtbankuid,
        @department AS department,
        @payingBankAccountNumber AS payingBankAccountNumber,
        @payingBankIfscCode AS payingBankIfscCode,
        @payingBankName AS payingBankName,
        GETDATE() AS fileGenerationDate,
        1000 AS amount,
        fdp.applicantName,
        fdp.receivingIfscCode,
        fdp.receivingAccountNumber,
        fdp.pensionType,
        CASE WHEN TRY_CAST(LTRIM(RTRIM(fdp.CurrentPlayer)) AS INT) IS NOT NULL 
             THEN JSON_VALUE(fdp.WorkFlow, CONCAT('$[', TRY_CAST(LTRIM(RTRIM(fdp.CurrentPlayer)) AS INT), '].completedAt'))
             ELSE NULL
        END AS sanctionedon
    FROM FormDetailsParsed fdp
    INNER JOIN WorkflowParsed wp ON fdp.ReferenceNumber = wp.ReferenceNumber
    CROSS APPLY OPENJSON(fdp.FormDetails, '$.Location') WITH (
        name NVARCHAR(50) '$.name',
        value INT '$.value'
    ) AS jsonLocation
    WHERE jsonLocation.name = 'District' AND jsonLocation.value = @AccessCode
      AND (@ApplicationStatus = 'Total Applications' OR wp.StatusValue = @ApplicationStatus)
      AND wp.StatusValue IS NOT NULL
      AND wp.CompletedAtDate BETWEEN @StartOfMonth AND @LastDayOfMonth;
END
GO

CREATE PROCEDURE [dbo].[GetServicesByRole]
    @Role VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        s.ServiceId,
        s.ServiceName
    FROM 
        [dbo].[Services] s
    CROSS APPLY 
        OPENJSON(s.OfficerEditableField) WITH (
            designation NVARCHAR(255) '$.designation'
        ) AS jsonValues
    WHERE 
        jsonValues.designation = @Role
        AND s.Active = 1;
END
GO

CREATE PROCEDURE [dbo].[GetShiftedApplications]
    @Role VARCHAR(255),
    @AccessLevel VARCHAR(20), -- Optional now, but keeping for signature consistency
    @AccessCode INT,          -- Optional now
    @ServiceId INT
AS
BEGIN
    SET NOCOUNT ON;

    WITH RankedStatus AS (
        SELECT
            ca.ReferenceNumber,
            ca.Citizen_id,
            ca.ServiceId,
            ca.DistrictUidForBank,
            ca.FormDetails,
            ca.WorkFlow,
            ca.AdditionalDetails,
            ca.CurrentPlayer,
            ca.[Status],
            ca.Created_at,
            jsonWorkFlow.status AS workflow_status,
            jsonWorkFlow.designation,
            jsonWorkFlow.shifted,
            jsonWorkFlow.shiftedFrom,
            ROW_NUMBER() OVER (
                PARTITION BY ca.ReferenceNumber 
                ORDER BY 
                    CASE WHEN jsonWorkFlow.shifted = 1 THEN 0 ELSE 1 END,
                    jsonWorkFlow.playerId DESC
            ) AS rn
        FROM 
            [dbo].[Citizen_Applications] ca
        CROSS APPLY
            OPENJSON(ca.WorkFlow) WITH (
                status NVARCHAR(50) '$.status',
                designation NVARCHAR(50) '$.designation',
                playerId INT '$.playerId',
                shifted BIT '$.shifted',
                shiftedFrom INT '$.shiftedFrom'
            ) AS jsonWorkFlow
        WHERE
            jsonWorkFlow.designation = @Role
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
            AND jsonWorkFlow.shifted = 1
            AND jsonWorkFlow.shiftedFrom = @AccessCode
    )
    SELECT
        rs.ReferenceNumber,
        MAX(rs.Citizen_id) AS Citizen_id,
        MAX(rs.ServiceId) AS ServiceId,
        MAX(rs.DistrictUidForBank) AS DistrictUidForBank,
        MAX(rs.FormDetails) AS FormDetails,
        MAX(rs.WorkFlow) AS WorkFlow,
        MAX(rs.AdditionalDetails) AS AdditionalDetails,
        MAX(rs.CurrentPlayer) AS CurrentPlayer,
        MAX(rs.[Status]) AS [Status],
        MAX(rs.Created_at) AS Created_at
    FROM
        RankedStatus rs
    WHERE
        rs.rn = 1
    GROUP BY
        rs.ReferenceNumber;
END
GO

CREATE PROCEDURE [dbo].[GetShiftedCount]
    @AccessLevel VARCHAR(20),
    @AccessCode INT,
    @ServiceId INT,
    @TakenBy VARCHAR(50),
    @DivisionCode INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    WITH RankedStatus AS (
        SELECT 
            ca.ReferenceNumber,
            ca.ServiceId,
            ca.FormDetails,
            jsonWorkFlow.status,
            jsonWorkFlow.designation,
            jsonWorkFlow.shifted,
            jsonWorkFlow.shiftedFrom,
            ROW_NUMBER() OVER (
                PARTITION BY ca.ReferenceNumber 
                ORDER BY 
                    CASE WHEN jsonWorkFlow.shifted = 1 THEN 0 ELSE 1 END,  -- Prioritize shifted = true
                    jsonWorkFlow.playerId DESC
            ) AS rn
        FROM 
            [dbo].[Citizen_Applications] ca
        CROSS APPLY
            OPENJSON(ca.WorkFlow) WITH (
                status NVARCHAR(50) '$.status',
                designation NVARCHAR(50) '$.designation',
                playerId INT '$.playerId',
                shifted BIT '$.shifted',
                shiftedFrom INT '$.shiftedFrom'
            ) AS jsonWorkFlow
        WHERE
            jsonWorkFlow.designation = @TakenBy
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
    ),
    LatestStatus AS (
        SELECT 
            ReferenceNumber,
            ServiceId,
            FormDetails,
            status,
            shifted,
            shiftedFrom
        FROM 
            RankedStatus
        WHERE 
            rn = 1
    ),
    FilteredApplications AS (
        SELECT 
            ls.ReferenceNumber,
            ls.ServiceId,
            ls.status,
            ls.shifted,
            ls.shiftedFrom
        FROM 
            LatestStatus ls
        CROSS APPLY
            OPENJSON(ls.FormDetails, '$.Location') WITH (
                name NVARCHAR(50) '$.name',
                value INT '$.value'
            ) AS jsonLocation
        LEFT JOIN
            [dbo].[District] d ON jsonLocation.name = 'District' AND jsonLocation.value = d.DistrictID
        WHERE
            ls.ServiceId = @ServiceId
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' AND jsonLocation.name = 'District')  -- No comparison with @AccessCode
                OR (@AccessLevel = 'Tehsil' AND jsonLocation.name = 'Tehsil')
                OR (
                    @AccessLevel = 'Division' AND (
                        (jsonLocation.name = 'District' AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' AND EXISTS (
                            SELECT 1 FROM Tehsil t
                            INNER JOIN District d2 ON t.DistrictID = d2.DistrictID
                            WHERE t.TehsilID = jsonLocation.value AND d2.Division = @DivisionCode
                        ))
                    )
                )
            )
        GROUP BY ls.ReferenceNumber, ls.ServiceId, ls.status, ls.shifted, ls.shiftedFrom
    )
    SELECT
        ISNULL(SUM(CASE WHEN fa.shifted = 1 AND fa.shiftedFrom = @AccessCode THEN 1 ELSE 0 END), 0) AS ShiftedCount
    FROM
        FilteredApplications fa;
END
GO

CREATE PROCEDURE [dbo].[GetStatusCount]
    @AccessLevel VARCHAR(20),
    @AccessCode INT,
    @ServiceId INT,
    @TakenBy VARCHAR(50),
    @DivisionCode INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- ======== Main Applications Section ========
    -- Retrieve the latest status for each application
    WITH RankedStatus AS (
        SELECT 
            ca.ReferenceNumber,
            ca.ServiceId,
            ca.FormDetails,
            jsonWorkFlow.status,
            jsonWorkFlow.designation,
            ROW_NUMBER() OVER (
                PARTITION BY ca.ReferenceNumber 
                ORDER BY COALESCE(jsonWorkFlow.timestamp, '9999-12-31') DESC, jsonWorkFlow.seq DESC
            ) AS rn
        FROM [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            timestamp DATETIME '$.timestamp',
            seq INT '$.seq',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonWorkFlow
        WHERE 
            jsonWorkFlow.status IS NOT NULL 
            AND jsonWorkFlow.status <> ''
            AND jsonWorkFlow.designation = @TakenBy
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
            AND ca.DataType != 'legacy'
    ),
    LatestStatus AS (
        SELECT 
            ReferenceNumber, 
            ServiceId, 
            FormDetails, 
            status
        FROM RankedStatus
        WHERE rn = 1
    ),
    FilteredApplications AS (
        SELECT 
            ls.ReferenceNumber,
            ls.ServiceId,
            ls.status,
            CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM [dbo].[Corrigendum] c 
                    WHERE c.ReferenceNumber = ls.ReferenceNumber 
                        AND c.Type = 'Corrigendum'
                ) THEN 1 
                ELSE 0 
            END AS HasCorrigendum
        FROM LatestStatus ls
        CROSS APPLY OPENJSON(ls.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE ls.ServiceId = @ServiceId
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM Tehsil t
                                INNER JOIN District d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            ))
                    )
                )
            )
    ),
    -- ======== Forwarded by TakenBy and Sanctioned Applications ========
    ForwardedSanctioned AS (
        SELECT DISTINCT
            ca.ReferenceNumber
        FROM [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonWorkFlow
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE 
            jsonWorkFlow.status = 'forwarded'
            AND jsonWorkFlow.designation = @TakenBy
            AND ca.Status = 'sanctioned'
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
            AND ca.DataType != 'legacy'
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM Tehsil t
                                INNER JOIN District d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            ))
                    )
                )
            )
    ),
    -- ======== Forwarded by TakenBy and Sanctioned Corrigendum ========
    ForwardedSanctionedCorrigendum AS (
        SELECT DISTINCT
            c.CorrigendumId
        FROM [dbo].[Corrigendum] c
        INNER JOIN [dbo].[Citizen_Applications] ca 
            ON ca.ReferenceNumber = c.ReferenceNumber
        CROSS APPLY OPENJSON(c.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonWorkFlow
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE 
            jsonWorkFlow.status = 'forwarded'
            AND jsonWorkFlow.designation = @TakenBy
            AND c.Status = 'sanctioned'
            AND c.Type = 'Corrigendum'
            AND ca.ServiceId = @ServiceId
            AND ISJSON(c.WorkFlow) = 1
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM Tehsil t
                                INNER JOIN District d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            ))
                    )
                )
            )
    ),
    -- ======== Forwarded by TakenBy and Verified Correction ========
    ForwardedVerifiedCorrection AS (
        SELECT DISTINCT
            c.CorrigendumId
        FROM [dbo].[Corrigendum] c
        INNER JOIN [dbo].[Citizen_Applications] ca 
            ON ca.ReferenceNumber = c.ReferenceNumber
        CROSS APPLY OPENJSON(c.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonWorkFlow
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE 
            jsonWorkFlow.status = 'forwarded'
            AND jsonWorkFlow.designation = @TakenBy
            AND c.Status = 'verified'
            AND c.Type = 'Correction'
            AND ca.ServiceId = @ServiceId
            AND ISJSON(c.WorkFlow) = 1
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM Tehsil t
                                INNER JOIN District d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            ))
                    )
                )
            )
    ),
    -- ======== Corrigendum and Correction Section ========
    CorrigendumStatus AS (
        SELECT 
            c.CorrigendumId,
            c.ReferenceNumber,
            c.Type,
            jsonCorr.status,
            jsonCorr.designation,
            ca.FormDetails,
            ROW_NUMBER() OVER (
                PARTITION BY c.CorrigendumId 
                ORDER BY COALESCE(jsonCorr.timestamp, '9999-12-31') DESC, jsonCorr.seq DESC
            ) AS rn
        FROM [dbo].[Corrigendum] c
        INNER JOIN [dbo].[Citizen_Applications] ca 
            ON ca.ReferenceNumber = c.ReferenceNumber
        CROSS APPLY OPENJSON(c.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            timestamp DATETIME '$.timestamp',
            seq INT '$.seq',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonCorr
        WHERE 
            jsonCorr.status IS NOT NULL 
            AND jsonCorr.status <> ''
            AND jsonCorr.designation = @TakenBy
            AND ISJSON(c.WorkFlow) = 1
            AND ca.ServiceId = @ServiceId
    ),
    LatestCorrigendumStatus AS (
        SELECT 
            CorrigendumId, 
            ReferenceNumber, 
            Type, 
            FormDetails, 
            status
        FROM CorrigendumStatus
        WHERE rn = 1
    ),
    FilteredCorrigendum AS (
        SELECT 
            lcs.CorrigendumId,
            lcs.ReferenceNumber,
            lcs.Type,
            lcs.status
        FROM LatestCorrigendumStatus lcs
        CROSS APPLY OPENJSON(lcs.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE
            (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM Tehsil t
                                INNER JOIN District d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            ))
                    )
                )
            )
    ),
    -- ======== Withheld Applications Section ========
    RankedWithheld AS (
        SELECT 
            wa.ReferenceNumber,
            wa.WithheldType,
            ROW_NUMBER() OVER (
                PARTITION BY wa.ReferenceNumber 
                ORDER BY wa.WithheldOn DESC, wa.Withheld_Id DESC
            ) AS rn
        FROM [dbo].[Withheld_Applications] wa
        WHERE 
            wa.IsWithheld = 1
            AND wa.ServiceId = @ServiceId
    ),
    LatestWithheld AS (
        SELECT 
            ReferenceNumber, 
            WithheldType
        FROM RankedWithheld
        WHERE rn = 1
    ),
    FilteredWithheld AS (
        SELECT 
            lw.ReferenceNumber,
            lw.WithheldType
        FROM LatestWithheld lw
        INNER JOIN [dbo].[Citizen_Applications] ca 
            ON ca.ReferenceNumber = lw.ReferenceNumber
        CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE 
            ca.ServiceId = @ServiceId
            AND ISJSON(ca.FormDetails) = 1
            AND ca.DataType != 'legacy'
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM Tehsil t
                                INNER JOIN District d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            ))
                    )
                )
            )
    )

    -- ======== Final SELECT ========
    SELECT
        -- Main application status counts
        ISNULL(SUM(CASE WHEN fa.status = 'pending' THEN 1 ELSE 0 END), 0) AS PendingCount,
        ISNULL(SUM(CASE WHEN fa.status = 'forwarded' THEN 1 ELSE 0 END), 0) AS ForwardedCount,
        ISNULL(SUM(CASE WHEN fa.status = 'returned' THEN 1 ELSE 0 END), 0) AS ReturnedCount,
        ISNULL(SUM(CASE WHEN fa.status = 'returntoedit' THEN 1 ELSE 0 END), 0) AS ReturnToEditCount,
        ISNULL(SUM(CASE WHEN fa.status = 'sanctioned' THEN 1 ELSE 0 END), 0) AS SanctionedCount,
        ISNULL(SUM(CASE WHEN fa.status = 'rejected' THEN 1 ELSE 0 END), 0) AS RejectCount,
        ISNULL(SUM(CASE WHEN fa.status = 'disbursed' THEN 1 ELSE 0 END), 0) AS DisbursedCount,
        COUNT(DISTINCT fa.ReferenceNumber) AS TotalApplications,
        -- Forwarded and Sanctioned counts
        ISNULL((SELECT COUNT(*) FROM ForwardedSanctioned), 0) AS ForwardedSanctionedCount,
        ISNULL((SELECT COUNT(*) FROM ForwardedSanctionedCorrigendum), 0) AS ForwardedSanctionedCorrigendumCount,
        ISNULL((SELECT COUNT(*) FROM ForwardedVerifiedCorrection), 0) AS ForwardedVerifiedCorrectionCount,
        -- Corrigendum counts by status
        ISNULL(SUM(CASE WHEN fc.status = 'pending' AND fc.Type = 'Corrigendum' THEN 1 ELSE 0 END), 0) AS CorrigendumPendingCount,
        ISNULL(SUM(CASE WHEN fc.status = 'forwarded' AND fc.Type = 'Corrigendum' THEN 1 ELSE 0 END), 0) AS CorrigendumForwardedCount,
        ISNULL(SUM(CASE WHEN fc.status = 'returned' AND fc.Type = 'Corrigendum' THEN 1 ELSE 0 END), 0) AS CorrigendumReturnedCount,
        ISNULL(SUM(CASE WHEN fc.status = 'sanctioned' AND fc.Type = 'Corrigendum' THEN 1 ELSE 0 END), 0) AS CorrigendumSanctionedCount,
        ISNULL(SUM(CASE WHEN fc.status = 'rejected' AND fc.Type = 'Corrigendum' THEN 1 ELSE 0 END), 0) AS CorrigendumRejectedCount,
        ISNULL(SUM(CASE WHEN fc.Type = 'Corrigendum' THEN 1 ELSE 0 END), 0) AS CorrigendumCount,
        -- Correction counts by status
        ISNULL(SUM(CASE WHEN fc.status = 'pending' AND fc.Type = 'Correction' THEN 1 ELSE 0 END), 0) AS CorrectionPendingCount,
        ISNULL(SUM(CASE WHEN fc.status = 'forwarded' AND fc.Type = 'Correction' THEN 1 ELSE 0 END), 0) AS CorrectionForwardedCount,
        ISNULL(SUM(CASE WHEN fc.status = 'returned' AND fc.Type = 'Correction' THEN 1 ELSE 0 END), 0) AS CorrectionReturnedCount,
        ISNULL(SUM(CASE WHEN fc.status = 'verified' AND fc.Type = 'Correction' THEN 1 ELSE 0 END), 0) AS CorrectionSanctionedCount,
        ISNULL(SUM(CASE WHEN fc.status = 'rejected' AND fc.Type = 'Correction' THEN 1 ELSE 0 END), 0) AS CorrectionRejectedCount,
        ISNULL(SUM(CASE WHEN fc.Type = 'Correction' THEN 1 ELSE 0 END), 0) AS CorrectionCount,
        -- Withheld applications counts
        ISNULL(COUNT(DISTINCT fw.ReferenceNumber), 0) AS TotalWithheldCount,
        ISNULL(SUM(CASE WHEN fw.WithheldType = 'TEMPORARY' THEN 1 ELSE 0 END), 0) AS TemporaryWithheldCount,
        ISNULL(SUM(CASE WHEN fw.WithheldType = 'PERMANENT' THEN 1 ELSE 0 END), 0) AS PermanentWithheldCount
    FROM 
        FilteredApplications fa
        LEFT JOIN 
        FilteredCorrigendum fc 
        ON fa.ReferenceNumber = fc.ReferenceNumber
        LEFT JOIN 
        FilteredWithheld fw 
        ON fa.ReferenceNumber = fw.ReferenceNumber;
END
GO

CREATE PROCEDURE [dbo].[GetTemporaryDisabilityCount]
    @AccessLevel VARCHAR(20),
    @AccessCode INT,
    @ServiceId INT,
    @TakenBy VARCHAR(50),
    @DivisionCode INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- ======== Final SELECT with Both Counts ========
    WITH RankedStatus AS (
        SELECT 
            ca.ReferenceNumber,
            ca.ServiceId,
            ca.FormDetails,
            jsonWorkFlow.status,
            ROW_NUMBER() OVER (
                PARTITION BY ca.ReferenceNumber 
                ORDER BY COALESCE(jsonWorkFlow.timestamp, '9999-12-31') DESC, jsonWorkFlow.seq DESC
            ) AS rn
        FROM [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            timestamp DATETIME '$.timestamp',
            seq INT '$.seq'
        ) AS jsonWorkFlow
        WHERE 
            jsonWorkFlow.status IS NOT NULL 
            AND jsonWorkFlow.status <> ''
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
    ),
    LatestStatus AS (
        SELECT 
            ReferenceNumber, 
            ServiceId, 
            FormDetails, 
            status
        FROM RankedStatus
        WHERE rn = 1
    )
    SELECT
        ISNULL(SUM(CASE WHEN fa.TemporaryDisabilityExpiringSoon = 1 THEN 1 ELSE 0 END), 0) AS TemporaryDisabilityExpiringSoonCount,
        ISNULL(SUM(CASE WHEN fa.IsPhysicallyChallenged = 1 THEN 1 ELSE 0 END), 0) AS TotalPhysicallyChallengedApplications
    FROM (
        SELECT 
            ls.ReferenceNumber,
            ls.ServiceId,
            ls.FormDetails,
            ls.status,
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM OPENJSON(ls.FormDetails, '$."Pension Type"') WITH (
                        value NVARCHAR(100) '$.value',
                        additionalFields NVARCHAR(MAX) '$.additionalFields' AS JSON
                    ) AS pension
                    CROSS APPLY OPENJSON(pension.additionalFields) WITH (
                        name NVARCHAR(100) '$.name',
                        value NVARCHAR(100) '$.value',
                        additionalFields NVARCHAR(MAX) '$.additionalFields' AS JSON
                    ) AS disability
                    CROSS APPLY OPENJSON(disability.additionalFields) WITH (
                        name NVARCHAR(100) '$.name',
                        value NVARCHAR(100) '$.value'
                    ) AS tempDisability
                    WHERE pension.value = 'PHYSICALLY CHALLENGED PERSON'
                        AND disability.name = 'KindOfDisability'
                        AND disability.value = 'TEMPORARY'
                        AND tempDisability.name = 'IfTemporaryDisabilityUdidCardValidUpto'
                        AND tempDisability.value IS NOT NULL
                        AND TRY_CONVERT(DATE, tempDisability.value) IS NOT NULL
                        AND DATEDIFF(MONTH, GETDATE(), TRY_CONVERT(DATE, tempDisability.value)) BETWEEN 0 AND 3
                ) THEN 1
                ELSE 0
            END AS TemporaryDisabilityExpiringSoon,
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM OPENJSON(ls.FormDetails, '$."Pension Type"') WITH (
                        value NVARCHAR(100) '$.value'
                    ) AS pension
                    WHERE pension.value = 'PHYSICALLY CHALLENGED PERSON'
                ) THEN 1
                ELSE 0
            END AS IsPhysicallyChallenged
        FROM LatestStatus ls
        CROSS APPLY OPENJSON(ls.FormDetails, '$.Location') WITH (
            name NVARCHAR(50) '$.name',
            value INT '$.value'
        ) AS jsonLocation
        LEFT JOIN [dbo].[District] d 
            ON jsonLocation.name = 'District' 
            AND jsonLocation.value = d.DistrictID
        WHERE ls.ServiceId = @ServiceId
            AND (
                @AccessLevel = 'State'
                OR (@AccessLevel = 'District' 
                    AND jsonLocation.name = 'District' 
                    AND jsonLocation.value = @AccessCode)
                OR (@AccessLevel = 'Tehsil' 
                    AND jsonLocation.name = 'Tehsil' 
                    AND jsonLocation.value = @AccessCode)
                OR (
                    @AccessLevel = 'Division' 
                    AND (
                        (jsonLocation.name = 'District' 
                            AND jsonLocation.value = @AccessCode 
                            AND d.Division = @DivisionCode)
                        OR
                        (jsonLocation.name = 'Tehsil' 
                            AND EXISTS (
                                SELECT 1 
                                FROM [dbo].[Tehsil] t
                                INNER JOIN [dbo].[District] d2 
                                    ON t.DistrictID = d2.DistrictID
                                WHERE t.TehsilID = jsonLocation.value 
                                    AND d2.Division = @DivisionCode
                            )
                        )
                    )
                )
            )
    ) fa;
END
GO

CREATE PROCEDURE [dbo].[InsertOfficerDetail]
    @OfficerId INT,
    @Role VARCHAR(50),
    @AccessLevel VARCHAR(20),
    @AccessCode INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO OfficerDetails (OfficerId, [Role], AccessLevel, AccessCode)
    VALUES (@OfficerId, @Role, @AccessLevel, @AccessCode);

    -- Return the ID of the newly inserted record
    SELECT SCOPE_IDENTITY() AS NewDetailId;
END
GO

CREATE PROCEDURE [dbo].[RegisterUser]
    @Name VARCHAR(100),
    @Username NVARCHAR(100),
    @Password NVARCHAR(100),
    @Email NVARCHAR(100),
    @MobileNumber NVARCHAR(20),
    @Profile VARCHAR(100),
    @UserType NVARCHAR(50),
    @BackupCodes NVARCHAR(MAX),
    @AddtionalDetails VARCHAR(255),
    @RegisteredDate NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    -- Hash the password (example using a simple SHA-256 hash; adjust as needed)
    DECLARE @HashedPassword VARBINARY(64); -- Adjust size as needed for SHA-256
    SET @HashedPassword = HASHBYTES('SHA2_256', @Password);

    -- Insert the user record into the Users table
    INSERT INTO Users ([Name],Username, [Password], Email, MobileNumber, [Profile], UserType, BackupCodes,AdditionalDetails,RegisteredDate)
    VALUES (@Name,@Username, @HashedPassword, @Email, @MobileNumber, @Profile, @UserType, @BackupCodes,@AddtionalDetails,@RegisteredDate);

        -- Return a success result with the new UserId (assuming UserId is auto-incremented)
    SELECT * FROM Users WHERE UserId = SCOPE_IDENTITY();
   
END
GO

CREATE PROCEDURE [ResetUserPassword]
    @Email NVARCHAR(100),
    @NewPassword NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables
    DECLARE @HashedPassword VARBINARY(64); -- SHA-256 hash size
    DECLARE @UserExists INT;

    -- Check if the email exists
    SELECT @UserExists = COUNT(*) FROM Users WHERE Email = @Email;

    IF @UserExists = 0
    BEGIN
        -- Return error if email not found
        SELECT 
            Result = 0,
            Message = 'No account found with this email.',
            UserId = CAST(0 AS INT);
        RETURN;
    END

    -- Hash the new password using SHA-256
    SET @HashedPassword = HASHBYTES('SHA2_256', @NewPassword);

    -- Update the user's password
    UPDATE Users
    SET [Password] = @HashedPassword
    WHERE Email = @Email;

    -- Return success result with UserId
    SELECT 
        Result = 1,
        Message = 'Password reset successfully.',
        UserId = UserId
    FROM Users 
    WHERE Email = @Email;
END
GO

CREATE PROCEDURE UpdateNullOfficer
    @NewOfficerId INT,
    @AccessLevel VARCHAR(10),
    @AccessCode INT,
    @Role VARCHAR(50)
AS
BEGIN
    -- Update ApplicationsHistory to assign a value to NULL OfficerId
    UPDATE ApplicationsHistory
    SET TakenBy = @NewOfficerId
    WHERE TakenBy IS NULL
    AND AccessLevel = @AccessLevel
    AND AccessCode = @AccessCode
    AND Role = @Role;

    -- Update ApplicationsStatus to assign a value to NULL OfficerId
    UPDATE ApplicationStatus
    SET CurrentlyWith = @NewOfficerId
    WHERE CurrentlyWith IS NULL
    AND AccessLevel = @AccessLevel
    AND AccessCode = @AccessCode
    AND Role = @Role;

    -- Update ApplicationsCount to assign a value to NULL OfficerId
    UPDATE ApplicationsCount
    SET OfficerId = @NewOfficerId
    WHERE OfficerId IS NULL
    AND AccessLevel = @AccessLevel
    AND AccessCode = @AccessCode
    AND Role = @Role;
END
GO

CREATE PROCEDURE [dbo].[UpdateWorkflowForService]
    @ServiceId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE ca
    SET ca.WorkFlow = (
        SELECT JSON_QUERY((
            SELECT 
                JSON_VALUE(oef.value, '$.designation') AS designation,
                COALESCE(JSON_VALUE(wf.value, '$.status'), '') AS status,
                JSON_VALUE(wf.value, '$.completedAt') AS completedAt,
                COALESCE(JSON_VALUE(wf.value, '$.remarks'), '') AS remarks,
                JSON_VALUE(oef.value, '$.playerId') AS playerId,
                JSON_VALUE(oef.value, '$.prevPlayerId') AS prevPlayerId,
                JSON_VALUE(oef.value, '$.nextPlayerId') AS nextPlayerId,
                JSON_VALUE(oef.value, '$.canPull') AS canPull
            FROM OPENJSON(s.OfficerEditableField) oef
            LEFT JOIN OPENJSON(ca.WorkFlow) wf
                ON JSON_VALUE(oef.value, '$.designation') = JSON_VALUE(wf.value, '$.designation')
            FOR JSON PATH
        ))
    )
    FROM Citizen_Applications ca
    JOIN Services s ON ca.ServiceId = s.ServiceId
    WHERE ca.ServiceId = @ServiceId
    AND ca.[Status] NOT IN ('Sanctioned', 'Rejected');
END
GO

CREATE PROCEDURE [dbo].[UserLogin]
    @Username NVARCHAR(50),
    @Password NVARCHAR(50)
AS
BEGIN
    -- Declare a variable to hold the hashed password
    DECLARE @PasswordHash VARBINARY(64);
    
    -- Hash the input password using SHA2_256 (or SHA2_512)
    SET @PasswordHash = HASHBYTES('SHA2_256', @Password);

    -- Retrieve user details where the username matches and the hashed password matches
    SELECT *
    FROM Users
    WHERE Username = @Username AND [Password] = @PasswordHash;
END
GO

CREATE PROCEDURE ValidateIFSC
    @bankName VARCHAR(255),
    @ifscCode VARCHAR(11)
AS
BEGIN
    SELECT *
    FROM BankDetails
    WHERE BANK LIKE '%' + @bankName + '%'
      AND IFSC = @ifscCode;
END;
GO