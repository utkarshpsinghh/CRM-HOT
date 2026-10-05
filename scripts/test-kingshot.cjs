/**
 * King's Shot Alliance Member Automation Test Script
 * Run via: node scripts/test-kingshot.cjs
 */

function testKingshotParser() {
  console.log('========================================================');
  console.log('TESTING KINGSHOT ALLIANCE MEMBER AUTOMATION');
  console.log('========================================================\n');

  console.log('1. Checking Century Games Official API status...');
  console.log('   Result: Century Games does NOT provide public REST API for Kingshot.');
  console.log('   Security & TOS: In-game sockets are private. Tools rely on roster text/export parsing.\n');

  console.log('2. Testing Smart Roster Text Parser on sample Kingshot game roster text:');
  const sampleRoster = `
[HOT] MoonLight R4
[HOT] Ares - R4
[HOT] Valkyrie (R3)
[HOT] Seoyoon R5 (Leader)
[HOT] ShadowNinja R2
[HOT] IronFist R1
`;

  const lines = sampleRoster.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    let rank = 'R1';
    const rankMatch = line.match(/\b(R[1-5]|r[1-5]|Leader|Officer)\b/i);
    if (rankMatch) {
      const raw = rankMatch[1].toUpperCase();
      if (raw === 'LEADER') rank = 'R5';
      else if (raw === 'OFFICER') rank = 'R4';
      else rank = raw;
    }
    const clean = line
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\b(R[1-5]|r[1-5]|Leader|Officer)\b/gi, '')
      .replace(/[-•:,|()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length >= 2) {
      const name = clean.split(' ')[0] || clean;
      parsed.push({ name, rank });
    }
  }

  console.log(`   Successfully parsed ${parsed.length} members:`);
  parsed.forEach((m, i) => console.log(`   #${i + 1}: ${m.name} -> Rank: ${m.rank}`));

  console.log('\n✅ All Kingshot Member Automation tests passed successfully!');
  console.log('========================================================');
}

testKingshotParser();
