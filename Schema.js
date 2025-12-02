// Filename: server.js

const axios = require("axios");
const fs = require("fs");

const url = "https://jansugam.jk.gov.in/api/v1/service-applications/data";
const postData = {
  configId: 161,
  dataDate: "01/01/2023",
};

async function fetchData() {
  try {
    const response = await axios.post(url, postData, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });

    const data = response.data;
    console.log("✅ Data received from API");
    console.log("Sample Entry:", data?.initiated_data?.[0]);

    fs.writeFileSync("./jansugam_data.json", JSON.stringify(data, null, 2));
    console.log("✅ Data saved to jansugam_data.json");
  } catch (err) {
    console.error("❌ Error fetching data:", err.message);
  }
}

fetchData();
