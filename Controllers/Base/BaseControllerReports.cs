using System.Data;
using System.Dynamic;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers
{
    public partial class BaseController
    {
        public string GetOfficerAreaForHistory(string accessLevel, int? accessCode)
        {


            switch (accessLevel)
            {
                case "Tehsil":
                    var tehsil = dbcontext.Tswotehsil.FirstOrDefault(t => t.TehsilId == accessCode);
                    return tehsil?.TehsilName ?? string.Empty;

                case "District":
                    var district = dbcontext.District.FirstOrDefault(d => d.DistrictId == accessCode);
                    return district?.DistrictName ?? string.Empty;

                case "Division":
                    var districtForDivision = dbcontext.District.FirstOrDefault(d => d.DistrictId == accessCode);
                    if (districtForDivision == null)
                        return string.Empty;
                    return districtForDivision.Division == 1 ? "Jammu" : "Kashmir";
                case "State":
                    return "J&K";
                default:
                    return string.Empty;
            }
        }
        public string GetOfficerArea(string accessLevel, dynamic formDetails)
        {
            int accessCode;

            switch (accessLevel)
            {
                case "Tehsil":
                    accessCode = Convert.ToInt32(GetFieldValue("Tehsil", formDetails));
                    var tehsil = dbcontext.Tswotehsil.FirstOrDefault(t => t.TehsilId == accessCode);
                    return tehsil?.TehsilName ?? string.Empty;

                case "District":
                    accessCode = Convert.ToInt32(GetFieldValue("District", formDetails));
                    var district = dbcontext.District.FirstOrDefault(d => d.DistrictId == accessCode);
                    return district?.DistrictName ?? string.Empty;

                case "Division":
                    accessCode = Convert.ToInt32(GetFieldValue("District", formDetails));
                    var districtForDivision = dbcontext.District.FirstOrDefault(d => d.DistrictId == accessCode);
                    if (districtForDivision == null)
                        return string.Empty;
                    return districtForDivision.Division == 1 ? "Jammu" : "Kashmir";
                case "State":
                    return "J&K";
                default:
                    return string.Empty;
            }
        }
        public string GetApplications(string? scope, string? columnOrder, string? columnVisibility, int ServiceId, string? type, int pageIndex = 0, int pageSize = 10, string dataType = "new")
        {
            var officerDetails = GetOfficerDetails();

            var role = new SqlParameter("@Role", officerDetails!.Role);
            var accessLevel = new SqlParameter("@AccessLevel", officerDetails.AccessLevel);
            var accessCode = new SqlParameter("@AccessCode", officerDetails.AccessCode);
            var applicationStatus = new SqlParameter("@ApplicationStatus", (object?)type ?? DBNull.Value);
            var serviceId = new SqlParameter("@ServiceId", ServiceId);
            var pageIndexParam = new SqlParameter("@PageIndex", pageIndex);
            var pageSizeParam = new SqlParameter("@PageSize", pageSize);
            var isPaginated = new SqlParameter("@IsPaginated", scope == "InView");
            var dataTypeParam = new SqlParameter("@DataType", (object?)dataType ?? DBNull.Value);
            var totalRecordsParam = new SqlParameter
            {
                ParameterName = "@TotalRecords",
                SqlDbType = System.Data.SqlDbType.Int,
                Direction = System.Data.ParameterDirection.Output
            };

            List<CitizenApplications> response;

            var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == ServiceId);
            if (service == null) return JsonConvert.SerializeObject(new { data = new List<dynamic>(), columns = new List<dynamic>(), poolData = new List<dynamic>(), totalRecords = 0 });

            var workflow = JsonConvert.DeserializeObject<List<dynamic>>(service.OfficerEditableField!);
            dynamic authorities = workflow!.FirstOrDefault(p => p.designation == officerDetails.Role)!;

            if (type == "shifted")
            {
                response = dbcontext.CitizenApplications
                    .FromSqlRaw("EXEC GetShiftedApplications @Role, @AccessLevel, @AccessCode, @ServiceId",
                                role, accessLevel, accessCode, serviceId)
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

            // Deserialize column order and visibility
            var orderedColumns = JsonConvert.DeserializeObject<List<string>>(columnOrder ?? "[]")!;
            var visibility = JsonConvert.DeserializeObject<Dictionary<string, bool>>(columnVisibility ?? "{}")!;

            // Base columns
            List<dynamic> baseColumns = new List<dynamic>
            {
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "serviceName", header = "Service Name" },
                new { accessorKey = "status", header = "Application Status" },
                new { accessorKey = "submissionDate", header = "Citizen Submission Date" },
                new { accessorKey = "actionTakenOn", header = "Action Taken On" },
                new { accessorKey = "customActions", header = "Actions" }
            };

            // Apply ordering and visibility
            List<dynamic> filteredColumns = new List<dynamic>();
            if (orderedColumns.Count > 0)
            {
                foreach (var key in orderedColumns)
                {
                    if (visibility.TryGetValue(key, out var isVisible) && isVisible)
                    {
                        var col = baseColumns.FirstOrDefault(c => c.accessorKey == key);
                        if (col != null) filteredColumns.Add(col);
                    }
                }
            }
            else
            {
                // Ensure 'visibility' is strongly typed
                var visibilityDict = visibility as Dictionary<string, bool> ?? new Dictionary<string, bool>();

                // Filter columns based on visibility
                filteredColumns = baseColumns
                    .Where(c => !visibilityDict.TryGetValue(c.accessorKey, out bool isVisible) || isVisible)
                    .ToList();

            }

            List<dynamic> data = new List<dynamic>();
            List<dynamic> poolData = new List<dynamic>();

            var poolList = dbcontext.Pool.FirstOrDefault(p =>
                p.ServiceId == ServiceId &&
                p.AccessLevel == officerDetails.AccessLevel &&
                p.AccessCode == officerDetails.AccessCode
            );

            var pool = poolList != null && !string.IsNullOrWhiteSpace(poolList.List)
                ? JsonConvert.DeserializeObject<List<string>>(poolList.List)
                : new List<string>();

            int snoCounter = (pageIndex * pageSize) + 1;

            foreach (var details in response)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(details.FormDetails!);
                var officers = JsonConvert.DeserializeObject<JArray>(details.WorkFlow!);
                var currentPlayer = details.CurrentPlayer;

                var latestHistory = dbcontext.ActionHistory
                    .Where(h => h.ReferenceNumber == details.ReferenceNumber)
                    .AsEnumerable()
                    .OrderByDescending(h => DateTime.ParseExact(h.ActionTakenDate, "dd MMM yyyy hh:mm:ss tt", CultureInfo.InvariantCulture))
                    .FirstOrDefault();

                var parsedDate = latestHistory != null
                    ? DateTime.ParseExact(latestHistory.ActionTakenDate, "dd MMM yyyy hh:mm:ss tt", CultureInfo.InvariantCulture)
                    : DateTime.MinValue;

                // Custom Actions logic (simplified)
                var customActions = new List<dynamic>();
                if (type == "forwarded" || type == "returned" || type == "returntoedit")
                {
                    dynamic currentOfficer = officers!.FirstOrDefault(o => (string)o["designation"]! == officerDetails.Role)!;
                    if (currentOfficer?["canPull"] != null && (bool)currentOfficer!["canPull"]!)
                    {
                        customActions.Add(new { type = "Pull", tooltip = "Pull", color = "#F0C38E", actionFunction = "pullApplication" });
                    }
                }

                var item = new ExpandoObject() as IDictionary<string, object?>;

                foreach (var col in filteredColumns)
                {
                    switch ((string)col.accessorKey)
                    {
                        case "sno": item["sno"] = snoCounter++; break;
                        case "referenceNumber": item["referenceNumber"] = details.ReferenceNumber; break;
                        case "applicantName": item["applicantName"] = GetFieldValue("ApplicantName", formDetails); break;
                        case "serviceName": item["serviceName"] = dbcontext.Services.FirstOrDefault(s => s.ServiceId == details.ServiceId)?.ServiceName; break;
                        case "status": item["status"] = details.Status; break;
                        case "submissionDate": item["submissionDate"] = details.CreatedAt; break;
                        case "actionTakenOn": item["actionTakenOn"] = parsedDate == DateTime.MinValue ? null : parsedDate.ToString("dd MMM yyyy hh:mm:ss tt"); break;
                        case "customActions": item["customActions"] = customActions; break;
                    }
                }

                if (type == "shifted")
                    data.Add(item);
                else
                    (pool!.Contains(details.ReferenceNumber) && type == "pending" ? poolData : data).Add(item);
            }

            var result = Json(new
            {
                data,
                columns = filteredColumns,
                poolData,
                totalRecords,
                canSanction = authorities?.canSanction ?? false
            });

            return JsonConvert.SerializeObject(result);
        }

        public async Task<string> GetApplicationHistory(string? scope, string? columnOrder, string? columnVisibility, string ApplicationId, int page, int size)
        {
            var application = await dbcontext.CitizenApplications.FirstOrDefaultAsync(ca => ca.ReferenceNumber == ApplicationId);

            var players = JsonConvert.DeserializeObject<JArray>(application!.WorkFlow!);
            var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);
            int currentPlayerIndex = (int)application.CurrentPlayer!;
            var currentPlayer = players?.FirstOrDefault(o => (int)o["playerId"]! == currentPlayerIndex);

            var fullHistory = await dbcontext.ActionHistory
                .Where(ah => ah.ReferenceNumber == ApplicationId)
                .ToListAsync();

            // Apply scope-based filtering
            var history = (scope == "InView")
                ? fullHistory.Skip(page * size).Take(size).ToList()
                : fullHistory;

            // Define full columns
            List<dynamic> columns =
            [
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "actionTaker", header = "Action Taker" },
                new { accessorKey = "actionTaken", header = "Action Taken" },
                new { accessorKey = "remarks", header = "Remarks" },
                new { accessorKey = "actionTakenOn", header = "Action Taken On" },
            ];

            List<string> orderedColumns = JsonConvert.DeserializeObject<List<string>>(columnOrder!)!;
            Dictionary<string, bool> visibility = JsonConvert.DeserializeObject<Dictionary<string, bool>>(columnVisibility!)!;

            var filteredColumns = orderedColumns
                .Where(key => visibility.TryGetValue(key, out var isVisible) && isVisible)
                .Select(key =>
                    columns.FirstOrDefault(col =>
                        col.GetType().GetProperty("accessorKey")?.GetValue(col)?.ToString() == key
                    )
                )
                .Where(col => col != null)
                .ToList();

            List<dynamic> data = [];
            int index = 1;

            foreach (var his in history)
            {
                var officerArea = GetOfficerAreaForHistory(his.LocationLevel!, his.LocationValue);

                dynamic item = new ExpandoObject();
                var itemDict = (IDictionary<string, object?>)item;

                itemDict["sno"] = index;
                itemDict["actionTaker"] = his.ActionTaker != "Citizen"
                    ? $"{his.ActionTaker} {officerArea}"
                    : his.ActionTaker;
                itemDict["actionTaken"] = his.ActionTaken == "ReturnToCitizen"
                    ? "Returned to citizen for correction"
                    : his.ActionTaken;
                itemDict["remarks"] = his.Remarks;
                itemDict["actionTakenOn"] = his.ActionTakenDate;

                data.Add(item);
                index++;
            }

            if ((string)currentPlayer!["status"]! == "pending")
            {
                string designation = (string)currentPlayer["designation"]!;
                string accessLevel = (string)currentPlayer["accessLevel"]!;
                string officerArea = GetOfficerArea(accessLevel, formDetails);

                dynamic pendingItem = new ExpandoObject();
                var pendingDict = (IDictionary<string, object?>)pendingItem;

                pendingDict["sno"] = index;
                pendingDict["actionTaker"] = $"{designation} {officerArea}";
                pendingDict["actionTaken"] = "pending";
                pendingDict["remarks"] = "";
                pendingDict["actionTakenOn"] = "";

                data.Add(pendingItem);
            }

            var result = Json(new
            {
                data,
                columns = filteredColumns,
            });

            return JsonConvert.SerializeObject(result);
        }
        public string GetInitiatedApplications(string? scope, string? columnOrder, string? columnVisibility, int pageIndex = 0, int pageSize = 10)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var UserId = new SqlParameter("@UserId", Convert.ToInt32(userIdClaim));
            var PageIndex = new SqlParameter("@PageIndex", pageIndex);
            var PageSize = new SqlParameter("@PageSize", pageSize);
            var IsPaginated = new SqlParameter("@IsPaginated", scope == "InView");

            var TotalRecords = new SqlParameter("@TotalRecords", SqlDbType.Int) { Direction = ParameterDirection.Output };

            // Execute stored procedure
            var applications = dbcontext.CitizenApplications
                .FromSqlRaw("EXEC GetInitiatedApplications @UserId, @PageIndex, @PageSize, @IsPaginated, @TotalRecords OUTPUT",
                    UserId, PageIndex, PageSize, IsPaginated, TotalRecords)
                .ToList();

            // Retrieve the total record count from the output
            int totalRecords = TotalRecords.Value != DBNull.Value ? Convert.ToInt32(TotalRecords.Value) : 0;

            var sortedApplications = applications
                .ToList();

            var pagedApplications = (scope == "InView")
                ? [.. sortedApplications.Skip(pageIndex * pageSize).Take(pageSize)]
                : sortedApplications;

            var columns = new List<dynamic>
            {
                new { accessorKey = "sno", header = "S.No" },
                new { accessorKey = "serviceName", header = "Service Name" },
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "currentlyWith", header = "Currently With" },
                new { accessorKey = "submissionDate", header = "Submission Date" },
                new { accessorKey = "status", header = "Status" }
            };

            List<string> orderedColumns = JsonConvert.DeserializeObject<List<string>>(columnOrder!)!;
            Dictionary<string, bool> visibility = JsonConvert.DeserializeObject<Dictionary<string, bool>>(columnVisibility!)!;

            var filteredColumns = orderedColumns
                .Where(key => visibility.TryGetValue(key, out var isVisible) && isVisible)
                .Select(key =>
                    columns.FirstOrDefault(col =>
                        col.GetType().GetProperty("accessorKey")?.GetValue(col)?.ToString() == key
                    )
                )
                .Where(col => col != null)
                .ToList();

            var actionMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "pending", "Pending" },
                { "forwarded", "Forwarded" },
                { "sanctioned", "Sanctioned" },
                { "returned", "Returned" },
                { "rejected", "Rejected" },
                { "returntoedit", "Returned to citizen for correction" },
                { "Deposited", "Inserted to Bank File" },
                { "Dispatched", "Payment Under Process" },
                { "Disbursed", "Payment Disbursed" },
                { "Failure", "Payment Failed" }
            };

            var data = new List<dynamic>();
            int index = 0;

            foreach (var application in pagedApplications)
            {
                var formDetails = JsonConvert.DeserializeObject<dynamic>(application.FormDetails!);
                var officers = JsonConvert.DeserializeObject<JArray>(application.WorkFlow!);
                var currentPlayer = application.CurrentPlayer;
                string officerDesignation = (string)officers![currentPlayer!]!["designation"]!;
                string offierAccessLevel = (string)officers![currentPlayer!]!["accessLevel"]!;
                string officerStatus = (string)officers![currentPlayer!]!["status"]!;
                string officerArea = GetOfficerArea(offierAccessLevel, formDetails);

                string serviceName = dbcontext.Services
                    .FirstOrDefault(s => s.ServiceId == application.ServiceId)?
                    .ServiceName ?? "Unknown";

                dynamic row = new ExpandoObject();
                var rowDict = (IDictionary<string, object?>)row;

                var visibleKeys = filteredColumns
                    .Select(col => col!.GetType().GetProperty("accessorKey")?.GetValue(col)?.ToString())
                    .Where(key => !string.IsNullOrEmpty(key))
                    .ToHashSet();

                if (visibleKeys.Contains("sno"))
                    rowDict["sno"] = (pageIndex * pageSize) + index + 1;

                if (visibleKeys.Contains("serviceName"))
                    rowDict["serviceName"] = serviceName;

                if (visibleKeys.Contains("referenceNumber"))
                    rowDict["referenceNumber"] = application.ReferenceNumber;

                if (visibleKeys.Contains("applicantName"))
                    rowDict["applicantName"] = GetFieldValue("ApplicantName", formDetails);

                if (visibleKeys.Contains("currentlyWith"))
                    rowDict["currentlyWith"] = $"{officerDesignation} {officerArea}";

                if (visibleKeys.Contains("submissionDate"))
                    rowDict["submissionDate"] = application.CreatedAt;

                if (visibleKeys.Contains("status"))
                    rowDict["status"] = actionMap.TryGetValue(officerStatus!, out var label) ? label : officerStatus;

                data.Add(row);
                index++;
            }

            var result = Json(new
            {
                data,
                columns = filteredColumns,
                totalRecords,
            });

            return JsonConvert.SerializeObject(result);
        }


        [HttpPost]
        public IActionResult ExportData([FromForm] IFormCollection form)
        {
            try
            {
                string? columnOrder = form["columnOrder"];
                string? columnVisibility = form["columnVisibility"];
                string? scope = form["scope"];
                string? format = form["format"];
                int pageIndex = Convert.ToInt32(form["pageIndex"]);
                int pageSize = Convert.ToInt32(form["pageSize"]);
                int ServiceId = Convert.ToInt32(form["ServiceId"]);
                string? type = form["type"];
                string? function = form["function"];

                dynamic? result = null;
                if (function == "GetApplications")
                {
                    result = JsonConvert.DeserializeObject<dynamic>(GetApplications(scope, columnOrder, columnVisibility, ServiceId, type, pageIndex, pageSize));
                }
                else if (function == "GetInitiatedApplications")
                {
                    result = JsonConvert.DeserializeObject<dynamic>(GetInitiatedApplications(scope, columnOrder, columnVisibility, pageIndex, pageSize));
                }

                if (result == null)
                {
                    _logger.LogError("No data returned from GetApplications.");
                    return Json(new { status = false, error = "No data available." });
                }

                var obj = result!["Value"];
                var data = obj["data"];
                var columns = obj["columns"]; // Note: Changed from "column" to match typical JSON structure


                // Deserialize columns and columnOrder for processing
                var columnList = JsonConvert.DeserializeObject<List<Dictionary<string, string>>>(columns.ToString());
                var dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(data.ToString());

                // Generate file based on format
                string fileName = $"Report_{scope}_{DateTime.Now:yyyyMMdd_HHmmss}";
                byte[] fileBytes;
                string contentType;

                switch (format?.ToLower())
                {
                    case "excel":
                        fileBytes = GenerateExcel(dataList, columnList);
                        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                        fileName += ".xlsx";
                        break;
                    case "csv":
                        fileBytes = GenerateCsv(dataList, columnList);
                        contentType = "text/csv";
                        fileName += ".csv";
                        break;
                    case "pdf":
                        fileBytes = GeneratePdf(dataList, columnList);
                        contentType = "application/pdf";
                        fileName += ".pdf";
                        break;
                    default:
                        _logger.LogError($"Invalid format: {format}");
                        return Json(new { status = false, error = "Invalid format specified." });
                }

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating export file.");
                return Json(new { status = false, error = $"Error generating file: {ex.Message}" });
            }
        }


    }
}