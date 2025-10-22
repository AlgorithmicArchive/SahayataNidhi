using System.Net;
using System.Net.Mail;
using EncryptionHelper;
using Microsoft.Extensions.Options;
using SahayataNidhi.Models.Entities;

namespace SendEmails
{
    public class EmailSender(ILogger<EmailSender> logger, SwdjkContext dbcontext, IEncryptionService encryptionService, IConfiguration configuration) : IEmailSender
    {
        protected readonly SwdjkContext dbcontext = dbcontext;
        private readonly ILogger<EmailSender> _logger = logger;

        private readonly IEncryptionService _encryptionService = encryptionService;
        private readonly IConfiguration _configuration = configuration;

        public async Task SendEmail(string email, string subject, string message)
        {
            throw new SmtpException("Simulated failure for testing");
            await SendEmailWithAttachments(email, subject, message, null);
        }

        // New method to support attachments
        public async Task SendEmailWithAttachments(string email, string subject, string message, IList<string>? attachmentPaths = null)
        {
            try
            {
                var _emailSettings = dbcontext.EmailSettings.FirstOrDefault();
                string? senderEmail = _emailSettings!.SenderEmail;
                string? key = _configuration["Encryption:Key"];
                string? password = _encryptionService.Decrypt(_emailSettings.Password, key!);

                using (var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.SmtpPort)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(senderEmail, password),
                    Timeout = 30000
                })
                {
                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(senderEmail!),
                        Subject = subject,
                        Body = message,
                        IsBodyHtml = true
                    };
                    mailMessage.To.Add(email);

                    // Add attachments if provided
                    if (attachmentPaths != null && attachmentPaths.Any())
                    {
                        foreach (var path in attachmentPaths)
                        {
                            _logger.LogInformation($"---------full Path:{path}------------------");
                            if (System.IO.File.Exists(path))
                            {
                                var attachment = new Attachment(path);
                                mailMessage.Attachments.Add(attachment);
                            }
                            else
                            {
                                _logger.LogWarning($"Attachment file not found: {path}");
                            }
                        }
                    }

                    await client.SendMailAsync(mailMessage);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending email: {ex}");
                throw;
            }
        }
    }
}
