using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Renci.SshNet;
using SahayataNidhi.Models.Entities;
using Microsoft.AspNetCore.SignalR;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Security.Claims;
using System.Data;
using System.Text.RegularExpressions;
using System.Text;

namespace SahayataNidhi.Controllers.Officer
{
    public partial class OfficerController : Controller
    {
        // [HttpPost]
        // public IActionResult UploadCsv([FromForm] IFormCollection form)
        // {
        //     var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //     Models.Entities.User Officer = dbcontext.Users.Find(Convert.ToInt32(userId))!;
        //     var officer = GetOfficerDetails();
        //     string officerDesignation = officer.Role!;
        //     string accessLevel = officer.AccessLevel!;

        //     string ftpHost = form["ftpHost"].ToString();
        //     string ftpUser = form["ftpUser"].ToString();
        //     string ftpPassword = form["ftpPassword"].ToString();
        //     int serviceId = Convert.ToInt32(form["serviceId"].ToString());
        //     int districtId = Convert.ToInt32(form["districtId"].ToString());

        //     var bankFile = dbcontext.BankFiles.FirstOrDefault(bf => bf.ServiceId == serviceId && bf.DistrictId == districtId && bf.FileSent == false);
        //     var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "exports", bankFile!.FileName);
        //     var ftpClient = new SftpClient(ftpHost, 22, ftpUser, ftpPassword);
        //     ftpClient.Connect();

        //     if (!ftpClient.IsConnected) return Json(new { status = false, message = "Unable to connect to the SFTP server." });

        //     using (var stream = new FileStream(filePath, FileMode.Open))
        //     {
        //         ftpClient.UploadFile(stream, Path.GetFileName(filePath));
        //     }
        //     ftpClient.Disconnect();

        //     bankFile.FileSent = true;
        //     dbcontext.SaveChanges();

        //     var @ServiceId = new SqlParameter("@ServiceId", serviceId);
        //     var @DistrictId = new SqlParameter("@DistrictId", districtId.ToString());
        //     var @OfficerId = new SqlParameter("@OfficerId", Convert.ToInt32(userId));
        //     var @CurrentStatus = new SqlParameter("@CurrentStatus", "Deposited");
        //     var @NewStatus = new SqlParameter("@NewStatus", "Dispatched");
        //     var @UpdateDate = new SqlParameter("@UpdateDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

        //     var update = dbcontext.Database.ExecuteSqlRaw("EXEC UpdateApplication_Status_History_Count @ServiceId,@DistrictId,@OfficerId,@CurrentStatus,@NewStatus,@UpdateDate", @ServiceId, @DistrictId, @OfficerId, @CurrentStatus, @NewStatus, @UpdateDate);


        //     return Json(new { status = true, message = "File Uploaded Successfully." });
        // }

        // public IActionResult GetResponseBankFile([FromForm] IFormCollection form)
        // {
        //     int? userId = Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        //     Models.Entities.User Officer = dbcontext.Users.Find(userId)!;
        //     var officer = GetOfficerDetails();
        //     string officerDesignation = officer.Role!;
        //     string accessLevel = officer.AccessLevel!;

        //     string ftpHost = form["ftpHost"].ToString();
        //     string ftpUser = form["ftpUser"].ToString();
        //     string ftpPassword = form["ftpPassword"].ToString();
        //     int serviceId = Convert.ToInt32(form["serviceId"].ToString());
        //     int districtId = Convert.ToInt32(form["districtId"].ToString());

        //     var bankFiles = dbcontext.BankFiles.Where(bf => bf.ServiceId == serviceId && bf.DistrictId == districtId && bf.FileSent == true && bf.DbUpdate == false).ToList();
        //     var ftpClient = new SftpClient(ftpHost, 22, ftpUser, ftpPassword);
        //     ftpClient.Connect();

        //     if (!ftpClient.IsConnected)
        //         return Json(new { status = false, message = "Unable to connect to the SFTP server." });

        //     var columns = new List<dynamic>{
        //         new {label="S.No.",value="sno"},
        //         new {label="File Name",value="fileName"},
        //         new {label="Response File",value="responseFile"},
        //         new {label="Action",value="button"},
        //     };

        //     List<dynamic> fileResponse = [];
        //     int index = 1;
        //     if (bankFiles.Count > 0)
        //     {
        //         foreach (var item in bankFiles)
        //         {
        //             string originalFileName = Path.GetFileNameWithoutExtension(item!.FileName);
        //             string responseFile = $"{originalFileName}_response.csv";
        //             if (item.ResponseFile != responseFile && !ftpClient.Exists(responseFile))
        //             {
        //                 fileResponse.Add(new { sno = index, fileName = item.FileName, responseFile = "No Reponse File", button = "No Action" });
        //             }
        //             else
        //             {
        //                 if (item.ResponseFile != responseFile)
        //                 {
        //                     string filePath = Path.Combine(_webHostEnvironment.WebRootPath, "exports", responseFile);
        //                     Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

        //                     using (var stream = new FileStream(filePath, FileMode.Create))
        //                     {
        //                         ftpClient.DownloadFile(responseFile, stream);
        //                     }
        //                     item.ResponseFile = responseFile;
        //                     item.RecievedOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");
        //                 }
        //                 fileResponse.Add(new { sno = index, fileName = item.FileName, responseFile, button = new { function = "UpdateDatabase", parameters = new { responseFile = $"exports/{responseFile}" }, buttonText = "Update Database" } });
        //             }
        //         }
        //         dbcontext.SaveChanges();
        //         return Json(new { columns, data = fileResponse, totalCount = fileResponse.Count });
        //     }
        //     else return Json(new { columns, data = fileResponse, totalCount = fileResponse.Count });
        // }

        // public async Task<IActionResult> ProcessResponseFile([FromForm] IFormCollection form)
        // {
        //     int? userId = Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        //     int? serviceId = Convert.ToInt32(form["serviceId"].ToString());
        //     string responseFile = form["responseFile"].ToString();
        //     string filePath = Path.Combine(_webHostEnvironment.WebRootPath, responseFile);

        //     using var reader = new StreamReader(filePath);
        //     var csvConfig = new CsvConfiguration(CultureInfo.InvariantCulture)
        //     {
        //         HasHeaderRecord = false
        //     };

        //     using var csv = new CsvReader(reader, csvConfig);

        //     try
        //     {
        //         var records = csv.GetRecords<ResponseCSVModal>().ToList();

        //         // Extract all ReferenceNumbers
        //         var referenceNumbers = records.Select(r => r.ReferenceNumber).Where(r => !string.IsNullOrEmpty(r)).ToList();

        //         // Convert the list of ReferenceNumbers to a comma-separated string
        //         var referenceNumbersString = string.Join(",", referenceNumbers);

        //         // Create a DataTable for the TVP
        //         var dataTable = new DataTable();
        //         dataTable.Columns.Add("ServiceId", typeof(int));
        //         dataTable.Columns.Add("OfficerId", typeof(int));
        //         dataTable.Columns.Add("ApplicationId", typeof(string));
        //         dataTable.Columns.Add("Status", typeof(string));
        //         dataTable.Columns.Add("TransactionId", typeof(string));
        //         dataTable.Columns.Add("DateOfDibursion", typeof(string));
        //         dataTable.Columns.Add("TransactionStatus", typeof(string));
        //         dataTable.Columns.Add("File", typeof(string));
        //         dataTable.Columns.Add("ApplicantName", typeof(string));

        //         foreach (var record in records)
        //         {
        //             dataTable.Rows.Add(
        //                 serviceId,
        //                 userId,
        //                 record.ReferenceNumber ?? string.Empty,
        //                 record.Status ?? "",
        //                 record.TransactionId ?? string.Empty,
        //                 record.DateOfDisbursion ?? DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"),
        //                 record.TransactionStatus ?? string.Empty,
        //                 form["responseFile"].ToString(),
        //                 record.ApplicantName
        //             );
        //         }

        //         var tvpParameter = new SqlParameter("@ResponseRecords", SqlDbType.Structured)
        //         {
        //             TypeName = "BankResponseTableType",
        //             Value = dataTable
        //         };

        //         // Execute the bulk processing procedure
        //         await dbcontext.Database.ExecuteSqlRawAsync("EXEC UpdateFromBankResponse @ResponseRecords", tvpParameter);
        //         string file = Regex.Match(responseFile, @"[^/]+$").Value;
        //         var bankFile = dbcontext.BankFiles.FirstOrDefault(bf => bf.ResponseFile == file);
        //         bankFile!.DbUpdate = true;
        //         bankFile.UpdatedOn = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt");
        //         dbcontext.SaveChanges();
        //         // Return the reference numbers string for further processing
        //         return Json(new { status = true, message = "Database Updated Successfully.", referenceNumbers = referenceNumbersString });
        //     }
        //     catch (Exception ex)
        //     {
        //         return Json(new { status = false, message = "Some error occurred while updating database.", error = ex.Message });
        //     }
        // }

        // public dynamic GetPaymentHistory(string referenceNumbersString, int page, int size)
        // {
        //     try
        //     {
        //         // Create the SQL parameter
        //         var referenceNumbersParam = new SqlParameter("@ReferenceNumbers", referenceNumbersString);

        //         // Call the GetPaymentHistory stored procedure
        //         var paymentHistory = dbcontext.Database.SqlQuery<ApplicationsHistoryModal>($"EXEC GetPaymentHistory @ReferenceNumbers = {new SqlParameter("@ReferenceNumbers", referenceNumbersParam)}")
        //             .AsEnumerable()
        //             .Skip(page * size)
        //             .Take(size)
        //             .ToList();

        //         var columns = new List<dynamic>{
        //         new {label="S.No.",value="sno"},
        //         new {label="Designation",value="designation"},
        //         new {label="Action Taken",value="actionTaken"},
        //         new {label="Remarks",value="remarks"},
        //         new {label="Taken On/Received On",value="takenOn"},
        //     };
        //         List<dynamic> data = [];
        //         int index = 1;
        //         foreach (var item in paymentHistory)
        //         {
        //             var cell = new
        //             {
        //                 sno = index,
        //                 designation = item.Designation,
        //                 actionTaken = item.ActionTaken,
        //                 remarks = item.Remarks,
        //                 takenOn = item.TakenAt
        //             };
        //             data.Add(cell);
        //             index++;
        //         }

        //         return Json(new { columns, data, totalCount = data.Count });
        //     }
        //     catch (Exception ex)
        //     {
        //         throw new Exception("Error while fetching payment history: " + ex.Message);
        //     }
        // }


        // public async Task<IActionResult> BankCsvFile(string serviceId, string districtId)
        // {
        //     int serviceIdInt = Convert.ToInt32(serviceId);
        //     int districtIdInt = Convert.ToInt32(districtId);
        //     var service = dbcontext.Services.FirstOrDefault(s => s.ServiceId == serviceIdInt);
        //     var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        //     if (userId == null) return Unauthorized();

        //     var officer = await dbcontext.Users.FindAsync(Convert.ToInt32(userId));
        //     if (officer == null) return NotFound();

        //     var details = GetOfficerDetails();
        //     string officerDesignation = details?.Role!;
        //     int accessCode = Convert.ToInt32(details?.AccessCode);

        //     // var applicationsCount = await dbcontext.ApplicationsCounts
        //     //     .FirstOrDefaultAsync(rc => rc.ServiceId == serviceIdInt && rc.OfficerId == details!.UserId && rc.Status == "Sanctioned");

        //     var bankFile = await dbcontext.BankFiles
        //         .FirstOrDefaultAsync(bf => bf.ServiceId == serviceIdInt && bf.DistrictId == districtIdInt && bf.FileSent == false);

        //     var district = await dbcontext.District
        //         .FirstOrDefaultAsync(d => d.DistrictId == districtIdInt);


        //     // Ensure the exports directory exists
        //     string webRootPath = _webHostEnvironment.WebRootPath;
        //     string exportsFolder = Path.Combine(webRootPath, "exports");

        //     Directory.CreateDirectory(exportsFolder);

        //     string fileName = bankFile?.FileName ?? $"{district!.DistrictShort}_BankFile_{DateTime.Now:ddMMMyyyyhhmm}.csv";
        //     string filePath = Path.Combine(exportsFolder, fileName);

        //     // Notify the start of the process
        //     await hubContext.Clients.All.SendAsync("ReceiveProgress", 0);


        //     // Fetch data using the stored procedure
        //     var bankFileData = dbcontext.Database.SqlQuery<BankFileData>($"EXEC GetBankFileData @ServiceId = {new SqlParameter("@ServiceId", serviceIdInt)}, @FileCreationDate = {new SqlParameter("@FileCreationDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"))}, @DistrictId = {new SqlParameter("@DistrictId", districtId)}").AsEnumerable().ToList();

        //     int totalRecords = bankFileData.Count;
        //     int batchSize = 1000; // Adjust the batch size as needed
        //     int processedRecords = 0;

        //     using (var streamWriter = new StreamWriter(filePath, append: true))
        //     using (var csvWriter = new CsvWriter(streamWriter, new CsvConfiguration(CultureInfo.InvariantCulture)
        //     {
        //         HasHeaderRecord = false // Do not include headers
        //     }))
        //     {
        //         while (processedRecords < totalRecords)
        //         {
        //             var batch = bankFileData.Skip(processedRecords).Take(batchSize);
        //             await csvWriter.WriteRecordsAsync(batch);

        //             processedRecords += batch.Count();
        //             int progress = (int)(processedRecords / (double)totalRecords * 100);
        //             await hubContext.Clients.All.SendAsync("ReceiveProgress", progress);
        //         }
        //     }


        //     // Notify completion
        //     await hubContext.Clients.All.SendAsync("ReceiveProgress", 100);

        //     if (bankFile == null)
        //     {
        //         var newBankFile = new BankFile
        //         {
        //             ServiceId = serviceIdInt,
        //             DistrictId = districtIdInt,
        //             FileName = fileName,
        //             GeneratedDate = DateTime.Now.ToString("dd MMM yyyy hh:mm tt"),
        //             TotalRecords = totalRecords,
        //             FileSent = false,
        //             SentOn = "",
        //             ResponseFile = "",
        //             RecievedOn = "",
        //             DbUpdate = false,
        //             UpdatedOn = "",
        //         };
        //         dbcontext.BankFiles.Add(newBankFile);
        //     }
        //     else
        //     {
        //         bankFile.TotalRecords += totalRecords;
        //         bankFile.GeneratedDate = DateTime.Now.ToString("dd MMM yyyy hh:mm tt");
        //     }

        //     await dbcontext.SaveChangesAsync();

        //     var @ServiceId = new SqlParameter("@ServiceId", serviceIdInt);
        //     var @DistrictId = new SqlParameter("@DistrictId", districtId);
        //     var @OfficerId = new SqlParameter("@OfficerId", Convert.ToInt32(userId));
        //     var @CurrentStatus = new SqlParameter("@CurrentStatus", "Sanctioned");
        //     var @NewStatus = new SqlParameter("@NewStatus", "Deposited");
        //     var @UpdateDate = new SqlParameter("@UpdateDate", DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt"));

        //     var update = await dbcontext.Database.ExecuteSqlRawAsync("EXEC UpdateApplication_Status_History_Count @ServiceId,@DistrictId,@OfficerId,@CurrentStatus,@NewStatus,@UpdateDate", @ServiceId, @DistrictId, @OfficerId, @CurrentStatus, @NewStatus, @UpdateDate);




        //     return Json(new { filePath = $"/exports/{fileName}" });
        // }

        // public IActionResult GetBankFileRecords(string ServiceId, string DistrictId, string status, int page, int size)
        // {
        //     int serviceId = Convert.ToInt32(ServiceId);
        //     int districtId = Convert.ToInt32(DistrictId);
        //     List<string> statuses = [];
        //     if (status == "BankRecords")
        //     {
        //         statuses.Add("Deposited");
        //         statuses.Add("Dispatched");
        //         statuses.Add("Disbursed");
        //         statuses.Add("Failure");
        //     }
        //     else statuses.Add(status);

        //     string statusParam = string.Join(",", statuses);
        //     var applications = dbcontext.Applications
        //        .FromSqlRaw("EXEC GetApplicationsForBank @DistrictId, @ServiceId, @Statuses",
        //                    new SqlParameter("@DistrictId", districtId),
        //                    new SqlParameter("@ServiceId", serviceId),
        //                    new SqlParameter("@Statuses", statusParam))
        //        .ToList();
        //     // Apply pagination to the list
        //     var paginatedApplications = applications.Skip(page * size).Take(size).ToList();
        //     // Define columns
        //     var columns = new List<dynamic>
        //     {
        //         new { label = "S.No", value = "sno" },
        //         new { label = "Reference Number", value = "referenceNumber" },
        //         new { label = "Applicant Name", value = "applicantName" },
        //         new { label = "Submission Date", value = "submissionDate" },
        //     };

        //     // Track added columns to avoid duplicates
        //     var addedColumns = new HashSet<string>();

        //     // Initialize data list
        //     List<dynamic> data = [];
        //     int index = 1;

        //     foreach (var item in paginatedApplications)
        //     {
        //         // Deserialize ServiceSpecific JSON
        //         var serviceSpecific = JsonConvert.DeserializeObject<Dictionary<string, string>>(item.ServiceSpecific);

        //         // Initialize cell with predefined columns
        //         var cell = new List<KeyValuePair<string, object>>
        //         {
        //             new("sno", index),
        //             new("referenceNumber", item.ApplicationId),
        //             new("applicantName", item.ApplicantName),
        //             new("submissionDate", item.SubmissionDate),
        //         };

        //         // Add dynamic columns based on ServiceSpecific data
        //         foreach (var kvp in serviceSpecific!)
        //         {
        //             string key = kvp.Key;
        //             string value = kvp.Value;
        //             bool isDigitOnly = value.All(char.IsDigit);

        //             if (!isDigitOnly && addedColumns.Add(key.ToLower())) // Add column only if it's not already added
        //             {
        //                 columns.Insert(3, new { label = key, value = key.ToLower() });
        //             }

        //             // Add cell data
        //             cell.Insert(3, new KeyValuePair<string, object>(key.ToLower(), value));
        //         }

        //         // Convert cell list to dictionary and add to data
        //         var cellDictionary = cell.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        //         data.Add(cellDictionary);
        //         index++;
        //     }



        //     return Json(new { data, columns, totalCount = applications.Count });
        // }


        // public IActionResult VerifyBankFileAndRecords(string ServiceId, string DistrictId)
        // {
        //     int serviceId = Convert.ToInt32(ServiceId);
        //     int districtId = Convert.ToInt32(DistrictId);
        //     int totalCount = 0;
        //     _logger.LogInformation($"District Id: {districtId.GetType()} Service ID: {serviceId.GetType()}");

        //     // Fetch applications with pagination applied directly
        //     var applications = dbcontext.Applications
        //         .FromSqlRaw("EXEC GetApplicationsForBank @DistrictId, @ServiceId, @Status",
        //                     new SqlParameter("@DistrictId", districtId),
        //                     new SqlParameter("@ServiceId", serviceId),
        //                     new SqlParameter("@Status", "Sanctioned"))
        //         .ToList();

        //     // Total count of applications
        //     totalCount = applications.Count;


        //     var columns = new List<dynamic>{
        //         new {label="S.No.",value="sno"},
        //         new {label="Bank File Records",value="bankRecords"},
        //         new {label="New Records",value="newRecords"},
        //         new {label="Bank File Records",value="button1"},
        //         new {label="Bank File Action",value="button2"},
        //         new {label="New Records Action",value="button3"},
        //     };

        //     // Check if bank file is sent
        //     var bankFile = dbcontext.BankFiles.FirstOrDefault(bf => bf.ServiceId == serviceId && bf.DistrictId == districtId);
        //     var isBankFileSent = bankFile?.FileSent;
        //     int bankFileRecords = bankFile?.TotalRecords ?? 0;

        //     List<dynamic> data = [];
        //     var bankFileAction1 = new
        //     {
        //         function = "ViewBankRecords",
        //         parameters = new { isBankFileSent },
        //         buttonText = "View"
        //     };
        //     var bankFileAction2 = new
        //     {
        //         function = "AppendToBankFile",
        //         parameters = new { },
        //         buttonText = "Append"
        //     };

        //     var bankFileAction3 = new
        //     {
        //         function = "CreateBankFile",
        //         parameters = new { },
        //         buttonText = "Create Bank File"
        //     };

        //     var bankFileAction4 = new
        //     {
        //         function = "SendBankFile",
        //         parameters = new { },
        //         buttonText = "Send Bank File"
        //     };


        //     var newRecordAction = new
        //     {
        //         function = "ViewNewRecords",
        //         parameters = new { isBankFileSent },
        //         buttonText = "View"
        //     };
        //     var cell = new List<KeyValuePair<string, object>>
        //     {
        //        new("sno",1),
        //        new("bankRecords",bankFileRecords),
        //        new("newRecords",totalCount),
        //        new("button1",bankFileRecords>0?bankFileAction1:"No Action"),
        //        new("button2",totalCount > 0 && bankFileRecords > 0 ? bankFileAction2 : totalCount > 0 && bankFileRecords == 0 ? bankFileAction3 : totalCount == 0 && bankFileRecords > 0 && isBankFileSent == false ? bankFileAction4: "No Action"),
        //        new("button3",totalCount>0?newRecordAction:"No Action")
        //     };
        //     var cellDictionary = cell.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        //     data.Add(cellDictionary);


        //     // Return the JSON result
        //     return Json(new
        //     {
        //         columns,
        //         data,
        //         totalCount = data.Count
        //     });
        // }


        // public IActionResult IsBankFile(string serviceId, string districtId)
        // {
        //     int ServiceId = Convert.ToInt32(serviceId);
        //     int DistrictId = Convert.ToInt32(districtId);
        //     var bankFile = dbcontext.BankFiles.FirstOrDefault(bf => bf.ServiceId == ServiceId && bf.DistrictId == DistrictId && bf.FileSent == false);
        //     var newRecords = dbcontext.Applications
        //     .FromSqlRaw("SELECT * FROM Applications WHERE ApplicationStatus = 'Sanctioned' AND JSON_VALUE(ServiceSpecific, '$.District') = {0}", districtId)
        //      .ToList();

        //     return Json(new { bankFile, newRecords = newRecords.Count });
        // }


        [HttpGet]
        public IActionResult GetRecordsForBankFile(int AccessCode, int ServiceId, string type, int Month, int Year, int pageIndex = 0, int pageSize = 10)
        {
            var accessCode = new SqlParameter("@AccessCode", AccessCode);
            var applicationStatus = new SqlParameter("@ApplicationStatus", type);
            var serviceId = new SqlParameter("@ServiceId", ServiceId);
            var month = new SqlParameter("@Month", Month);
            var year = new SqlParameter("@Year", Year);

            // Call new stored procedure
            var rawResults = dbcontext.Database
            .SqlQueryRaw<BankFileRawResult>(
                "EXEC GetRecordsForBankFile_New @AccessCode, @ApplicationStatus, @ServiceId, @Month, @Year",
                new SqlParameter("@AccessCode", AccessCode),
                new SqlParameter("@ApplicationStatus", type),
                new SqlParameter("@ServiceId", ServiceId),
                new SqlParameter("@Month", Month),
                new SqlParameter("@Year", Year)
            )
            .ToList();

            // Optional: Sort by ReferenceNumber (last part)
            var sortedResults = rawResults.OrderBy(a =>
            {
                var parts = a.ReferenceNumber!.Split('/');
                var numberPart = parts.Last();
                return int.TryParse(numberPart, out int num) ? num : 0;
            }).ToList();

            var totalRecords = sortedResults.Count;

            // Paginate
            var pagedResults = sortedResults
                .Skip(pageIndex * pageSize)
                .Take(pageSize)
                .ToList();

            var columns = new List<dynamic>
            {
                new { accessorKey = "referenceNumber", header = "Reference Number" },
                new { accessorKey = "districtbankuid", header = "District Bank Uid" },
                new { accessorKey = "department", header = "Department" },
                new { accessorKey = "payingBankAccountNumber", header = "Paying Bank Account Number" },
                new { accessorKey = "payingBankIfscCode", header = "Paying IFSC Code" },
                new { accessorKey = "amount", header = "Pension Amount" },
                new { accessorKey = "fileGenerationDate", header = "File Generation Date" },
                new { accessorKey = "payingBankName", header = "Paying Bank Name" },
                new { accessorKey = "applicantName", header = "Applicant Name" },
                new { accessorKey = "receivingIfscCode", header = "Receiving IFSC Code" },
                new { accessorKey = "receivingAccountNumber", header = "Receiving Account Number" },
                new { accessorKey = "pensionType", header = "Pension Type" },
            };

            return Ok(new
            {
                data = pagedResults,
                columns,
                totalRecords,
                pageIndex,
                pageSize
            });
        }

        [HttpGet]
        public IActionResult ExportBankFileCsv(int AccessCode, int ServiceId, string type, int Month, int Year)
        {
            // Fetch district short name from DB based on AccessCode
            var districtShortName = dbcontext.District
                .Where(d => d.DistrictId == AccessCode)
                .Select(d => d.DistrictShort) // ensure this column exists
                .FirstOrDefault();

            if (string.IsNullOrEmpty(districtShortName))
                return BadRequest("District not found");

            // Prepare filename
            string monthShort = new DateTime(Year, Month, 1).ToString("MMM"); // e.g., "Jul"
            string fileName = $"BankFile_{districtShortName}_{monthShort}_{Year}.csv";

            // SQL parameters
            var accessCode = new SqlParameter("@AccessCode", AccessCode);
            var applicationStatus = new SqlParameter("@ApplicationStatus", type);
            var serviceId = new SqlParameter("@ServiceId", ServiceId);
            var month = new SqlParameter("@Month", Month);
            var year = new SqlParameter("@Year", Year);

            // Execute stored procedure
            var rawResults = dbcontext.Database
                .SqlQueryRaw<BankFileRawResult>(
                    "EXEC GetRecordsForBankFile_New @AccessCode, @ApplicationStatus, @ServiceId, @Month, @Year",
                    accessCode, applicationStatus, serviceId, month, year)
                .ToList();

            if (rawResults.Count == 0)
                return NotFound("No records found for the provided parameters.");

            // Build CSV
            var csvBuilder = new StringBuilder();
            foreach (var item in rawResults)
            {
                var line = string.Join(",",
                    EscapeCsv(item.ReferenceNumber),
                    EscapeCsv(item.Districtbankuid),
                    EscapeCsv(item.Department),
                    EscapeCsv(item.PayingBankAccountNumber),
                    EscapeCsv(item.PayingBankIfscCode),
                    EscapeCsv(item.PayingBankName),
                    EscapeCsv(item.FileGenerationDate.ToString("yyyy-MM-dd HH:mm:ss")),
                    item.Amount,
                    EscapeCsv(item.ApplicantName),
                    EscapeCsv(item.ReceivingIfscCode),
                    EscapeCsv(item.ReceivingAccountNumber),
                    EscapeCsv(item.PensionType)
                );

                csvBuilder.AppendLine(line);
            }

            // Define file path on the server
            string folderPath = System.IO.Path.Combine(_webHostEnvironment.WebRootPath, "BankFiles");
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            string filePath = System.IO.Path.Combine(folderPath, fileName);

            // Save file to disk
            System.IO.File.WriteAllText(filePath, csvBuilder.ToString(), Encoding.UTF8);

            // Return file to frontend
            var mimeType = "text/csv";
            return PhysicalFile(filePath, mimeType, fileName);
        }

        private static string EscapeCsv(string? input)
        {
            if (string.IsNullOrEmpty(input))
                return "";
            if (input.Contains(",") || input.Contains("\"") || input.Contains("\n"))
                return $"\"{input.Replace("\"", "\"\"")}\"";
            return input;
        }


    }
}