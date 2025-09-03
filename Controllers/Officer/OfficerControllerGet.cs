using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.IO;
using iText.Kernel.Geom;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using iText.IO.Image;
using iText.Kernel.Colors;
using iText.Layout.Borders;
using iText.Kernel.Pdf.Canvas;
using System.Data;
using System.Dynamic;

namespace SahayataNidhi.Controllers.Officer
{
    public partial class OfficerController : Controller
    {

        public class LegacyStatusCounts
        {
            public int TotalApplications { get; set; }
            public int RejectCount { get; set; }
            public int SanctionedCount { get; set; }
            public int PensionStoppedCount { get; set; }

        }

        public class TemporaryDisability
        {
            public int TemporaryDisabilityExpiringSoonCount { get; set; }
            public int TotalPhysicallyChallengedApplications { get; set; }

        }



        [HttpGet]
        public IActionResult GetLegacyCount(int ServiceId)
        {
            // Validate officer authentication
            var officer = GetOfficerDetails();
            if (officer == null)
                return Unauthorized("Officer authentication failed.");

            // Validate service
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == ServiceId);
            if (service == null)
                return NotFound("Service not found.");

            // Parse workflow
            if (string.IsNullOrEmpty(service.OfficerEditableField))
                return Json(new { countList = new List<object>(), corrigendumList = new List<object>(), correctionList = new List<object>(), canSanction = false });


            // Prepare SQL parameters
            var sqlParams = new List<SqlParameter>
            {
                new("@AccessLevel", officer.AccessLevel),
                new("@AccessCode", officer.AccessCode ?? (object)DBNull.Value),
                new("@ServiceId", ServiceId),
                new("@DivisionCode", officer.AccessLevel == "Division" ? officer.AccessCode : (object)DBNull.Value)
            };



            // Execute stored procedures
            var counts = dbcontext.Database
                .SqlQueryRaw<LegacyStatusCounts>(
                    "EXEC GetLegacyStatusCount @AccessLevel, @AccessCode, @ServiceId, @DivisionCode",
                    sqlParams.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new LegacyStatusCounts();


            // Build count lists using a helper function
            var countList = new List<object>
            {
                new
                {
                    label = "Total Applications",
                    count = counts.TotalApplications,
                    bgColor = "#6A1B9A",
                    textColor = "#FFFFFF",
                    tableTitle = "Total Legacy Applications",
                },
                new
                {
                    label = "Sanctioned",
                    count = counts.SanctionedCount,
                    bgColor = "#FFC107",
                    textColor = "#212121",
                    tableTitle = "Sanctioned Legacy Applications",

                },
                 new
                {
                    label = "Rejected",
                    count = counts.RejectCount,
                    bgColor = "#FFC107",
                    textColor = "#212121",
                    tableTitle = "Rejected Legacy Applications",

                },
                 new
                {
                    label = "Pension's Stopped",
                    count = counts.PensionStoppedCount,
                    bgColor = "#FFC107",
                    textColor = "#212121",
                    tableTitle = "Pension's Stopped Legacy Applications",

                }
            };


            return Json(new
            {
                countList,
            });
        }
        [HttpGet]
        public IActionResult GetApplicationsCount(int ServiceId)
        {
            // Validate officer authentication
            var officer = GetOfficerDetails();
            if (officer == null)
                return Unauthorized("Officer authentication failed.");

            // Validate service
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == ServiceId);
            if (service == null)
                return NotFound("Service not found.");

            // Parse workflow
            if (string.IsNullOrEmpty(service.OfficerEditableField))
                return Json(new { countList = new List<object>(), corrigendumList = new List<object>(), correctionList = new List<object>(), canSanction = false });

            List<dynamic> workflow;
            try
            {
                workflow = JsonConvert.DeserializeObject<List<dynamic>>(service.OfficerEditableField) ?? new List<dynamic>();
            }
            catch (JsonException ex)
            {
                return StatusCode(500, $"Error parsing workflow: {ex.Message}");
            }

            if (workflow.Count == 0)
                return Json(new { countList = new List<object>(), corrigendumList = new List<object>(), correctionList = new List<object>(), canSanction = false });

            // Find officer authorities
            dynamic authorities = workflow.FirstOrDefault(p => p.designation == officer.Role)!;
            if (authorities == null)
                return Json(new { countList = new List<object>(), corrigendumList = new List<object>(), correctionList = new List<object>(), canSanction = false });

            var officerAuthorities = new
            {
                CanSanction = authorities.canSanction ?? false,
                CanHavePool = authorities.canHavePool ?? false,
                CanForwardToPlayer = authorities.canForwardToPlayer ?? false,
                CanReturnToPlayer = authorities.canReturnToPlayer ?? false,
                CanCorrigendum = authorities.canCorrigendum ?? false,
                CanReturnToCitizen = authorities.canReturnToCitizen ?? false,
                CanManageBankFiles = authorities.canManageBankFiles ?? false,
                CanWithhold = authorities.canWithhold ?? false,
                CanValidateAadhaar = authorities.canValidateAadhaar ?? false
            };

            // Prepare SQL parameters
            var sqlParams = new List<SqlParameter>
            {
                new("@AccessLevel", officer.AccessLevel),
                new("@AccessCode", officer.AccessCode ?? (object)DBNull.Value),
                new("@ServiceId", ServiceId),
                new("@TakenBy", officer.Role),
                new("@DivisionCode", officer.AccessLevel == "Division" ? officer.AccessCode : (object)DBNull.Value)
            };

            // Execute stored procedures
            var counts = dbcontext.Database
                .SqlQueryRaw<StatusCounts>(
                    "EXEC GetStatusCount @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode",
                    sqlParams.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new StatusCounts();

            var shiftedCount = dbcontext.Database
                .SqlQueryRaw<ShiftedCountModal>(
                    "EXEC GetShiftedCount @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode",
                    sqlParams.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new ShiftedCountModal();

            var temporaryCount = dbcontext.Database
               .SqlQueryRaw<TemporaryDisability>(
                   "EXEC GetTemporaryDisabilityCount @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode",
                   sqlParams.ToArray()
               )
               .AsEnumerable()
               .FirstOrDefault() ?? new TemporaryDisability();

            // Build count lists using a helper function
            var countList = BuildMainApplicationCounts(counts, officerAuthorities);
            var corrigendumList = BuildCorrigendumCounts(counts, officerAuthorities);
            var correctionList = BuildCorrectionCounts(counts, officerAuthorities);
            var temporaryCountList = new List<dynamic>();
            var withheldCountList = new List<dynamic>();
            var citizenPendingList = new List<dynamic>();

            if (!(bool)officerAuthorities.CanReturnToCitizen)
            {
                citizenPendingList.Add(new
                {
                    label = "Pending With Citizen",
                    count = counts.ReturnToEditCount,
                    bgColor = "#CE93D8",
                    textColor = "#4A148C",
                    tooltipText = "Application is pending at Citizen level for correction.",
                    tableTitle = "Pending With Citizen Applications",
                });
            }

            // Add Shifted Count only if count is greater than 0
            if (shiftedCount.ShiftedCount > 0)
            {
                countList.Add(new
                {
                    label = "Shifted To Another Location",
                    count = shiftedCount.ShiftedCount,
                    tableTitle = "Shifted Applications",
                    bgColor = "#ABCDEF",
                    textColor = "#123456"
                });
            }

            // Add PCP Applications count (always show, even if 0)
            temporaryCountList.Add(new
            {
                label = "PCP Applications",
                count = temporaryCount.TotalPhysicallyChallengedApplications,
                tooltipText = "Physically Challenged Applicants",
                tableTitle = "Total PCP Applications",
                bgColor = "#ABCDEF",
                textColor = "#123456"
            });

            // Add PCP - UDID Card Expires 3 Months count (always show, even if 0)
            temporaryCountList.Add(new
            {
                label = "PCP-UDID Expires 3 Months",
                count = temporaryCount.TemporaryDisabilityExpiringSoonCount,
                tooltipText = "Physically Challenged Applicants with Temporary Disability, UDID Card Expiring Soon",
                tableTitle = "Expiring Eligibility Applications",
                bgColor = "#ABCDEF",
                textColor = "#123456"
            });

            // Add Total Withheld Applications count (always show, even if 0)
            withheldCountList.Add(new
            {
                label = "Total Withheld Applications",
                count = counts.TotalWithheldCount,
                tooltipText = "Total Withheld Applications",
                tableTitle = "Total Withheld Applications",
                bgColor = "#FFCC00",
                textColor = "#000000"
            });

            // Add Temporary Withheld count (always show, even if 0)
            withheldCountList.Add(new
            {
                label = "Temporary Withheld",
                count = counts.TemporaryWithheldCount,
                tooltipText = "Temporary Withheld Applications",
                tableTitle = "Temporary Withheld Applications",
                bgColor = "#FFCC00",
                textColor = "#000000"
            });

            // Add Permanent Withheld count (always show, even if 0)
            withheldCountList.Add(new
            {
                label = "Permanent Withheld",
                count = counts.PermanentWithheldCount,
                tooltipText = "Permanent Withheld Applications",
                tableTitle = "Permanent Withheld Applications",
                bgColor = "#FFCC00",
                textColor = "#000000"
            });

            return Json(new
            {
                countList,
                corrigendumList,
                correctionList,
                temporaryCountList,
                withheldCountList,
                citizenPendingList,
                canSanction = officerAuthorities.CanSanction,
                canHavePool = officerAuthorities.CanHavePool,
                canCorrigendum = officerAuthorities.CanCorrigendum,
                officerAuthorities
            });
        }

        [HttpGet]
        public IActionResult GetApplications(int ServiceId, string type, int pageIndex = 0, int pageSize = 10, string? dataType = null)
        {
            var officerDetails = GetOfficerDetails();

            var role = new SqlParameter("@Role", officerDetails.Role);
            var accessLevel = new SqlParameter("@AccessLevel", officerDetails.AccessLevel);
            var accessCode = new SqlParameter("@AccessCode", officerDetails.AccessCode);
            var applicationStatus = new SqlParameter("@ApplicationStatus", (object?)type ?? DBNull.Value);
            var serviceId = new SqlParameter("@ServiceId", ServiceId);
            var pageIndexParam = new SqlParameter("@PageIndex", pageIndex);
            var pageSizeParam = new SqlParameter("@PageSize", pageSize);
            var isPaginated = new SqlParameter("@IsPaginated", 1);
            var dataTypeParam = new SqlParameter("@DataType", (object?)dataType ?? DBNull.Value);
            var totalRecordsParam = new SqlParameter
            {
                ParameterName = "@TotalRecords",
                SqlDbType = System.Data.SqlDbType.Int,
                Direction = System.Data.ParameterDirection.Output
            };

            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == ServiceId);
            if (service == null)
            {
                return NotFound();
            }

            var workflow = JsonConvert.DeserializeObject<List<dynamic>>(service.OfficerEditableField!);
            if (workflow == null || workflow.Count == 0)
            {
                return Json(new { countList = new List<dynamic>(), canSanction = false });
            }

            dynamic authorities = workflow.FirstOrDefault(p => p.designation == officerDetails.Role)!;
            if (authorities == null)
            {
                return Json(new { countList = new List<dynamic>(), canSanction = false });
            }

            List<CitizenApplication> response;

            if (type == "shifted")
            {
                response = dbcontext.CitizenApplications
                    .FromSqlRaw("EXEC GetShiftedApplications @Role, @AccessLevel, @AccessCode, @ServiceId",
                        role, accessLevel, accessCode, serviceId)
                    .ToList();

                // Manual sort & paging
                response = response.OrderBy(a =>
                {
                    var parts = a.ReferenceNumber!.Split('/');
                    var numberPart = parts.Last();
                    return int.TryParse(numberPart, out int num) ? num : 0;
                }).ToList();

                response = response
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();
            }
            else
            {
                response = dbcontext.CitizenApplications
                 .FromSqlRaw(
                     "EXEC GetApplicationsForOfficer @Role, @AccessLevel, @AccessCode, @ApplicationStatus, @ServiceId, @PageIndex, @PageSize, @IsPaginated, @DataType, @TotalRecords OUTPUT",
                     role, accessLevel, accessCode, applicationStatus, serviceId,
                     pageIndexParam, pageSizeParam, isPaginated, dataTypeParam, totalRecordsParam
                 )
                 .ToList();
            }

            int totalRecords = type == "shifted" ? response.Count : (int)totalRecordsParam.Value;

            // Columns with S.No
            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "serviceName", header = "Service Name" },
                new { accessorKey = "status", header = "Application Status" },
                new { accessorKey = "submissionDate", header = "Citizen Submission Date" },
                new { accessorKey = "actionTakenOn", header = "Received On" }
            ];

            List<dynamic> data = [];
            List<dynamic> poolData = [];

            var poolList = dbcontext.Pools.FirstOrDefault(p =>
                p.ServiceId == ServiceId &&
                p.AccessLevel == officerDetails.AccessLevel &&
                p.AccessCode == officerDetails.AccessCode
            );

            var pool = poolList != null && !string.IsNullOrWhiteSpace(poolList.List)
                ? JsonConvert.DeserializeObject<List<string>>(poolList.List)
                : new List<string>();

            // Start numbering based on pagination
            int snoCounter = (pageIndex * pageSize) + 1;

            foreach (var details in response)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails!);
                var officers = JsonConvert.DeserializeObject<JArray>(details.WorkFlow!);
                var currentPlayer = details.CurrentPlayer;

                var latestHistory = dbcontext.ActionHistories
                    .Where(h => h.ReferenceNumber == details.ReferenceNumber)
                    .AsEnumerable() // force in-memory
                    .OrderByDescending(h => DateTime.ParseExact(
                        h.ActionTakenDate,
                        "dd MMM yyyy hh:mm:ss tt",
                        CultureInfo.InvariantCulture))
                    .FirstOrDefault();

                // ✅ Parse into DateTime for sorting
                var parsedDate = latestHistory != null
                    ? DateTime.ParseExact(
                        latestHistory.ActionTakenDate,
                        "dd MMM yyyy hh:mm:ss tt",
                        CultureInfo.InvariantCulture)
                    : DateTime.MinValue;

                string officerDesignation = (string)officers![currentPlayer!]!["designation"]!;

                if (latestHistory != null && officerDesignation == latestHistory.ActionTaker)
                {
                    columns = columns
                        .Select(col =>
                            col.accessorKey == "actionTakenOn"
                                ? new { accessorKey = col.accessorKey, header = "Action Taken On" }
                                : col
                        )
                        .ToList<dynamic>();
                }

                string serviceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == details.ServiceId)!.ServiceName!;
                var corrigendums = dbcontext.Corrigenda.Where(co => co.ReferenceNumber == details.ReferenceNumber).ToList();
                List<string> corrigendumIds = new();

                foreach (var item in corrigendums)
                {
                    string value = GetSanctionedCorrigendum(JsonConvert.DeserializeObject<dynamic>(item.WorkFlow), item.CorrigendumId);
                    if (value != null)
                    {
                        corrigendumIds.Add(value);
                    }
                }

                var customActions = new List<dynamic>();
                var rawStatus = officers[currentPlayer]["status"]!.ToString();
                var currentOfficer = officers!.FirstOrDefault(o => (string)o["designation"]! == officerDetails.Role);

                bool canPull = currentOfficer?["canPull"] != null && (bool)currentOfficer["canPull"]!;
                if ((type == "forwarded" || type == "returned" || type == "returntoedit") && canPull)
                {
                    customActions.Add(new
                    {
                        type = "Pull",
                        tooltip = "Pull",
                        color = "#F0C38E",
                        actionFunction = "pullApplication"
                    });
                }

                if (type == "returntoedit" && !canPull)
                {
                    customActions.Add(new
                    {
                        type = "View",
                        tooltip = "View",
                        color = "#F0C38E",
                        actionFunction = "handleViewApplication"
                    });
                }

                var currentStatus = (string)officers[currentPlayer!]!["status"]!;
                if (currentStatus != "returntoedit" && currentStatus != "sanctioned")
                {
                    customActions.Add(new
                    {
                        type = "View",
                        tooltip = "View",
                        color = "#F0C38E",
                        actionFunction = type == "pending" ? "handleOpenApplication" : "handleViewApplication"
                    });
                }
                else if (currentStatus == "sanctioned")
                {
                    customActions.Add(new
                    {
                        type = "View",
                        tooltip = "View",
                        color = "#F0C38E",
                        actionFunction = "handleViewApplication"
                    });

                    foreach (string id in corrigendumIds)
                    {
                        customActions.Add(new
                        {
                            type = "DownloadCorrigendum",
                            tooltip = "View CRG " + id.TrimEnd('/').Split('/').Last(),
                            corrigendumId = id,
                            color = "#F0C38E",
                            actionFunction = "handleViewPdf"
                        });
                    }
                }

                var excludedStatuses = new[] { "Rejected", "Sanctioned", "Initiated" };
                bool IsError = excludedStatuses.Contains(details.Status);
                if (!IsError)
                {
                    customActions.Clear();
                }

                string? Status = IsError
                    ? rawStatus == "returntoedit" ? "Pending With Citizen" : char.ToUpper(rawStatus[0]) + rawStatus.Substring(1)
                    : details.Status;

                var applicationObject = new
                {
                    sno = snoCounter++, // serial number
                    referenceNumber = details.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails),
                    submissionDate = details.CreatedAt,
                    actionTakenOn = parsedDate == DateTime.MinValue ? null : parsedDate.ToString("dd MMM yyyy hh:mm:ss tt"),
                    serviceName,
                    status = Status,
                    serviceId = details.ServiceId,
                    customActions,
                    sortDate = parsedDate // ✅ keep raw date for sorting
                };

                if (type == "shifted")
                {
                    data.Add(applicationObject);
                }
                else
                {
                    if (pool!.Contains(details.ReferenceNumber!) && type == "pending")
                    {
                        poolData.Add(applicationObject);
                    }
                    else
                    {
                        data.Add(applicationObject);
                    }
                }
            }

            // ✅ Final sort by latest ActionTakenOn
            data = data.OrderByDescending(d => d.sortDate).ToList<dynamic>();
            poolData = poolData.OrderByDescending(d => d.sortDate).ToList<dynamic>();

            data = data
            .OrderByDescending(d => d.sortDate)
            .Select((d, i) => new
            {
                sno = (pageIndex * pageSize) + i + 1, // renumber after sort
                d.referenceNumber,
                d.applicantName,
                d.submissionDate,
                d.actionTakenOn,
                d.serviceName,
                d.status,
                d.serviceId,
                d.customActions
            })
            .ToList<dynamic>();

            poolData = poolData
                .OrderByDescending(d => d.sortDate)
                .Select((d, i) => new
                {
                    // pick one:
                    sno = (pageIndex * pageSize) + i + 1, // or keep pagination offset too
                    d.referenceNumber,
                    d.applicantName,
                    d.submissionDate,
                    d.actionTakenOn,
                    d.serviceName,
                    d.status,
                    d.serviceId,
                    d.customActions
                })
                .ToList<dynamic>();

            return Json(new
            {
                data,
                columns,
                poolData,
                totalRecords,
                canSanction = (bool)authorities.canSanction
            });
        }

        [HttpGet]
        public IActionResult GetWithheldApplications(string serviceId, string type, int pageIndex = 0, int pageSize = 10)
        {
            var withheldType = type.StartsWith("withheld_")
            ? type.Split('_')[1]
            : type;

            _logger.LogInformation($"----- Withheld Type: {withheldType} --------------");

            var response = dbcontext.WithheldApplications
            .Where(wh => wh.ServiceId == Convert.ToInt32(serviceId) &&
                        (withheldType == "total" || wh.WithheldType == withheldType))
            .ToList();

            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
                    new { accessorKey = "referenceNumber", header = "Reference Number" },
                    new { accessorKey = "applicantName", header = "Applicant Name" },
                    new { accessorKey = "withheldType", header = "Withheld Type" },
                    new { accessorKey = "withheldReason", header = "Withheld Reason" }
            ];
            List<dynamic> data = [];
            int index = 1;
            foreach (var application in response)
            {
                var details = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == application.ReferenceNumber);
                var formdetails = JToken.Parse(details!.FormDetails!);
                var applicantName = FindFieldRecursively(formdetails, "ApplicantName");
                var customActions = new List<dynamic>();
                customActions.Add(new
                {
                    type = "View",
                    tooltip = "View",
                    color = "#F0C38E",
                    actionFunction = "handleViewApplication"
                });
                data.Add(new
                {
                    sno = index,
                    referenceNumber = application.ReferenceNumber,
                    applicantName = (string)applicantName!["value"]!,
                    withheldType = application.WithheldType,
                    withheldReason = application.WithheldReason,
                    customActions
                });
            }

            return Json(new { columns, data, totlaRecords = response.Count });
        }


        [HttpGet]
        public async Task<IActionResult> GetTemporaryDisability(string? ServiceId, string type, int pageIndex = 0, int pageSize = 10)
        {
            var officer = GetOfficerDetails();
            int serviceId;
            try
            {
                serviceId = Convert.ToInt32(ServiceId);
            }
            catch
            {
                return BadRequest("Invalid ServiceId");
            }

            string accessLevel = officer.AccessLevel!; // Adjust based on context or pass as parameter
            int? accessCode = officer.AccessCode; // Adjust based on context or pass as parameter
            string takenBy = officer.Role!; // Adjust based on context or pass as parameter
            int? divisionCode = null; // Adjust based on context or pass as parameter
            string resultType = type == "totalpcpapplication" ? "totalpcpapplication" : "expiringeligibility";

            // Validate pagination parameters
            if (pageIndex < 0) pageIndex = 0;
            if (pageSize < 1) pageSize = 10;

            // Execute stored procedure
            var applications = await dbcontext.CitizenApplications
                .FromSqlRaw("EXEC [dbo].[GetDisabilityApplications] @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode, @ResultType, @PageNumber, @PageSize",
                    new SqlParameter("@AccessLevel", accessLevel),
                    new SqlParameter("@AccessCode", accessCode),
                    new SqlParameter("@ServiceId", serviceId),
                    new SqlParameter("@TakenBy", takenBy),
                    new SqlParameter("@DivisionCode", divisionCode ?? (object)DBNull.Value),
                    new SqlParameter("@ResultType", resultType),
                    new SqlParameter("@PageNumber", pageIndex + 1), // SQL uses 1-based indexing
                    new SqlParameter("@PageSize", pageSize))
                .ToListAsync();



            // Commented out as per request
            var serviceName = await dbcontext.Services
                .Where(s => s.ServiceId == serviceId)
                .Select(s => s.ServiceName)
                .FirstOrDefaultAsync() ?? "Unknown Service";

            List<dynamic> data = new();

            List<dynamic> columns = new()
            {
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "serviceName", header = "Service Name" },
            };

            if (type == "totalpcpapplication")
            {
                columns.Add(new { accessorKey = "applicationType", header = "UDID Card Type" });
                columns.Add(new { accessorKey = "expiryDate", header = "UDID Card Expiry Date" });
            }
            else
            {
                columns.Add(new { accessorKey = "expiryDate", header = "UDID Card Expiry Date" });
                columns.Add(new { accessorKey = "noOfMailSent", header = "No. Of Reminder Mails Sent to Citizen" });

            }


            foreach (var application in applications)
            {
                var formDetailsObj = JToken.Parse(application.FormDetails ?? "{}");
                string applicantName = GetFieldValue("ApplicantName", formDetailsObj);

                var customActions = new List<dynamic>
                {
                    new
                    {
                        type = "SendEmail",
                        tooltip = "Send Reminder Email",
                        tooltipText = "Send Reminder Mail to Citizen",
                        color = "#F0C38E",
                        actionFunction = "sendExpirationEmail"
                    }
                };

                dynamic applicationObject = new ExpandoObject();
                applicationObject.referenceNumber = application.ReferenceNumber;
                applicationObject.applicantName = applicantName;
                applicationObject.serviceName = serviceName;
                var expiringApplication = dbcontext.ApplicationsWithExpiringEligibilities
                     .FirstOrDefault(ae => ae.ReferenceNumber == application.ReferenceNumber);
                DateTime expirationDate = DateTime.Parse(expiringApplication?.ExpirationDate!);
                int daysLeft = (expirationDate.Date - DateTime.Today).Days;

                if (type == "totalpcpapplication")
                {
                    var disabilityType = FindFieldRecursively(formDetailsObj, "KindOfDisability")!;
                    _logger.LogInformation($"-------------------- Disability Type: {disabilityType["value"]} -----------------------");
                    applicationObject.applicationType = disabilityType["value"];
                    applicationObject.expiryDate = expirationDate.ToString("dd/MM/yyyy") + $" ({daysLeft} days left)";
                }
                else
                {
                    applicationObject.expiryDate = expirationDate.ToString("dd/MM/yyyy") + $" ({daysLeft} days left)";
                    applicationObject.noOfMailSent = expiringApplication!.MailSent;
                    applicationObject.customActions = customActions;

                }


                data.Add(applicationObject);
            }

            return Json(new { data, columns, totalrecords = applications.Count() });
        }


        public class AgeWiseReportDto
        {
            public int Age { get; set; }
            public int CountOfApplicants { get; set; }
        }

        public class PensionTypeWiseReportDto
        {
            public int Age { get; set; }
            public string? PensionType { get; set; }
            public int CountOfApplicants { get; set; }
        }

        public class GenderWiseReportDto
        {
            public string? Gender { get; set; }
            public int CountOfApplicants { get; set; }
        }

        [HttpGet]
        public IActionResult GetApplicationsForReports(
     int AccessCode,
     int ServiceId,
     string? StatusType = null,
     string ReportType = "TehsilWise",
     string? DataType = null,
     DateTime? StartDate = null,
     DateTime? EndDate = null,
     int pageIndex = 0,
     int pageSize = 10)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                    return BadRequest(new { error = "Officer details not found" });

                var accessCodeParam = new SqlParameter("@AccessCode", AccessCode);
                var serviceIdParam = new SqlParameter("@ServiceId", ServiceId);
                var accessLevelParam = new SqlParameter("@AccessLevel", officer.AccessLevel == "Tehsil" ? "Tehsil" : "District");
                var dataTypeParam = new SqlParameter("@DataType", (object?)DataType ?? "new");
                var applicationStatusParam = new SqlParameter("@ApplicationStatus", (object?)StatusType ?? "total");
                var startDateParam = new SqlParameter("@StartDate", (object?)StartDate ?? DBNull.Value);
                var endDateParam = new SqlParameter("@EndDate", (object?)EndDate ?? DBNull.Value);

                List<dynamic> data;
                List<dynamic> columns;
                int totalRecords;

                switch (ReportType)
                {
                    case "AgeWise":
                        var ageData = dbcontext.Database
                            .SqlQueryRaw<AgeWiseReportDto>(
                                "EXEC GetAgeCountsFiltered @ServiceId, @AccessLevel, @AccessCode, @ApplicationStatus, @DataType, @StartDate, @EndDate",
                                serviceIdParam, accessLevelParam, accessCodeParam, applicationStatusParam, dataTypeParam, startDateParam, endDateParam)
                            .ToList();

                        totalRecords = ageData.Count;
                        data = ageData.Skip(pageIndex * pageSize).Take(pageSize).ToList<dynamic>();
                        columns = new List<dynamic>
                {
                    new { accessorKey = "age", header = "Age" },
                    new { accessorKey = "countOfApplicants", header = "Ben. Count" }
                };
                        break;

                    case "PensionTypeWise":
                        var pensionData = dbcontext.Database
                            .SqlQueryRaw<PensionTypeWiseReportDto>(
                                "EXEC GetAgeAndPensionCounts @ServiceId, @AccessLevel, @AccessCode, @ApplicationStatus, @DataType, @StartDate, @EndDate",
                                serviceIdParam, accessLevelParam, accessCodeParam, applicationStatusParam, dataTypeParam, startDateParam, endDateParam)
                            .ToList();

                        totalRecords = pensionData.Count;
                        data = pensionData.Skip(pageIndex * pageSize).Take(pageSize).ToList<dynamic>();
                        columns = new List<dynamic>
                {
                    new { accessorKey = "age", header = "Age" },
                    new { accessorKey = "pensionType", header = "Pension Type" },
                    new { accessorKey = "countOfApplicants", header = "Ben. Count" }
                };
                        break;

                    case "GenderWise":
                        var genderData = dbcontext.Database
                            .SqlQueryRaw<GenderWiseReportDto>(
                                "EXEC GetGenderCounts @ServiceId, @AccessLevel, @AccessCode, @ApplicationStatus, @DataType",
                                serviceIdParam, accessLevelParam, accessCodeParam, applicationStatusParam, dataTypeParam)
                            .ToList();

                        totalRecords = genderData.Count;
                        data = genderData.Skip(pageIndex * pageSize).Take(pageSize).ToList<dynamic>();
                        columns = new List<dynamic>
                {
                    new { accessorKey = "gender", header = "Gender" },
                    new { accessorKey = "countOfApplicants", header = "Ben. Count" }
                };
                        break;

                    case "TehsilWise":
                    default:
                        var tehsilData = dbcontext.Database
                            .SqlQueryRaw<SummaryReports>(
                                "EXEC GetApplicationsForReport @AccessCode, @ServiceId, @AccessLevel",
                                accessCodeParam, serviceIdParam, accessLevelParam)
                            .ToList();

                        totalRecords = tehsilData.Count;
                        data = tehsilData.Skip(pageIndex * pageSize).Take(pageSize).ToList<dynamic>();
                        columns = new List<dynamic>
                {
                    new { accessorKey = "tehsilName", header = "Tehsil Name" },
                    new { accessorKey = "totalApplicationsSubmitted", header = "Total Applications Received" },
                    new { accessorKey = "totalApplicationsPending", header = "Total Applications Pending" },
                    new { accessorKey = "totalApplicationsReturnToEdit", header = "Pending With Citizens" },
                    new { accessorKey = "totalApplicationsSanctioned", header = "Total Sanctioned" },
                    new { accessorKey = "totalApplicationsRejected", header = "Total Rejected" },
                };
                        break;
                }

                return Json(new
                {
                    data,
                    columns,
                    totalRecords
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error executing report for AccessCode: {AccessCode}, ServiceId: {ServiceId}");
                return StatusCode(500, new { error = "An error occurred while fetching the report" });
            }
        }




        [HttpGet]
        public IActionResult GetUserDetails(string applicationId)
        {
            var officer = GetOfficerDetails();
            var details = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == applicationId);
            if (details == null)
                return Json(new { error = "Application not found" });

            var ReferenceNumber = new SqlParameter("@ReferenceNumber", applicationId);
            var OfficerAccessLevel = new SqlParameter("@OfficerAccessLevel", officer.AccessLevel);
            var OfficerAccessCode = new SqlParameter("@OfficerAccessCode", officer.AccessCode);
            var ServiceId = new SqlParameter("@ServiceId", Convert.ToInt32(details.ServiceId));
            var OfficerRole = new SqlParameter("@OfficerRole", officer.Role);
            var Status = new SqlParameter("@Status", DBNull.Value);
            var Type = new SqlParameter("@Type", DBNull.Value);

            var IsCorrigendumPending = dbcontext.Corrigenda
               .FromSqlRaw("EXEC GetCorrigendumByLocationAccess @OfficerAccessLevel, @OfficerAccessCode, @ReferenceNumber, @Status, @CorrigendumId, @Type, @OfficerRole",
                   OfficerAccessLevel, OfficerAccessCode, ReferenceNumber, Status, new SqlParameter("@CorrigendumId", DBNull.Value), Type, OfficerRole)
               .ToList();

            var formDetailsToken = JToken.Parse(details.FormDetails!);
            // var extraFiles = new List<dynamic>
            // {
            //     sanctionedFile = new {}
            // };

            bool hasPending = false;
            if (IsCorrigendumPending.Count != 0)
            {
                string type = "";
                foreach (var application in IsCorrigendumPending)
                {
                    var workflowArray = JArray.Parse(application.WorkFlow);
                    hasPending = workflowArray.Any(item => string.Equals((string)item["status"]!, "pending", StringComparison.OrdinalIgnoreCase));
                    type = application.Type!;
                    if (application.Status == "Sanctioned")
                    {
                        var corrigendumFields = JObject.Parse(application.CorrigendumFields);

                        foreach (var field in corrigendumFields.Properties())
                        {
                            if (field.Name == "Files")
                                continue;

                            var newValue = field.Value["new_value"]?.ToString();
                            if (!string.IsNullOrEmpty(newValue))
                            {
                                UpdateFieldValueRecursively(formDetailsToken, field.Name, newValue);
                            }
                        }
                    }
                }
            }


            var serviceDetails = dbcontext.Services.FirstOrDefault(s => s.ServiceId == details.ServiceId);
            bool isSanctioned = details.Status == "Sanctioned";
            // Deserialize
            formDetailsToken = ReorderFormDetails(formDetailsToken, applicationId, isSanctioned);
            var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails!);

            var officerArray = JsonConvert.DeserializeObject<JArray>(details.WorkFlow!);
            int currentPlayer = details.CurrentPlayer;

            // Update workflow "canPull"
            UpdateWorkflowFlags(officerArray!, currentPlayer);
            details.WorkFlow = JsonConvert.SerializeObject(officerArray);
            dbcontext.SaveChanges();

            // Clone current officer
            var currentOfficer = officerArray!.FirstOrDefault(o => (int)o["playerId"]! == currentPlayer);
            var currentOfficerClone = currentOfficer != null ? (JObject)currentOfficer.DeepClone() : new JObject();

            InjectEditableActionForm(currentOfficerClone, serviceDetails, currentPlayer);
            UpdateOfficerActionFormLabels(currentOfficerClone, formDetails);

            ReplaceCodeFieldsWithNames(formDetailsToken);
            FormatDateFields(formDetailsToken);

            return Json(new
            {
                list = formDetailsToken,
                currentOfficerDetails = currentOfficerClone,
                hasPending,
                isSanctioned
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetSanctionLetter(string applicationId)
        {
            OfficerDetailsModal officer = GetOfficerDetails();
            var formdetails = dbcontext.CitizenApplications.FirstOrDefault(fd => fd.ReferenceNumber == applicationId);
            var lettersJson = dbcontext.Services
                       .FirstOrDefault(s => s.ServiceId == Convert.ToInt32(formdetails!.ServiceId))?.Letters;

            var parsed = JsonConvert.DeserializeObject<Dictionary<string, dynamic>>(lettersJson!);
            dynamic? sanctionSection = parsed!.TryGetValue("Sanction", out var sanction) ? sanction : null;
            var tableFields = sanctionSection!.tableFields;
            var sanctionLetterFor = sanctionSection.letterFor;
            var information = sanctionSection.information;

            var details = dbcontext.CitizenApplications
                .FirstOrDefault(ca => ca.ReferenceNumber == applicationId);



            var formData = JsonConvert.DeserializeObject<JObject>(details!.FormDetails!);

            // Final key-value pair list for the PDF
            var pdfFields = new Dictionary<string, string>();

            foreach (var item in tableFields)
            {
                var formatted = GetFormattedValue(item, formData);
                string label = formatted.Label ?? "[Label Missing]";
                string value = formatted.Value ?? "";

                pdfFields[label] = value;
            }

            // Call your PDF generator
            await _pdfService.CreateSanctionPdf(pdfFields, sanctionLetterFor?.ToString() ?? "", information?.ToString() ?? "", officer, applicationId);
            string fileName = applicationId.Replace("/", "_") + "_SanctionLetter.pdf";

            return Json(new
            {
                status = true,
                path = fileName
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetApplicationHistory(string ApplicationId, int page, int size)
        {
            if (string.IsNullOrEmpty(ApplicationId))
            {
                return BadRequest("ApplicationId is required.");
            }

            var parameter = new SqlParameter("@ApplicationId", ApplicationId);
            var application = await dbcontext.CitizenApplications.FirstOrDefaultAsync(ca => ca.ReferenceNumber == ApplicationId);
            var players = JsonConvert.DeserializeObject<dynamic>(application!.WorkFlow!) as JArray;
            int currentPlayerIndex = application.CurrentPlayer;
            var currentPlayer = players!.FirstOrDefault(o => (int)o["playerId"]! == currentPlayerIndex);
            var history = await dbcontext.ActionHistories.Where(ah => ah.ReferenceNumber == ApplicationId).ToListAsync();
            var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);


            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey="sno" },
                new { header = "Action Taker", accessorKey="actionTaker" },
                new { header = "Action Taken",accessorKey="actionTaken" },
                new { header = "Remarks",accessorKey="remarks" },
                new { header = "Action Taken On",accessorKey="actionTakenOn" },
            };
            int index = 1;
            List<dynamic> data = [];
            foreach (var item in history)
            {
                string officerArea = GetOfficerAreaForHistory(item.LocationLevel!, item.LocationValue);
                data.Add(new
                {
                    sno = index,
                    actionTaker = item.ActionTaker != "Citizen" ? item.ActionTaker + " " + officerArea : item.ActionTaker,
                    actionTaken = item.ActionTaken! == "ReturnToCitizen" ? "Returned to citizen for correction" : item.ActionTaken,
                    remarks = item.Remarks,
                    actionTakenOn = item.ActionTakenDate,
                });
                index++;
            }
            if ((string)currentPlayer!["status"]! == "pending")
            {
                string designation = (string)currentPlayer["designation"]!;
                string officerArea = GetOfficerArea(designation, formDetails);
                data.Add(new
                {
                    sno = index,
                    actionTaker = currentPlayer["designation"] + " " + officerArea,
                    actionTaken = currentPlayer["status"],
                    actionTakenOn = "",
                });
            }

            return Json(new { data, columns, customActions = new { } });
        }

        [HttpGet]
        public async Task<IActionResult> GenerateUserDetailsPdf(string applicationId)
        {
            if (string.IsNullOrEmpty(applicationId))
            {
                return BadRequest("Application ID is required.");
            }

            // Retrieve application details
            var application = await dbcontext.CitizenApplications
                .Where(ca => ca.ReferenceNumber == applicationId)
                .FirstOrDefaultAsync();


            if (application == null)
            {
                return NotFound("Application not found.");
            }

            using (var memoryStream = new MemoryStream())
            {
                // Initialize PDF writer and document
                var writer = new PdfWriter(memoryStream);
                var pdf = new PdfDocument(writer);
                var document = new Document(pdf, PageSize.A4);
                document.SetMargins(20, 20, 20, 20);

                string serviceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == application.ServiceId)!.ServiceName!;

                // Parse FormDetails JSON
                var formDetails = JObject.Parse(application.FormDetails!);

                // Create a header table for title and applicant image
                var headerTable = new Table(UnitValue.CreatePercentArray(new float[] { 70, 30 }));
                headerTable.SetWidth(UnitValue.CreatePercentValue(100));

                // Title cell
                var titleCell = new Cell(1, 1)
                .Add(new Paragraph("Citizen Application Details")
                    .SetFontSize(16)
                    .SetBold()
                    .SetTextAlignment(TextAlignment.CENTER)
                    .SetFontColor(new DeviceRgb(25, 118, 210))
                    .SetMarginBottom(5)) // Reduced margin to bring serviceName closer
                .Add(new Paragraph(serviceName)
                    .SetFontSize(12)
                    .SetTextAlignment(TextAlignment.CENTER)
                    .SetFontColor(new DeviceRgb(0, 0, 0)) // Black color for serviceName
                    .SetMarginBottom(15))
                .SetBorder(Border.NO_BORDER)
                .SetVerticalAlignment(VerticalAlignment.MIDDLE);
                headerTable.AddCell(titleCell);

                // Applicant image cell
                var imagePath = GetFormFieldValue(formDetails, "ApplicantImage");
                var imageCell = new Cell(1, 1)
                    .SetBorder(Border.NO_BORDER)
                    .SetVerticalAlignment(VerticalAlignment.MIDDLE)
                    .SetTextAlignment(TextAlignment.RIGHT);

                if (!string.IsNullOrEmpty(imagePath))
                {
                    var ImageDetails = dbcontext.UserDocuments.FirstOrDefault(u => u.FileName == imagePath);
                    if (ImageDetails != null)
                    {
                        try
                        {
                            var imageData = ImageDataFactory.Create(ImageDetails.FileData);
                            var image = new Image(imageData)
                                .ScaleToFit(50, 50)
                                .SetBorder(new SolidBorder(new DeviceRgb(25, 118, 210), 2))
                                .SetBorderRadius(new BorderRadius(4))
                                .SetMargins(5, 5, 5, 5);
                            imageCell.Add(image);
                        }
                        catch (Exception ex)
                        {
                            imageCell.Add(new Paragraph($"Image error: {ex.Message}")
                                .SetFontSize(8)
                                .SetFontColor(ColorConstants.RED)
                                .SetTextAlignment(TextAlignment.RIGHT));
                        }
                    }
                    else
                    {
                        imageCell.Add(new Paragraph("Image not found")
                            .SetFontSize(8)
                            .SetFontColor(ColorConstants.RED)
                            .SetTextAlignment(TextAlignment.RIGHT));
                    }
                }
                else
                {
                    imageCell.Add(new Paragraph("No image")
                        .SetFontSize(8)
                        .SetFontColor(ColorConstants.GRAY)
                        .SetTextAlignment(TextAlignment.RIGHT));
                }
                headerTable.AddCell(imageCell);

                document.Add(headerTable);

                // Create a table for application details
                var detailsTable = new Table(2);
                detailsTable.SetWidth(UnitValue.CreatePercentValue(100));
                detailsTable.SetMarginBottom(20);

                // Add section headers and details
                foreach (var section in formDetails)
                {
                    if (section.Key == "Documents" || section.Key == "ApplicantImage") continue;

                    // Add section header spanning both columns
                    var sectionHeader = new Cell(1, 2)
                        .Add(new Paragraph(FormatSectionKey(section.Key))
                            .SetFontSize(14)
                            .SetBold()
                            .SetFontColor(new DeviceRgb(242, 140, 56))
                            .SetMarginTop(15)
                            .SetMarginBottom(10))
                        .SetBorder(Border.NO_BORDER)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(5));
                    detailsTable.AddCell(sectionHeader);

                    if (section.Value is JArray sectionArray)
                    {
                        foreach (var item in sectionArray)
                        {
                            var label = item["label"]?.ToString();
                            var value = item["value"]?.ToString();

                            if (!string.IsNullOrEmpty(label) && !string.IsNullOrEmpty(value))
                            {
                                string displayValue = ConvertValueForDisplay(label, value);

                                var labelCell = new Cell()
                                    .Add(new Paragraph(FormatFieldLabel(label))
                                        .SetFontSize(11)
                                        .SetBold()
                                        .SetFontColor(new DeviceRgb(51, 51, 51)))
                                    .SetBorder(Border.NO_BORDER)
                                    .SetPadding(8)
                                    .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                    .SetBorderRadius(new BorderRadius(4));
                                detailsTable.AddCell(labelCell);

                                var valueCell = new Cell()
                                    .Add(new Paragraph(displayValue)
                                        .SetFontSize(12)
                                        .SetFontColor(new DeviceRgb(0, 0, 0)))
                                    .SetBorder(Border.NO_BORDER)
                                    .SetPadding(8)
                                    .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                    .SetBorderRadius(new BorderRadius(4));
                                detailsTable.AddCell(valueCell);

                                if (item["additionalFields"] is JArray additionalFields)
                                {
                                    foreach (var additionalField in additionalFields)
                                    {
                                        var addLabel = additionalField["label"]?.ToString();
                                        var addValue = additionalField["value"]?.ToString();
                                        if (!string.IsNullOrEmpty(addLabel) && !string.IsNullOrEmpty(addValue))
                                        {
                                            string addDisplayValue = ConvertValueForDisplay(addLabel, addValue);

                                            var addLabelCell = new Cell()
                                                .Add(new Paragraph(FormatFieldLabel(addLabel))
                                                    .SetFontSize(10)
                                                    .SetBold()
                                                    .SetFontColor(new DeviceRgb(51, 51, 51)))
                                                .SetBorder(Border.NO_BORDER)
                                                .SetPadding(6)
                                                .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                                .SetBorderRadius(new BorderRadius(4))
                                                .SetPaddingLeft(20);
                                            detailsTable.AddCell(addLabelCell);

                                            var addValueCell = new Cell()
                                                .Add(new Paragraph(addDisplayValue)
                                                    .SetFontSize(10)
                                                    .SetFontColor(new DeviceRgb(0, 0, 0)))
                                                .SetBorder(Border.NO_BORDER)
                                                .SetPadding(6)
                                                .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                                .SetBorderRadius(new BorderRadius(4));
                                            detailsTable.AddCell(addValueCell);

                                            if (additionalField["additionalFields"] is JArray nestedFields)
                                            {
                                                foreach (var nestedField in nestedFields)
                                                {
                                                    var nestedLabel = nestedField["label"]?.ToString();
                                                    var nestedValue = nestedField["value"]?.ToString();
                                                    if (!string.IsNullOrEmpty(nestedLabel) && !string.IsNullOrEmpty(nestedValue))
                                                    {
                                                        string nestedDisplayValue = ConvertValueForDisplay(nestedLabel, nestedValue);

                                                        var nestedLabelCell = new Cell()
                                                            .Add(new Paragraph(FormatFieldLabel(nestedLabel))
                                                                .SetFontSize(10)
                                                                .SetBold()
                                                                .SetFontColor(new DeviceRgb(51, 51, 51)))
                                                            .SetBorder(Border.NO_BORDER)
                                                            .SetPadding(6)
                                                            .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                                            .SetBorderRadius(new BorderRadius(4))
                                                            .SetPaddingLeft(30);
                                                        detailsTable.AddCell(nestedLabelCell);

                                                        var nestedValueCell = new Cell()
                                                            .Add(new Paragraph(nestedDisplayValue)
                                                                .SetFontSize(10)
                                                                .SetFontColor(new DeviceRgb(0, 0, 0)))
                                                            .SetBorder(Border.NO_BORDER)
                                                            .SetPadding(6)
                                                            .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                                            .SetBorderRadius(new BorderRadius(4));
                                                        detailsTable.AddCell(nestedValueCell);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                document.Add(detailsTable);

                // Add Attached Documents section without header
                var documents = formDetails["Documents"] as JArray;
                bool hasDocuments = documents != null && documents.Any();
                if (hasDocuments)
                {
                    foreach (var doc in documents!)
                    {
                        var filePath = doc["File"]?.ToString();
                        var enclosure = doc["label"]?.ToString();
                        var FileDetails = dbcontext.UserDocuments.FirstOrDefault(u => u.FileName == filePath);
                        if (FileDetails != null)
                        {
                            if (FileDetails.FileData != null)
                            {
                                try
                                {
                                    // Start a new page for each document
                                    using var inputStream = new MemoryStream(FileDetails.FileData);
                                    using var reader = new PdfReader(inputStream);
                                    using var tempMs = new MemoryStream();
                                    var srcPdf = new PdfDocument(reader, new PdfWriter(tempMs));
                                    var firstPage = srcPdf.GetPage(1);

                                    var canvas = new PdfCanvas(firstPage.NewContentStreamBefore(), firstPage.GetResources(), srcPdf);
                                    var canvasDoc = new Document(srcPdf);
                                    canvasDoc.ShowTextAligned(
                                        new Paragraph($"Document: {enclosure}")
                                            .SetFontSize(14)
                                            .SetBold()
                                            .SetFontColor(new DeviceRgb(242, 140, 56))
                                            .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                            .SetPadding(5),
                                        x: 36, y: firstPage.GetPageSize().GetTop() - 50,
                                        TextAlignment.LEFT
                                    );
                                    canvasDoc.Close();

                                    srcPdf = new PdfDocument(new PdfReader(new MemoryStream(tempMs.ToArray())));
                                    int documentPageCount = srcPdf.GetNumberOfPages();
                                    srcPdf.CopyPagesTo(1, documentPageCount, pdf);
                                    srcPdf.Close();
                                    document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));

                                }
                                catch (Exception ex)
                                {
                                    document.Add(new Paragraph($"Error loading {enclosure}: {ex.Message}")
                                        .SetFontSize(12)
                                        .SetFontColor(ColorConstants.RED)
                                        .SetMarginBottom(5));
                                }
                            }
                            else
                            {
                                document.Add(new Paragraph($"Document {enclosure}: File not found")
                                    .SetFontSize(12)
                                    .SetFontColor(ColorConstants.RED)
                                    .SetMarginBottom(5));
                            }
                        }
                    }
                }

                // Add Sanction Letter if application status is Sanctioned
                if (application.Status == "Sanctioned")
                {
                    var sanctionLetterPath = applicationId.Replace("/", "_") + "_SanctionLetter.pdf";
                    var FileDetails = dbcontext.UserDocuments.FirstOrDefault(u => u.FileName == sanctionLetterPath);
                    if (FileDetails != null)
                    {
                        try
                        {
                            using var inputStream = new MemoryStream(FileDetails.FileData);
                            using var reader = new PdfReader(inputStream);
                            using var tempMs = new MemoryStream();
                            var srcPdf = new PdfDocument(reader, new PdfWriter(tempMs));
                            var firstPage = srcPdf.GetPage(1);

                            var canvas = new PdfCanvas(firstPage.NewContentStreamBefore(), firstPage.GetResources(), srcPdf);
                            var canvasDoc = new Document(srcPdf);
                            canvasDoc.ShowTextAligned(
                                new Paragraph("Sanction Letter")
                                    .SetFontSize(14)
                                    .SetBold()
                                    .SetFontColor(new DeviceRgb(242, 140, 56))
                                    .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                    .SetPadding(5),
                                x: 36, y: firstPage.GetPageSize().GetTop() - 50,
                                TextAlignment.LEFT
                            );
                            canvasDoc.Close();

                            srcPdf = new PdfDocument(new PdfReader(new MemoryStream(tempMs.ToArray())));
                            int documentPageCount = srcPdf.GetNumberOfPages();
                            srcPdf.CopyPagesTo(1, documentPageCount, pdf);
                            srcPdf.Close();
                            document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));

                            var corrigendum = dbcontext.Corrigenda.Where(c => c.ReferenceNumber == applicationId).ToList();
                            if (corrigendum.Count > 0)
                            {
                                foreach (var cor in corrigendum)
                                {
                                    var corFileDetails = dbcontext.UserDocuments.FirstOrDefault(u =>
                                        u.FileName == cor.CorrigendumId.Replace("/", "_") + "_CorrigendumSanctionLetter.pdf");

                                    if (corFileDetails != null)
                                    {
                                        using var corInputStream = new MemoryStream(corFileDetails.FileData);
                                        using var corReader = new PdfReader(corInputStream);
                                        using var corTempMs = new MemoryStream();
                                        var corSrcPdf = new PdfDocument(corReader, new PdfWriter(corTempMs));
                                        var corFirstPage = corSrcPdf.GetPage(1);

                                        var corCanvas = new PdfCanvas(corFirstPage.NewContentStreamBefore(), corFirstPage.GetResources(), corSrcPdf);
                                        var corCanvasDoc = new Document(corSrcPdf);
                                        corCanvasDoc.ShowTextAligned(
                                            new Paragraph("Sanction Letter")
                                                .SetFontSize(14)
                                                .SetBold()
                                                .SetFontColor(new DeviceRgb(242, 140, 56))
                                                .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                                                .SetPadding(5),
                                            x: 36, y: corFirstPage.GetPageSize().GetTop() - 50,
                                            TextAlignment.LEFT
                                        );
                                        corCanvasDoc.Close();

                                        // Re-open the modified PDF to copy pages
                                        using var finalCorReader = new PdfReader(new MemoryStream(corTempMs.ToArray()));
                                        using var finalCorPdf = new PdfDocument(finalCorReader);
                                        int corDocumentPageCount = finalCorPdf.GetNumberOfPages();
                                        finalCorPdf.CopyPagesTo(1, corDocumentPageCount, pdf);
                                        finalCorPdf.Close();

                                        document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                                    }
                                    else
                                    {
                                        document.Add(new Paragraph($"Corrigendum Letter for ID {cor.CorrigendumId}: File not found")
                                            .SetFontSize(12)
                                            .SetFontColor(ColorConstants.RED)
                                            .SetMarginBottom(5));
                                    }
                                }

                            }

                        }
                        catch (Exception ex)
                        {
                            document.Add(new Paragraph($"Error loading Sanction Letter: {ex.Message}")
                                .SetFontSize(12)
                                .SetFontColor(ColorConstants.RED)
                                .SetMarginBottom(5));
                        }
                    }
                    else
                    {
                        document.Add(new Paragraph("Sanction Letter: File not found")
                            .SetFontSize(12)
                            .SetFontColor(ColorConstants.RED)
                            .SetMarginBottom(5));
                    }
                }

                // Add Application History on a new page only if there is content before it
                if (pdf.GetNumberOfPages() > 1 || hasDocuments || detailsTable.GetNumberOfRows() > 0 || application.Status == "Sanctioned")
                {
                    document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                }

                // Add Application History
                var players = JsonConvert.DeserializeObject<dynamic>(application.WorkFlow!) as JArray;
                int currentPlayerIndex = application.CurrentPlayer;
                var currentPlayer = players!.FirstOrDefault(o => (int)o["playerId"]! == currentPlayerIndex);
                var history = await dbcontext.ActionHistories.Where(ah => ah.ReferenceNumber == applicationId).ToListAsync();

                var historyTable = new Table(UnitValue.CreatePercentArray(new float[] { 10, 25, 25, 25, 15 }));
                historyTable.SetWidth(UnitValue.CreatePercentValue(100));
                historyTable.SetMarginTop(20);
                historyTable.SetMarginBottom(20);

                document.Add(new Paragraph("Application History")
                    .SetFontSize(14)
                    .SetBold()
                    .SetFontColor(new DeviceRgb(242, 140, 56))
                    .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                    .SetPadding(8)
                    .SetMarginTop(20)
                    .SetMarginBottom(10)
                    .SetTextAlignment(TextAlignment.LEFT)
                    .SetBorderRadius(new BorderRadius(5)));

                var headers = new[] { "S.No", "Action Taker", "Action Taken", "Remarks", "Action Taken On" };
                foreach (var header in headers)
                {
                    historyTable.AddHeaderCell(new Cell()
                        .Add(new Paragraph(header)
                            .SetFontSize(11)
                            .SetBold()
                            .SetFontColor(new DeviceRgb(51, 51, 51))
                            .SetTextAlignment(TextAlignment.CENTER))
                        .SetBackgroundColor(new DeviceRgb(200, 200, 200))
                        .SetPadding(8)
                        .SetBorderRadius(new BorderRadius(4)));
                }

                int index = 1;
                foreach (var item in history)
                {
                    string officerArea = GetOfficerAreaForHistory(item.LocationLevel!, item.LocationValue);
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(index.ToString())
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0))
                            .SetTextAlignment(TextAlignment.CENTER))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(item.ActionTaker != "Citizen" ? $"{item.ActionTaker} {officerArea}" : item.ActionTaker)
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0)))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(item.ActionTaken == "ReturnToCitizen" ? "Returned to citizen for correction" : item.ActionTaken)
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0)))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(item.Remarks ?? "")
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0)))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(item.ActionTakenDate.ToString())
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0))
                            .SetTextAlignment(TextAlignment.CENTER))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    index++;
                }

                if ((string)currentPlayer!["status"]! == "pending")
                {
                    string designation = (string)currentPlayer["designation"]!;
                    string officerArea = GetOfficerArea(designation, formDetails);
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(index.ToString())
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0))
                            .SetTextAlignment(TextAlignment.CENTER))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph($"{currentPlayer["designation"]} {officerArea}")
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0)))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph(currentPlayer["status"]!.ToString())
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0)))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph("")
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0)))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                    historyTable.AddCell(new Cell()
                        .Add(new Paragraph("")
                            .SetFontSize(10)
                            .SetFontColor(new DeviceRgb(0, 0, 0))
                            .SetTextAlignment(TextAlignment.CENTER))
                        .SetPadding(6)
                        .SetBackgroundColor(new DeviceRgb(245, 245, 245))
                        .SetBorderRadius(new BorderRadius(4)));
                }

                document.Add(historyTable);

                document.Close();
                writer.Close();

                var pdfBytes = memoryStream.ToArray();
                return File(pdfBytes, "application/pdf", $"{applicationId}_UserDetails.pdf");
            }
        }

        [HttpGet]
        public IActionResult RemoveFromPool(int ServiceId, string itemToRemove)
        {
            var officer = GetOfficerDetails();

            // Find the existing pool for this officer and service
            var poolRecord = dbcontext.Pools.FirstOrDefault(p =>
                p.ServiceId == ServiceId &&
                p.ListType == "Pool" &&
                p.AccessLevel == officer.AccessLevel &&
                p.AccessCode == officer.AccessCode);

            if (poolRecord == null || string.IsNullOrWhiteSpace(poolRecord.List))
            {
                return Json(new { status = false, message = "No existing pool found." });
            }

            // Deserialize the current pool list
            var poolList = JsonConvert.DeserializeObject<List<string>>(poolRecord.List) ?? new List<string>();

            // Remove the specified item (case-sensitive match)
            bool removed = poolList.Remove(itemToRemove);

            if (!removed)
            {
                return Json(new { status = false, message = "Item not found in the pool." });
            }

            // Serialize and update the pool list
            poolRecord.List = JsonConvert.SerializeObject(poolList);
            dbcontext.SaveChanges();

            return Json(new { status = true, ServiceId, removedItem = itemToRemove });
        }

        [HttpGet]
        public IActionResult GetApplicationForCorrigendum(string referenceNumber, string serviceId, string type, string? applicationId = null)
        {
            var officer = GetOfficerDetails();
            if (officer == null)
            {
                return Json(new { status = false, message = "Officer details not found." });
            }

            var ReferenceNumber = new SqlParameter("@ReferenceNumber", referenceNumber);
            var Role = new SqlParameter("@Role", officer.Role);
            var OfficerAccessLevel = new SqlParameter("@OfficerAccessLevel", officer.AccessLevel);
            var OfficerAccessCode = new SqlParameter("@OfficerAccessCode", officer.AccessCode);
            var ServiceId = new SqlParameter("@ServiceId", Convert.ToInt32(serviceId));
            var Type = new SqlParameter("@Type", type);
            var OfficerRole = new SqlParameter("@OfficerRole", officer.Role);

            var Message = new SqlParameter
            {
                ParameterName = "@Message",
                SqlDbType = SqlDbType.NVarChar,
                Size = 255,
                Direction = ParameterDirection.Output
            };

            // Check for pending Corrigendum/Correction
            var Status = new SqlParameter("@Status", DBNull.Value);

            var IsCorrigendumPending = dbcontext.Corrigenda
                .FromSqlRaw("EXEC GetCorrigendumByLocationAccess @OfficerAccessLevel, @OfficerAccessCode, @ReferenceNumber, @Status, @CorrigendumId, @Type, @OfficerRole",
                    OfficerAccessLevel, OfficerAccessCode, ReferenceNumber, Status, new SqlParameter("@CorrigendumId", DBNull.Value), Type, OfficerRole)
                .ToList();

            if (IsCorrigendumPending.Count != 0)
            {
                bool hasPending = false;
                foreach (var application in IsCorrigendumPending)
                {
                    var workflowArray = JArray.Parse(application.WorkFlow);
                    hasPending = workflowArray.Any(item => string.Equals((string)item["status"]!, "pending", StringComparison.OrdinalIgnoreCase));
                }
                if (hasPending)
                    return Json(new { status = false, message = $"A {type} is already in progress for this Application Id." });
            }

            var result = dbcontext.CitizenApplications
                .FromSqlRaw("EXEC GetApplicationForCorrigendum @ReferenceNumber, @Role, @OfficerAccessLevel, @OfficerAccessCode, @ServiceId, @Type, @Message OUTPUT",
                    ReferenceNumber, Role, OfficerAccessLevel, OfficerAccessCode, ServiceId, Type, Message)
                .ToList();

            string messageText = Message.Value?.ToString() ?? "Unknown";

            if (!result.Any())
            {
                return Json(new { status = false, message = messageText });
            }

            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == Convert.ToInt32(serviceId));
            if (service == null)
            {
                return Json(new { status = false, message = "Service not found." });
            }

            var formElements = service.FormElement;
            JObject documentFields;
            try
            {
                documentFields = string.IsNullOrEmpty(service.DocumentFields)
                    ? new JObject()
                    : JObject.Parse(service.DocumentFields);
            }
            catch (JsonException ex)
            {
                return Json(new { status = false, message = $"Failed to parse document fields: {ex.Message}" });
            }

            var corrigendumFieldNames = documentFields[type] is JArray fields
                ? fields.Select(f => f.ToString()).ToHashSet()
                : new HashSet<string>();

            var formDetailsJson = result[0].FormDetails;
            if (string.IsNullOrEmpty(formDetailsJson))
            {
                return Json(new { status = false, message = "Form details are missing." });
            }

            JObject formDetails;
            try
            {
                formDetails = JObject.Parse(formDetailsJson);
            }
            catch (JsonException ex)
            {
                return Json(new { status = false, message = $"Failed to parse form details: {ex.Message}" });
            }


            var workFlow = JArray.Parse(result[0].WorkFlow ?? "[]");
            bool isCurrentOfficer = type == "Correction" && workFlow.Count > result[0].CurrentPlayer &&
                                   workFlow[result[0].CurrentPlayer]["role"]?.ToString() == officer.Role;
            bool isSanctioned = result[0].Status == "Sanctioned";

            var nextOfficerDetails = workFlow.Count > 1 ? workFlow[1] : new JObject();
            string? nextOfficerDesignation = (string)nextOfficerDetails["designation"]!;
            string officerArea = GetOfficerArea(nextOfficerDesignation, formDetails);

            if (applicationId != null)
            {
                var corrigendum = dbcontext.Corrigenda
                    .FirstOrDefault(c => c.CorrigendumId == applicationId && c.Type == type);
                if (corrigendum == null)
                {
                    return Json(new { status = false, message = $"{type} not found." });
                }

                var corrigendumFields = corrigendum.CorrigendumFields;
                var history = JsonConvert.DeserializeObject<List<dynamic>>(corrigendum.History ?? "[]");
                var columns = new List<dynamic>
            {
                new { accessorKey = "sno", header = "S.No." },
                new { accessorKey = "officer", header = "Officer" },
                new { accessorKey = "actionTaken", header = "Action Taken" },
                new { accessorKey = "remarks", header = "Remarks" },
                new { accessorKey = "actionTakenOn", header = "Action Taken On" },
            };

                var data = new List<dynamic>();
                int index = 1;
                foreach (var item in history!)
                {
                    string officerName = item["officer"]?.ToString() ?? "Unknown";
                    string status = item["status"]?.ToString() ?? "Unknown";
                    string historyRemarks = item["remarks"]?.ToString() ?? "";
                    string actionTakenOn = item["actionTakenOn"]?.ToString() ?? "";

                    data.Add(new
                    {
                        sno = index,
                        officer = officerName,
                        actionTaken = status,
                        remarks = historyRemarks,
                        actionTakenOn
                    });
                    index++;
                }

                workFlow = JArray.Parse(corrigendum.WorkFlow ?? "[]");
                nextOfficerDetails = workFlow.Count > corrigendum.CurrentPlayer + 1 ? workFlow[corrigendum.CurrentPlayer + 1] : new JObject();
                nextOfficerDesignation = (string)nextOfficerDetails["designation"]!;
                officerArea = GetOfficerArea(nextOfficerDesignation, formDetails);

                JObject corrigendumFieldsJson = corrigendumFields is string
                    ? JObject.Parse(corrigendumFields)
                    : (JObject)corrigendumFields;

                JArray officerFiles = new();
                if (corrigendumFieldsJson["Files"] is JObject filesObject &&
                    filesObject[officer.RoleShort!] is JArray roleFiles)
                {
                    officerFiles = roleFiles;
                }

                return Json(new
                {
                    status = true,
                    corrigendumFields,
                    application = result[0],
                    formDetails,
                    allowedForDetails = corrigendumFieldNames,
                    formElements,
                    nextOfficer = nextOfficerDesignation + " " + officerArea,
                    columns,
                    data,
                    files = officerFiles,
                    isCurrentOfficer,
                    isSanctioned,
                    corrigendumType = corrigendum.Type,
                    userRole = officer.Role
                });
            }

            return Json(new
            {
                status = true,
                application = result[0],
                formDetails,
                allowedForDetails = corrigendumFieldNames,
                formElements,
                nextOfficer = nextOfficerDesignation + " " + officerArea,
                isCurrentOfficer,
                isSanctioned,
                corrigendumType = type,
                userRole = officer.Role
            });
        }

        [HttpGet]
        public IActionResult GetCorrigendumApplications(string type, string applicationType, string ServiceId, int pageIndex = 0, int pageSize = 10)
        {
            var officer = GetOfficerDetails();
            if (officer == null)
            {
                return Unauthorized();
            }

            _logger.LogInformation("------------------ Getting applications for officer: {Officer} -----------------------", officer.Role);
            var officerAccessLevel = new SqlParameter("@OfficerAccessLevel", officer.AccessLevel);
            var officerAccessCode = new SqlParameter("@OfficerAccessCode", officer.AccessCode);
            var referenceNumber = new SqlParameter("@ReferenceNumber", DBNull.Value);
            var status = new SqlParameter("@Status", type);
            var corrigendumId = new SqlParameter("@CorrigendumId", DBNull.Value);
            var Type = new SqlParameter("@Type", applicationType);
            var OfficerRole = new SqlParameter("@OfficerRole", officer.Role);

            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == Convert.ToInt32(ServiceId));

            List<dynamic> workflow;
            try
            {
                workflow = JsonConvert.DeserializeObject<List<dynamic>>(service!.OfficerEditableField!) ?? new List<dynamic>();
            }
            catch (JsonException ex)
            {
                return StatusCode(500, $"Error parsing workflow: {ex.Message}");
            }

            if (workflow.Count == 0)
                return Json(new { countList = new List<object>(), corrigendumList = new List<object>(), correctionList = new List<object>(), canSanction = false });

            // Find officer authorities
            dynamic authorities = workflow.FirstOrDefault(p => p.designation == officer.Role)!;

            var applications = dbcontext.Corrigenda
                .FromSqlRaw("EXEC GetCorrigendumByLocationAccess @OfficerAccessLevel, @OfficerAccessCode, @ReferenceNumber, @Status, @CorrigendumId, @Type, @OfficerRole",
                    officerAccessLevel, officerAccessCode, referenceNumber, status, corrigendumId, Type, OfficerRole)
                .ToList();

            var applicationReferenceNumbers = applications.Select(c => c.ReferenceNumber).ToList();
            var citizenApplications = dbcontext.CitizenApplications
                .Where(ca => applicationReferenceNumbers.Contains(ca.ReferenceNumber))
                .ToDictionary(ca => ca.ReferenceNumber!, ca => ca);

            var sortedData = applications.OrderBy(a =>
            {
                var parts = a.CorrigendumId!.Split('/');
                var numberPart = parts.Last();
                return int.TryParse(numberPart, out int num) ? num : 0;
            }).ToList();

            var totalRecords = sortedData.Count;

            var pagedData = sortedData
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            List<dynamic> data = new();

            foreach (var application in pagedData)
            {
                if (citizenApplications.TryGetValue(application.ReferenceNumber!, out var citizenApp))
                {
                    var formDetails = JsonConvert.DeserializeObject<dynamic>(citizenApp.FormDetails!);
                    var workFlow = JsonConvert.DeserializeObject<JArray>(application.WorkFlow!);
                    var creationOfficer = workFlow![0];
                    string creationOfficerDesignation = (string)creationOfficer["designation"]!;
                    string officerArea = GetOfficerArea(creationOfficerDesignation, JObject.Parse(citizenApp.FormDetails!));
                    var customActions = new List<dynamic>();

                    var history = JArray.Parse(application.History!);
                    var firstAction = history[0];


                    var currentOfficer = workFlow!.FirstOrDefault(o => (string)o["designation"]! == officer.Role);
                    var officerWithApplication = workFlow.FirstOrDefault(o => (int)o["playerId"]! == application.CurrentPlayer!);
                    string? CurrentStatus = (string)officerWithApplication!["status"]!;
                    // Add Pull if applicable
                    bool canPull = currentOfficer?["canPull"] != null && (bool)currentOfficer["canPull"]!;

                    if ((type == "forwarded" || type == "returned") && canPull)
                    {
                        customActions.Add(new
                        {
                            type = "Pull",
                            tooltip = "Pull",
                            color = "#F0C38E",
                            actionFunction = "pullApplication"
                        });
                    }
                    else
                    {
                        var matchedItem = workFlow
                       .FirstOrDefault(item => (string)item["designation"]! == officer.Role);


                        bool isToEdit = matchedItem != null && (string?)matchedItem["status"] == "pending" && (int?)matchedItem["playerId"] == application.CurrentPlayer && authorities != null && (bool)authorities!.canCorrigendum && (string)firstAction["actionTaker"]! != "Citizen";
                        string actionFunction = isToEdit ? "handleEditCorrigendumApplication" : application.Status == "Sanctioned" ? "handleViewPdf" : "handleViewCorrigendumApplication";
                        customActions.Add
                        (
                            new
                            {
                                type = application.Status == "sanctioned" ? "View" : "DownloadCorrigendum",
                                tooltip = "View Corrigendum",
                                corrigendumId = application.CorrigendumId,
                                color = "#F0C38E",
                                actionFunction,
                            }
                        );
                    }


                    string applicationId = application.CorrigendumId.ToString();

                    data.Add(new
                    {
                        referenceNumber = application.ReferenceNumber,
                        applicationId = application.CorrigendumId,
                        createdBy = (string)firstAction["actionTaken"]! == "Citizen" ? "Citizent" : creationOfficerDesignation + " " + officerArea,
                        applicantName = GetFieldValue("ApplicantName", formDetails),
                        currentStatus = CurrentStatus == "sanctioned" ? "Issued" : CurrentStatus,
                        creationDate = application.CreatedAt.ToString("dd MMM yyyy hh:mm:ss tt"),
                        applicationType = applicationType,
                        serviceId = citizenApp.ServiceId,
                        customActions
                    });
                }
            }

            List<dynamic> columns = new()
            {
                new { accessorKey = "applicationId", header = applicationType + " Id" },
                new { accessorKey = "createdBy", header = "Creation Officer" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "currentStatus", header = "Current Status" },
                new { accessorKey = "creationDate", header = applicationType + " Creation Date" },
                new { accessorKey = "applicationType", header = "Application Type" }
            };

            return Json(new
            {
                data,
                columns,
                poolData = new List<dynamic>(),
                totalRecords
            });
        }
        [HttpGet]
        public IActionResult GetCorrigendumApplication(string? referenceNumber = null, string? corrigendumId = null, string? type = null)
        {
            if (string.IsNullOrEmpty(corrigendumId))
            {
                return BadRequest("Corrigendum number is required.");
            }

            var officer = GetOfficerDetails();
            if (officer == null)
            {
                return Unauthorized();
            }

            var officerAccessLevel = new SqlParameter("@OfficerAccessLevel", officer.AccessLevel);
            var officerAccessCode = new SqlParameter("@OfficerAccessCode", officer.AccessCode);
            var referenceNumberParam = new SqlParameter("@ReferenceNumber", (object?)referenceNumber ?? DBNull.Value);
            var statusParam = new SqlParameter("@Status", DBNull.Value);
            var corrigendumIdParam = new SqlParameter("@CorrigendumId", (object?)corrigendumId ?? DBNull.Value);
            var Type = new SqlParameter("@Type", (object?)type ?? DBNull.Value);

            var corrigendumApplication = dbcontext.Corrigenda
                .FromSqlRaw("EXEC GetCorrigendumByLocationAccess @OfficerAccessLevel, @OfficerAccessCode, @ReferenceNumber, @Status, @CorrigendumId, @Type",
                    officerAccessLevel, officerAccessCode, referenceNumberParam, statusParam, corrigendumIdParam, Type)
                .ToList()
                .FirstOrDefault();

            if (corrigendumApplication == null)
            {
                return NotFound("Corrigendum application not found.");
            }

            referenceNumber = corrigendumApplication.ReferenceNumber;

            List<dynamic>? history = string.IsNullOrEmpty(corrigendumApplication.History)
                ? []
                : JsonConvert.DeserializeObject<List<dynamic>>(corrigendumApplication.History);

            var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);
            if (application == null)
            {
                return NotFound("Citizen application not found.");
            }

            var formDetails = JObject.Parse(application.FormDetails!);
            bool noaction = true;
            dynamic? sanctionOfficer = null;

            var applicationWorkFlow = string.IsNullOrEmpty(application.WorkFlow)
                ? null
                : JsonConvert.DeserializeObject<JArray>(application.WorkFlow);

            UpdateWorkflowFlags(applicationWorkFlow!, application.CurrentPlayer);
            application.WorkFlow = JsonConvert.SerializeObject(applicationWorkFlow);

            if (!string.IsNullOrEmpty(corrigendumApplication.WorkFlow))
            {
                var corrigendumWorkFlow = JsonConvert.DeserializeObject<JArray>(corrigendumApplication.WorkFlow);

                // Use the CurrentPlayer (or similar property) from corrigendumApplication
                UpdateWorkflowFlags(corrigendumWorkFlow!, corrigendumApplication.CurrentPlayer);

                corrigendumApplication.WorkFlow = JsonConvert.SerializeObject(corrigendumWorkFlow);
            }

            dbcontext.SaveChanges();

            if (applicationWorkFlow != null)
            {
                foreach (var item in applicationWorkFlow)
                {
                    if (item["status"]?.ToString() == "sanctioned")
                    {
                        sanctionOfficer = item;
                    }
                }
            }

            List<JObject>? Officer = string.IsNullOrEmpty(corrigendumApplication.WorkFlow)
                ? null
                : JsonConvert.DeserializeObject<List<JObject>>(corrigendumApplication.WorkFlow);

            if (Officer == null || corrigendumApplication.CurrentPlayer < 0 || corrigendumApplication.CurrentPlayer >= Officer.Count)
            {
                return BadRequest("Invalid workflow or current player index.");
            }

            var currentOfficer = Officer[corrigendumApplication.CurrentPlayer];
            if (currentOfficer["designation"]?.ToString() != officer.Role ||
                (currentOfficer["designation"]?.ToString() == officer.Role && currentOfficer["status"]?.ToString() != "pending"))
            {
                noaction = false;
            }

            var corrigendumFields = string.IsNullOrEmpty(corrigendumApplication.CorrigendumFields)
                ? null
                : JsonConvert.DeserializeObject<JObject>(corrigendumApplication.CorrigendumFields);

            string remarks = corrigendumFields?["remarks"]?.ToString() ?? "";

            List<dynamic> actions = [new { label = "Reject", value = "reject" }];

            if (Convert.ToInt32(currentOfficer["playerId"]) > 0)
            {
                var prevOfficer = Officer[corrigendumApplication.CurrentPlayer - 1];
                string prevOfficerDesignation = (string)prevOfficer["designation"]!;
                string officerArea = GetOfficerArea(prevOfficerDesignation, formDetails);



                actions.Add(new { label = $"Return to {prevOfficerDesignation} {officerArea}", value = "return" });
                if (sanctionOfficer == null && type == "Correction")
                {
                    actions.Add(new { label = $"Verify", value = "verified" });
                }
            }

            if (sanctionOfficer != null && sanctionOfficer!["designation"]?.ToString() == currentOfficer["designation"]?.ToString())
            {
                actions.Add(new { label = "Issue Corrigendum", value = "sanction" });
            }
            else if (Officer.Count > corrigendumApplication.CurrentPlayer + 1)
            {
                var nextOfficer = Officer[corrigendumApplication.CurrentPlayer + 1];
                string nextOfficerDesignation = (string)nextOfficer["designation"]!;
                string officerArea = GetOfficerArea(nextOfficerDesignation, formDetails);

                actions.Add(new { label = $"Forward to {nextOfficerDesignation} {officerArea}", value = "forward" });
            }

            List<dynamic> columns = [
                new { accessorKey = "sno", header = "S.No." },
            new { accessorKey = "actionTaker", header = "Action Taker" },
            new { accessorKey = "actionTaken", header = "Action Taken" },
            new { accessorKey = "remarks", header = "Remarks" },
            new { accessorKey = "actionTakenOn", header = "Action Taken On" },
            ];

            var data = new List<dynamic>();
            int index = 1;
            string roleShort = "";
            if (history != null)
            {
                foreach (var item in history)
                {
                    string officerName = item["actionTaker"]?.ToString() ?? "Unknown";
                    string status = item["status"]?.ToString() ?? "Unknown";
                    string historyRemarks = item["remarks"]?.ToString() ?? "";
                    string actionTakenOn = item["actionTakenOn"]?.ToString() ?? "";
                    if (!officerName.Contains("Citizen"))
                    {

                        string[] words = officerName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        string firstThreeWords = string.Join(" ", words.Take(4));
                        _logger.LogInformation($"Officer Name: {officerName} First Three Words: {firstThreeWords}");

                        var designation = dbcontext.OfficersDesignations
                            .FirstOrDefault(od => od.Designation == firstThreeWords);

                        roleShort = designation?.DesignationShort ?? "Unknown";
                        _logger.LogInformation($"Role Short: {roleShort}");
                    }
                    data.Add(new
                    {
                        sno = index,
                        actionTaker = officerName,
                        actionTaken = status,
                        remarks = historyRemarks,
                        actionTakenOn,
                    });
                    index++;
                }
            }

            var formdetails = JObject.Parse(application.FormDetails!);
            foreach (var item in JsonConvert.DeserializeObject<List<dynamic>>(corrigendumApplication.WorkFlow)!)
            {
                if (item["status"] == "pending")
                {
                    data.Add(new
                    {
                        sno = index,
                        actionTaker = item["designation"] + " " + GetOfficerArea(item["designation"].ToString(), formdetails),
                        actionTaken = item["status"],
                        remarks = item["remarks"],
                        actionTakenOn = item["completedAt"]
                    });
                    break;
                }
            }

            List<dynamic> fieldColumns = [
                new { accessorKey = "formField", header = "Description" },
                    new { accessorKey = "oldvalue", header = "As Existing" },
                    new { accessorKey = "newvalue", header = "As Corrected" },
                ];

            var fieldsData = new List<dynamic>();
            var stack = new Stack<(string path, JToken field)>();

            if (corrigendumFields != null)
            {
                foreach (var item in corrigendumFields)
                {
                    if (item.Key != "remarks" && item.Key != "Files" && item.Value is JObject)
                    {
                        stack.Push((item.Key, item.Value));
                    }
                }
            }

            while (stack.Count > 0)
            {
                var (path, field) = stack.Pop();
                string header = Regex.Replace(path, "(\\B[A-Z])", " $1");

                string oldValue = field["old_value"]?.ToString() ?? "";
                string newValue = field["new_value"]?.ToString() ?? "";

                // 🔁 Check for "Date" in the path and format oldValue/newValue
                if (path.IndexOf("Date", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    if (DateTime.TryParse(oldValue, out DateTime oldDt))
                        oldValue = oldDt.ToString("dd MMM yyyy");

                    if (DateTime.TryParse(newValue, out DateTime newDt))
                        newValue = newDt.ToString("dd MMM yyyy");
                }

                fieldsData.Add(new
                {
                    formField = header,
                    oldvalue = oldValue,
                    newvalue = newValue
                });

                var additionalValues = field["additional_values"];
                if (additionalValues != null && additionalValues is JObject nested)
                {
                    foreach (var nestedItem in nested)
                    {
                        string nestedPath = $"{path}.{nestedItem.Key}";
                        stack.Push((nestedPath, nestedItem.Value)!);
                    }
                }
            }


            var corFiles = corrigendumFields?["Files"] as JObject;
            _logger.LogInformation($"Cor Files: {corFiles}");

            var allFiles = corFiles?
                .Properties()
                .SelectMany(p => p.Value is JArray arr
                    ? arr.Select(f => f?.ToString()).Where(f => !string.IsNullOrWhiteSpace(f))
                    : Enumerable.Empty<string>())
                .ToList() ?? new List<string>()!;

            if (!allFiles.Any())
            {
                allFiles.Add("NO FILES");
            }

            _logger.LogInformation($"All Files: {string.Join(", ", allFiles)}");



            return Json(new
            {
                data,
                columns,
                fieldColumns,
                fieldsData,
                canTakeAction = noaction,
                actions,
                remarks,
                corrigendumApplication.CorrigendumId,
                files = allFiles
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetCorrigendumSanctionLetter(string referenceNumber, string corrigendumId)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return Unauthorized("Officer details not found.");
                }

                var corrigendum = dbcontext.Corrigenda
                    .FirstOrDefault(c => c.ReferenceNumber == referenceNumber && c.CorrigendumId == corrigendumId);
                if (corrigendum == null)
                {
                    return NotFound("Corrigendum not found.");
                }

                var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);
                if (application == null)
                {
                    return NotFound("Citizen application not found.");
                }

                var workflow = JArray.Parse(application.WorkFlow!);
                _logger.LogInformation($"Workflow: {workflow}");

                JToken sanctionedOfficer = workflow.FirstOrDefault(p => (string)p["status"]! == "sanctioned")!;
                _logger.LogInformation($"Sanction Officer: {sanctionedOfficer}");

                string? sanctionDate = (string)sanctionedOfficer["completedAt"]!;
                _logger.LogInformation($"Sanction Date: {sanctionDate}");

                var service = dbcontext.Services
                    .FirstOrDefault(s => s.ServiceId == application.ServiceId);
                if (service == null)
                {
                    return NotFound("Service not found.");
                }

                var corrigendumFieldsObj = JObject.Parse(corrigendum.CorrigendumFields ?? "{}");
                corrigendumFieldsObj.Remove("Files");

                await _pdfService.CreateCorrigendumSanctionPdf(
                    corrigendumFieldsObj.ToString(),
                    referenceNumber,
                    officer,
                    service.ServiceName!,
                    corrigendumId,
                    sanctionDate
                );

                var filePath = corrigendumId.Replace("/", "_") + "_CorrigendumSanctionLetter.pdf";
                return Json(new { status = true, path = filePath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, response = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetWithheldApplication(string referenceNumber, string serviceId)
        {
            if (string.IsNullOrEmpty(referenceNumber) || string.IsNullOrEmpty(serviceId))
            {
                return Json(new { status = false, response = "Reference number and service ID are required." });
            }

            if (!int.TryParse(serviceId, out int parsedServiceId))
            {
                return Json(new { status = false, response = "Invalid service ID format." });
            }

            var officer = GetOfficerDetails();
            if (officer == null)
            {
                return Json(new { status = false, response = "Unauthorized: Officer details not found." });
            }

            var withheldApplication = dbcontext.WithheldApplications
                .FirstOrDefault(wa => wa.ReferenceNumber == referenceNumber && wa.ServiceId == parsedServiceId);

            var citizenApplication = dbcontext.CitizenApplications
                .FirstOrDefault(ca => ca.ReferenceNumber == referenceNumber);

            if (withheldApplication == null)
            {
                if (citizenApplication == null)
                {
                    return Json(new { status = false, response = "Application not found." });
                }
                if (citizenApplication.Status != "Sanctioned")
                {
                    return Json(new { status = false, response = "Application is not sanctioned and cannot be withheld." });
                }
            }

            bool canPermanentToTemporary = true;
            var history = dbcontext.ActionHistories.Where(ah => ah.ReferenceNumber == referenceNumber && ah.ActionTaken.Contains("Withheld")).ToList();
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey="sno" },
                new { header = "Action Taker", accessorKey="actionTaker" },
                new { header = "Action Taken",accessorKey="actionTaken" },
                new { header = "Remarks", accessorKey="remarks" },
                new { header = "Action Taken On",accessorKey="actionTakenOn" },
            };
            int index = 1;
            List<dynamic> data = [];
            foreach (var item in history)
            {
                string officerArea = GetOfficerAreaForHistory(item.LocationLevel!, item.LocationValue);

                data.Add(new
                {
                    sno = index,
                    actionTaker = item.ActionTaker != "Citizen" ? item.ActionTaker + " " + officerArea : item.ActionTaker,
                    actionTaken = item.ActionTaken! == "ReturnToCitizen" ? "Returned to citizen for correction" : item.ActionTaken,
                    remarks = item.Remarks,
                    actionTakenOn = item.ActionTakenDate,
                });
                index++;
            }

            var application = new ExpandoObject() as IDictionary<string, object>;
            var Withheld = new ExpandoObject() as IDictionary<string, dynamic>;

            if (withheldApplication != null)
            {
                Withheld["withheldType"] = withheldApplication!.WithheldType;
                Withheld["withheldReason"] = withheldApplication!.WithheldReason;
                Withheld["isWithheld"] = withheldApplication.IsWithheld;
                Withheld["files"] = JsonConvert.DeserializeObject<List<string>>(withheldApplication.Files!)!;
            }
            if (citizenApplication?.FormDetails != null)
            {
                try
                {
                    var formDetails = JToken.Parse(citizenApplication.FormDetails);
                    var tswovalue = dbcontext.Tswotehsils.FirstOrDefault(to => to.TehsilId == Convert.ToInt32(GetFieldValue("Tehsil", formDetails)));
                    var dswovalue = dbcontext.Districts.FirstOrDefault(to => to.DistrictId == Convert.ToInt32(GetFieldValue("District", formDetails)))!.DistrictName;



                    application["applicantName"] = GetFieldValue("ApplicantName", formDetails) ?? "N/A";
                    application["parentage"] = GetFieldValue("RelationName", formDetails) ?? "N/A";
                    application["r/o"] = $"DISTRICT: {dswovalue}, ADDRESS: {GetFieldValue("PresentAddress", formDetails)}";
                }
                catch (JsonException)
                {
                    return Json(new { status = false, response = "Error parsing application form details." });
                }
            }
            else
            {
                application["applicantName"] = "N/A";
                application["parentage"] = "N/A";
            }
            bool recordExists = withheldApplication != null;

            return Json(new
            {
                status = true,
                application = Withheld,
                canPermanentToTemporary,
                applicationDetails = application,
                data,
                columns,
                recordExists
            });
        }

        [HttpGet]
        public IActionResult GetApplicationsForAadhaarValidation(int pageIndex = 0, int pageSize = 10, int serviceId = 1)
        {
            var officerDetails = GetOfficerDetails();

            var role = new SqlParameter("@Role", officerDetails.Role);
            var accessLevel = new SqlParameter("@AccessLevel", officerDetails.AccessLevel);
            var accessCode = new SqlParameter("@AccessCode", officerDetails.AccessCode);
            var applicationStatus = new SqlParameter("@ApplicationStatus", "sanctioned");
            var ServiceId = new SqlParameter("@ServiceId", serviceId);
            var pageIndexParam = new SqlParameter("@PageIndex", pageIndex);
            var pageSizeParam = new SqlParameter("@PageSize", pageSize);
            var isPaginated = new SqlParameter("@IsPaginated", 1);
            var dataTypeParam = new SqlParameter("@DataType", "legacy");
            var aadhaarFilterParam = new SqlParameter("@AadhaarFilter", "empty"); // Added for pending validations
            var totalRecordsParam = new SqlParameter
            {
                ParameterName = "@TotalRecords",
                SqlDbType = System.Data.SqlDbType.Int,
                Direction = System.Data.ParameterDirection.Output
            };

            var response = dbcontext.CitizenApplications
                 .FromSqlRaw(
                     "EXEC GetApplicationForAadhaarValidation @Role, @AccessLevel, @AccessCode, @ApplicationStatus, @ServiceId, @PageIndex, @PageSize, @IsPaginated, @DataType, @AadhaarFilter, @TotalRecords OUTPUT",
                     role, accessLevel, accessCode, applicationStatus, ServiceId,
                     pageIndexParam, pageSizeParam, isPaginated, dataTypeParam, aadhaarFilterParam, totalRecordsParam
                 )
                 .ToList();

            int totalRecords = (int)(totalRecordsParam.Value ?? 0);

            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
            new { accessorKey = "referenceNumber", header = "Reference Number" },
            new { accessorKey = "applicantName", header = "Applicant Name" },
            new { accessorKey = "parentage", header = "Parentage" },
            new { accessorKey = "dob", header = "Date Of Birth" },
        ];
            List<dynamic> data = [];

            foreach (var app in response)
            {
                var customActions = new List<dynamic>();
                customActions.Add(new
                {
                    type = "ValidateAadhaar",
                    tooltip = "Validate",
                    color = "#F0C38E",
                    actionFunction = "handleValidateAadhaar"
                });
                var formDetails = JObject.Parse(app.FormDetails!);
                _logger.LogInformation($"---------- Form Details: {formDetails} ---------------");

                var dob = GetFieldValue("DateOfBirth", formDetails);
                if (DateTime.TryParse(dob, out DateTime dobDate))
                {
                    dob = dobDate.ToString("dd MMM yyyy");
                }
                data.Add(new
                {
                    sno = data.Count + 1 + (pageIndex * pageSize),
                    referenceNumber = app.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails) ?? "N/A",
                    parentage = GetFieldValue("Parentage", formDetails) ?? "N/A",
                    dob = dob ?? "N/A",
                    input = true,
                    customActions,
                });
            }

            return Json(new
            {
                data,
                columns,
                totalRecords
            });
        }

        public IActionResult GetValidatedAadhaarApplications(int pageIndex = 0, int pageSize = 10, int serviceId = 1)
        {
            var officerDetails = GetOfficerDetails();

            var role = new SqlParameter("@Role", officerDetails.Role);
            var accessLevel = new SqlParameter("@AccessLevel", officerDetails.AccessLevel);
            var accessCode = new SqlParameter("@AccessCode", officerDetails.AccessCode);
            var applicationStatus = new SqlParameter("@ApplicationStatus", "sanctioned");
            var ServiceId = new SqlParameter("@ServiceId", serviceId);
            var pageIndexParam = new SqlParameter("@PageIndex", pageIndex);
            var pageSizeParam = new SqlParameter("@PageSize", pageSize);
            var isPaginated = new SqlParameter("@IsPaginated", 1);
            var dataTypeParam = new SqlParameter("@DataType", "legacy");
            var aadhaarFilterParam = new SqlParameter("@AadhaarFilter", "not_empty");
            var totalRecordsParam = new SqlParameter
            {
                ParameterName = "@TotalRecords",
                SqlDbType = System.Data.SqlDbType.Int,
                Direction = System.Data.ParameterDirection.Output
            };

            var response = dbcontext.CitizenApplications
                .FromSqlRaw(
                    "EXEC GetApplicationForAadhaarValidation @Role, @AccessLevel, @AccessCode, @ApplicationStatus, @ServiceId, @PageIndex, @PageSize, @IsPaginated, @DataType, @AadhaarFilter, @TotalRecords OUTPUT",
                    role, accessLevel, accessCode, applicationStatus, ServiceId,
                    pageIndexParam, pageSizeParam, isPaginated, dataTypeParam, aadhaarFilterParam, totalRecordsParam
                )
                .ToList();

            int totalRecords = (int)(totalRecordsParam.Value ?? 0);

            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "parentage", header = "Parentage" },
                new { accessorKey = "dob", header = "Date Of Birth" },
                new { accessorKey = "aadhaarStatus", header = "Aadhaar Status" }
            ];
            List<dynamic> data = [];

            foreach (var app in response)
            {
                var formDetails = JObject.Parse(app.FormDetails!);
                _logger.LogInformation($"---------- Form Details: {formDetails} ---------------");

                var dob = GetFieldValue("DateOfBirth", formDetails);
                if (DateTime.TryParse(dob, out DateTime dobDate))
                {
                    dob = dobDate.ToString("dd MMM yyyy");
                }
                data.Add(new
                {
                    sno = data.Count + 1 + (pageIndex * pageSize),
                    referenceNumber = app.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails) ?? "N/A",
                    parentage = GetFieldValue("Parentage", formDetails) ?? "N/A",
                    dob = dob ?? "N/A",
                    aadhaarStatus = "Validated"
                });
            }

            return Json(new
            {
                data,
                columns,
                totalRecords
            });
        }


        public class AadhaarValidationCount
        {
            public int TotalSanctioned { get; set; }
            public int AadhaarValidated { get; set; }
            public int AadhaarNotValidated { get; set; }
        }

        public IActionResult GetAadhaarValidationCount(string serviceId, string? division = null, string? district = null, string? tehsil = null)
        {
            var officerDetails = GetOfficerDetails();

            // Compute restricted filters based on officer access
            string officerAccessLevel = officerDetails.AccessLevel!;
            int? officerAccessCode = officerDetails.AccessCode;
            int? restrictedDivision = null;
            int? restrictedDistrict = null;
            int? restrictedTehsil = null;

            if (officerAccessLevel == "Division")
            {
                restrictedDivision = officerAccessCode;
            }
            else if (officerAccessLevel == "District")
            {
                var districtEntity = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == officerAccessCode);
                if (districtEntity != null)
                {
                    restrictedDivision = districtEntity.Division; // Assuming DivisionId property
                    restrictedDistrict = officerAccessCode;
                }
            }
            else if (officerAccessLevel == "Tehsil")
            {
                var tehsilEntity = dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == officerAccessCode);
                if (tehsilEntity != null)
                {
                    restrictedDistrict = tehsilEntity.DistrictId;
                    var districtEntity = dbcontext.Districts.FirstOrDefault(d => d.DistrictId == tehsilEntity.DistrictId);
                    if (districtEntity != null)
                    {
                        restrictedDivision = districtEntity.Division;
                    }
                    restrictedTehsil = officerAccessCode;
                }
            }

            // Enforce restrictions by overriding input parameters if necessary
            if (restrictedTehsil != null)
            {
                tehsil = restrictedTehsil.ToString();
            }
            if (restrictedDistrict != null)
            {
                district = restrictedDistrict.ToString();
            }
            if (restrictedDivision != null)
            {
                division = restrictedDivision.ToString();
            }

            string accessLevel;
            object? accessCode = DBNull.Value;
            object? divisionCode = DBNull.Value;

            // Pick correct access level
            if (!string.IsNullOrWhiteSpace(tehsil))
            {
                accessLevel = "Tehsil";
                accessCode = int.TryParse(tehsil, out var tehsilVal) ? tehsilVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(district))
            {
                accessLevel = "District";
                accessCode = int.TryParse(district, out var districtVal) ? districtVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(division))
            {
                accessLevel = "Division";
                accessCode = int.TryParse(division, out var divisionVal) ? divisionVal : DBNull.Value;
                divisionCode = accessCode; // For compatibility with SQL proc
            }
            else
            {
                accessLevel = "State";
            }

            var parameters = new List<SqlParameter>
            {
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) },
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode ?? DBNull.Value },
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode ?? DBNull.Value },
                new("@AadhaarFilter", SqlDbType.VarChar) { Value = DBNull.Value } // null by default
            };

            // Fetch Aadhaar validation counts
            var counts = dbcontext.Database
                .SqlQueryRaw<AadhaarValidationCount>(
                    "EXEC GetAadhaarValidationCount @AccessLevel, @AccessCode, @ServiceId, @DivisionCode, @AadhaarFilter",
                    parameters.ToArray()
                )
                .AsEnumerable()
                .FirstOrDefault() ?? new AadhaarValidationCount();

            // Define application status data
            var dataList = new List<dynamic>
            {
                new
                {
                    title = "Total Sanctioned",
                    value = counts.TotalSanctioned.ToString("N0"),
                    category = "application",
                    color = "#fff",
                    bgColor = "#4f46e5",
                    gradientStart = "#4f46e5",
                    gradientEnd = "#3b82f6",
                },
                new
                {
                    title = "Aadhaar Validated",
                    value = counts.AadhaarValidated.ToString("N0"),
                    category = "application",
                    color = "#fff",
                    bgColor = "#059669",
                    gradientStart = "#059669",
                    gradientEnd = "#10b981",
                },
                new
                {
                    title = "Aadhaar Not Validated",
                    value = counts.AadhaarNotValidated.ToString("N0"),
                    category = "application",
                    color = "#fff",
                    bgColor = "#f59e0b",
                    gradientStart = "#f59e0b",
                    gradientEnd = "#fbbf24",
                },
            };

            // Prepare officer access info for frontend
            var officerAccess = new
            {
                accessLevel = officerAccessLevel,
                accessCode = officerAccessCode,
                restrictedDivision,
                restrictedDistrict,
                restrictedTehsil
            };

            return Json(new { dataList, officerAccess });
        }

        public IActionResult GetAadhaarValidationData(string serviceId, string type, int pageIndex = 0, int pageSize = 10, string state = "0", string? division = null, string? district = null, string? tehsil = null)
        {
            // Determine AccessLevel and AccessCode based on filters
            string accessLevel;
            object accessCode = DBNull.Value;
            object divisionCode = DBNull.Value;

            if (!string.IsNullOrWhiteSpace(tehsil))
            {
                accessLevel = "Tehsil";
                accessCode = int.TryParse(tehsil, out var tehsilVal) ? tehsilVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(district))
            {

                accessLevel = "District";
                accessCode = int.TryParse(district, out var districtVal) ? districtVal : DBNull.Value;
            }
            else if (!string.IsNullOrWhiteSpace(division))
            {
                accessLevel = "Division";
                accessCode = int.TryParse(division, out var divisionVal) ? divisionVal : DBNull.Value;
                divisionCode = accessCode;
            }
            else
            {
                accessLevel = "State";
                accessCode = state == "0" ? 0 : DBNull.Value; // Assuming "0" represents Jammu & Kashmir
            }

            // Validate AccessLevel and AccessCode
            if ((accessLevel == "Tehsil" || accessLevel == "District") && accessCode == DBNull.Value)
            {
                return BadRequest("Invalid AccessCode for the specified AccessLevel.");
            }
            if (accessLevel == "Division" && divisionCode == DBNull.Value)
            {
                return BadRequest("Invalid DivisionCode for Division AccessLevel.");
            }

            // Parameters for GetMainApplicationStatusData
            var parameters = new List<SqlParameter>
            {
                new("@ServiceId", SqlDbType.Int) { Value = int.Parse(serviceId) },
                new("@AccessLevel", SqlDbType.VarChar) { Value = accessLevel },
                new("@AccessCode", SqlDbType.Int) { Value = accessCode },
                new("@DivisionCode", SqlDbType.Int) { Value = divisionCode },
                new("@AadhaarFilter", SqlDbType.VarChar) { Value = (object)(type == "sanctioned" ? null : type)! ?? DBNull.Value },
                new("@PageIndex", SqlDbType.Int) { Value = pageIndex },
                new("@PageSize", SqlDbType.Int) { Value = pageSize },
                new("@IsPaginated", SqlDbType.Bit) { Value = 1 },
                new("@TotalRecords", SqlDbType.Int) { Direction = ParameterDirection.Output }
            };

            // Fetch application data
            var response = dbcontext.CitizenApplications
                .FromSqlRaw(
                    "EXEC GetAadhaarValidationData @AccessLevel, @AccessCode, @ServiceId, @DivisionCode, @AadhaarFilter, @PageIndex, @PageSize, @IsPaginated, @TotalRecords OUTPUT",
                    parameters.ToArray()
                )
                .ToList();

            int totalRecords = (int)parameters.Find(p => p.ParameterName == "@TotalRecords")!.Value;

            // Fetch service details for serviceName
            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == int.Parse(serviceId));
            if (service == null)
            {
                return NotFound();
            }

            // Columns for the table
            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "serviceName", header = "Service Name" },
                new { accessorKey = "status", header = "Application Status" },
                new { accessorKey = "submissionDate", header = "Submission Date" }
            ];

            List<dynamic> data = [];

            // Start numbering based on pagination
            int snoCounter = (pageIndex * pageSize) + 1;

            foreach (var details in response)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails!);
                string serviceName = service.ServiceName!;
                string status = details.Status!; // Use WorkflowStatus from stored procedure

                var applicationObject = new
                {
                    sno = snoCounter++,
                    referenceNumber = details.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails),
                    submissionDate = details.CreatedAt,
                    serviceName,
                    status,
                    serviceId = details.ServiceId
                };

                data.Add(applicationObject);
            }

            return Json(new
            {
                data,
                columns,
                totalRecords
            });
        }

        public IActionResult SearchApplication(string ServiceId, string ReferenceNumber)
        {
            var officer = GetOfficerDetails();
            int serviceId = Convert.ToInt32(ServiceId);

            var application = dbcontext.CitizenApplications
                .FirstOrDefault(ca => ca.ServiceId == serviceId && ca.ReferenceNumber == ReferenceNumber);

            if (application == null)
            {
                return Json(new { status = false, message = "Application not found" });
            }

            var formDetails = JObject.Parse(application.FormDetails ?? "{}");
            var formDetailsToken = JToken.Parse(application.FormDetails!);
            formDetailsToken = ReorderFormDetails(formDetailsToken, ReferenceNumber, application.Status == "Sanctioned");
            ReplaceCodeFieldsWithNames(formDetailsToken);

            // Extract Tehsil & District only once
            int? tehsilId = Convert.ToInt32(GetFieldValue("Tehsil", formDetails));
            int? districtId = Convert.ToInt32(GetFieldValue("District", formDetails));

            // Preload district & tehsil objects only if needed
            var district = districtId.HasValue
                ? dbcontext.Districts.FirstOrDefault(d => d.DistrictId == districtId.Value)
                : null;

            var tehsil = tehsilId.HasValue
                ? dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == tehsilId.Value)
                : null;

            // Compute accessCode in one place
            int accessCode = officer.AccessLevel switch
            {
                "Tehsil" => tehsilId ?? 0,
                "District" => districtId ?? 0,
                "Division" => district?.Division ?? 0,
                _ => 0
            };

            // Officer has access
            if (officer.AccessCode == accessCode)
            {
                return Json(new { status = true, isAccessible = true, formDetailsToken });
            }

            // Officer does not have access
            return Json(new
            {
                status = true,
                isAccessible = false,
                message = $"You don't have access of this application. This application belongs to District: {district!.DistrictName}, Tehsil: {tehsil!.TehsilName}",
            });
        }
    }
}