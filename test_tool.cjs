const { tools } = require("./tools");

async function testHelp() {
    console.log("Testing fetch_incident_timeline...");
    try {
        const result = await tools.fetch_incident_timeline.execute({});
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

testHelp();
