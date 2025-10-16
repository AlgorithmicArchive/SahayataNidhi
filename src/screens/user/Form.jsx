import { Box } from "@mui/material";
import React from "react";
import DynamicScrollableForm from "../../components/form/DynamicScrollableForm";

export default function Form() {
  const indianMaleNames = [
    "RAHUL SHARMA",
    "AMIT VERMA",
    "SANJAY KUMAR",
    "VIJAY PATEL",
    "RAKESH SINGH",
    "ANIL MEHTA",
    "SURESH JAIN",
    "ARUN AGARWAL",
    "DEEPAK CHOPRA",
    "RAJIV SAXENA",
    "VIKAS GUPTA",
    "MANOJ NAIR",
    "PANKAJ MISHRA",
    "KUNAL RAO",
    "ROHIT SHINDE",
    "NAVEEN YADAV",
    "SUNIL BHATT",
    "PRAVEEN REDDY",
    "ASHOK DESHMUKH",
    "RAJESH IYER",
  ];

  const indianFemaleNames = [
    "PRIYA SHARMA",
    "ANITA VERMA",
    "NEHA SINGH",
    "KAVITA KUMARI",
    "SONALI GUPTA",
    "RITU JAIN",
    "POOJA AGARWAL",
    "DEEPIKA MEHTA",
    "SANGEETA NAIR",
    "ANJALI REDDY",
    "MEENA DESAI",
    "SWATI MISHRA",
    "BHAVNA SHAH",
    "KIRAN BHATT",
    "RESHMA IYER",
    "JYOTI YADAV",
    "TANUJA PATEL",
    "NAMRATA CHOPRA",
    "MADHURI RAO",
    "LATA SAXENA",
  ];

  function getRandomName(nameArray) {
    const index = Math.floor(Math.random() * nameArray.length);
    return nameArray[index];
  }

  const dummyDataList = [
    {
      Location: [
        {
          label: "District",
          name: "District",
          value: 5,
        },
        {
          label: "Tehsil Social Welfare Office (TSWO)",
          name: "Tehsil",
          value: 25,
        },
      ],
      "Pension Type": [
        {
          label: "Pension Type",
          name: "PensionType",
          value: "OLD AGE PENSION",
        },
      ],
      "Applicant Details": [
        {
          label: "Applicant Name",
          name: "ApplicantName",
          value: getRandomName(indianMaleNames),
        },
        {
          label: "Applicant Image",
          name: "ApplicantImage",
          File: "a1cfecb01ca7.jpg",
        },
        {
          label: "Date of Birth",
          name: "DateOfBirth",
          value: "1950-01-01",
        },
        {
          label: "Mobile Number",
          name: "MobileNumber",
          value: "9999911111",
        },
        {
          label: "Email",
          name: "Email",
          value: "randomizerweb129@gmail.com",
        },
        {
          label: "Category",
          name: "Category",
          value: "AYY",
        },
        {
          label: "Ration Card Number",
          name: "RationCardNumber",
          value: "1111111111",
        },
        {
          label: "Gender",
          name: "Gender",
          value: "Male",
        },
        {
          label: "Relation",
          name: "Relation",
          value: "Father",
        },
        {
          label: "Parentage",
          name: "Parentage",
          value: getRandomName(indianMaleNames),
        },
        {
          label: "Aadhaar Number",
          name: "AadharNumber",
          value: "",
        },
      ],
      "Present Address Details": [
        {
          label: "Present Address  (H.No., Street Name)",
          name: "PresentAddress",
          value: "123, Main Street, Jammu",
        },
        {
          label: "Present Address Type",
          name: "PresentAddressType",
          value: "Urban",
          additionalFields: [
            {
              lable: "Present District",
              name: "PresentDistrict",
              value: 5,
            },
            {
              lable: "Present Tehsil",
              name: "PresentTehsil",
              value: 79,
            },
            {
              label: "Present Muncipality",
              name: "PresentMuncipality",
              value: "248194",
            },
            {
              label: "Present Ward",
              name: "PresentWardNo",
              value: "11013",
            },
          ],
        },
        {
          label: "Present Pincode",
          name: "PresentPincode",
          value: "180001",
        },
      ],
      "Permanent Address Details": [
        {
          label: "Permanent Address  (H.No., Street Name)",
          name: "PermanentAddress",
          value: "123, Main Street, Jammu",
        },
        {
          label: "Permanent Address Type",
          name: "PermanentAddressType",
          value: "Urban",
        },
        {
          label: "Present Pincode",
          name: "PresentPincode",
          value: "180001",
        },
      ],
      "Bank Details": [
        {
          label: "Bank",
          name: "BankName",
          value: "",
        },
        {
          label: "Branch Name",
          name: "BranchName",
          value: "",
        },
        {
          label: "IFSC Code",
          name: "IfscCode",
          value: "",
        },
        {
          label: "Account Number",
          name: "AccountNumber",
          value: "1234567890122516",
        },
      ],
      Documents: [
        {
          label: "Domicile Certificate",
          name: "DomicileCertificate",
          Enclosure: "Domicile Certificate",
        },
        {
          label: "Proof Of Residence",
          name: "ProofOfResidence",
          Enclosure: "Electricity Bill",
        },
        {
          label: "Proof Of Age",
          name: "ProofOfAge",
          Enclosure: "Domicile Certificate",
        },
        {
          label: "Ration Card",
          name: "RationCard",
          Enclosure: "Ration Card(Inner & Outter Both)",
        },
        {
          label: "Bank Passbook",
          name: "BankPassbook",
          Enclosure: "Bank Passbook",
        },
        {
          label: "Affidavit",
          name: "Affidavit",
          Enclosure:
            "Affidavit attested by Judicial Magistrate lst Class or Executive Magistrate First Class that she/he is not in receipt of any pension/financial assistance from any other source.",
        },
        {
          label: "Other",
          name: "Other",
          Enclosure: "",
        },
      ],
    },
    {
      Location: [
        {
          label: "District",
          name: "District",
          value: 5,
        },
        {
          label: "Tehsil Social Welfare Office (TSWO)",
          name: "Tehsil",
          value: 25,
        },
      ],
      "Pension Type": [
        {
          label: "Pension Type",
          name: "PensionType",
          value: "PHYSICALLY CHALLENGED PERSON",
          additionalFields: [
            {
              label: "UDID Card Issue Date",
              name: "UdidCardIssueDate",
              value: "2025-02-02",
            },
            {
              label: "Type of Disability as per UDID Card",
              name: "TypeOfDisabilityAsPerUdidCard",
              value: "BLINDNESS",
            },
            {
              label: "Kind Of Disability",
              name: "KindOfDisability",
              value: "TEMPORARY",
              additionalFields: [],
            },
            {
              label: "UDID Card Number",
              name: "UdidCardNumber",
              value: "1111111111111111",
            },
            {
              label: "Percentage of Disability",
              name: "PercentageOfDisability",
              value: "45",
            },
          ],
        },
      ],
      "Applicant Details": [
        {
          label: "Applicant Name",
          name: "ApplicantName",
          value: getRandomName(indianMaleNames),
        },
        {
          label: "Applicant Image",
          name: "ApplicantImage",
          File: "a1cfecb01ca7.jpg",
        },
        {
          label: "Date of Birth",
          name: "DateOfBirth",
          value: "1950-01-01",
        },
        {
          label: "Mobile Number",
          name: "MobileNumber",
          value: "9999911111",
        },
        {
          label: "Email",
          name: "Email",
          value: "randomizerweb129@gmail.com",
        },
        {
          label: "Category",
          name: "Category",
          value: "AYY",
        },
        {
          label: "Ration Card Number",
          name: "RationCardNumber",
          value: "1111111111",
        },
        {
          label: "Gender",
          name: "Gender",
          value: "Male",
        },
        {
          label: "Relation",
          name: "Relation",
          value: "Father",
        },
        {
          label: "Parentage",
          name: "Parentage",
          value: getRandomName(indianMaleNames),
        },
        {
          label: "Aadhaar Number",
          name: "AadharNumber",
          value: "",
        },
      ],
      "Present Address Details": [
        {
          label: "Present Address  (H.No., Street Name)",
          name: "PresentAddress",
          value: "123, Main Street, Jammu",
        },
        {
          label: "Present Address Type",
          name: "PresentAddressType",
          value: "Urban",
          additionalFields: [
            {
              lable: "Present District",
              name: "PresentDistrict",
              value: 5,
            },
            {
              lable: "Present Tehsil",
              name: "PresentTehsil",
              value: 79,
            },
            {
              label: "Present Muncipality",
              name: "PresentMuncipality",
              value: "248194",
            },
            {
              label: "Present Ward",
              name: "PresentWardNo",
              value: "11013",
            },
          ],
        },
        {
          label: "Present Pincode",
          name: "PresentPincode",
          value: "180001",
        },
      ],
      "Permanent Address Details": [
        {
          label: "Permanent Address  (H.No., Street Name)",
          name: "PermanentAddress",
          value: "123, Main Street, Jammu",
        },
        {
          label: "Permanent Address Type",
          name: "PermanentAddressType",
          value: "Urban",
        },
        {
          label: "Present Pincode",
          name: "PresentPincode",
          value: "180001",
        },
      ],
      "Bank Details": [
        {
          label: "Bank",
          name: "BankName",
          value: "",
        },
        {
          label: "Branch Name",
          name: "BranchName",
          value: "",
        },
        {
          label: "IFSC Code",
          name: "IfscCode",
          value: "",
        },
        {
          label: "Account Number",
          name: "AccountNumber",
          value: "1234567890122516",
        },
      ],
      Documents: [
        {
          label: "Domicile Certificate",
          name: "DomicileCertificate",
          Enclosure: "Domicile Certificate",
        },
        {
          label: "Proof Of Residence",
          name: "ProofOfResidence",
          Enclosure: "Electricity Bill",
        },
        {
          label: "Proof Of Age",
          name: "ProofOfAge",
          Enclosure: "Domicile Certificate",
        },
        {
          label: "Ration Card",
          name: "RationCard",
          Enclosure: "Ration Card(Inner & Outter Both)",
        },
        {
          label: "Bank Passbook",
          name: "BankPassbook",
          Enclosure: "Bank Passbook",
        },
        {
          label: "Affidavit",
          name: "Affidavit",
          Enclosure:
            "Affidavit attested by Judicial Magistrate lst Class or Executive Magistrate First Class that she/he is not in receipt of any pension/financial assistance from any other source.",
        },
        {
          label: "Other",
          name: "Other",
          Enclosure: "",
        },
      ],
    },
    {
      Location: [
        {
          label: "District",
          name: "District",
          value: 5,
        },
        {
          label: "Tehsil Social Welfare Office (TSWO)",
          name: "Tehsil",
          value: 25,
        },
      ],
      "Pension Type": [
        {
          label: "Pension Type",
          name: "PensionType",
          value: "WOMEN IN DISTRESS",
          additionalFields: [
            {
              label: "Civil Condition",
              name: "CivilCondition",
              value: "WIDOW",
            },
          ],
        },
      ],
      "Applicant Details": [
        {
          label: "Applicant Name",
          name: "ApplicantName",
          value: getRandomName(indianFemaleNames),
        },
        {
          label: "Applicant Image",
          name: "ApplicantImage",
          File: "a1cfecb01ca7.jpg",
        },
        {
          label: "Date of Birth",
          name: "DateOfBirth",
          value: "1950-01-01",
        },
        {
          label: "Mobile Number",
          name: "MobileNumber",
          value: "9999911111",
        },
        {
          label: "Email",
          name: "Email",
          value: "randomizerweb129@gmail.com",
        },
        {
          label: "Category",
          name: "Category",
          value: "AYY",
        },
        {
          label: "Ration Card Number",
          name: "RationCardNumber",
          value: "1111111111",
        },
        {
          label: "Gender",
          name: "Gender",
          value: "Female",
        },
        {
          label: "Relation",
          name: "Relation",
          value: "Father",
        },
        {
          label: "Parentage",
          name: "Parentage",
          value: getRandomName(indianMaleNames),
        },
        {
          label: "Aadhaar Number",
          name: "AadharNumber",
          value: "",
        },
      ],
      "Present Address Details": [
        {
          label: "Present Address  (H.No., Street Name)",
          name: "PresentAddress",
          value: "123, Main Street, Jammu",
        },
        {
          label: "Present Address Type",
          name: "PresentAddressType",
          value: "Urban",
          additionalFields: [
            {
              lable: "Present District",
              name: "PresentDistrict",
              value: 5,
            },
            {
              lable: "Present Tehsil",
              name: "PresentTehsil",
              value: 79,
            },
            {
              label: "Present Muncipality",
              name: "PresentMuncipality",
              value: "248194",
            },
            {
              label: "Present Ward",
              name: "PresentWardNo",
              value: "11013",
            },
          ],
        },
        {
          label: "Present Pincode",
          name: "PresentPincode",
          value: "180001",
        },
      ],
      "Permanent Address Details": [
        {
          label: "Permanent Address  (H.No., Street Name)",
          name: "PermanentAddress",
          value: "123, Main Street, Jammu",
        },
        {
          label: "Permanent Address Type",
          name: "PermanentAddressType",
          value: "Urban",
        },
        {
          label: "Present Pincode",
          name: "PresentPincode",
          value: "180001",
        },
      ],
      "Bank Details": [
        {
          label: "Bank",
          name: "BankName",
          value: "",
        },
        {
          label: "Branch Name",
          name: "BranchName",
          value: "",
        },
        {
          label: "IFSC Code",
          name: "IfscCode",
          value: "",
        },
        {
          label: "Account Number",
          name: "AccountNumber",
          value: "1234567890122519",
        },
      ],
      Documents: [
        {
          label: "Domicile Certificate",
          name: "DomicileCertificate",
          Enclosure: "Domicile Certificate",
        },
        {
          label: "Proof Of Residence",
          name: "ProofOfResidence",
          Enclosure: "Electricity Bill",
        },
        {
          label: "Proof Of Age",
          name: "ProofOfAge",
          Enclosure: "Domicile Certificate",
        },
        {
          label: "Ration Card",
          name: "RationCard",
          Enclosure: "Ration Card(Inner & Outter Both)",
        },
        {
          label: "Bank Passbook",
          name: "BankPassbook",
          Enclosure: "Bank Passbook",
        },
        {
          label: "Affidavit",
          name: "Affidavit",
          Enclosure:
            "Affidavit attested by Judicial Magistrate lst Class or Executive Magistrate First Class that she/he is not in receipt of any pension/financial assistance from any other source.",
        },
        {
          label: "Other",
          name: "Other",
          Enclosure: "",
        },
      ],
    },
  ];
  const randomIndex = Math.floor(Math.random() * dummyDataList.length);
  const dummyData = dummyDataList[randomIndex];
  return (
    <Box
      sx={{
        width: "100%",
        minHeight: { xs: "180vh", lg: "90vh" }, // Use min-height to ensure at least full viewport height
        display: { xs: "flex" },
        justifyContent: { xs: "center" }, // Center content vertically
        alignItems: { xs: "center", lg: "start" }, // Center content horizontally
        boxSizing: "border-box",
        background:
          "linear-gradient(to bottom right, #f4f9ff 0%, #f9f3ec 100%)",
      }}
    >
      <DynamicScrollableForm data={{}} />
    </Box>
  );
}
