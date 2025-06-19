const query = require("./server/queries");

async function testQuery() {
    console.log("🔍 Testing home settings query...");
    
    try {
        const settings = await query.homeSettings.get();
        console.log("✅ Query successful:", settings);
        
        // Test update query
        const updateData = {
            event_title: "TEST TITLE " + Date.now(),
            artist_name: "TEST ARTIST"
        };
        
        console.log("🔄 Testing update with data:", updateData);
        const updated = await query.homeSettings.update(updateData, 1);
        console.log("✅ Update successful:", updated);
        
        // Get again to verify
        const settingsAfter = await query.homeSettings.get();
        console.log("📋 Settings after update:", settingsAfter);
        
    } catch (error) {
        console.error("❌ Query failed:", error);
    }
}

testQuery();
