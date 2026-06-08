
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const serverless = require('serverless-http');

// 🔥 THE FIX: Force Node.js to use Google/Cloudflare DNS to fix the Windows bug
require('node:dns/promises').setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true); // Vital for getting accurate IPs on deployed servers

// Replace <db_password> with your actual database user password
const uri = "mongodb+srv://yaminahad420_db_user:WWpJjdshIHuuiNiW@cluster0.luuib9x.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Helper to determine browser name
function getBrowserName(ua) {
    if (!ua) return "Unknown";
    if (ua.includes("Firefox")) return "Mozilla Firefox";
    if (ua.includes("SamsungBrowser")) return "Samsung Internet";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    if (ua.includes("Trident")) return "Internet Explorer";
    if (ua.includes("Edge") || ua.includes("Edg")) return "Microsoft Edge";
    if (ua.includes("Chrome")) return "Google Chrome";
    if (ua.includes("Safari")) return "Apple Safari";
    return "Unknown Browser";
}

// Main "/" route
app.get('/', async (req, res) => {
    try {
        // 1. Capture the client's network information
        let ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // Clean up IPv6 loopback format if testing locally
        if (ip === '::1' || ip === '::ffff:127.0.0.1') {
            ip = '127.0.0.1';
        }

        const userAgent = req.headers['user-agent'] || '';
        const browserName = getBrowserName(userAgent);
        const language = req.headers['accept-language'] ? req.headers['accept-language'].split(',')[0] : 'Unknown';

        const visitorData = {
            ipAddress: ip,
            browserName,
            userAgent,
            language,
            timestamp: new Date()
        };

        // 2. Query MongoDB Cloud using Native Driver
        // Connect to the Atlas Cluster
        await client.connect();
        
        // Select database and collection (it will auto-create these if they don't exist)
        const database = client.db("visitorTracker");
        const visitorsCollection = database.collection("records");

        // Check if a document with this IP address already exists
        const existingVisitor = await visitorsCollection.findOne({ ipAddress: ip });

        if (!existingVisitor) {
            // IP is unique -> Insert into MongoDB Cloud
            await visitorsCollection.insertOne(visitorData);
            
            // hiding response
            res.send("<h1>Ops, Very sorry unfortunately something went wrong!! letter..</h1>")
            
            // res.send(`
            //     <h1>Thank you for visiting!</h1>
            //     <p>Your details have been successfully recorded for the first time.</p>
            //     <pre>${JSON.stringify(visitorData, null, 2)}</pre>
            // `);
        } else {
            // IP already exists -> Return thank you message without duplicating
            // res.send(`
            //     <h1>Thank you for returning!</h1>
            //     <p>Your IP (${ip}) is already registered in our cloud system. No new data was saved.</p>
            //     <pre>${JSON.stringify(visitorData, null, 2)}</pre>
            // `);

            // hiding response
            res.send("<h1>Ops, Very sorry unfortunately something went wrong!! letter..</h1>")
        }

    } catch (error) {
        console.error("Server or Database Error:", error);
        res.status(500).send("An error occurred while executing database checks.");
    } finally {
        // Keep the connection open for subsequent requests in production, 
        // but for local script safety, we make sure it gracefully logs errors.
    }
});

module.exports.handler = serverless(app);