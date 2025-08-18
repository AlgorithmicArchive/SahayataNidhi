-- DROP SCHEMA dbo;

-- CREATE SCHEMA dbo;
-- SocialWelfareDepartment.dbo.ActionHistory definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.ActionHistory;

CREATE TABLE ActionHistory (
	history_id int IDENTITY(1,1) NOT NULL,
	referenceNumber varchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	ActionTaker varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	ActionTaken varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	LocationLevel varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	LocationValue int NULL,
	Remarks varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	ActionTakenDate varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	CONSTRAINT ActionHistory_PK PRIMARY KEY (history_id)
);


-- SocialWelfareDepartment.dbo.ApplicationPerDistrict definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.ApplicationPerDistrict;

CREATE TABLE ApplicationPerDistrict (
	UUID int IDENTITY(1,1) NOT NULL,
	[Type] nvarchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	DistrictId int NOT NULL,
	ServiceId int NULL,
	FinancialYear varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CountValue int NOT NULL,
	CONSTRAINT PK_ApplicationPerDistrict PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.ApplicationsWithExpiringEligibility definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.ApplicationsWithExpiringEligibility;

CREATE TABLE ApplicationsWithExpiringEligibility (
	Expiring_Id int IDENTITY(1,1) NOT NULL,
	ServiceId int NOT NULL,
	ReferenceNumber nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Expiration_Date nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Mail_Sent int DEFAULT 0 NOT NULL,
	Created_At date DEFAULT getdate() NULL,
	CONSTRAINT PK_ApplicationsWithExpiringEligibility PRIMARY KEY (Expiring_Id)
);


-- SocialWelfareDepartment.dbo.BankDetails definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.BankDetails;

CREATE TABLE BankDetails (
	BANK varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	IFSC varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	BRANCH varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	ADDRESS varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CITY1 varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CITY2 varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	STATE varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[STD CODE] varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	PHONE varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
);


-- SocialWelfareDepartment.dbo.Blocks definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Blocks;

CREATE TABLE Blocks (
	UUID int IDENTITY(1,1) NOT NULL,
	DistrictId int NULL,
	BlockId int NULL,
	BlockName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Blocks PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.Certificates definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Certificates;

CREATE TABLE Certificates (
	UUID int IDENTITY(1,1) NOT NULL,
	OfficerId int NOT NULL,
	serialNumber varbinary(MAX) NULL,
	certifiyingAuthority varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	expirationDate datetime NULL,
	registeredDate nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Certificates PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.Citizen_Applications definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Citizen_Applications;

CREATE TABLE Citizen_Applications (
	ReferenceNumber varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Citizen_id int NOT NULL,
	ServiceId int NOT NULL,
	DistrictUidForBank varchar(6) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	FormDetails nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	WorkFlow nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	AdditionalDetails nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CurrentPlayer int NULL,
	Status nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	DataType nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Created_at varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Citizen_Applications PRIMARY KEY (ReferenceNumber)
);


-- SocialWelfareDepartment.dbo.District definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.District;

CREATE TABLE District (
	DistrictID int NOT NULL,
	DistrictName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	DistrictShort varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Division int NOT NULL,
	UUID int NULL,
	CONSTRAINT District_PK PRIMARY KEY (DistrictID)
);


-- SocialWelfareDepartment.dbo.EmailSettings definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.EmailSettings;

CREATE TABLE EmailSettings (
	Id int IDENTITY(1,1) NOT NULL,
	SenderName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	SenderEmail varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	SmtpServer varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	SmtpPort int NOT NULL,
	Password text COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Templates nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_EmailSettings PRIMARY KEY (Id)
);


-- SocialWelfareDepartment.dbo.HalqaPanchayat definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.HalqaPanchayat;

CREATE TABLE HalqaPanchayat (
	UUID int IDENTITY(1,1) NOT NULL,
	BlockId int NULL,
	HalqaPanchayatId int NULL,
	HalqaPanchayatName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
);


-- SocialWelfareDepartment.dbo.Muncipalities definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Muncipalities;

CREATE TABLE Muncipalities (
	UUID int IDENTITY(1,1) NOT NULL,
	DistrictId int NULL,
	MuncipalityId int NULL,
	MuncipalityName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	MuncipalityType int NULL,
	CONSTRAINT PK_Muncipalities PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.MuncipalityTypes definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.MuncipalityTypes;

CREATE TABLE MuncipalityTypes (
	UUID int IDENTITY(1,1) NOT NULL,
	TypeCode int NULL,
	TypeName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_MuncipalityTypes PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.OfficersDesignations definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.OfficersDesignations;

CREATE TABLE OfficersDesignations (
	UUID int IDENTITY(1,1) NOT NULL,
	Designation varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	DesignationShort varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	AccessLevel varchar(40) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT OfficersDesignations_PK PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.PensionPayments definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.PensionPayments;

CREATE TABLE PensionPayments (
	stateCode varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	stateName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	divisionCode varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	divisionName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	districtId varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	districtName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	paymentOfMonth varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	paymentOfYear varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	referenceNumber varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	districtBankUID varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	payingDepartment varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	payingDeptAccountNumber varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	pensionAmount varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	paymentFileGenerationDate varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	payingDeptBankName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	payingDeptIfscCode varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	pensionerName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	pensionerIfscCode varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	pensionerAccountNo varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	pensionerType varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	bankRes_pensionerCategory varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	bankRes_StatusFromBank varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	bankRes_TransactionId varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	bankRes_BankDateExecuted varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	bankRes_TransactionStatus varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
);


-- SocialWelfareDepartment.dbo.Services definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Services;

CREATE TABLE Services (
	ServiceId int IDENTITY(1,1) NOT NULL,
	ServiceName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	NameShort varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Department varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	FormElement varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	BankDetails varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	OfficerEditableField nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	DocumentFields nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT '''''''' NULL,
	Letters nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	ApprovalListEnabled bit NULL,
	webService nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CreatedAt varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Active bit NOT NULL,
	CONSTRAINT PK_Services PRIMARY KEY (ServiceId)
);


-- SocialWelfareDepartment.dbo.TSWOTehsil definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.TSWOTehsil;

CREATE TABLE TSWOTehsil (
	divisionCode int NULL,
	DistrictID int NULL,
	TehsilId int NULL,
	TehsilName varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	tswoOfficeName varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL
);


-- SocialWelfareDepartment.dbo.Tehsil definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Tehsil;

CREATE TABLE Tehsil (
	UUID int IDENTITY(1,1) NOT NULL,
	DistrictID int NOT NULL,
	TehsilId int NOT NULL,
	TehsilName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	IsTswo bit DEFAULT 0 NULL,
	CONSTRAINT Tehsil_PK PRIMARY KEY (TehsilId,UUID)
);


-- SocialWelfareDepartment.dbo.UserDocuments definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.UserDocuments;

CREATE TABLE UserDocuments (
	fileId int IDENTITY(1,1) NOT NULL,
	FileName nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	FileType nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	FileSize int NOT NULL,
	FileData varbinary(MAX) NOT NULL,
	UpdatedAt datetime DEFAULT getdate() NOT NULL,
	CONSTRAINT PK_UserDocuments PRIMARY KEY (fileId)
);


-- SocialWelfareDepartment.dbo.Users definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Users;

CREATE TABLE Users (
	UserId int IDENTITY(1,1) NOT NULL,
	Name varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Username varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Email varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Password varbinary(64) NULL,
	MobileNumber varchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Profile varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	UserType varchar(30) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	BackupCodes varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	AdditionalDetails nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	IsEmailValid bit DEFAULT 0 NOT NULL,
	RegisteredDate nvarchar(120) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Users PRIMARY KEY (UserId)
);


-- SocialWelfareDepartment.dbo.Villages definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Villages;

CREATE TABLE Villages (
	UUID int IDENTITY(1,1) NOT NULL,
	HalqaPanchayatId int NULL,
	VillageId int NULL,
	VillageName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Villages PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.Wards definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Wards;

CREATE TABLE Wards (
	UUID int IDENTITY(1,1) NOT NULL,
	MuncipalityId int NULL,
	WardCode int NULL,
	WardNo int NULL,
	CONSTRAINT PK_Wards PRIMARY KEY (UUID)
);


-- SocialWelfareDepartment.dbo.Withheld_Applications definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Withheld_Applications;

CREATE TABLE Withheld_Applications (
	Withheld_Id int IDENTITY(1,1) NOT NULL,
	ServiceId int NOT NULL,
	ReferenceNumber nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	IsWithheld bit DEFAULT 0 NOT NULL,
	WithheldType nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	WithheldReason text COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	MailSentToCitizen int DEFAULT 0 NULL,
	WithheldOn date DEFAULT getdate() NULL,
	CONSTRAINT PK_Withheld_Applications PRIMARY KEY (Withheld_Id)
);


-- SocialWelfareDepartment.dbo.AuditLogs definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.AuditLogs;

CREATE TABLE AuditLogs (
	LogId int IDENTITY(1,1) NOT NULL,
	UserId int NOT NULL,
	[Action] nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Description nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[Timestamp] datetime2 DEFAULT getutcdate() NOT NULL,
	IpAddress nvarchar(45) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Browser nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	OperatingSystem nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Device nvarchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Status nvarchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	AdditionalData nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_AuditLogs PRIMARY KEY (LogId),
	CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
);


-- SocialWelfareDepartment.dbo.Corrigendum definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Corrigendum;

CREATE TABLE Corrigendum (
	CorrigendumId varchar(60) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	ReferenceNumber varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Location nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CorrigendumFields nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	WorkFlow nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	CurrentPlayer int NOT NULL,
	[type] nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	History nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Status varchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CreatedAt datetime DEFAULT getdate() NOT NULL,
	CONSTRAINT PK_Corrigendum PRIMARY KEY (CorrigendumId),
	CONSTRAINT FK_Corrigendum_Citizen_Applications FOREIGN KEY (ReferenceNumber) REFERENCES Citizen_Applications(ReferenceNumber)
);


-- SocialWelfareDepartment.dbo.Pool definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.Pool;

CREATE TABLE Pool (
	PoolId int IDENTITY(1,1) NOT NULL,
	ServiceId int NOT NULL,
	AccessLevel varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	AccessCode int NOT NULL,
	ListType varchar(20) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	List nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Pool PRIMARY KEY (PoolId),
	CONSTRAINT FK_Pool_Services FOREIGN KEY (ServiceId) REFERENCES Services(ServiceId)
);
 CREATE NONCLUSTERED INDEX IX_Pool_ServiceId ON SocialWelfareDepartment.dbo.Pool (  ServiceId ASC  )  
	 WITH (  PAD_INDEX = OFF ,FILLFACTOR = 100  ,SORT_IN_TEMPDB = OFF , IGNORE_DUP_KEY = OFF , STATISTICS_NORECOMPUTE = OFF , ONLINE = OFF , ALLOW_ROW_LOCKS = ON , ALLOW_PAGE_LOCKS = ON  )
	 ON [PRIMARY ] ;


-- SocialWelfareDepartment.dbo.WebService definition

-- Drop table

-- DROP TABLE SocialWelfareDepartment.dbo.WebService;

CREATE TABLE WebService (
	Id int IDENTITY(1,1) NOT NULL,
	webServiceName varchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	serviceId int NOT NULL,
	apiEndPoint nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	onAction nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	fieldMappings nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	createdAt varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	updatedAt varchar(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	isActive bit DEFAULT 0 NOT NULL,
	CONSTRAINT PK_WebService PRIMARY KEY (Id),
	CONSTRAINT FK_WebService_Services FOREIGN KEY (serviceId) REFERENCES Services(ServiceId)
);