require('dotenv').config();
const { MongoClient } = require('mongodb');

// Ensure we are connecting directly to the 'GEO' database
const sourceUri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/GEO?retryWrites=true&w=majority&appName=Cluster0";
const destUri = "mongodb+srv://dgtlmarttech_db_user:GognVTBpQRRWZwZb@cluster0.twmpfgv.mongodb.net/GEO?retryWrites=true&w=majority";

async function migrate() {
    console.log("==================================================");
    console.log("Starting Migration for 'GEO' database ONLY");
    console.log("==================================================");
    console.log("Source:", sourceUri.replace(/:([^:@]{3,})@/, ':***@'));
    console.log("Dest:  ", destUri.replace(/:([^:@]{3,})@/, ':***@'));
    console.log("==================================================\n");
    
    // We already have mongoose installed, so mongodb native driver is available.
    const sourceClient = new MongoClient(sourceUri);
    const destClient = new MongoClient(destUri);

    try {
        console.log("1. Connecting to Source and Destination clusters...");
        await sourceClient.connect();
        await destClient.connect();
        console.log("   ✅ Connections established!");

        const sourceDb = sourceClient.db('GEO');
        const destDb = destClient.db('GEO');

        console.log("\n2. Fetching collections from Source database...");
        const collections = await sourceDb.listCollections().toArray();
        console.log(`   Found ${collections.length} collections.\n`);
        
        for (const collInfo of collections) {
            const collName = collInfo.name;
            console.log(`⏳ Migrating collection: [${collName}]...`);
            
            const sourceColl = sourceDb.collection(collName);
            const destColl = destDb.collection(collName);

            // Fetch all documents for this collection
            const docs = await sourceColl.find({}).toArray();
            
            if (docs.length > 0) {
                // Warning: We are NOT clearing the destination collection. 
                // Running this twice will duplicate data unless you have unique indexes.
                await destColl.insertMany(docs);
                console.log(`   ✅ Copied ${docs.length} documents.`);
            } else {
                console.log(`   ⚠️ Collection is empty. Skipped.`);
            }
        }
        
        console.log("\n==================================================");
        console.log("🎉 SUCCESS: GEO Database Migration Completed!");
        console.log("==================================================");

    } catch (e) {
        console.error("\n❌ Migration failed. Error details:", e);
    } finally {
        await sourceClient.close();
        await destClient.close();
    }
}

migrate();
