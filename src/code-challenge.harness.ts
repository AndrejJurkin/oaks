import {
  mergeUserProfiles,
  sourceA,
  sourceB,
} from './code-challenge';
import type { UserProfile } from './code-challenge';

/*****************************************************
 * TEST HARNESS
 *****************************************************/

function logSection(title: string, data: any) {
  console.log('='.repeat(40));
  console.log(title);
  console.log(data);
  console.log('='.repeat(40));
}

/**
 * TEST 1: MERGE
 * - We expect 8 unique emails total:
 *   alex, mary, sue, ivan, self, john, tim, bob
 */
export function testMerge() {
  const expectedCount = 8;

  const merged = mergeUserProfiles(sourceA, sourceB);
  if (merged.length === 0) {
    console.warn('Step 2: not implemented');
    return;
  }
  logSection('Merged Profiles', merged);

  if (merged.length !== 8) {
    console.error(
      `❌ mergeUserProfiles: Expected ${expectedCount} users, got ${merged.length}.`
    );
  } else {
    console.log('✅ mergeUserProfiles passed (user count check).');
  }

  const uniqueEmails = new Set(merged.map(u => u.email.toLowerCase()));
  if (uniqueEmails.size !== expectedCount) {
    console.error(
      `❌ mergeUserProfiles: Expected ${expectedCount} unique emails, got ${uniqueEmails.size}.`
    );
  } else {
    console.log('✅ mergeUserProfiles passed (unique email count check).');
  }

  // Additional check for Mary
  const mary = merged.find(u => u.email?.toLowerCase() === 'mary@example.com');
  if (!mary) {
    console.error(
      "❌ mergeUserProfiles: Expected 'mary@example.com' email in the result."
    );
  } else {
    const warnings = [
      [mary.email !== 'mary@example.com',
        `Email did not match. Expected 'mary@example.com', got '${mary.email}'.`],
      [mary.name !== 'Mary Clarke',
        `Name did not match. Expected 'Mary Clarke', got '${mary.name}'.`],
      [mary.role !== 'manager',
        `Role did not match. Expected 'manager', got '${mary.role}'.`],
    ].filter(([condition, message]) => !!condition).map(([condition, message]) => message);

    if (warnings.length) {
      console.warn(`⚠️ mergeUserProfiles (Mary):\n${warnings.join('\n')}`);
    }
  }

  return merged;
}

/**
 * TEST 2: LINK MANAGERS
 */
// export function testLinkManagers(merged: UserProfile[]) {
//   const linked = linkManagers(merged);
//   if (linked.length === 0) {
//     console.warn('Step 3: not implemented');
//     return;
//   }
//   logSection('Linked Managers', linked);

//   const data = [
//     // (A) "alex@example.com" -> manager "mary@example.com"
//     {
//       userName: 'Alex',
//       userEmail: 'alex@example.com',
//       managerName: 'Mary',
//       managerEmail: 'mary@example.com',
//     },
//     // (B) "ivan@example.com" -> manager undefined
//     {
//       userName: 'Ivan',
//       userEmail: 'ivan@example.com',
//       managerName: 'undefined',
//       managerEmail: undefined,
//     },
//     // (C) "self@example.com" -> manager undefined (self-reference)
//     {
//       userName: 'Self',
//       userEmail: 'self@example.com',
//       managerName: 'undefined',
//       managerEmail: undefined,
//     },
//     // (D) "bob@example.com" -> manager "alex@example.com"
//     {
//       userName: 'Bob',
//       userEmail: 'bob@example.com',
//       managerName: 'Alex',
//       managerEmail: 'alex@example.com',
//     },
//   ];

//   data.forEach(expected => {
//     const user = linked.find(u => u.email === expected.userEmail);
//     if (!user) {
//       console.error(
//         `❌ linkManagers: Expected "${expected.userEmail}" email in the result.`
//       );
//     } else if (user.manager && user.manager.email === user.email) {
//       console.error(`❌ linkManagers: user shouldn't manage themselves.`);
//     } else if (
//       expected.managerEmail &&
//       (!user.manager || user.manager.email !== expected.managerEmail)
//     ) {
//       console.error(
//         `❌ linkManagers: ${expected.userName}'s manager not set to ${expected.managerName}.`
//       );
//     } else if (!expected.managerEmail && user.manager) {
//       console.error(
//         `❌ linkManagers: ${expected.userName}'s manager should be undefined, found ${user.manager.email}`
//       );
//     } else {
//       console.log(
//         `✅ linkManagers: ${expected.userName} -> ${expected.managerName} OK`
//       );
//     }
//   });

//   return linked;
// }

// /**
//  * TEST 3: COUNT DIRECT & INDIRECT REPORTS
//  */
// export function testCountReports(linked: UserProfile[]) {
//   const counts = countReports(linked);
//   if (Object.keys(counts).length === 0) {
//     console.warn('Step 4: not implemented');
//     return;
//   }
//   logSection('Reports (direct & indirect)', counts);

//   const data = [
//     // (A) tim -> mary -> (alex, john) => alex -> bob
//     // So tim.direct=1 (mary), tim.indirect=3 (alex, john, bob)
//     { email: 'tim@example.com', counts: { direct: 1, indirect: 3 } },
//     // (B) mary -> alex, john; alex -> bob
//     // So mary.direct=2 (alex, john), mary.indirect=1 (bob)
//     { email: 'mary@example.com', counts: { direct: 2, indirect: 1 } },
//     // (C) alex -> bob => direct=1, indirect=0
//     { email: 'alex@example.com', counts: { direct: 1, indirect: 0 } },
//   ];

//   data.forEach(expected => {
//     const actualAcounts = counts[expected.email];
//     if (!actualAcounts) {
//       console.error(
//         `❌ countReports: No entry for ${expected.email} in counts.`
//       );
//     } else {
//       if (
//         actualAcounts.direct === expected.counts.direct &&
//         actualAcounts.indirect === expected.counts.indirect
//       ) {
//         console.log(
//           `✅ countReports: ${expected.email} => { direct: ${expected.counts.direct}, indirect: ${expected.counts.indirect} } OK`
//         );
//       } else {
//         console.warn(
//           `⚠️ countReports: For ${expected.email}, expected { direct: ${expected.counts.direct}, indirect: ${expected.counts.indirect} }, got:`,
//           actualAcounts
//         );
//       }
//     }
//   });
// }

/*****************************************************
 * RUN ALL TESTS
 *****************************************************/

(function runAllTests() {
  console.log('\nRunning All Tests...\n\n');

  testMerge();
  // const linked = testLinkManagers(merged);
  // testCountReports(linked);

  console.log('\nDone\n');
})();
