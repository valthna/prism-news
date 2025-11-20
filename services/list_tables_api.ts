
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'zbtoxggsribmpodjrqrn';
const ACCESS_TOKEN = 'sbp_76debf6bf08d9871017530a662e87964be4f8193';

async function listTables() {
    console.log("Fetching tables via Management API...");

    try {
        const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Error ${response.status}: ${text}`);
            process.exit(1);
        }

        const data = await response.json();
        console.log("Tables found in public schema:");
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Network error:", error);
        process.exit(1);
    }
}

listTables();
