# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Compile TypeScript to dist/
- `npm run dev` - Start development server with auto-reload using nodemon
- `npm start` - Run compiled application from dist/
- `npm run deploy-commands` - Deploy Discord slash commands to the server
- `npm run typeorm` - Run TypeORM CLI commands with TypeScript support

## Architecture Overview

This is a Discord bot that creates a typing speed ranking system by analyzing screenshots of typing game results using AI vision services.

### Core Components

**Bot Framework**: Discord.js v14 with slash command interactions and thread management for organizing results.

**Database Layer**: TypeORM with MySQL/MariaDB storing typing submissions with scores, accuracy, speed, and miss counts. Database uses environment variables for connection (NS_MARIADB_* prefixed).

**AI Analysis Pipeline**: 
- Azure Computer Vision (backup service in analyze.azure-backup.ts)
- Google Gemini 2.5 Flash (primary service in analyze.ts) for extracting typing metrics from game screenshots
- Structured JSON response schema enforcing level, charCount, accuracyRate, mistypeCount extraction

**Scoring System**: Custom algorithm in utils/score.ts combining speed, accuracy, and miss penalty: `speed + (212 - missCount² * 2.25) + 500`

**Ranking Logic**: SQL-based best score per user using ROW_NUMBER() window function, only accepting level 5 submissions for competitive ranking.

### Key Workflows

1. `/submit` command processes image attachments through AI analysis, calculates scores, stores valid level 5 results, and creates threads for organized feedback
2. `/ranking` command queries best scores per user with optional full listing vs top 16 limit
3. Thread creation isolates each submission's analysis results and error handling

### Environment Requirements

Required environment variables: DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID, CLIENT_PUBLIC_KEY, AZURE_COMPUTER_VISION_ENDPOINT, AZURE_COMPUTER_VISION_KEY, GEMINI_API_KEY, NS_MARIADB_* database credentials.

Database migrations are in src/migration/ directory and can be run via TypeORM CLI.