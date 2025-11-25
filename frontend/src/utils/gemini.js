export const geminiCall = async (systemInstruction, userQuery, jsonSchema = null) => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: systemInstruction,
                    user_query: userQuery,
                    json_schema: jsonSchema
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            attempt++;
            console.error(`Gemini call failed (attempt ${attempt}/${MAX_RETRIES}):`, error);
            if (attempt === MAX_RETRIES) throw error;
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
    }
};
