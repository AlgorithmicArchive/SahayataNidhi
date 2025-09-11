TRUNCATE TABLE UserDocuments;
TRUNCATE TABLE ApplicationPerDistrict;
TRUNCATE TABLE ApplicationsWithExpiringEligibility;
TRUNCATE TABLE Corrigendum;
TRUNCATE TABLE ActionHistory;
TRUNCATE TABLE Withheld_Applications;
TRUNCATE TABLE AuditLogs;
DELETE FROM Citizen_Applications WHERE DataType = 'new';
