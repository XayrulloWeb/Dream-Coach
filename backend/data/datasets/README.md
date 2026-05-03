# Dream Coach Datasets

This folder is the canonical location for all import datasets used by backend seed scripts.

## Structure

- `players/`
- `players/fut/`
- `players/public/`
- `events/`
- `mappings/`

## Current files

- `players/players.csv`
- `players/fifa_players.csv`
- `players/players.template.csv`
- `players/fut/FIFA_23_Fut_Players.csv`
- `events/footbal events.zip`
- `mappings/fifa_players.mapping.json`
- `mappings/football_events.mapping.json`

## Seed commands

Run from `backend/`:

- `npm run seed:players`
- `npm run seed:players:fifa`
- `npm run seed:players:fut`
- `npm run seed:players:public`
- `npm run seed:players:public:all`
- `npm run seed:players:merged`
- `npm run seed:events`
