using Microsoft.AspNetCore.Mvc;
using iText.Kernel.Pdf;
using iText.Signatures;
using Org.BouncyCastle.Pkcs;
using Org.BouncyCastle.Crypto;
using iText.Bouncycastle.Crypto;
using iText.Commons.Bouncycastle.Cert;
using iText.Bouncycastle.X509;
using System.Security.Cryptography.X509Certificates;
using System.Security.Cryptography;
using iText.Forms.Form.Element;
using iText.Forms.Fields.Properties;
using iText.Kernel.Font;
using iText.IO.Font.Constants;
using iText.Kernel.Colors;
using System.Text;

namespace SahayataNidhi.Controllers.Officer
{
    public partial class OfficerController : Controller
    {
        [HttpPost]
        public IActionResult RegisterDSC([FromForm] IFormCollection form)
        {
            try
            {
                var officer = GetOfficerDetails();

                // Validate user exists
                bool officerExists = dbcontext.Users.Any(u => u.UserId == officer.UserId);
                if (!officerExists)
                {
                    return BadRequest("The officer/user ID does not exist.");
                }


                _logger.LogInformation($"------------USER ID: {officer.UserId}-----------------");

                var serialString = form["serial_number"].ToString();
                var ca = form["certifying_authority"].ToString();
                var expirationString = form["expiration_date"].ToString();

                // Parse serial number
                byte[] serialBytes = Convert.FromHexString(serialString); // or use BigInteger if decimal

                // Parse expiration date
                DateTime? expirationDate = DateTime.TryParse(expirationString, out var parsedDate)
                    ? parsedDate
                    : (DateTime?)null;

                var cert = new Models.Entities.Certificates
                {
                    OfficerId = Convert.ToInt32(officer.UserId),
                    SerialNumber = serialBytes,
                    CertifiyingAuthority = ca,
                    ExpirationDate = expirationDate,
                    RegisteredDate = DateTime.Now.ToString("dd MMM yyyy hh:mm:ss tt")
                };

                dbcontext.Certificates.Add(cert);
                dbcontext.SaveChanges();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                // Log exception if needed
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public IActionResult AlreadyRegistered()
        {
            var officer = GetOfficerDetails();
            try
            {

                // Validate user exists
                bool officerExists = dbcontext.Users.Any(u => u.UserId == officer.UserId);
                if (!officerExists)
                {
                    return BadRequest(new { success = false, message = "The officer/user ID does not exist." });
                }


                // Retrieve the certificate for the officer
                var certificate = dbcontext.Certificates
                    .Where(c => c.OfficerId == Convert.ToInt32(officer.UserId))
                    .FirstOrDefault();

                if (certificate == null)
                {
                    return Json(new
                    {
                        success = true,
                        isAlreadyRegistered = false
                    });
                }

                return Json(new
                {
                    success = true,
                    certificate_id = certificate.Uuid,
                    isAlreadyRegistered = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching registered DSC for User ID: {UserId}", officer?.UserId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public IActionResult UnRegisteredDSC([FromForm] IFormCollection form)
        {
            int certificateId = Convert.ToInt32(form["certificateId"]);
            var certificate = dbcontext.Certificates.FirstOrDefault(c => c.Uuid == certificateId);
            if (certificate != null)
            {
                dbcontext.Certificates.Remove(certificate);
                dbcontext.SaveChanges();
                return Json(new { status = true });
            }
            return Json(new { status = false });
        }

        public IActionResult GetRegisteredDSC()
        {
            var officer = GetOfficerDetails();
            try
            {

                // Validate user exists
                bool officerExists = dbcontext.Users.Any(u => u.UserId == officer.UserId);
                if (!officerExists)
                {
                    return BadRequest(new { success = false, message = "The officer/user ID does not exist." });
                }

                _logger.LogInformation($"Fetching registered DSC for User ID: {officer.UserId}");

                // Retrieve the certificate for the officer
                var certificate = dbcontext.Certificates
                    .Where(c => c.OfficerId == Convert.ToInt32(officer.UserId))
                    .Select(c => new
                    {
                        serial_number = Convert.ToHexString(c.SerialNumber!),
                        certifying_authority = c.CertifiyingAuthority,
                        expiration_date = c.ExpirationDate
                    })
                    .FirstOrDefault();

                if (certificate == null)
                {
                    return NotFound(new { success = false, message = "No registered certificate found for this officer." });
                }

                return Json(new
                {
                    success = true,
                    certificate = new
                    {
                        certificate.serial_number,
                        certificate.certifying_authority,
                        certificate.expiration_date
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching registered DSC for User ID: {UserId}", officer?.UserId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}