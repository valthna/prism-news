
const PROJECT_REF = 'zbtoxggsribmpodjrqrn';
const ACCESS_TOKEN = 'sbp_76debf6bf08d9871017530a662e87964be4f8193';

async function inspectTables() {
    const tables = ['ai_models', 'model_metrics', 'model_logs', 'model_health'];

    for (const table of tables) {
        console.log(`\n=== ${table.toUpperCase()} ===`);

        const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table}'
      ORDER BY ordinal_position;
    `;

        try {
            const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                console.error(`Error ${response.status}`);
                continue;
            }

            const data = await response.json();
            console.table(data);
        } catch (error) {
            console.error("Error:", error);
        }
    }
}

inspectTables();
