using System;
using System.Collections.Generic;

namespace SahayataNidhi.Models.Entities;

public partial class PensionPayment
{
    public string? StateCode { get; set; }

    public string? StateName { get; set; }

    public string? DivisionCode { get; set; }

    public string? DivisionName { get; set; }

    public string? DistrictId { get; set; }

    public string? DistrictName { get; set; }

    public string? PaymentOfMonth { get; set; }

    public string? PaymentOfYear { get; set; }

    public string? ReferenceNumber { get; set; }

    public string? DistrictBankUid { get; set; }

    public string? PayingDepartment { get; set; }

    public string? PayingDeptAccountNumber { get; set; }

    public string? PensionAmount { get; set; }

    public string? PaymentFileGenerationDate { get; set; }

    public string? PayingDeptBankName { get; set; }

    public string? PayingDeptIfscCode { get; set; }

    public string? PensionerName { get; set; }

    public string? PensionerIfscCode { get; set; }

    public string? PensionerAccountNo { get; set; }

    public string? PensionerType { get; set; }

    public string? BankResPensionerCategory { get; set; }

    public string? BankResStatusFromBank { get; set; }

    public string? BankResTransactionId { get; set; }

    public string? BankResBankDateExecuted { get; set; }

    public string? BankResTransactionStatus { get; set; }
}
