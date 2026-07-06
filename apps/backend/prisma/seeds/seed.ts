import readline from 'readline';

import { RequestSeed } from './requestSeed.js';
import { RequestDraftSeed } from './requestDraftSeed.js';
import { ApprovalSeed } from './approvalSeed.js';
import { DenialSeed } from './denialSeed.js';
import { FedAgeniesSeed } from './fedAgenciesSeed.js';
import { ConcurrenceSeed } from './concurrenceSeed.js';
import { CommentSeed } from './commentSeed.js';
import { ActionSeed } from './actionSeed.js';
import { EntitiesUsersSeed } from './entitiesUsersSeed.js';
import { InquiriesSeed } from './inquiriesSeed.js';
import { CommonConditionsSeed } from './commonConditionsSeed.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  try {
    while (true) {
      const choice = (
        await askQuestion(
          `\nWhat would you like to seed?\n` +
            `A) New requests\n` +
            `B) Approved requests\n` +
            `C) Denied requests\n` +
            `D) Federal agencies\n` +
            `E) Concurrences\n` +
            `F) Comments\n` +
            `G) Actions\n` +
            `H) Request drafts\n` +
            `I) Entities+Users+Domains\n` +
            `J) Inquiries\n` +
            `K) Common Conditions\n` +
            `Q) Quit\n` +
            `Enter choice (A/B/C/D/E/F/G/H/I/J/K/Q): `
        )
      ).toUpperCase();

      switch (choice) {
        case 'A': {
          const countStr = await askQuestion(
            'How many requests would you like to seed? (default 50): '
          );
          const count = countStr ? parseInt(countStr, 10) : 50;
          if (isNaN(count) || count < 1) {
            console.log('Invalid number provided.');
            break;
          }
          await new RequestSeed().main(count);
          break;
        }
        case 'B':
          await new ApprovalSeed().main();
          break;
        case 'C':
          await new DenialSeed().main();
          break;
        case 'D':
          await new FedAgeniesSeed().main();
          break;
        case 'E': {
          const countStr = await askQuestion(
            'How many concurrences would you like to seed? (default 20): '
          );
          const count = countStr ? parseInt(countStr, 10) : 20;
          if (isNaN(count) || count < 1) {
            console.log('Invalid number provided.');
            break;
          }
          await new ConcurrenceSeed().main(count);
          break;
        }
        case 'F': {
          const countStr = await askQuestion(
            'How many comments would you like to seed? (default 20): '
          );
          const count = countStr ? parseInt(countStr, 10) : 20;
          if (isNaN(count) || count < 1) {
            console.log('Invalid number provided.');
            break;
          }
          await new CommentSeed().main(count);
          break;
        }
        case 'G': {
          const countStr = await askQuestion(
            'How many actions would you like to seed? (default 20): '
          );
          const count = countStr ? parseInt(countStr, 10) : 20;
          if (isNaN(count) || count < 1) {
            console.log('Invalid number provided.');
            break;
          }
          await new ActionSeed().main(count);
          break;
        }
        case 'H': {
          const countStr = await askQuestion(
            'How many request drafts would you like to seed? (default 30): '
          );
          const count = countStr ? parseInt(countStr, 10) : 30;
          if (isNaN(count) || count < 1) {
            console.log('Invalid number provided.');
            break;
          }
          await new RequestDraftSeed().main(count);
          break;
        }
        case 'I':
          await new EntitiesUsersSeed().main();
          break;
        case 'J': {
          const countStr = await askQuestion(
            'How many inqiuries would you like to seed? (default 20): '
          );
          const count = countStr ? parseInt(countStr, 10) : 20;
          if (isNaN(count) || count < 1) {
            console.log('Invalid number provided.');
            break;
          }
          await new InquiriesSeed().main(count);
          break;
        }
        case 'K':
          await new CommonConditionsSeed().main();
          break;
        case 'Q':
          console.log('Exiting.');
          rl.close();
          return;
        default:
          console.log(
            'Invalid choice. Please enter A, B, C, D, E, F, G, H, I, J, K, or Q.'
          );
      }

      console.log('Seeding operation complete.\n');
    }
  } catch (e) {
    console.error('Error during seeding:', e);
    process.exit(1);
  }
}

main();
