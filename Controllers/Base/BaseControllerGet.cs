using System.Globalization;
using System.Security.Claims;
using ClosedXML.Excel;
using CsvHelper;
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

namespace SahayataNidhi.Controllers
{
    public partial class BaseController
    {
        [HttpGet]
        public async Task<IActionResult> DisplayFile(string fileName)
        {
            var fileModel = await dbcontext.UserDocuments
                .FirstOrDefaultAsync(f => f.FileName == fileName);

            if (fileModel == null)
            {
                return NotFound("File not found.");
            }

            if (!fileModel.FileType.StartsWith("image/") && fileModel.FileType != "application/pdf")
            {
                return BadRequest("File is not an image or PDF.");
            }

            return File(fileModel.FileData, fileModel.FileType);
        }

        [HttpGet]
        public IActionResult GetTableSettings(string storageKey)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(userIdClaim, out int userId))
            {
                return BadRequest(new { status = false, message = "Invalid user." });
            }

            var userDetails = dbcontext.Users.FirstOrDefault(u => u.UserId == userId);
            if (userDetails == null || string.IsNullOrWhiteSpace(userDetails.AdditionalDetails))
            {
                return NotFound(new { status = false, message = "User or settings not found." });
            }

            JObject additionalDetails;

            try
            {
                additionalDetails = JObject.Parse(userDetails.AdditionalDetails);
            }
            catch (JsonReaderException)
            {
                return BadRequest(new { status = false, message = "Malformed AdditionalDetails JSON." });
            }

            if (additionalDetails.TryGetValue("TableSettings", out JToken? tableSettingsToken) &&
                tableSettingsToken is JObject tableSettings &&
                tableSettings.TryGetValue(storageKey, out JToken? value))
            {
                return Json(new { status = true, TableSettings = value });
            }

            return Json(new { status = false, message = "Table setting not found." });
        }

        public OfficerDetailsModal? GetOfficerDetails()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                // Log the issue for debugging
                _logger.LogWarning("GetOfficerDetails: UserId is null. User is not authenticated or NameIdentifier claim is missing.");
                return null;
            }

            _logger.LogInformation($"------- User ID: {userId} --------");

            var parameter = new SqlParameter("@UserId", userId);
            var officer = dbcontext.Database
            .SqlQuery<OfficerDetailsModal>($"EXEC GetOfficerDetails @UserId = {parameter}")
                .AsEnumerable()
                .FirstOrDefault();

            return officer;
        }

        // public IActionResult GetApplicationsCount(int? ServiceId = null, int? DistrictId = null)
        // {
        //     // Get the current officer's details.
        //     var officer = GetOfficerDetails();
        //     if (officer == null)
        //     {
        //         return Unauthorized();
        //     }

        //     // Retrieve the service record.
        //     var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == ServiceId);
        //     if (service == null)
        //     {
        //         return NotFound();
        //     }

        //     // Deserialize the OfficerEditableField JSON.
        //     // Assuming the JSON is an array of objects.
        //     var workflow = JsonConvert.DeserializeObject<List<dynamic>>(service.OfficerEditableField!);
        //     if (workflow == null || workflow.Count == 0)
        //     {
        //         return Json(new { countList = new List<dynamic>(), canSanction = false });
        //     }

        //     // Find the authority record for the officer's role.
        //     // The JSON field names must match those in your stored JSON.
        //     dynamic authorities = workflow.FirstOrDefault(p => p.designation == officer.Role)!;
        //     if (authorities == null)
        //     {
        //         return Json(new { countList = new List<dynamic>(), canSanction = false });
        //     }


        //     var sqlParams = new List<SqlParameter>
        //     {
        //         new SqlParameter("@AccessLevel", officer.AccessLevel),
        //         new SqlParameter("@AccessCode", DistrictId ?? 0),  // or TehsilId
        //         new SqlParameter("@ServiceId", ServiceId ?? 0),
        //         new SqlParameter("@TakenBy", officer.Role)
        //     };

        //     // Add DivisionCode only when required
        //     if (officer.AccessLevel == "Division")
        //     {
        //         sqlParams.Add(new SqlParameter("@DivisionCode", officer.AccessCode));
        //     }
        //     else
        //     {
        //         sqlParams.Add(new SqlParameter("@DivisionCode", DBNull.Value));
        //     }

        //     var counts = dbcontext.Database
        //         .SqlQueryRaw<StatusCounts>(
        //             "EXEC GetStatusCount @AccessLevel, @AccessCode, @ServiceId, @TakenBy, @DivisionCode",
        //             sqlParams.ToArray()
        //         )
        //         .AsEnumerable()
        //         .FirstOrDefault() ?? new StatusCounts();



        //     _logger.LogInformation($"-------------COUNTS: {JsonConvert.SerializeObject(counts)}-----------------------");


        //     // Build the count list based on the available authority permissions.
        //     var countList = new List<dynamic>
        //     {
        //         new
        //         {
        //             label = "Total Applications",
        //             count = counts.TotalApplications,
        //             bgColor = "#000000",
        //             textColor = "#FFFFFF"
        //         },

        //         // Pending is always included.
        //         new
        //         {
        //             label = "Pending",
        //             count = counts.PendingCount,
        //             bgColor = "#FFC107",
        //             textColor = "#212121"
        //         }
        //     };

        //     // Forwarded (if allowed)
        //     if ((bool)authorities.canForwardToPlayer)
        //     {
        //         countList.Add(new
        //         {
        //             label = "Forwarded",
        //             count = counts.ForwardedCount,
        //             bgColor = "#64B5F6",
        //             textColor = "#0D47A1"
        //         });
        //     }

        //     // Returned (if allowed)
        //     if ((bool)authorities.canReturnToPlayer)
        //     {
        //         countList.Add(new
        //         {
        //             label = "Returned",
        //             count = counts.ReturnedCount,
        //             bgColor = "#E0E0E0",
        //             textColor = "#212121"
        //         });
        //     }

        //     // Citizen Pending (if allowed)
        //     if ((bool)authorities.canReturnToCitizen)
        //     {
        //         countList.Add(new
        //         {
        //             label = "Citizen Pending",
        //             count = counts.ReturnToEditCount,
        //             bgColor = "#CE93D8",
        //             textColor = "#4A148C"
        //         });
        //     }

        //     // Rejected (if allowed)
        //     if ((bool)authorities.canReject)
        //     {
        //         countList.Add(new
        //         {
        //             label = "Rejected",
        //             count = counts.RejectCount,
        //             bgColor = "#FF7043",
        //             textColor = "#B71C1C"
        //         });
        //     }

        //     // Sanctioned (if allowed)
        //     if ((bool)authorities.canSanction)
        //     {
        //         countList.Add(new
        //         {
        //             label = "Sanctioned",
        //             count = counts.SanctionedCount,
        //             bgColor = "#81C784",
        //             textColor = "#1B5E20"
        //         });
        //     }

        //     countList.Add(new
        //     {
        //         label = "Disbursed",
        //         count = counts.DisbursedCount,
        //         bgColor = "#ABCDEF",
        //         textColor = "#123456"
        //     });

        //     // Return the count list and whether the officer can sanction.
        //     return Json(new { countList, canSanction = (bool)authorities.canSanction });
        // }

        public string GetFieldValue(string fieldName, dynamic data)
        {
            foreach (var section in data)
            {
                if (section.First is JArray fields)
                {
                    foreach (var field in fields)
                    {
                        if (field["name"] != null && field["name"]?.ToString() == fieldName)
                        {
                            return field["value"]?.ToString() ?? "";
                        }
                    }
                }
            }
            return "";
        }

        [HttpGet]
        public IActionResult GetDepartments()
        {
            var departments = dbcontext.Departments.ToList();
            return Json(new { status = true, departments });
        }

        [HttpGet]
        public IActionResult GetDesignations(string deparmentId)
        {
            // JsonConvert.DeserializeObject
            var designations = dbcontext.OfficersDesignations.Where(des => des.DepartmentId == Convert.ToInt32(deparmentId)).ToList();
            return Json(new { status = true, designations });
        }

        [HttpGet]
        public IActionResult GetServices()
        {
            var officer = GetOfficerDetails();

            if (officer!.Role == "Designer" || officer.UserType == "Admin" || officer.UserType == "Viewer")
            {
                var Services = dbcontext.Services.ToList();
                return Json(new { status = true, services = Services });
            }

            // Fetch the service list for the given role
            var roleParameter = new SqlParameter("@Role", officer!.Role);
            var services = dbcontext.Database
                                       .SqlQuery<OfficerServiceListModal>($"EXEC GetServicesByRole @Role = {roleParameter}")
                                       .AsEnumerable() // To avoid composability errors
                                       .ToList();

            return Json(new { status = true, services });
        }

        [HttpGet]
        public IActionResult GetAccessAreas()
        {
            var officer = GetOfficerDetails();
            if (officer == null)
            {
                var Districts = dbcontext.Districts.ToList();
                return Json(new { status = true, districts = Districts });
            }
            if (officer!.AccessLevel == "Tehsil")
            {
                var tehsils = dbcontext.Tswotehsils.Where(t => t.TehsilId == officer.AccessCode).ToList();
                return Json(new { status = true, tehsils });
            }
            var districts = dbcontext.Districts.Where(d => (officer.AccessLevel == "State") || (officer!.AccessLevel == "Division" && d.Division == officer.AccessCode) || (officer.AccessLevel == "District" && d.DistrictId == officer.AccessCode)).ToList();
            return Json(new { status = true, districts });
        }

        [HttpGet]
        public IActionResult GetDistricts(string? division = null)
        {
            List<District> districts;
            if (division != null)
            {
                districts = dbcontext.Districts.Where(d => d.Division == Convert.ToInt32(division)).ToList();
                return Json(new { status = true, districts });
            }
            districts = dbcontext.Districts.ToList();
            return Json(new { status = true, districts });
        }

        [HttpGet]
        public IActionResult GetTeshilForDistrict(string districtId)
        {
            int DistrictId = Convert.ToInt32(districtId);
            var tehsils = dbcontext.Tswotehsils.Where(u => u.DistrictId == DistrictId).ToList();
            return Json(new { status = true, tehsils });
        }

        [HttpGet]
        public IActionResult GetIFSCCode(string bankName, string branchName)
        {
            // Validate input parameters
            if (string.IsNullOrWhiteSpace(bankName) || string.IsNullOrWhiteSpace(branchName))
            {
                return BadRequest(new { status = false, message = "BankName and BranchName are required." });
            }

            try
            {
                if (bankName == "JK GRAMEEN BANK")
                {
                    return Ok(new { status = true, ifscCode = "JAKA0GRAMEN" });
                }
                string cleanedBankName = bankName;
                if (cleanedBankName.StartsWith("THE ", StringComparison.OrdinalIgnoreCase))
                {
                    cleanedBankName = cleanedBankName.Substring(4).TrimStart();
                }
                // Execute the stored procedure
                var ifscCode = dbcontext.Database
                .SqlQueryRaw<string>(
                    "EXEC GetIfscCode @BankName, @BranchName",
                    new SqlParameter("@BankName", cleanedBankName),
                    new SqlParameter("@BranchName", branchName))
                .AsNoTracking()
                .AsEnumerable()
                .FirstOrDefault();

                if (!string.IsNullOrEmpty(ifscCode))
                {
                    return Ok(new { status = true, ifscCode });
                }
                else
                {
                    return NotFound(new { status = false, message = "No IFSC code found for the provided bank and branch." });
                }
            }
            catch (Exception ex)
            {
                // Log the exception (use a logging framework like Serilog in production)
                return StatusCode(500, new { status = false, message = "An error occurred while fetching the IFSC code.", error = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetAreaList(string table, int parentId)
        {
            object? data = null;

            switch (table)
            {
                case "TehsilAll":
                    data = dbcontext.Tehsils
                     .Where(t => t.DistrictId == parentId)
                     .Select(t => new { value = t.TehsilId, label = t.TehsilName }) // Optional: project only needed fields
                     .ToList();
                    break;
                case "Tehsil":
                    data = dbcontext.Tswotehsils
                        .Where(t => t.DistrictId == parentId)
                        .Select(t => new { value = t.TehsilId, label = t.TehsilName }) // Optional: project only needed fields
                        .ToList();
                    break;

                case "Muncipality":
                    data = dbcontext.Muncipalities.Where(m => m.DistrictId == parentId)
                    .Select(m => new { value = m.MuncipalityId, label = m.MuncipalityName })
                    .ToList();
                    break;

                case "Block":
                    data = dbcontext.Blocks.Where(m => m.DistrictId == parentId)
                    .Select(m => new { value = m.BlockId, label = m.BlockName })
                    .ToList();
                    break;

                case "Ward":
                    data = dbcontext.Wards
                    .Where(m => m.MuncipalityId == parentId)
                    .OrderBy(m => m.WardCode) // 👈 Sorts by WardCode
                    .Select(m => new
                    {
                        value = m.WardCode,
                        label = "Ward No " + m.WardNo
                    })
                    .ToList();

                    break;

                case "HalqaPanchayat":
                    data = dbcontext.HalqaPanchayats.Where(m => m.BlockId == parentId)
                            .Select(m => new { value = m.HalqaPanchayatId, label = m.HalqaPanchayatName })
                            .ToList();
                    break;
                case "Village":
                    data = dbcontext.Villages.Where(m => m.HalqaPanchayatId == parentId)
                          .Select(m => new { value = m.VillageId, label = m.VillageName })
                          .ToList();
                    break;
                // Add other cases as needed

                default:
                    return BadRequest("Invalid table name.");
            }

            return Json(new { data });
        }

        private static byte[] GenerateExcel(List<Dictionary<string, object>> data, List<Dictionary<string, string>> columns)
        {
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Report");

                // Add headers
                for (int i = 0; i < columns.Count; i++)
                {
                    worksheet.Cell(1, i + 1).Value = columns[i]["header"] ?? columns[i]["accessorKey"];
                    worksheet.Cell(1, i + 1).Style.Font.Bold = true;
                }

                // Add data
                for (int rowIndex = 0; rowIndex < data.Count; rowIndex++)
                {
                    var rowData = data[rowIndex];
                    for (int colIndex = 0; colIndex < columns.Count; colIndex++)
                    {
                        var key = columns[colIndex]["accessorKey"];
                        worksheet.Cell(rowIndex + 2, colIndex + 1).Value = rowData.GetValueOrDefault(key)?.ToString() ?? "";
                    }
                }

                // Add footer
                int footerRow = data.Count + 3;
                worksheet.Cell(footerRow, 1).Value = $"Report generated on: {DateTime.Now:dd MMMM yyyy, HH:mm:ss}";
                worksheet.Cell(footerRow, 1).Style.Font.Italic = true;
                worksheet.Range(footerRow, 1, footerRow, columns.Count).Merge();

                // Auto-adjust column widths
                worksheet.Columns().AdjustToContents();

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                return stream.ToArray();
            }
        }

        private static byte[] GenerateCsv(List<Dictionary<string, object>> data, List<Dictionary<string, string>> columns)
        {
            using (var stream = new MemoryStream())
            using (var writer = new StreamWriter(stream))
            using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
            {
                // Write headers
                foreach (var column in columns)
                {
                    csv.WriteField(column["header"] ?? column["accessorKey"]);
                }
                csv.NextRecord();

                // Write data
                foreach (var row in data)
                {
                    foreach (var column in columns)
                    {
                        csv.WriteField(row.GetValueOrDefault(column["accessorKey"])?.ToString() ?? "");
                    }
                    csv.NextRecord();
                }

                // Write footer
                csv.WriteField($"Report generated on: {DateTime.Now:dd MMMM yyyy, HH:mm:ss}");
                csv.NextRecord();

                writer.Flush();
                return stream.ToArray();
            }
        }

        private static byte[] GeneratePdf(List<Dictionary<string, object>> data, List<Dictionary<string, string>> columns)
        {
            using (var stream = new MemoryStream())
            {
                using (var pdf = new PdfWriter(stream))
                using (var pdfDoc = new PdfDocument(pdf))
                {
                    var document = new Document(pdfDoc);

                    // Create table
                    var table = new Table(columns.Count);
                    table.SetWidth(UnitValue.CreatePercentValue(100));

                    // Add headers
                    foreach (var column in columns)
                    {
                        table.AddHeaderCell(new Cell().Add(new Paragraph(column["header"] ?? column["accessorKey"]).SetBold()));
                    }

                    // Add data
                    foreach (var row in data)
                    {
                        foreach (var column in columns)
                        {
                            table.AddCell(new Cell().Add(new Paragraph(row.GetValueOrDefault(column["accessorKey"])?.ToString() ?? "")));
                        }
                    }

                    // Add footer
                    table.AddFooterCell(new Cell(1, columns.Count)
                        .Add(new Paragraph($"Report generated on: {DateTime.Now:dd MMMM yyyy, HH:mm:ss}")
                        .SetItalic()));

                    document.Add(table);
                    document.Close();

                    return stream.ToArray();
                }
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetBanks()
        {
            try
            {
                var banks = await dbcontext.Banks
                    .ToListAsync();
                return Ok(new { status = true, data = banks });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetBankCode(string bankId)
        {
            try
            {
                int BankId = Convert.ToInt32(bankId);
                var bank = dbcontext.Banks
                    .FirstOrDefault(b => b.Id == BankId);

                if (bank != null)
                {
                    return Ok(new { status = true, bankCode = bank.BankCode });
                }
                else
                {
                    return NotFound(new { status = false, message = "Bank not found." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetBankDetails(string IfscCode)
        {
            try
            {
                var bankDetails = dbcontext.BankDetails
                    .FirstOrDefault(b => b.Ifsc == IfscCode);

                if (bankDetails != null)
                {
                    return Ok(new { status = true, bankDetails });
                }
                else
                {
                    return NotFound(new { status = false, message = "Bank details not found." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }

    }
}