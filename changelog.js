const { LinearClient } = require('@linear/sdk');
const OpenAI = require('openai');
const process = require('process');

const BATCH_SIZE = 15;

const LINEAR_TEAM = 'Engineering'
const LINEAR_DONE_COLUMN = 'Deployed (this week)'

const APP_CLASS = 'App';
const ADMIN_CLASS = 'Admin';
const BUG_CLASS = 'Bug';
const MISC_CLASS = 'Misc';

// Define the order of the classes
const CLASS_ORDER = [APP_CLASS, ADMIN_CLASS, BUG_CLASS, MISC_CLASS];

const linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY
});

async function summarise(tickets) {
    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    });

    const prompt = `
  You are a product manager with a great technical background for a tech startup company making a release log of the tickets shipped by the company.

  The tickets are structured the following way:
  - An identifier, to recognise the ticket
  - A title, explaining the main goal of the ticket (it's helps to understand the ticket general idea)
  - A description, explaining all the details and how to achieve the goal (it tells what the ticket does)
  - Some labels, to explain what the ticket is about (e.g. bug for a bug fix, product for a product feature, forest admin for an admin feature)
  - a priority, which tells how urgent the ticket was
  - an estimate, which tells how much work the ticket represented (estimate is between 1 and 7, 1 being small ticket and 7 being huge) - a ticket with high priority and high estimate is usually an key feature for the company
  - the person responsible for it (it's a name)
  - a url, to link to the ticket

  Each feature is either one of the 4 classes below:
  - ${APP_CLASS}: it means this is a product feature that impacted the core of our application (label is often product, but not always, and high estimate and high priority are often product features)
  - ${ADMIN_CLASS}: it means it touched forest admin or something related to admin tasks, it's rarely a product task (label is often "forest admin" but not always) - some examples of things that are admin include "the Shortlister", "forest admin workspaces"
  - ${BUG_CLASS}: it means it was a bug fix (generally tagged with a label "bug")
  - ${MISC_CLASS}: anything that does not fit clearly in one of those 3 categories above

  Now given all the context your have, summarise a ticket in the json structure below

  Json object should look something like this (it's json, and words between {{}} should be replace with result along with the {{}}, so for example {{ticket url}} should give https://linear.app/collective-work/issue/E-3307/test):

  {
    "identifier": "{{ticket identifier}}",
    "url": "{{ticket url}}",
    "summary": "{{ticket summary}}",
    "category": "{{ticket category}}",
    "class": "{{ticket class}}"
  }

  where
  - {{ticket identifier}} is just the identifier
  - {{ticket url}} is just the url
  - {{ticket summary}} is a quick summary of what the ticket solved or created - it must be a proper natural english sentence at the imperative mood (like a git commit message) and should not contain ay weird structure like [] characters at the beginning (example of not tolarated "[Shortlister] Show not onboarded collectives", it should be instead "Show not onboarded collectives on the shortlister" or similar)
  - {{ticket category}} is an ideally max 2 words (3 tolerated if hard to describe) describing the category/area of the ticket (for example, if the ticket is around impoving the CI, then it should be "CI", if it around Datadog test, it should be "Datadog", if it's about the Shortlister, then it should be "Shortlister")
  - {{ticket class}} is the class the ticket belong to (class definition is the one above, and can ONLY be one of [${APP_CLASS}, ${ADMIN_CLASS}, ${BUG_CLASS}, ${MISC_CLASS}], nothing else!)

  here is an example of a ticket json object:

  {
    "identifier": "E-3306",
    "url": "https://linear.app/collective-work/issue/E-3306/update-prisma-to-v5",
    "summary": "Updated the database to it's new major version",
    "category": "Database",
    "class": "${MISC_CLASS}"
  }

  As there are multiple tickets, the result should JUST a json array of objects as above, directly parsable.
  You should always return a json array, even if the array contains only one element - this is really important.

  Here are the tickets:
  `;

    try {
        const result = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: tickets.join(`\n---\n`) },
            ],
            model: 'gpt-3.5-turbo-16k',
            max_tokens: 2000,
        });

        return result.choices[0].message.content;
    } catch (error) {
        console.error('Error querying OpenAI API:', error);
        return '';
    }
}

async function getAllFinishedTickets() {
    let tickets = [];

    try {
        // Assuming there exists a method `issues` that fetches all issues.
        const allIssues = await linearClient.issues({
            filter: {
                and: [
                    {
                        team: { name: { eq: LINEAR_TEAM } },
                        state: { name: { eq: LINEAR_DONE_COLUMN } },
                    },
                ],
            },
            first: 200,
        });

        const totalTicketCount = allIssues.nodes.length;

        if (allIssues && totalTicketCount) {
            console.log(`Found ${totalTicketCount} tickets...`);
            tickets = allIssues.nodes
        } else {
            console.log('No issues found');
        }
    } catch (error) {
        console.error('Error fetching issues', error);
    }

    return tickets;
}

async function summariseTickets(tickets){
    let summarisedTickets = []
    const totalTicketCount = tickets.length;

    console.log(`Summarising ${totalTicketCount} tickets...`);

    for (let i = 0; i < totalTicketCount; i += BATCH_SIZE) {
        const ticketBatch = await Promise.all(
            tickets.slice(i, i + BATCH_SIZE).map(async (ticket) => {
                const assignee = await ticket.assignee;
                const labels = await ticket.labels();

                if (assignee) {
                    // ticket representation in natural language
                    return `
                    - Ticket identifier: ${ticket.identifier}
                    - Ticket title: ${ticket.title}
                    - Ticket priority: ${ticket.priorityLabel}
                    - Ticket esimate: ${ticket.estimate}
                    - Person responsable for the ticket: ${assignee.name}
                    - Labels of the ticket: ${labels.nodes
                                .map((label) => label.name)
                                .join(', ')}
                    - Url of the ticket: ${ticket.url}
                    - Ticket description: ${ticket.description}
                   `;
                }
            })
        );

        console.log(
            `Summarising ${ticketBatch.length} tickets - batch: [${i}, ${
                i + BATCH_SIZE
            }] out of ${totalTicketCount}...`
        );

        const summarisedTicketBatch = await summarise(ticketBatch);

        console.log('Summarised results:');
        console.log(`${summarisedTicketBatch}`);

        let parsedSummarisedTicketBatch = JSON.parse(summarisedTicketBatch)

        if (!Array.isArray(parsedSummarisedTicketBatch)) {
            parsedSummarisedTicketBatch = [parsedSummarisedTicketBatch];
        }

        summarisedTickets = [...summarisedTickets, ...parsedSummarisedTicketBatch];
    }

    return summarisedTickets;
}

function formatReleaseNote(tickets) {
    // Step 1: Group by class
    let groupedTickets = tickets.reduce((group, ticket) => {
        let className = ticket.class;
        if (!group[className]) {
            group[className] = [];
        }

        group[className].push(ticket);
        return group;
    }, {});

    // Step 2: Form the string
    let resultString = '';

    CLASS_ORDER.forEach((className) => {
        resultString += `*${className}*:\n`;

        if (groupedTickets[className]) {
            groupedTickets[className].forEach((ticket) => {
                resultString += `[${ticket.category}] ${ticket.summary} - [${ticket.identifier}](${ticket.url})\n`;
            });
        }

        console.log(
            `Found ${(groupedTickets[className] || []).length} for class ${className}`
        );

        resultString += '\n';
    });

    return resultString;
}

async function generateReleaseNote () {
    // 1. Get the linear tickets
    const finishedTickets = await getAllFinishedTickets();

    // 2. Summarise the ticket thanks to GPT using a special format
    const summarisedTickets = await summariseTickets(finishedTickets)

    // 3. Build the release note string from all the summarised ticket data
    const releaseNote = formatReleaseNote(summarisedTickets)

    // Log the result
    console.log('\n\nFinal release note:\n\n');
    console.log(releaseNote);
}

generateReleaseNote()