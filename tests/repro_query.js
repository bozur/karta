const query = `
            SELECT TOP 5 
                korisnik, 
                brojac_stavki, 
                brojac_dogadjaja, 
                brojac_zapisa,
                (ISNULL(brojac_stavki, 0) * 10 + ISNULL(brojac_dogadjaja, 0) + ISNULL(brojac_zapisa, 0)) as points
            FROM korisnik
            ORDER BY points DESC
`;

let processedText = query
    .replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/GETUTCDATE\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/ISNULL\(/gi, 'COALESCE(')
    .replace(/LEN\(/gi, 'LENGTH(')
    .replace(/OUTPUT INSERTED\.id/gi, 'RETURNING id')
    .replace(/DATETIME2/gi, 'TIMESTAMP')
    .replace(/CAST\((.*?) AS N?VARCHAR(\(\d+\))?\)/gi, 'CAST($1 AS VARCHAR)');

console.log('--- After replacements ---');
console.log(processedText);

const topMatch = processedText.match(/SELECT\s+TOP\s+(\d+)\s+([\s\S]*)/i);
if (topMatch) {
    console.log('--- TOP Match Found ---');
    console.log('Limit:', topMatch[1]);
    console.log('Rest:', topMatch[2].substring(0, 50) + '...');

    processedText = `SELECT ${topMatch[2]} LIMIT ${topMatch[1]}`;
} else {
    console.log('--- No TOP Match ---');
}

console.log('--- Final Query ---');
console.log(processedText);
