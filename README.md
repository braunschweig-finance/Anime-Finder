# Anime Finder

A free website that answers "What anime should I watch if I like ___?"

- **Find my next anime:** describe the show you want in your own words.
- **If you liked…:** pick a show and get similar ones, with what they share.
- **Forgot the name?:** list what you remember and get likely matches.

Every result is a real show from [AniList](https://anilist.co). Google Gemini (free tier) reads your
description and explains the picks. If Gemini is busy or out of free requests, the site falls back to a
basic keyword search.

## Run it on your computer

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. `npm ci`
3. Copy `.env.example` to `.env.local` and paste your Gemini key after `GEMINI_API_KEY=`.
   `.env.local` is never uploaded to GitHub.
4. `npm run dev`, then open http://localhost:3000

## Deploy

Import this repository at [vercel.com/new](https://vercel.com/new) and add `GEMINI_API_KEY` under
Environment Variables. Full steps are in the launch guide.

## Where things are

- `app/`: pages (home, About, Privacy) and the API routes in `app/api/`
- `components/`: the tabs, result cards, filters and theme toggle
- `lib/`: AniList and Gemini clients, the search logic, caching
- `HANDOFF.md`: build notes and what has been tested
