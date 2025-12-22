SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
ALTER PROCEDURE [dbo].[GetStatusCount]
    @AccessLevel VARCHAR(20)=NULL,
    @AccessCode INT = NULL,
    @ServiceId INT,
    @TakenBy VARCHAR(50) =NULL,
    @DivisionCode INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- ======== Main Applications Section ========
    WITH RankedStatus AS (
        SELECT 
            ca.ReferenceNumber,
            ca.ServiceId,
            ca.FormDetails,
            jsonWorkFlow.status,
            jsonWorkFlow.designation,
            ROW_NUMBER() OVER (
                PARTITION BY ca.ReferenceNumber 
                ORDER BY COALESCE(TRY_CONVERT(DATETIME, jsonWorkFlow.timestamp), '1900-01-01') DESC, 
                         COALESCE(jsonWorkFlow.seq, 9999) DESC
            ) AS rn
        FROM [dbo].[Citizen_Applications] ca
        CROSS APPLY OPENJSON(ca.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            timestamp NVARCHAR(50) '$.timestamp',
            seq INT '$.seq',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonWorkFlow
        WHERE 
            jsonWorkFlow.status IS NOT NULL 
            AND jsonWorkFlow.status <> ''
            AND (jsonWorkFlow.designation = @TakenBy OR jsonWorkFlow.status='returntoedit')
            AND ca.ServiceId = @ServiceId
            AND ISJSON(ca.WorkFlow) = 1
            AND ca.DataType != 'legacy'
    ),
    LatestStatus AS (
        SELECT 
            ReferenceNumber, 
            ServiceId, 
            FormDetails, 
            status,
            designation
        FROM RankedStatus
        WHERE rn = 1
    ),
    FilteredApplications AS (
        SELECT DISTINCT
            ls.ReferenceNumber,
            ls.ServiceId,
            ls.status,
            ls.designation,
            CASE 
                WHEN EXISTS (
                    SELECT 1 
                    FROM [dbo].[Corrigendum] c 
                    WHERE c.ReferenceNumber = ls.ReferenceNumber 
                        AND c.Type IN ('Corrigendum', 'Amendment')
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
    -- ======== Forwarded by TakenBy and Sanctioned Corrigendum/Amendment ========
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
            AND c.Type IN ('Corrigendum', 'Amendment')
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
    -- ======== Corrigendum, Correction, and Amendment Section ========
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
                ORDER BY COALESCE(TRY_CONVERT(DATETIME, jsonCorr.timestamp), '1900-01-01') DESC, 
                         COALESCE(jsonCorr.seq, 9999) DESC
            ) AS rn
        FROM [dbo].[Corrigendum] c
        INNER JOIN [dbo].[Citizen_Applications] ca 
            ON ca.ReferenceNumber = c.ReferenceNumber
        CROSS APPLY OPENJSON(c.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            timestamp NVARCHAR(50) '$.timestamp',
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
        SELECT DISTINCT
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
            jsonWorkFlow.status,
            jsonWorkFlow.designation,
            ROW_NUMBER() OVER (
                PARTITION BY wa.ReferenceNumber 
                ORDER BY COALESCE(TRY_CONVERT(DATETIME, jsonWorkFlow.completedAt), '1900-01-01') DESC, 
                         COALESCE(jsonWorkFlow.playerId, 9999) DESC
            ) AS rn
        FROM [dbo].[Withheld_Applications] wa
        INNER JOIN [dbo].[Citizen_Applications] ca 
            ON ca.ReferenceNumber = wa.ReferenceNumber
        CROSS APPLY OPENJSON(wa.WorkFlow) WITH (
            status NVARCHAR(50) '$.status',
            completedAt NVARCHAR(50) '$.completedAt',
            playerId INT '$.playerId',
            designation NVARCHAR(50) '$.designation'
        ) AS jsonWorkFlow
        WHERE 
            wa.IsWithheld = 1
            AND wa.ServiceId = @ServiceId
            AND ISJSON(wa.WorkFlow) = 1
            AND ca.DataType != 'legacy'
            AND (@TakenBy IS NULL OR jsonWorkFlow.designation = @TakenBy OR jsonWorkFlow.status = 'returntoedit')
    ),
    LatestWithheld AS (
        SELECT 
            ReferenceNumber, 
            WithheldType,
            status
        FROM RankedWithheld
        WHERE rn = 1
    ),
 FilteredWithheld AS (
    SELECT DISTINCT
        lw.ReferenceNumber,
        lw.WithheldType,
        lw.status
    FROM LatestWithheld lw
    INNER JOIN [dbo].[Citizen_Applications] ca
        ON ca.ReferenceNumber = lw.ReferenceNumber
    CROSS APPLY OPENJSON(ca.FormDetails, '$.Location') WITH (
        name NVARCHAR(50) '$.name',
        value INT '$.value'
    ) AS jsonLocation
    OUTER APPLY (
        -- Resolve Division regardless of whether we have District or Tehsil
        SELECT DivisionCode = CASE 
            WHEN jsonLocation.name = 'District' THEN d.Division
            WHEN jsonLocation.name = 'Tehsil' THEN d2.Division
            ELSE NULL 
        END
        FROM (SELECT jsonLocation.name, jsonLocation.value) x
        LEFT JOIN District d  ON jsonLocation.name = 'District'  AND jsonLocation.value = d.DistrictID
        LEFT JOIN Tehsil t    ON jsonLocation.name = 'Tehsil'    AND jsonLocation.value = t.TehsilID
        LEFT JOIN District d2 ON t.DistrictID = d2.DistrictID
    ) loc
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
            OR (@AccessLevel = 'Division'
                AND loc.DivisionCode = @DivisionCode)
        )
)
    -- ======== Final SELECT ========
    SELECT
        -- Main application status counts
        COUNT(DISTINCT CASE WHEN fa.status = 'pending' THEN fa.ReferenceNumber END) AS PendingCount,
        COUNT(DISTINCT CASE WHEN fa.status = 'forwarded' THEN fa.ReferenceNumber END) AS ForwardedCount,
        COUNT(DISTINCT CASE WHEN fa.status = 'returned' THEN fa.ReferenceNumber END) AS ReturnedCount,
        COUNT(DISTINCT CASE WHEN fa.status = 'returntoedit' THEN fa.ReferenceNumber END) AS ReturnToEditCount,
        COUNT(DISTINCT CASE WHEN fa.status = 'sanctioned' THEN fa.ReferenceNumber END) AS SanctionedCount,
        COUNT(DISTINCT CASE WHEN fa.status = 'rejected' THEN fa.ReferenceNumber END) AS RejectCount,
        COUNT(DISTINCT CASE WHEN fa.status = 'disbursed' THEN fa.ReferenceNumber END) AS DisbursedCount,

        -- FIXED TotalApplications
        COUNT(DISTINCT CASE 
            WHEN fa.status <> 'returntoedit' 
                 OR (fa.status = 'returntoedit' AND fa.designation = @TakenBy) 
            THEN fa.ReferenceNumber END
        ) AS TotalApplications,

        -- Forwarded and Sanctioned counts
        ISNULL((SELECT COUNT(*) FROM ForwardedSanctioned), 0) AS ForwardedSanctionedCount,
        ISNULL((SELECT COUNT(*) FROM ForwardedSanctionedCorrigendum), 0) AS ForwardedSanctionedCorrigendumCount,
        ISNULL((SELECT COUNT(*) FROM ForwardedVerifiedCorrection), 0) AS ForwardedVerifiedCorrectionCount,

        -- Corrigendum counts by status
        COUNT(DISTINCT CASE WHEN fc.status = 'pending' AND fc.Type = 'Corrigendum' THEN fc.CorrigendumId END) AS CorrigendumPendingCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'forwarded' AND fc.Type = 'Corrigendum' THEN fc.CorrigendumId END) AS CorrigendumForwardedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'returned' AND fc.Type = 'Corrigendum' THEN fc.CorrigendumId END) AS CorrigendumReturnedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'sanctioned' AND fc.Type = 'Corrigendum' THEN fc.CorrigendumId END) AS CorrigendumSanctionedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'rejected' AND fc.Type = 'Corrigendum' THEN fc.CorrigendumId END) AS CorrigendumRejectedCount,
        COUNT(DISTINCT CASE WHEN fc.Type = 'Corrigendum' THEN fc.CorrigendumId END) AS CorrigendumCount,

        -- Correction counts by status
        COUNT(DISTINCT CASE WHEN fc.status = 'pending' AND fc.Type = 'Correction' THEN fc.CorrigendumId END) AS CorrectionPendingCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'forwarded' AND fc.Type = 'Correction' THEN fc.CorrigendumId END) AS CorrectionForwardedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'returned' AND fc.Type = 'Correction' THEN fc.CorrigendumId END) AS CorrectionReturnedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'verified' AND fc.Type = 'Correction' THEN fc.CorrigendumId END) AS CorrectionSanctionedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'rejected' AND fc.Type = 'Correction' THEN fc.CorrigendumId END) AS CorrectionRejectedCount,
        COUNT(DISTINCT CASE WHEN fc.Type = 'Correction' THEN fc.CorrigendumId END) AS CorrectionCount,

        -- Amendment counts by status
        COUNT(DISTINCT CASE WHEN fc.status = 'pending' AND fc.Type = 'Amendment' THEN fc.CorrigendumId END) AS AmendmentPendingCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'forwarded' AND fc.Type = 'Amendment' THEN fc.CorrigendumId END) AS AmendmentForwardedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'returned' AND fc.Type = 'Amendment' THEN fc.CorrigendumId END) AS AmendmentReturnedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'sanctioned' AND fc.Type = 'Amendment' THEN fc.CorrigendumId END) AS AmendmentSanctionedCount,
        COUNT(DISTINCT CASE WHEN fc.status = 'rejected' AND fc.Type = 'Amendment' THEN fc.CorrigendumId END) AS AmendmentRejectedCount,
        COUNT(DISTINCT CASE WHEN fc.Type = 'Amendment' THEN fc.CorrigendumId END) AS AmendmentCount,

        -- Withheld applications counts
        COUNT(DISTINCT fw.ReferenceNumber) AS TotalWithheldCount,
        COUNT(DISTINCT CASE WHEN fw.WithheldType = 'TEMPORARY' THEN fw.ReferenceNumber END) AS TemporaryWithheldCount,
        COUNT(DISTINCT CASE WHEN fw.WithheldType = 'PERMANENT' THEN fw.ReferenceNumber END) AS PermanentWithheldCount,
        COUNT(DISTINCT CASE WHEN fw.status = 'pending' THEN fw.ReferenceNumber END) AS WithheldPendingCount,
        COUNT(DISTINCT CASE WHEN fw.status = 'forwarded' THEN fw.ReferenceNumber END) AS WithheldForwardedCount,
        COUNT(DISTINCT CASE WHEN fw.status = 'approved' THEN fw.ReferenceNumber END) AS WithheldApprovedCount
    FROM 
        FilteredApplications fa
        LEFT JOIN FilteredCorrigendum fc ON fa.ReferenceNumber = fc.ReferenceNumber
        LEFT JOIN FilteredWithheld fw ON fa.ReferenceNumber = fw.ReferenceNumber;
END
GO
