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

    [JsonPropertyName("data")]
    public DecryptData? Data { get; set; }
}
public class DecryptData
{
    [JsonPropertyName("decryptedString")]
    public string? DecryptedString { get; set; }
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