# Retro AI Polaroid

A retro-style Polaroid camera application powered by Gemini AI (via MuleRun).

## Features

- **Realistic Polaroid Camera**: Takes photos using your webcam with a retro interface.
- **AI Captioning**: Uses Gemini 2.5 Flash (via MuleRun API) to generate context-aware, nostalgic captions.
- **Interactive Photo Wall**: Drag, drop, and arrange your photos on a digital wall.
- **Zoom & Pan**: 
    - **Desktop**: Click a photo to select, then use the mouse wheel to zoom.
    - **Mobile**: Pinch to zoom photos and the camera interface.
- **Download**: Export your Polaroids as high-resolution images with classic borders and captions.
- **Metering**: Integrated with MuleRun metering for usage tracking.

## Tech Stack

- React 19
- Vite
- Framer Motion
- Gemini 2.5 Flash
- MuleRun API

## Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:Aron-Long/palide.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Create a `.env` file (or configure in Vercel):
   ```
   VITE_GEMINI_API_KEY=your_mule_run_api_key
   ```
   For metering (Backend/Vercel):
   ```
   MULE_AGENT_KEY=your_mule_agent_key
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

## Deployment

This project is configured for deployment on Vercel with support for MuleRun Iframe embedding.
