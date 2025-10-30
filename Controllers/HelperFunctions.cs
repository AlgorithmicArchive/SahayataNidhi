using System.Dynamic;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SahayataNidhi.Models.Entities;
using JsonSerializer = System.Text.Json.JsonSerializer;

public class UserHelperFunctions(IWebHostEnvironment webHostEnvironment, SwdjkContext dbcontext, ILogger<UserHelperFunctions> logger, IHttpClientFactory httpClientFactory, IConfiguration configuration)
{
    private readonly IWebHostEnvironment _webHostEnvironment = webHostEnvironment;
    private readonly SwdjkContext dbcontext = dbcontext;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly IConfiguration _configuration = configuration;
    private readonly ILogger<UserHelperFunctions> _logger = logger;

    private HttpClient Client => _httpClientFactory.CreateClient();

    private string BaseUrl => _configuration["JanParichay:ClientBaseUrl"]!.TrimEnd('/');

    public async Task<string> GetFilePath(IFormFile? docFile = null, byte[]? fileData = null, string? fileName = null, string documentType = "document")
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
        var fileModel = new UserDocuments
        {
            FileName = fileName ?? uniqueName, // Temporary placeholder
            FileType = contentType,
            FileSize = data.Length,
            FileData = data,
            DocumentType = documentType,
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

    public string GenerateApplicationId(int districtId, SwdjkContext dbcontext)
    {
        string? districtShort = dbcontext.District.FirstOrDefault(u => u.DistrictId == districtId)?.DistrictShort;

        string financialYear = GetCurrentFinancialYear();

        var result = dbcontext.ApplicationPerDistrict.FirstOrDefault(a => a.DistrictId == districtId && a.FinancialYear == financialYear);

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
            ActionTakenDate = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt", CultureInfo.InvariantCulture)
        };
        dbcontext.ActionHistory.Add(history);
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


    // Janparichay Helper functions
    public async Task<string> PerformHandshakeAsync(string handshakingId, string sid)
    {
        var url = $"{BaseUrl}/handshake?handshakingId={handshakingId}&sid={sid}";
        var response = await Client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("Handshake Response: {Content}", content);

        response.EnsureSuccessStatusCode();
        var result = JsonSerializer.Deserialize<HandshakeResponse>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                     ?? throw new Exception("Handshake failed: null response");

        if (result.Status?.ToLower() != "success")
            throw new Exception($"Handshake failed: {result.Status}");

        return result.ServerHandshakingId!;
    }

    // 2. ENCRYPT
    public async Task<string> EncryptStringAsync(string plainText)
    {
        var url = $"{BaseUrl}/encryption";

        var requestBody = new
        {
            AESString = plainText
        };

        var content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json"
        );

        _logger.LogInformation("Encrypt Request: {Body}", JsonSerializer.Serialize(requestBody));

        var response = await Client.PostAsync(url, content);
        var responseContent = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("Encrypt Response: {Content}", responseContent);

        response.EnsureSuccessStatusCode();

        var result = JsonSerializer.Deserialize<EncryptResponse>(responseContent,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new Exception("Encrypt failed: null response");

        // ✅ The actual API responds with data.signature, not data.AESString
        if (!string.Equals(result.Status, "success", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrEmpty(result.Data?.Signature))
        {
            throw new Exception($"Encrypt failed: {responseContent}");
        }

        // Return the encrypted string (inside 'signature' key)
        return result.Data.Signature;
    }




    public async Task<UserSignature> DecryptStringAsync(string encryptedText)
    {
        var url = $"{BaseUrl}/decryption";

        // Create the JSON body
        var jsonBody = JsonSerializer.Serialize(new
        {
            EncryptedString = encryptedText
        });

        var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        var response = await Client.PostAsync(url, content);
        var responseString = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("Decrypt Response: {Content}", responseString);

        response.EnsureSuccessStatusCode();

        var result = JsonSerializer.Deserialize<DecryptResponse>(responseString,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new Exception("Decrypt failed: null response");

        if (result.Status?.ToLower() != "success" || result.Data?.Signature == null)
            throw new Exception($"Decrypt failed: {responseString}");

        return result.Data.Signature;
    }


    // 3. HMAC
    public async Task<string> GetHmacSignatureAsync(string input)
    {
        var url = $"{BaseUrl}/hmac"; // Correct API endpoint

        // Prepare the JSON request body as per API spec
        var requestBody = new
        {
            HmacString = input
        };

        var content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json"
        );

        _logger.LogInformation("HMAC Request: {Body}", JsonSerializer.Serialize(requestBody));

        // API requires POST
        var response = await Client.PostAsync(url, content);
        var responseContent = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("HMAC Response: {Content}", responseContent);

        // Throw on 4xx or 5xx
        response.EnsureSuccessStatusCode();

        var result = JsonSerializer.Deserialize<HmacResponse>(
            responseContent,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new Exception("HMAC failed: null response");

        // Expected successful response format:
        // {
        //   "status": "success",
        //   "message": "...",
        //   "data": { "signature": "HMAC Sign" }
        // }

        if (!string.Equals(result.Status, "success", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrEmpty(result.Data?.Signature))
        {
            throw new Exception($"HMAC failed: {responseContent}");
        }

        return result.Data.Signature;
    }

    // 4. TOKEN VALIDATION
    public async Task<bool> ValidateTokenAsync(string clientToken, string sessionId, string browserId, string sid)
    {
        var url = $"{BaseUrl}/isTokenValid?clientToken={clientToken}&sessionId={sessionId}&browserId={browserId}&sid={sid}";
        var response = await Client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("TokenValid Response: {Content}", content);

        response.EnsureSuccessStatusCode();
        var result = JsonSerializer.Deserialize<TokenValidResponse>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                     ?? throw new Exception("TokenValid failed");

        return result.Status?.ToLower() == "success" && result.TokenValid == "true";
    }

    public async Task<Users> FindOrCreateJanParichayUser(UserSignature userSignature)
    {
        if (userSignature == null)
            throw new ArgumentException("Invalid JanParichay user data");

        // Fallback: Use UserId as Email if Email is missing/empty (common for mobile logins)
        var effectiveEmail = string.IsNullOrEmpty(userSignature.Email) ? userSignature.UserId : userSignature.Email;
        if (string.IsNullOrEmpty(effectiveEmail))
            throw new ArgumentException("Invalid JanParichay user data: Missing both Email and UserId");

        // 1. Try to find existing user by effectiveEmail
        var existingUser = await dbcontext.Users
      .FirstOrDefaultAsync(u => u.Email == effectiveEmail);

        if (existingUser != null)
        {
            if (string.IsNullOrWhiteSpace(existingUser.Username))
            {
                existingUser.Username = userSignature.UserName;
                await dbcontext.SaveChangesAsync(); // ✅ async save
            }

            return existingUser;
        }

        // 2. Prepare additional details as JSON for citizens/officers
        var additionalDetails = new
        {
            DateOfBirth = userSignature.Dob
        };
        var additionalJson = JsonSerializer.Serialize(additionalDetails);


        // 3. Create new user (use effectiveEmail for Username/Email)
        var newUser = new Users
        {
            Name = $"{userSignature.FirstName?.ToUpper()} {userSignature.LastName?.ToUpper()}".Trim(),
            Username = effectiveEmail,  // Use effectiveEmail here
            Email = effectiveEmail,     // Use effectiveEmail here
            MobileNumber = userSignature.MobileNo,
            UserType = userSignature.UserType ?? "Citizen",  // Fallback to userType if Role missing
            Profile = userSignature.ProfilePic ?? "/assets/images/profile.jpg",
            BackupCodes = null, // Generate if needed
            AdditionalDetails = additionalJson, // Store all extra details as JSON
            IsEmailValid = true,
            RegisteredDate = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
        };
        _logger.LogInformation($"Creating new user with UserData: {newUser}");

        dbcontext.Users.Add(newUser);  // Uncomment for actual save
        await dbcontext.SaveChangesAsync();
        return newUser;
    }
    // 5. LOGOUT
    public string GetJanParichayLogoutUrl(
    string clientToken,
    string sessionId,
    string browserId,
    string sid,
    string userAgent,
    string tid)
    {
        // Build the exact string to sign, as per documentation:
        // "JanParichay" + tid + "{BaseUrl}/v1/salt/api/client/logout" + clientToken + sid + sessionId

        var baseUrl = _configuration["JanParichay:JanParichayBaseUrl"]!.TrimEnd('/');

        var signatureBase = $"JanParichay{tid}{baseUrl}/v1/salt/api/client/logout{clientToken}{sid}{sessionId}";

        // Generate HMAC hash (sync for simplicity)
        var clientSignature = GetHmacSignatureAsync(signatureBase).GetAwaiter().GetResult();

        // Then build the final redirect URL
        var url = $"{baseUrl}/v1/salt/api/client/logout?" +
                  $"clientToken={clientToken}" +
                  $"&sid={sid}" +
                  $"&sessionId={sessionId}" +
                  $"&browserId={browserId}" +
                  $"&ua={userAgent}" +
                  $"&tid={tid}" +
                  $"&cs={clientSignature}";

        _logger.LogInformation("JanParichay Logout Redirect URL: {Url}", url);
        return url;
    }

    public string GetDepartment(Users user)
    {
        if (user.UserType != "Admin") return "";
        try
        {
            var details = JsonConvert.DeserializeObject<Dictionary<string, object>>(user.AdditionalDetails!);
            if (details?.TryGetValue("Department", out var deptId) == true)
            {
                int id = Convert.ToInt32(deptId);
                return dbcontext.Departments.FirstOrDefault(d => d.DepartmentId == id)?.DepartmentName ?? "";
            }
        }
        catch { }
        return "";
    }

    public string GenerateJwt(Users user, string clientToken)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.Username!),
            new(ClaimTypes.Role, user.UserType!),
            new("Profile", user.Profile!),
            new("JanParichayClientToken", clientToken)
        };

        var key = Encoding.ASCII.GetBytes(_configuration["JWT:Secret"]!);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(12),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration["JWT:Issuer"],
            Audience = _configuration["JWT:Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }


}

