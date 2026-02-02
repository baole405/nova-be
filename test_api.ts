import fs from "fs";

async function testApi() {
  try {
    const tokenContent = fs.readFileSync("token.txt", "utf-8");
    const token = tokenContent.trim().replace("generated_token: ", "");
    const BASE_URL = "http://localhost:3001/api";

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log("🚀 Starting API Tests with token...");

    // 1. Get My Apartment
    console.log("\n1️⃣ Testing GET /api/apartments/my");
    try {
      const aptRes = await fetch(`${BASE_URL}/apartments/my`, { headers });
      const aptText = await aptRes.text();
      console.log(`Status: ${aptRes.status}`);
      console.log("Body:", aptText.substring(0, 500)); // Log only first 500 chars
    } catch (e) {
      console.error("Apartment API Error", e);
    }

    // 2. Get Bills
    console.log("\n2️⃣ Testing GET /api/bills");
    try {
      const billsRes = await fetch(`${BASE_URL}/bills`, { headers });
      const billsText = await billsRes.text();
      console.log(`Status: ${billsRes.status}`);
      console.log("Body:", billsText.substring(0, 500));
    } catch (e) {
      console.error("Bills API Error", e);
    }

    // 3. Get Transactions
    console.log("\n3️⃣ Testing GET /api/transactions");
    try {
      const txRes = await fetch(`${BASE_URL}/transactions`, { headers });
      const txText = await txRes.text();
      console.log(`Status: ${txRes.status}`);
      console.log("Body:", txText.substring(0, 500));
    } catch (e) {
      console.error("Transactions API Error", e);
    }
  } catch (error) {
    console.error("❌ Test setup failed:", error);
  }
}

testApi();
