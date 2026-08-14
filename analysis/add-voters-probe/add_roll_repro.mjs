// Repro harness for the Add Voters duplicate check.
//
// The three pieces below are TRANSCRIBED VERBATIM from
//   packages/frontend/src/components/Election/Admin/AddElectionRoll.tsx
// at Equal-Vote/bettervoting main @ 7bc75a82 -- the row-building loop out of onSubmit
// (:55-:89), duplicatesExist (:173) and removeDuplicates (:158). Only the React bits
// (setSnack / confirm / postRoll) are stubbed; no logic is rewritten.
//
// Run: node add_roll_repro.mjs

// ---- verbatim: AddElectionRoll.tsx:158 -----------------------------------
function removeDuplicates(checkRolls) {
    const seen = new Set();
    const uniqueRolls = [];

    for (const roll of checkRolls) {
        const email = (roll.email || "").trim().toLowerCase();
        if (!seen.has(email)) {
            seen.add(email);
            uniqueRolls.push(roll);
        }
    }

    return uniqueRolls;
}

// ---- verbatim: AddElectionRoll.tsx:173 -----------------------------------
function duplicatesExist(pendingRolls) {
    const seen = new Set();
    for (const roll of pendingRolls) {
        const email = (roll.email || "").trim().toLowerCase();
        if (seen.has(email)) return true;
        if (!seen.has(email)) {
            seen.add(email);
        }
    }

    return false;
}

// ---- verbatim: the row-building loop out of onSubmit, AddElectionRoll.tsx:55 ----
function buildRolls(voterIDList, { enableVoterID, enableEmail, enablePrecinct, emailListOnly }) {
    const rows = voterIDList.split('\n').filter(row => row.trim());
    const rolls = [];
    const expectedCounts = Number(enableVoterID) + Number(enableEmail) + Number(enablePrecinct);
    rows.forEach((row) => {
        const csvSplit = row.split(',');
        if (csvSplit.length !== expectedCounts) {
            throw `Incorrect number of columns: ${row}`;
        }
        let count = 0;
        const roll = { state: 'approved', voter_id: undefined, email: undefined, precinct: undefined };
        if (enableVoterID && !emailListOnly) { roll.voter_id = csvSplit[count]; count += 1; }
        if (enableEmail)                     { roll.email    = csvSplit[count]; count += 1; }
        if (enablePrecinct)                  { roll.precinct = csvSplit[count]; count += 1; }
        rolls.push(roll);
    });
    return rolls;
}

// ---- the submit path, with confirm() answered by the caller ---------------
function submit(voterIDList, mode, answer) {
    const rolls = buildRolls(voterIDList, mode);
    if (!duplicatesExist(rolls)) return { prompted: false, posted: rolls };
    if (answer === 'NO') return { prompted: true, posted: [] };      // onSubmit returns without posting
    return { prompted: true, posted: removeDuplicates(rolls) };
}

const ADMIN_IDS = { enableVoterID: true,  enableEmail: false, enablePrecinct: false, emailListOnly: false };
const BV_EMAILS = { enableVoterID: false, enableEmail: true,  enablePrecinct: false, emailListOnly: true  };

const show = r => r.posted.map(x => x.voter_id ?? x.email).join(', ') || '(nothing)';
const line = (name, input, mode, answer) => {
    const r = submit(input, mode, answer);
    const typed = input.split('\n').filter(s => s.trim()).length;
    console.log(
        `${name.padEnd(46)} typed ${typed} -> posted ${String(r.posted.length).padEnd(2)}` +
        ` | prompted: ${r.prompted ? 'YES' : 'no '} | ${show(r)}`
    );
    return r;
};

console.log('\n=== admin-managed voter IDs (Email unticked) ===');
line('2 distinct IDs, answer YES',       'alpha\nbravo',            ADMIN_IDS, 'YES');
line('3 distinct IDs, answer YES',       'alpha\nbravo\ncharlie',   ADMIN_IDS, 'YES');
line('3 distinct IDs, answer NO',        'alpha\nbravo\ncharlie',   ADMIN_IDS, 'NO');
line('1 ID (no prompt possible)',        'alpha',                   ADMIN_IDS, 'YES');
line('3 IDs with a real duplicate',      'alpha\nbravo\nalpha',     ADMIN_IDS, 'YES');

console.log('\n=== BetterVoting-managed IDs / email list (the mode it was written for) ===');
line('3 distinct emails, answer YES',    'a@x.com\nb@x.com\nc@x.com', BV_EMAILS, 'YES');
line('3 emails with a real duplicate',   'a@x.com\nb@x.com\na@x.com', BV_EMAILS, 'YES');

console.log('\n=== the reporter\'s session, replayed (roll starts at 2) ===');
let roll = 2;
for (const input of ['3\n4\n5', '4\n5', '5']) {
    const r = submit(input, ADMIN_IDS, 'YES');
    const before = roll;
    roll += r.posted.length;
    console.log(`  submitted ${String(input.split('\n').length).padEnd(2)} row(s) -> roll ${before} -> ${roll}` +
                `   (video shows ${before} -> ${roll})`);
}
console.log('');
