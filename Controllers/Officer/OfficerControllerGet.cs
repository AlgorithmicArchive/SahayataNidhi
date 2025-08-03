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

namespace SahayataNidhi.Controllers.Officer
{
    public partial class OfficerController : Controller
    {

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
                CanManageBankFiles = authorities.canManageBankFiles ?? false
            };

            // Prepare SQL parameters
            var sqlParams = new List<SqlParameter>
            {
                new SqlParameter("@AccessLevel", officer.AccessLevel),
                new SqlParameter("@AccessCode", officer.AccessCode ?? (object)DBNull.Value),
                new SqlParameter("@ServiceId", ServiceId),
                new SqlParameter("@TakenBy", officer.Role),
                new SqlParameter("@DivisionCode", officer.AccessLevel == "Division" ? officer.AccessCode : (object)DBNull.Value)
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

            // Build count lists using a helper function
            var countList = BuildMainApplicationCounts(counts, officerAuthorities);
            var corrigendumList = BuildCorrigendumCounts(counts, officerAuthorities);
            var correctionList = BuildCorrectionCounts(counts, officerAuthorities);

            if (shiftedCount.ShiftedCount > 0)
            {
                countList.Add(new
                {
                    label = "Shifted To Another Location",
                    count = shiftedCount.ShiftedCount,
                    bgColor = "#ABCDEF",
                    textColor = "#123456"
                });
            }

            return Json(new
            {
                countList,
                corrigendumList,
                correctionList,
                canSanction = officerAuthorities.CanSanction,
                canHavePool = officerAuthorities.CanHavePool,
                canCorrigendum = officerAuthorities.CanCorrigendum,
                officerAuthorities
            });
        }

        [HttpGet]
        public IActionResult GetApplications(int ServiceId, string type, int pageIndex = 0, int pageSize = 10)
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
                // Shifted does not support pagination, fallback to manual paging
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
                // Use new paginated SP with output param
                response = dbcontext.CitizenApplications
                    .FromSqlRaw("EXEC GetApplicationsForOfficer @Role, @AccessLevel, @AccessCode, @ApplicationStatus, @ServiceId, @PageIndex, @PageSize, @IsPaginated, @TotalRecords OUTPUT",
                        role, accessLevel, accessCode, applicationStatus, serviceId,
                        pageIndexParam, pageSizeParam, isPaginated, totalRecordsParam)
                    .ToList();
            }

            int totalRecords = type == "shifted" ? response.Count : (int)totalRecordsParam.Value;

            // Common metadata columns
            List<dynamic> columns =
            [
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new {accessorKey="serviceName", header = "Service Name" },
                new { accessorKey = "status", header = "Application Status" },
                new { accessorKey = "submissionDate", header = "Submission Date" },

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

            foreach (var details in response)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails!);
                var officers = JsonConvert.DeserializeObject<JArray>(details.WorkFlow!);
                var currentPlayer = details.CurrentPlayer;
                string officerDesignation = (string)officers![currentPlayer!]!["designation"]!;
                string serviceName = dbcontext.Services.FirstOrDefault(s => s.ServiceId == details.ServiceId)!.ServiceName!;
                var corrigendums = dbcontext.Corrigenda.Where(co => co.ReferenceNumber == details.ReferenceNumber).ToList();
                List<string> corrigendumIds = new List<string>();

                foreach (var item in corrigendums)
                {
                    string value = GetSanctionedCorrigendum(JsonConvert.DeserializeObject<dynamic>(item.WorkFlow), item.CorrigendumId);
                    if (value != null)
                    {
                        corrigendumIds.Add(value);
                    }
                }

                string officerArea = GetOfficerArea(officerDesignation, formDetails);
                var customActions = new List<dynamic>();
                var rawStatus = officers[currentPlayer]["status"]!.ToString();

                var currentOfficer = officers!.FirstOrDefault(o => (string)o["designation"]! == officerDetails.Role);

                // Add Pull if applicable
                bool canPull = currentOfficer?["canPull"] != null && (bool)currentOfficer["canPull"]!;
                _logger.LogInformation($"---------------Can pull: {canPull}  Type: {type} ---------------");
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


                // Add other actions
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

                    customActions.Add(new
                    {
                        type = "DownloadSL",
                        tooltip = "View SL",
                        color = "#F0C38E",
                        actionFunction = "handleViewPdf"
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


                var applicationObject = new
                {
                    referenceNumber = details.ReferenceNumber,
                    applicantName = GetFieldValue("ApplicantName", formDetails),
                    submissionDate = details.CreatedAt,
                    serviceName,
                    status = rawStatus == "returntoedit" ? "Pending With Citizen" : char.ToUpper(rawStatus[0]) + rawStatus.Substring(1),
                    serviceId = details.ServiceId,
                    customActions
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
        public IActionResult GetApplicationsForReports(int AccessCode, int ServiceId, string? StatusType = null, int pageIndex = 0, int pageSize = 10)
        {
            try
            {
                var officer = GetOfficerDetails();
                // Validate input parameters
                if (pageIndex < 0 || pageSize <= 0)
                {
                    _logger.LogWarning($"Invalid pagination parameters: pageIndex={pageIndex}, pageSize={pageSize}");
                    return BadRequest(new { error = "Invalid pageIndex or pageSize" });
                }

                // Log officer details for debugging
                var officerDetails = GetOfficerDetails();
                _logger.LogInformation($"Officer Role: {officerDetails?.Role}, AccessLevel: {officerDetails?.AccessLevel}");

                // Define SQL parameters for the stored procedure
                var accessCode = new SqlParameter("@AccessCode", AccessCode);
                var serviceId = new SqlParameter("@ServiceId", ServiceId);
                var accessLevel = new SqlParameter("@AccessLevel", officer.AccessLevel == "Tehsil" ? "Tehsil" : "District");

                // Execute the stored procedure
                var response = dbcontext.Database
                    .SqlQueryRaw<SummaryReports>("EXEC GetApplicationsForReport @AccessCode, @ServiceId, @AccessLevel", accessCode, serviceId, accessLevel)
                    .ToList();

                _logger.LogInformation($"Fetched {response.Count} records for AccessCode: {AccessCode}, ServiceId: {ServiceId}, Response: {JsonConvert.SerializeObject(response)}");

                // Handle empty result set
                if (!response.Any())
                {
                    _logger.LogWarning($"No data returned for AccessCode: {AccessCode}, ServiceId: {ServiceId}");
                }

                // Sorting by TehsilName (optional, as stored procedure already orders by TehsilName)
                var sortedResponse = response.OrderBy(a => a.TehsilName).ToList();

                // Pagination
                var totalRecords = sortedResponse.Count;
                var pagedResponse = sortedResponse
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Define columns for the frontend
                List<dynamic> columns = new List<dynamic>
                {
                    new { accessorKey = "tehsilName", header = "Tehsil Name" },
                    new { accessorKey = "totalApplicationsSubmitted", header = "Total Applications Received" },
                    new { accessorKey = "totalApplicationsPending", header = "Total Applications Pending" },
                    new { accessorKey = "totalApplicationsReturnToEdit", header = "Total Applications Pending With Citizens" },
                    new { accessorKey = "totalApplicationsSanctioned", header = "Total Applications Sanctioned" },
                    new { accessorKey = "totalApplicationsRejected", header = "Total Applications Rejected" },

                };

                // Map the paged response to dynamic data for the frontend
                List<dynamic> data = pagedResponse.Select(item => new
                {
                    tehsilName = item.TehsilName,
                    totalApplicationsSubmitted = item.TotalApplicationsSubmitted,
                    totalApplicationsPending = item.TotalApplicationsPending,
                    totalApplicationsReturnToEdit = item.TotalApplicationsReturnToEdit,
                    totalApplicationsSanctioned = item.TotalApplicationsSanctioned,
                    totalApplicationsRejected = item.TotalApplicationsRejected,

                }).Cast<dynamic>().ToList();

                // Return JSON response
                return Json(new
                {
                    data,
                    columns,
                    totalRecords
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error executing GetApplicationsForReport for AccessCode: {AccessCode}, ServiceId: {ServiceId}");
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

            bool hasPending = false;
            if (IsCorrigendumPending.Count != 0)
            {
                string type = "";
                foreach (var application in IsCorrigendumPending)
                {
                    var workflowArray = JArray.Parse(application.WorkFlow);
                    hasPending = workflowArray.Any(item => string.Equals((string)item["status"]!, "pending", StringComparison.OrdinalIgnoreCase));
                    type = application.Type!;
                }
            }


            var serviceDetails = dbcontext.Services.FirstOrDefault(s => s.ServiceId == details.ServiceId);
            bool isSanctioned = details.Status == "Sanctioned";
            // Deserialize
            var formDetailsToken = JToken.Parse(details.FormDetails!);
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

                JArray officerFiles = new JArray();
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

                    var currentOfficer = workFlow!.FirstOrDefault(o => (string)o["designation"]! == officer.Role);

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


                        bool isToEdit = matchedItem != null && (string?)matchedItem["status"] == "pending" && (int?)matchedItem["playerId"] == application.CurrentPlayer && authorities != null && (bool)authorities!.canCorrigendum;
                        string actionFunction = isToEdit ? "handleEditCorrigendumApplication" : "handleViewCorrigendumApplication";
                        customActions.Add
                        (
                            new
                            {
                                type = "View",
                                tooltip = "View",
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
                        creationOfficer = creationOfficerDesignation + " " + officerArea,
                        applicantName = GetFieldValue("ApplicantName", formDetails),
                        creationDate = application.CreatedAt.ToString("dd MMM yyyy hh:mm:ss tt"),
                        applicationType = applicationType,
                        serviceId = citizenApp.ServiceId,
                        customActions
                    });
                }
            }

            List<dynamic> columns = new List<dynamic>
            {
                new { accessorKey = "applicationId", header = applicationType + " Id" },
                new { accessorKey = "creationOfficer", header = "Creation Officer" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
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

                actions.Add(new { label = "Forward", value = "forward" });
            }

            List<dynamic> columns = [
                new { accessorKey = "sno", header = "S.No." },
            new { accessorKey = "officer", header = "Officer" },
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
                    string officerName = item["officer"]?.ToString() ?? "Unknown";
                    string status = item["status"]?.ToString() ?? "Unknown";
                    string historyRemarks = item["remarks"]?.ToString() ?? "";
                    string actionTakenOn = item["actionTakenOn"]?.ToString() ?? "";
                    string[] words = officerName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    string firstThreeWords = string.Join(" ", words.Take(4));
                    _logger.LogInformation($"Officer Name: {officerName} First Three Words: {firstThreeWords}");

                    var designation = dbcontext.OfficersDesignations
                        .FirstOrDefault(od => od.Designation == firstThreeWords);

                    roleShort = designation?.DesignationShort ?? "Unknown";
                    _logger.LogInformation($"Role Short: {roleShort}");

                    data.Add(new
                    {
                        sno = index,
                        officer = officerName,
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
                        officer = item["designation"] + " " + GetOfficerArea(item["designation"].ToString(), formdetails),
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
            var files = corFiles?.ContainsKey(roleShort) ?? false ? corFiles[roleShort] : "NO FILES";

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
                files
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetCorrigendumSanctionLetter(string applicationId, string corrigendumId)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return Unauthorized("Officer details not found.");
                }

                var corrigendum = dbcontext.Corrigenda
                    .FirstOrDefault(c => c.ReferenceNumber == applicationId && c.CorrigendumId == corrigendumId);
                if (corrigendum == null)
                {
                    return NotFound("Corrigendum not found.");
                }

                var application = dbcontext.CitizenApplications.FirstOrDefault(ca => ca.ReferenceNumber == applicationId);
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
                    applicationId,
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

    }
}