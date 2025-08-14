using System.Dynamic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;

public class UserHelperFunctions(IWebHostEnvironment webHostEnvironment, SocialWelfareDepartmentContext dbcontext, ILogger<UserHelperFunctions> logger)
{
    private readonly IWebHostEnvironment _webHostEnvironment = webHostEnvironment;
    private readonly SocialWelfareDepartmentContext dbcontext = dbcontext;

    private readonly ILogger<UserHelperFunctions> _logger = logger;

    public async Task<string> GetFilePath(IFormFile? docFile = null, byte[]? fileData = null, string? fileName = null)
    {
        if ((docFile == null || docFile.Length == 0) && fileData == null)
        {
            return "No file provided.";
        }

        string uniqueName;
        byte[] data;
        string contentType;

        if (docFile != null)
        {
            // Handle IFormFile
            string fileExtension = Path.GetExtension(docFile.FileName);
            string shortGuid = Guid.NewGuid().ToString("N")[..12];
            uniqueName = shortGuid + fileExtension;
            contentType = docFile.ContentType;

            using var memoryStream = new MemoryStream();
            await docFile.CopyToAsync(memoryStream);
            data = memoryStream.ToArray();
        }
        else
        {
            // Handle programmatically generated file
            if (fileData == null)
            {
                throw new ArgumentNullException(nameof(fileData));
            }


            // Determine file type from fileData (check for PDF signature)
            string fileExtension;
            if (fileData.Length > 5 && fileData[0] == 0x25 && fileData[1] == 0x50 && fileData[2] == 0x44 && fileData[3] == 0x46 && fileData[4] == 0x2D)
            {
                // Confirmed PDF (%PDF- signature)
                fileExtension = ".pdf";
                contentType = "application/pdf";
            }
            else
            {
                throw new NotSupportedException("Unsupported file type. Only PDF is supported.");
            }

            string shortGuid = Guid.NewGuid().ToString("N")[..12];
            uniqueName = shortGuid + fileExtension;
            data = fileData;
        }

        if (fileName != null)
        {
            var existingFile = dbcontext.UserDocuments.FirstOrDefault(f => f.FileName == fileName);
            if (existingFile != null)
            {
                dbcontext.UserDocuments.Remove(existingFile);
                await dbcontext.SaveChangesAsync(); // or dbcontext.SaveChanges() if not async
            }
        }

        // Save to database to generate FileId
        var fileModel = new UserDocument
        {
            FileName = fileName == null ? uniqueName : fileName, // Temporary placeholder
            FileType = contentType,
            FileSize = data.Length,
            FileData = data,
            UpdatedAt = DateTime.Now
        };

        dbcontext.UserDocuments.Add(fileModel);
        await dbcontext.SaveChangesAsync();


        return uniqueName;
    }

    public string GetCurrentFinancialYear()
    {
        var today = DateTime.Today;
        int startYear = today.Month < 4 ? today.Year - 1 : today.Year;
        int endYear = startYear + 1;

        // Format: yyyy-yy (e.g., 2025-26)
        return $"{startYear}-{endYear % 100:00}";
    }



    public string GenerateApplicationId(int districtId, SocialWelfareDepartmentContext dbcontext)
    {
        string? districtShort = dbcontext.Districts.FirstOrDefault(u => u.DistrictId == districtId)?.DistrictShort;

        string financialYear = GetCurrentFinancialYear();

        var result = dbcontext.ApplicationPerDistricts.FirstOrDefault(a => a.DistrictId == districtId && a.FinancialYear == financialYear);

        int countPerDistrict = result?.CountValue ?? 0;

        string sql = "";

        if (countPerDistrict != 0)
            sql = "UPDATE ApplicationPerDistrict SET CountValue = @CountValue WHERE DistrictId = @districtId AND FinancialYear = @financialyear";
        else
            sql = "INSERT INTO ApplicationPerDistrict (DistrictId, FinancialYear, CountValue) VALUES (@districtId, @financialyear, @CountValue)";

        countPerDistrict++; // Increment before using in SqlParameter

        dbcontext.Database.ExecuteSqlRaw(sql,
            new SqlParameter("@districtId", districtId),
            new SqlParameter("@financialyear", financialYear),
            new SqlParameter("@CountValue", countPerDistrict));

        return $"{districtShort}/{financialYear}/{countPerDistrict}";
    }


    public SqlParameter[]? GetAddressParameters(IFormCollection form, string prefix)
    {
        try
        {
            return
            [
            new SqlParameter("@AddressDetails", form[$"{prefix}Address"].ToString()),
            new SqlParameter("@DistrictId", Convert.ToInt32(form[$"{prefix}District"])),
            new SqlParameter("@TehsilId", Convert.ToInt32(form[$"{prefix}Tehsil"])),
            new SqlParameter("@BlockId", Convert.ToInt32(form[$"{prefix}Block"])),
            new SqlParameter("@HalqaPanchayatName", form[$"{prefix}PanchayatMuncipality"].ToString()),
            new SqlParameter("@VillageName", form[$"{prefix}Village"].ToString()),
            new SqlParameter("@WardName", form[$"{prefix}Ward"].ToString()),
            new SqlParameter("@Pincode", form[$"{prefix}Pincode"].ToString())
            ];
        }
        catch (FormatException)
        {
            return null;
        }
    }

    public void UpdateApplication(string columnName, string columnValue, SqlParameter applicationId)
    {
        var columnNameParam = new SqlParameter("@ColumnName", columnName);
        var columnValueParam = new SqlParameter("@ColumnValue", columnValue);

        dbcontext.Database.ExecuteSqlRaw("EXEC UpdateApplication @ColumnName,@ColumnValue,@ApplicationId", columnNameParam, columnValueParam, applicationId);
    }

    public string[] GenerateUniqueRandomCodes(int numberOfCodes, int codeLength)
    {
        HashSet<string> codesSet = new HashSet<string>();
        Random random = new();

        while (codesSet.Count < numberOfCodes)
        {
            const string chars = "0123456789";
            char[] codeChars = new char[codeLength];

            for (int i = 0; i < codeLength; i++)
            {
                codeChars[i] = chars[random.Next(chars.Length)];
            }

            string newCode = new(codeChars);
            codesSet.Add(newCode.ToString());
        }

        string[] codesArray = new string[numberOfCodes];
        codesSet.CopyTo(codesArray);
        return codesArray;
    }

    public void InsertHistory(string referenceNumber, string ActionTaken, string ActionTaker, string Remarks, string LocationLevel, int LocationValue)
    {
        var history = new ActionHistory
        {
            ReferenceNumber = referenceNumber,
            ActionTaken = ActionTaken,
            ActionTaker = ActionTaker,
            Remarks = Remarks,
            LocationLevel = LocationLevel,
            LocationValue = LocationValue,
            ActionTakenDate = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
        };
        dbcontext.ActionHistories.Add(history);
        dbcontext.SaveChanges();
    }

    public bool DeleteFile(string filePath)
    {
        try
        {
            if (string.IsNullOrEmpty(filePath))
            {
                return false; // Nothing to delete
            }

            // Assuming the file path is relative, adjust base path as per your setup
            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", filePath.TrimStart('/'));

            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
                return true;
            }

            return false; // File not found
        }
        catch (Exception ex)
        {
            // Log exception if needed
            Console.WriteLine($"Error deleting file: {ex.Message}");
            return false;
        }
    }

}

