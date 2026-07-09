const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
dotenv.config({ path: path.join(__dirname, ".env") });

const Project = require("./src/models/Project");
const Snapshot = require("./src/models/Snapshot");
const { internalRunProjectScan } = require("./src/controllers/project.controller");

async function runScan() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    // Create a dummy project
    const project = new Project({
      name: "CreatorsXchange Test",
      brandName: "creatorsxchange",
      domain: "creatorsxchange.com",
      prompts: ["top influencer marketplaces for brands"],
      userId: new mongoose.Types.ObjectId(), // Fake user
      targetEngines: ["openai", "gemini"],
      market: { name: "Global", type: "global" }
    });
    await project.save();
    console.log(`Created test project: ${project._id}`);

    console.log("Running comprehensive scan (this will take 30-60 seconds)...");
    await internalRunProjectScan(project);
    console.log("Scan complete.");

    // Fetch the generated snapshot
    const snapshot = await Snapshot.findOne({ projectId: project._id }).sort({ date: -1 }).lean();
    if (snapshot) {
      console.log("--- SNAPSHOT DATA ---");
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log("No snapshot was created.");
    }

  } catch (err) {
    console.error("Fatal Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runScan();
