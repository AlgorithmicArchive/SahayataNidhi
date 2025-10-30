using System.Text.Json.Serialization;

public class HandshakeResponse
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("serverHandshakingId")]
    public string? ServerHandshakingId { get; set; }
}

/* ---------- HMAC ---------- */
public class HmacResponse
{
    public string? Status { get; set; }
    public string? Message { get; set; }
    public HmacData? Data { get; set; }
}

public class HmacData
{
    public string? Signature { get; set; }
}


/* ---------- ENCRYPT ---------- */
public class EncryptResponse
{
    public string? Status { get; set; }
    public string? Message { get; set; }
    public EncryptData? Data { get; set; }
}

public class EncryptData
{
    public string? Signature { get; set; }  // This holds the encrypted string
}



/* ---------- DECRYPT ---------- */
public class DecryptResponse
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("data")]
    public DecryptData? Data { get; set; }
}

public class DecryptData
{
    [JsonPropertyName("signature")]
    public UserSignature? Signature { get; set; }
}

public class UserSignature
{
    [JsonPropertyName("address")]
    public string? Address { get; set; }

    [JsonPropertyName("authRole")]
    public string? AuthRole { get; set; }

    [JsonPropertyName("browserId")]
    public string? BrowserId { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("clientToken")]
    public string? ClientToken { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("csc_id")]
    public string? CscId { get; set; }

    [JsonPropertyName("departmentName")]
    public string? DepartmentName { get; set; }

    [JsonPropertyName("designation")]
    public string? Designation { get; set; }

    [JsonPropertyName("dl")]
    public string? Dl { get; set; }

    [JsonPropertyName("dob")]
    public string? Dob { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("employeeCode")]
    public string? EmployeeCode { get; set; }

    [JsonPropertyName("encryptedAadhaar")]
    public string? EncryptedAadhaar { get; set; }

    [JsonPropertyName("expiresAt")]
    public string? ExpiresAt { get; set; }

    [JsonPropertyName("firstName")]
    public string? FirstName { get; set; }

    [JsonPropertyName("fullName")]
    public string? FullName { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("handShakingId")]
    public string? HandShakingId { get; set; }

    [JsonPropertyName("ip")]
    public string? Ip { get; set; }

    [JsonPropertyName("isLoginThroughCSC")]
    public string? IsLoginThroughCSC { get; set; }

    [JsonPropertyName("issuer")]
    public string? Issuer { get; set; }

    [JsonPropertyName("lastName")]
    public string? LastName { get; set; }

    [JsonPropertyName("localTokenId")]
    public string? LocalTokenId { get; set; }

    [JsonPropertyName("location")]
    public string? Location { get; set; }

    [JsonPropertyName("loginId")]
    public string? LoginId { get; set; }

    [JsonPropertyName("mailAlternateAddress")]
    public string[]? MailAlternateAddress { get; set; }

    [JsonPropertyName("mailEquivalentAddress")]
    public string[]? MailEquivalentAddress { get; set; }

    [JsonPropertyName("mapping_id")]
    public string? MappingId { get; set; }

    [JsonPropertyName("mobileNo")]
    public string? MobileNo { get; set; }

    [JsonPropertyName("nicaccountexpdate")]
    public string? NicAccountExpDate { get; set; }

    [JsonPropertyName("pan")]
    public string? Pan { get; set; }

    [JsonPropertyName("parentToken")]
    public string? ParentToken { get; set; }

    [JsonPropertyName("parichayId")]
    public string? ParichayId { get; set; }

    [JsonPropertyName("profilePic")]
    public string? ProfilePic { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("serviceData")]
    public object? ServiceData { get; set; }

    [JsonPropertyName("serviceId")]
    public string? ServiceId { get; set; }

    [JsonPropertyName("serviceState")]
    public string? ServiceState { get; set; }

    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }

    [JsonPropertyName("ssoType")]
    public string? SsoType { get; set; }

    [JsonPropertyName("state")]
    public string? State { get; set; }

    [JsonPropertyName("stateCode")]
    public string? StateCode { get; set; }

    [JsonPropertyName("stateRole")]
    public string? StateRole { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("subservice")]
    public string? SubService { get; set; }

    [JsonPropertyName("ua")]
    public string? Ua { get; set; }

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("userName")]
    public string? UserName { get; set; }

    [JsonPropertyName("userRole")]
    public string? UserRole { get; set; }

    [JsonPropertyName("userState")]
    public string? UserState { get; set; }

    [JsonPropertyName("userType")]
    public string? UserType { get; set; }

    [JsonPropertyName("user_id")]
    public string? User_Id { get; set; }

    [JsonPropertyName("verificationIds")]
    public VerificationIds? VerificationIds { get; set; }

    [JsonPropertyName("verificationParameters")]
    public string? VerificationParameters { get; set; }

    [JsonPropertyName("zimOtp")]
    public string? ZimOtp { get; set; }
}

public class VerificationIds
{
    [JsonPropertyName("mobile")]
    public string? Mobile { get; set; }

    [JsonPropertyName("userid")]
    public string? UserId { get; set; }
}
/* ---------- TOKEN VALIDATION ---------- */
public class TokenValidResponse
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("tokenValid")]
    public string? TokenValid { get; set; }   // "true" or "false"
}

/* ---------- LOGOUT ---------- */
public class LogoutResponse
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

/* ---------- USER (after decryption) ---------- */
public class JanParichayUser
{
    [JsonPropertyName("FirstName")] public string? FirstName { get; set; }
    [JsonPropertyName("LastName")] public string? LastName { get; set; }
    [JsonPropertyName("Email")] public string? Email { get; set; }
    [JsonPropertyName("MobileNo")] public string? MobileNo { get; set; }
    [JsonPropertyName("Designation")] public string? Designation { get; set; }
    [JsonPropertyName("UserId")] public string? UserId { get; set; }
    [JsonPropertyName("ParichayId")] public string? ParichayId { get; set; }
    [JsonPropertyName("BrowserId")] public string? BrowserId { get; set; }
    [JsonPropertyName("SessionId")] public string? SessionId { get; set; }
    [JsonPropertyName("ClientToken")] public string? ClientToken { get; set; }
    [JsonPropertyName("LoginId")] public string? LoginId { get; set; }
    [JsonPropertyName("ServiceAccessTime")]
    public long ServiceAccessTime { get; set; }
}