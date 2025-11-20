# CSC-698
**Personalized AI Motivator and Life Coach**
Demo Video: https://drive.google.com/file/d/1nWlVcd2dwHg2ufxlH9bEcJn8D7Jbfx4W/view?usp=sharing
> 🚀 **Quick Start**: New to the project? Check out [SETUP.md](./SETUP.md) for complete installation instructions.

## Project Overview

**Problem Statement**
We often have personal goals that we want to work towards, but struggle to find the personal motivation to take the first step. It is helpful to have someone to encourage you and hold you accountable. We often see this with personal trainers and life coaches. However, those services can be very expensive and are not accessible to all individuals. The struggle to find proper motivation is a huge barrier for someone to make the effort and self improve.

**Objectives:**
Priority 1 
- Create a customizable AI that is personable and warm.
- Have it respond appropriately with detail and bring up information from past conversations.
- Create an AI that can break large goals into small and specific actions.
Priority 2
- During conversion, AI will be mindful of time and give reminders.
- There will be notifications with personalized messages for task reminders.
- The AI will have the ability to sync with the user’s calendar and create new events.
  
**Project Description**
Our final product will be a mobile app. We want it to be a mobile app since we want it to connect with our users' calendars, and we can also send daily reminders or motivational quotes at random times through a push notification to help motivate our users. However, the main part of our app will be our AI chat interface. That is where the user can write a prompt to our AI, and then the user will receive life coaching. For example, we envision our app to work something like this:

User: Hey AI Trainer, last night I watched a cooking show, and I would like to try to learn how to cook this week. I have work all day on Wednesday and Thursday, so please be considerate of that. I also met my step goal of 150 steps a day last week and went to the gym twice in the week.”

AI “ Wow, im so happy to hear that. You're doing great. I am so proud of you. Let's set your plan up for this week. This week, let's try to hit 175 steps a day, and let's try to go to the gym three times. You had mentioned liking pasta in a previous chat, so I created an easy beginner-friendly recipe for pasta that you can cook on Monday, since that's your less-busy day. For Wednesday and Thursday, your step count has been reduced to 100 steps. Let me know if you would like to change anything about this plan.

## Technical Architecture

### Tech Stack
- **AI Model**: OpenAI GPT-4o-mini (pre-trained model)
- **Vector Memory**: Qdrant (user goals and long-term context)
- **AI Orchestration**: LangChain
- **Frontend**: React Native mobile app
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL
- **Hosting**: AWS
- **Package Management**: pnpm workspaces

### Project Structure
```
CSC-698/
├── mobile/          # React Native app
├── service/         # Express.js API backend  
├── common/          # Shared TypeScript types and utilities
├── SETUP.md         # Development environment setup
└── README.md        # This file
```

### Development Commands
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev:mobile      # React Native Metro
pnpm dev:service     # Express API server

# Build and test
pnpm build          # Build all packages
pnpm typecheck      # TypeScript validation
pnpm test           # Run test suites
```

**Team Roles and Responsibilities**
Claudia (Team Lead) : Facilitate meetings and coordinate schedules. Handle overall development and software stack management. Focus on backend and AI integration.

Francis Aviles (Front-End): Leading development of frontend mobile app. Handling deployment and integration with the mobile environment.

Bryan Mendez (Backend): Leading backend development, setting up database and API. 

**Expected Outcomes**
We will deliver a demo of our mobile app in a simulator or test environment. We will measure our success based on achieving the below goals.

- Users shall be able to converse with the personalized AI.
- AI shall be supportive and encouraging.
- Users shall be able to customize the tone and style of their AI coach.
- Users shall be able to create schedule/weekly goals.
- Users shall receive reminders of their goals/events.
- Users shall receive communication with AI following up on previous conversations.
- AI shall have memory of previous conversations.
- AI shall have memory of current goals.

## Getting Started

### For New Developers
1. **Setup Environment**: Follow the complete [SETUP.md](./SETUP.md) guide
2. **Install Dependencies**: Run `pnpm install` in the project root
3. **Start Development**: Use `pnpm dev:service` and `pnpm dev:mobile` 
4. **Review Architecture**: Examine the `/mobile`, `/service`, and `/common` packages

### For Contributors
- Follow the Git workflow established by the team
- Ensure all TypeScript checks pass: `pnpm typecheck`
- Test your changes before submitting PRs
- Document any new environment variables or setup steps

### Package-Specific Documentation
- **Mobile App**: See [mobile/README.md](./mobile/README.md) for React Native specific setup
- **API Service**: See [service/README.md](./service/README.md) for backend configuration  
- **Shared Code**: See [common/README.md](./common/README.md) for shared types and utilities
