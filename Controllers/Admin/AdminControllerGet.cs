using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

namespace SahayataNidhi.Controllers.Admin
{
    public partial class AdminController : Controller
    {



        [HttpGet]
        public IActionResult GetApplicationsForReports(int AccessCode, int ServiceId, string? StatusType = null, int pageIndex = 0, int pageSize = 10)
        {
            try
            {
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
                var accessLevel = new SqlParameter("@AccessLevel", "District");
                var dataType = new SqlParameter("@DataType", "new");

                // Execute the stored procedure
                var response = dbcontext.Database
                    .SqlQueryRaw<SummaryReports>("EXEC GetApplicationsForReport @AccessCode, @ServiceId, @AccessLevel, @DataType", accessCode, serviceId, accessLevel, dataType)
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
                List<dynamic> columns =
                [
                    new { accessorKey = "tehsilName", header = "Tehsil Name" },
                    new { accessorKey = "totalApplicationsSubmitted", header = "Total Applications Submitted" },
                    new { accessorKey = "totalApplicationsRejected", header = "Total Applications Rejected" },
                    new { accessorKey = "totalApplicationsSanctioned", header = "Total Applications Sanctioned" }
                ];

                // Map the paged response to dynamic data for the frontend
                List<dynamic> data = pagedResponse.Select(item => new
                {
                    tehsilName = item.TehsilName,
                    totalApplicationsSubmitted = item.TotalApplicationsSubmitted,
                    totalApplicationsRejected = item.TotalApplicationsRejected,
                    totalApplicationsSanctioned = item.TotalApplicationsSanctioned
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
        public IActionResult GetDetailsForDashboard()
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return BadRequest(new { error = "Officer details not found" });
                }

                var accessLevelParam = new SqlParameter("@AccessLevel", officer.AccessLevel ?? (object)DBNull.Value);
                var accessCodeParam = new SqlParameter("@AccessCode", officer.AccessCode);
                var dataTypeParam = new SqlParameter("@DataType", "new");
                var departmentParam = new SqlParameter("@Department",
                 officer.Department == 0 ? (object)DBNull.Value : officer.Department);


                var result = dbcontext.Database
                .SqlQueryRaw<DashboardData>(
                    "EXEC GetCountForAdmin @AccessLevel, @AccessCode, @DataType, @Department",
                   accessLevelParam, accessCodeParam, dataTypeParam, departmentParam
                )
                .AsEnumerable() // 👈 Move execution to client-side
                .FirstOrDefault(); // Now safe to use

                if (result == null || result.TotalOfficers == -1)
                {
                    return BadRequest(new { error = "Invalid access level or code" });
                }

                return Json(new
                {
                    totalOfficers = result.TotalOfficers,
                    totalRegisteredUsers = result.TotalCitizens,
                    totalApplicationsSubmitted = result.TotalApplicationsSubmitted,
                    totalServices = result.TotalServices
                });
            }
            catch (Exception ex)
            {
                // TODO: log exception here
                return StatusCode(500, new
                {
                    error = "An error occurred while fetching dashboard data",
                    details = ex.Message
                });
            }
        }

        public string GetArea(string AccessLevel, int AccessCode)
        {
            if (AccessLevel == "State") return "Jammu & Kashmir";
            else if (AccessLevel == "Division") return AccessCode == 1 ? "Jammu" : "Kashmir";
            else if (AccessLevel == "District") return dbcontext.Districts.FirstOrDefault(d => d.DistrictId == AccessCode)!.DistrictName!;
            else return dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == AccessCode)!.TehsilName!;
        }

        [HttpGet]
        public IActionResult GetOfficersList(int pageIndex = 0, int pageSize = 10)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return BadRequest(new { error = "Officer details not found" });
                }

                // Validate Department (optional, depending on requirements)
                if (officer.Department == null)
                {
                    return BadRequest(new { error = "Department ID is required" });
                }

                // Prepare parameters for the stored procedure
                var accessLevelParam = new SqlParameter("@AccessLevel", officer.AccessLevel ?? (object)DBNull.Value);
                var accessCodeParam = new SqlParameter("@AccessCode", officer.AccessCode);
                var departmentParam = new SqlParameter("@Department", officer.Department ?? (object)DBNull.Value);

                // Execute the stored procedure
                var response = dbcontext.Database
                    .SqlQueryRaw<OfficerByAccessLevel>(
                        "EXEC GetOfficersByAccessLevel @AccessLevel, @AccessCode, @Department",
                        accessLevelParam, accessCodeParam, departmentParam
                    )
                    .ToList();

                // Pagination
                var totalRecords = response.Count;
                var pagedData = response
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Columns for frontend
                var columns = new List<object>
            {
                new { accessorKey = "name", header = "Name" },
                new { accessorKey = "username", header = "Username" },
                new { accessorKey = "email", header = "Email" },
                new { accessorKey = "mobileNumber", header = "Mobile Number" },
                new { accessorKey = "designation", header = "Designation" },
                new { accessorKey = "accessLevel", header = "Officer Level" },
                new { accessorKey = "accessArea", header = "Officer Area" }
            };

                // Custom actions for validation
                var customActions = new List<dynamic>
            {
                new
                {
                    type = "Validate",
                    tooltip = "Validate",
                    color = "#F0C38E",
                    actionFunction = "ValidateOfficer"
                }
            };

                // Shape the data
                var data = pagedData.Select(item => new
                {
                    name = item.Name,
                    username = item.Username,
                    email = item.Email,
                    mobileNumber = item.MobileNumber,
                    designation = item.Designation,
                    accessLevel = item.AccessLevel,
                    accessArea = GetArea(item.AccessLevel!, Convert.ToInt32(item.AccessCode)),
                    customActions = Convert.ToBoolean(item.IsValidated) ? (object)"Validated" : customActions
                }).ToList();

                return Json(new
                {
                    data,
                    columns,
                    totalRecords
                });
            }
            catch (Exception ex)
            {
                // Log the exception (use your logging framework, e.g., Serilog, NLog)
                // Example: _logger.LogError(ex, "Error fetching officers list");
                return StatusCode(500, new
                {
                    error = "An error occurred while fetching officers list",
                    details = ex.Message
                });
            }
        }

        [HttpGet]
        public IActionResult GetUsersList(int pageIndex = 0, int pageSize = 10)
        {
            var officer = GetOfficerDetails();
            if (officer == null)
            {
                return BadRequest(new { error = "Officer details not found" });
            }


            var response = dbcontext.Database
            .SqlQueryRaw<CitizenByAccessLevel>(
                "EXEC GetCitizensByAccessLevel @AccessLevel, @AccessCode",
                new SqlParameter("@AccessLevel", officer.AccessLevel ?? (object)DBNull.Value),
                new SqlParameter("@AccessCode", officer.AccessCode)
            ).ToList();

            var totalRecords = response.Count;
            var pagedData = response
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            // Columns (for frontend)
            var columns = new List<object>
                {
                    new { accessorKey = "name", header = "Name" },
                    new { accessorKey = "username", header = "Username" },
                    new { accessorKey = "email", header = "Email" },
                    new { accessorKey = "mobileNumber", header = "Mobile Number" },
                };

            var customActions = new List<dynamic>
                {
                    new
                    {
                        type = "Validate",
                        tooltip = "Validate",
                        color = "#F0C38E",
                        actionFunction = "ValidateOfficer"
                    }
                };
            // Shape the data
            var data = pagedData.Select(item => new
            {
                name = item.Name,
                username = item.Username,
                email = item.Email,
                mobileNumber = item.MobileNumber,
            }).ToList();

            return Json(new
            {
                data,
                columns,
                totalRecords
            });

        }

        public string GetAreaName(int id, string fieldName)
        {
            if (fieldName == "Tehsil")
            {
                return dbcontext.Tswotehsils.FirstOrDefault(t => t.TehsilId == id)!.TehsilName!;
            }
            else if (fieldName.EndsWith("Tehsil"))
            {
                return dbcontext.Tehsils.FirstOrDefault(t => t.TehsilId == id)!.TehsilName!;
            }
            else if (fieldName.Contains("District"))
            {
                return dbcontext.Districts.FirstOrDefault(d => d.DistrictId == id)!.DistrictName!;
            }
            else if (fieldName.Contains("Muncipality"))
            {
                return dbcontext.Muncipalities.FirstOrDefault(m => m.MuncipalityId == id)!.MuncipalityName!;
            }
            else if (fieldName.Contains("Block"))
            {
                return dbcontext.Blocks.FirstOrDefault(b => b.BlockId == id)!.BlockName!;
            }
            else if (fieldName.Contains("WardNo"))
            {
                return dbcontext.Wards.FirstOrDefault(w => w.WardCode == id)!.WardNo.ToString()!;
            }
            else return dbcontext.Villages.FirstOrDefault(v => v.VillageId == id)!.VillageName!;
        }

        [HttpGet]
        public IActionResult GetApplicationsList(int pageIndex = 0, int pageSize = 10)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return BadRequest(new { error = "Officer details not found" });
                }

                // Prepare parameters for the stored procedure
                var accessLevelParam = new SqlParameter("@AccessLevel", officer.AccessLevel ?? (object)DBNull.Value);
                var accessCodeParam = new SqlParameter("@AccessCode", officer.AccessCode);
                var dataTypeParam = new SqlParameter("@DataType", (object)"new" ?? DBNull.Value);
                var departmentParam = new SqlParameter("@Department", officer.Department ?? (object)DBNull.Value);

                // Execute the stored procedure
                var response = dbcontext.Database
                    .SqlQueryRaw<ApplicationByAccessLevel>(
                        "EXEC GetApplicationsByAccessLevel @AccessLevel, @AccessCode, @DataType, @Department",
                        accessLevelParam, accessCodeParam, dataTypeParam, departmentParam
                    )
                    .ToList();

                // Pagination
                var totalRecords = response.Count;
                var pagedData = response
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Use HashSet to avoid duplicate columns
                var columnsSet = new HashSet<string>();
                var columns = new List<object>();
                var data = new List<Dictionary<string, object>>();

                foreach (var item in pagedData)
                {
                    var dataDict = new Dictionary<string, object>();

                    dataDict["ReferenceNumber"] = item.ReferenceNumber!;

                    // Add column for ReferenceNumber once
                    if (columnsSet.Add("ReferenceNumber"))
                        columns.Insert(0, new { accessorKey = "ReferenceNumber", header = "Reference Number" });

                    if (!string.IsNullOrWhiteSpace(item.FormDetails))
                    {
                        var formData = JsonConvert.DeserializeObject<Dictionary<string, List<JObject>>>(item.FormDetails!);

                        foreach (var section in formData!)
                        {
                            foreach (var field in section.Value)
                            {
                                string? accessorKey = field["name"]?.ToString();
                                string? header = field["label"]?.ToString();
                                if (accessorKey!.Contains("Tehsil") || accessorKey.Contains("District") || accessorKey.Contains("Block") ||
                                    accessorKey!.Contains("Muncipality") || accessorKey.Contains("WardNo") || accessorKey.Contains("Village"))
                                {
                                    field["value"] = GetAreaName(Convert.ToInt32(field["value"]), accessorKey);
                                }

                                if (!string.IsNullOrWhiteSpace(accessorKey) && !string.IsNullOrWhiteSpace(header))
                                {
                                    // Add value
                                    if (field["value"] != null)
                                        dataDict[accessorKey] = field["value"]!;
                                    else if (field["File"] != null)
                                        dataDict[accessorKey] = System.IO.Path.GetFileName(field["File"]!.ToString());

                                    // Add column if not already added
                                    if (columnsSet.Add(accessorKey))
                                        columns.Add(new { accessorKey, header });

                                    // Handle nested additionalFields
                                    if (field["additionalFields"] is JArray additionalFields)
                                    {
                                        foreach (var af in additionalFields)
                                        {
                                            string? afKey = af["name"]?.ToString();
                                            string? afLabel = af["label"]?.ToString();

                                            if (afKey!.Contains("Tehsil") || afKey.Contains("District") || afKey.Contains("Block") ||
                                                afKey!.Contains("Muncipality") || afKey.Contains("WardNo") || afKey.Contains("Village"))
                                            {
                                                af["value"] = GetAreaName(Convert.ToInt32(af["value"]), afKey);
                                            }

                                            var afValue = af["value"] ?? (af["File"] != null ? System.IO.Path.GetFileName(af["File"]!.ToString()) : null);

                                            if (!string.IsNullOrWhiteSpace(afKey) && !string.IsNullOrWhiteSpace(afLabel))
                                            {
                                                dataDict[afKey] = afValue?.ToString() ?? "";

                                                if (columnsSet.Add(afKey))
                                                    columns.Add(new { accessorKey = afKey, header = afLabel });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    data.Add(dataDict);
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
                // Log the exception (use your logging framework, e.g., Serilog, NLog)
                // Example: _logger.LogError(ex, "Error fetching applications list for AccessLevel: {AccessLevel}, AccessCode: {AccessCode}", officer.AccessLevel, officer.AccessCode);
                return StatusCode(500, new
                {
                    error = "An error occurred while fetching applications list",
                    details = ex.Message
                });
            }
        }

        [HttpGet]
        public IActionResult GetServices(int pageIndex = 0, int pageSize = 10)
        {
            var officer = GetOfficerDetails();
            // Fetch and materialize all active services
            var services = dbcontext.Services
                .Where(s => s.DepartmentId == officer!.Department || officer.Department == null)
                .OrderBy(s => s.ServiceName) // Optional: order by service name
                .ToList();

            var totalCount = services.Count;

            // Apply pagination
            var pagedServices = services
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();


            // Define table columns
            var columns = new List<dynamic>
            {
                new { header = "S.No", accessorKey = "sno" },
                new { header = "Service Name", accessorKey = "servicename" },
                new { header = "Department", accessorKey = "department" }
            };

            // Prepare paginated data with embedded customActions
            List<dynamic> data = [];
            int index = 0;

            foreach (var item in pagedServices)
            {
                int serialNo = (pageIndex * pageSize) + index + 1;
                var department = dbcontext.Departments.FirstOrDefault(d => d.DepartmentId == item.DepartmentId)?.DepartmentName ?? "N/A";

                var row = new
                {
                    sno = serialNo,
                    servicename = item.ServiceName,
                    department,
                    serviceId = item.ServiceId,
                };

                data.Add(row);
                index++;
            }

            return Json(new
            {
                status = true,
                data,
                columns,
                totalCount
            });
        }

        public IActionResult GetOfficerToValidate(int pageIndex = 0, int pageSize = 10)
        {
            try
            {
                // Validate pagination input
                if (pageIndex < 0 || pageSize <= 0)
                {
                    return BadRequest(new { error = "Invalid pageIndex or pageSize" });
                }

                // Get current officer's details
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return Unauthorized(new { error = "Officer not found" });
                }

                string accessLevel = officer.AccessLevel!;
                int accessCode = Convert.ToInt32(officer.AccessCode);

                // Define stored procedure parameters
                var paramAccessLevel = new SqlParameter("@AccessLevel", accessLevel);
                var paramAccessCode = new SqlParameter("@AccessCode", accessCode);

                // Call stored procedure
                var response = dbcontext.Database
                    .SqlQueryRaw<OfficersToValidateModal>("EXEC GetOfficersToValidate @AccessLevel, @AccessCode", paramAccessLevel, paramAccessCode)
                    .ToList();

                // Pagination
                var totalRecords = response.Count;
                var pagedData = response
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Columns (for frontend)
                var columns = new List<object>
                {
                    new { accessorKey = "name", header = "Name" },
                    new { accessorKey = "username", header = "Username" },
                    new { accessorKey = "email", header = "Email" },
                    new { accessorKey = "mobileNumber", header = "Mobile Number" },
                    new { accessorKey = "designation", header = "Designation" }
                };

                // Dynamic custom actions based on validation state
                var customActions = new List<dynamic>();
                foreach (var item in pagedData)
                {
                    var isValidated = item.IsValidated ?? false; // Assuming IsValidated is a nullable bool in OfficersToValidateModal
                    customActions.Add(new
                    {
                        type = isValidated ? "Unvalidate" : "Validate",
                        tooltip = isValidated ? "Unvalidate" : "Validate",
                        color = isValidated ? "#FF6B6B" : "#F0C38E", // Red for unvalidate, orange for validate
                        actionFunction = isValidated ? "ValidateOfficer" : "ValidateOfficer"
                    });
                }

                // Shape the data with dynamic actions
                var data = pagedData.Select((item, index) => new
                {
                    name = item.Name,
                    username = item.Username,
                    email = item.Email,
                    mobileNumber = item.MobileNumber,
                    designation = item.Designation,
                    customActions = new List<dynamic> { customActions[index] } // Assign specific action per row
                }).ToList();

                return Json(new
                {
                    data,
                    columns,
                    totalRecords
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching officers to validate");
                return StatusCode(500, new { error = "An error occurred while fetching data." });
            }
        }


        public IActionResult GetCurrentAdminDetails()
        {
            var officer = GetOfficerDetails(); // Assume this retrieves the current admin's details
            if (officer == null)
            {
                return BadRequest(new { status = false, message = "Officer details not found" });
            }

            var additionalDetails = new
            {
                officer.Role,
                officer.RoleShort,
                officer.AccessLevel,
                officer.AccessCode,
                officer.Department,
            };

            dynamic? districts = null;

            if (officer.AccessLevel == "System")
            {
                // System Admins can access all districts
                districts = dbcontext.Districts
                    .Select(d => new { d.DistrictId, d.DistrictName })
                    .ToList();
            }
            else if (officer.AccessLevel == "State")
            {
                // State-level officers can access all districts
                districts = dbcontext.Districts
                    .Select(d => new { d.DistrictId, d.DistrictName })
                    .ToList();
            }
            else if (officer.AccessLevel == "Division")
            {
                // Division-level officers can access only their own districts
                districts = dbcontext.Districts
                    .Select(d => new { d.DistrictId, d.DistrictName })
                    .ToList();
            }

            return Json(new
            {
                status = true,
                officer.UserType,
                AdditionalDetails = JsonConvert.SerializeObject(additionalDetails),
                districts
            });
        }

        public IActionResult GetDesignations(int pageIndex = 0, int pageSize = 10)
        {
            try
            {
                var officer = GetOfficerDetails();
                if (officer == null)
                {
                    return BadRequest(new { error = "Officer details not found" });
                }

                // Fetch designations filtered by DepartmentId
                var designations = dbcontext.OfficersDesignations
                    .Where(d => d.DepartmentId == officer.Department)
                    .Select(d => new
                    {
                        DesignationId = d.Uuid,
                        Designation = d.Designation,
                        DesignationShort = d.DesignationShort,
                        AccessLevel = d.AccessLevel
                    })
                    .ToList();

                // Pagination
                var totalRecords = designations.Count;
                var pagedData = designations
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Define columns for the frontend
                var columns = new List<object>
        {
            new { accessorKey = "designationId", header = "ID" },
            new { accessorKey = "designation", header = "Designation" },
            new { accessorKey = "designationShort", header = "Short Name" },
            new { accessorKey = "accessLevel", header = "Access Level" }
        };

                // Shape data with custom actions
                var data = pagedData.Select(d => new
                {
                    designationId = d.DesignationId,
                    designation = d.Designation,
                    designationShort = d.DesignationShort,
                    accessLevel = d.AccessLevel,
                    customActions = new List<object>
            {
                new { tooltip = "Update", color = "#F0C38E", actionFunction = "UpdateDesignation" },
                new { tooltip = "Delete", color = "#F0C38E", actionFunction = "DeleteDesignation" }
            }
                }).ToList();

                return Json(new
                {
                    data,
                    columns,
                    totalRecords
                });
            }
            catch (Exception ex)
            {
                // Log the exception (use your logging framework, e.g., Serilog, NLog)
                return StatusCode(500, new
                {
                    error = "An error occurred while fetching designations",
                    details = ex.Message
                });
            }
        }

        [HttpGet]
        public IActionResult GetDepartments(int pageIndex = 0, int pageSize = 10)
        {
            try
            {
                // Fetch all departments
                var departments = dbcontext.Departments
                    .Select(d => new
                    {
                        DepartmentId = d.DepartmentId,
                        DepartmentName = d.DepartmentName,
                    })
                    .ToList();

                // Pagination
                var totalRecords = departments.Count;
                var pagedData = departments
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                // Define columns for the frontend
                var columns = new List<object>
        {
            new { accessorKey = "departmentId", header = "ID" },
            new { accessorKey = "departmentName", header = "Department" },
        };

                // Shape data with custom actions
                var data = pagedData.Select(d => new
                {
                    departmentId = d.DepartmentId,
                    departmentName = d.DepartmentName,
                    customActions = new List<object>
                    {
                        new { tooltip = "Update", color = "#F0C38E", actionFunction = "UpdateDepartment" },
                        new { tooltip = "Delete", color = "#F0C38E", actionFunction = "DeleteDepartment" }
                    }
                }).ToList();

                return Json(new
                {
                    data,
                    columns,
                    totalRecords
                });
            }
            catch (Exception ex)
            {
                // Log the exception properly
                return StatusCode(500, new
                {
                    error = "An error occurred while fetching departments",
                    details = ex.Message
                });
            }
        }



    }
}