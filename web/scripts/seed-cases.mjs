import assert from "node:assert/strict";

import {
  createInitialInvitation,
  addInviteePerspective,
  submitParaphrase,
  reviewParaphrase,
  isMutualUnderstandingConfirmed,
  encryptInvitation,
} from "../src/lib/invitations/crypto.ts";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const SCENARIOS = [
  {
    label: "roommates",
    perspectiveA:
      "We agreed to split chores evenly when we moved in, but I feel like I'm doing the dishes and taking out the trash almost every day while my roommate barely touches the shared spaces. I've brought it up twice and it gets better for a few days, then goes back to how it was.",
    perspectiveB:
      "I do plenty around the apartment, just not always the things my roommate notices. I cook most nights and handle groceries, which takes real time and planning. It feels like only the visible chores count, and the rest gets ignored.",
    paraphraseAonB:
      "You feel like the work you do — cooking, groceries — doesn't get counted the same way visible chores like dishes do, and that feels unfair.",
    paraphraseBonA:
      "You feel like you're carrying the daily maintenance of the shared space alone, and that raising it hasn't led to a lasting change.",
  },
  {
    label: "coworkers",
    perspectiveA:
      "I came up with the idea for the feature that ended up being the team's biggest win this quarter, but when it was presented to leadership, my coworker took credit for it without mentioning where it came from. I feel erased from something I'm proud of.",
    perspectiveB:
      "I built and shipped that feature almost entirely on my own after the initial idea was mentioned in passing. I don't think a five-minute comment in a meeting counts as ownership of months of implementation work.",
    paraphraseAonB:
      "You feel like the actual work of building and shipping the feature is what should count as ownership, not who first mentioned the idea.",
    paraphraseBonA:
      "You feel like your original idea got absorbed into someone else's success story, with no acknowledgment of where it started.",
  },
  {
    label: "hermanos",
    perspectiveA:
      "Our mother is getting older and needs more help, but I'm the one who visits every week and handles her appointments. My brother lives closer and has more free time, but he says he's 'not good at that kind of thing' and mostly just sends money.",
    perspectiveB:
      "I contribute financially because that's genuinely what I can offer right now — I'm not equipped for caregiving and I think I'd do more harm than good trying. It feels like no amount of money is ever treated as equal to time.",
    paraphraseAonB:
      "You feel like your financial contribution is real and meaningful, but it's being dismissed as if it doesn't count the way hands-on help does.",
    paraphraseBonA:
      "You feel stretched thin doing the hands-on care alone, and like the current split of responsibilities isn't sustainable for you.",
  },
  {
    label: "cofundadores",
    perspectiveA:
      "We started this company with a shared vision, but now my co-founder wants to pivot the entire product based on one investor conversation. I think we're abandoning two years of work and our actual users for a shinier story to tell.",
    perspectiveB:
      "The market has clearly shifted and our current users aren't enough to get us to the next stage. Sticking to the original plan out of loyalty to what we built, instead of what the data is telling us, feels like it risks the whole company.",
    paraphraseAonB:
      "You feel like continuing on the current path isn't a neutral choice — it's actively risky given what the market is showing, regardless of the emotional investment in it.",
    paraphraseBonA:
      "You feel like the pivot treats the last two years and the users we already have as disposable, in favor of chasing investor approval.",
  },
];

async function seedScenario(scenario) {
  let inv = createInitialInvitation(scenario.perspectiveA);
  inv = addInviteePerspective(inv, scenario.perspectiveB);
  inv = submitParaphrase(inv, "inviter", scenario.paraphraseAonB);
  inv = reviewParaphrase(inv, "invitee", true);
  inv = submitParaphrase(inv, "invitee", scenario.paraphraseBonA);
  inv = reviewParaphrase(inv, "inviter", true);

  assert.equal(
    isMutualUnderstandingConfirmed(inv),
    true,
    `[${scenario.label}] mutual understanding not confirmed`,
  );

  const { envelope } = await encryptInvitation(inv);

  const response = await fetch(`${BASE_URL}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId: inv.caseId, envelope }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[${scenario.label}] POST /api/cases failed ${response.status}: ${text}`);
  }

  return inv.caseId;
}

const caseIds = [];
for (const scenario of SCENARIOS) {
  const caseId = await seedScenario(scenario);
  console.log(`[${scenario.label}] ${caseId}`);
  caseIds.push(caseId);
}

console.log("\nCase IDs created:");
for (const id of caseIds) console.log(` ${id}`);
