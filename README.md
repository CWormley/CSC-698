# CSC-698
Project Title	
Personalized AI Motivator and Life Coach

Problem Statement
We often have personal goals that we want to work towards, but struggle to find the personal motivation to take the first step. It is helpful to have someone to encourage you and hold you accountable. We often see this with personal trainers and life coaches. However, those services can be very expensive and are not accessible to all individuals. The struggle to find proper motivation is a huge barrier for someone to make the effort and self improve.

Objectives:
Priority 1
Create a customizable AI that is personable and warm.
Have it respond appropriately with detail and bring up information from past conversations.
Create an AI that can break large goals into small and specific actions.
Priority 2
During conversion, AI will be mindful of time and give reminders.
There will be notifications with personalized messages for task reminders.
The AI will have the ability to sync with the user’s calendar and create new events.
Project Description
Our final product will be a mobile app. We want it to be a mobile app since we want it to connect with our users' calendars, and we can also send daily reminders or motivational quotes at random times through a push notification to help motivate our users. However, the main part of our app will be our AI chat interface. That is where the user can write a prompt to our AI, and then the user will receive life coaching. For example, we envision our app to work something like this:


 User: Hey AI Trainer, last night I watched a cooking show, and I would like to try to learn how to cook this week. I have work all day on Wednesday and Thursday, so please be considerate of that. I also met my step goal of 150 steps a day last week and went to the gym twice in the week.”


AI “ Wow, im so happy to hear that. You're doing great. I am so proud of you. Let's set your plan up for this week. This week, let's try to hit 175 steps a day, and let's try to go to the gym three times. You had mentioned liking pasta in a previous chat, so I created an easy beginner-friendly recipe for pasta that you can cook on Monday, since that's your less-busy day. For Wednesday and Thursday, your step count has been reduced to 100 steps. Let me know if you would like to change anything about this plan.

Technical Approach
AI Model: OpenAI GPT-4o-mini (pre-trained model)
Memory: Qdrant (user goals and key long term info)
Orchestration: LangChain
Frontend: React Native mobile app
Hosting: AWS
Backend: Node.js/Express
Database: PostgreSQL

Team Roles and Responsibilities
Claudia (Team Lead) : Facilitate meetings and coordinate schedules. Handle overall development and software stack management. Focus on backend and AI integration.

Francis Aviles (Front-End): Leading development of frontend mobile app. Handling deployment and integration with the mobile environment.

Bryan Mendez (Backend): Leading backend development, setting up database and API. 

Expected Outcomes
We will deliver a demo of our mobile app in a simulator or test environment. We will measure our success based on achieving the below goals.

Users shall be able to converse with the personalized AI.
AI shall be supportive and encouraging.
Users shall be able to customize the tone and style of their AI coach.
Users shall be able to create schedule/weekly goals.
Users shall receive reminders of their goals/events.
Users shall receive communication with AI following up on previous conversations.
AI shall have memory of previous conversations.
AI shall have memory of current goals.
