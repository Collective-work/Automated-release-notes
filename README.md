# Automated release notes

🚀 10x your release process

✌️ Went from spending **~2h** to do nice release notes for the whole company -> to **15 mins**

![09f698e165f545fbb10f6c8fda98a174](https://github.com/Collective-work/Automated-release-notes/assets/10058703/ebd557ec-ab79-480e-ba75-965bf7a8a7e9)

## Motivation and our process at Collective

Disclaimer: This is not a ready to go package, that can be used out of the box.

But it's simple enough it should give you ideas about how to generated release notes (it's one simple and readable script, 
if you don't like the code, blame ChatGPT - I used it for most of it to go fast).

The release notes is generated from tickets in a done column (you can of course adapt it to your logic, I'm aware the 
processes are very different from one company to another)

Here is how our process works overall:

1. We use linear
2. Every week, tickets with PRs merged go in a column on our engineering board `'Deployed (this week)'`
3. At the end of every week, I look at all those tickets and create a changelog I push to the team (this used to take 
me hours, mainly the reason I decided to automate it)
4. I push the update on slack, adding some ping here and there and some additional picture for context - people react 
and are generally happy that we progress 😉

## What this does

This is an opinionated script of course. I did not make the effort to abstract it. The goal is more to show all we can
do with AI and release notes 🤩

1. The script fetch all the cards in the column `'Deployed (this week)'`
2. It passes them through GPT-3 with a prompt TLDR; it asks it to summarise in 1 line more or less the ticket and categorise it
3. We create the final release note, with our 4 main categories (to better categorise what was shipped), these are:

- **App** - for new feature and application interaction
- **Admin** - for new admin features, as we are a pretty ops heavy company
- **Bug** - for bugs that we fixed
- **Misc** - for anything unrelated to the 3 classes above

4. I copy/paste the generated result in slack, modify 2-3 things (of course some things are not in the right place) and 
add pictures and ping the right people so they see the feature release (hard for GPT to know this 😜)
5. Hit send and collect emojis on slack (but I'm an imposter of course, the engineers did all the hard work)

## Make it work

- Requires `node` and `pnpm` 
- Install dependencies (`linear sdk` and `openai` at the moment) by doing

```
pnpm install
```

or if you want to go fast

```
npm install @linear/sdk openai
```

## Usage

```
LINEAR_API_KEY=key OPEN_AI_API_KEY=key node changelog.ts
```

## The final result

The result:

```
App:
[Setting] Allow collectives to change the roles of their members - E-3300
[Opportunity] Allow collectives to answer questions to better respond to a project opportunit - E-3301  
 
Admin:
[Forest Admin] Add a button to check if IBAN is valid - E-3302
[Email] Send emails by the push of a button to users that need to fill a KYC - E-3303 

Bug:
[UI] Fix side panel not closing on Safari - E-3304

Misc:
[CI] Fix CI issues related to Datadog - E-3305
```
