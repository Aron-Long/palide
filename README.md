# Retro AI Polaroid

A retro-style Polaroid camera application powered by Gemini AI.

## Features

- **Realistic Polaroid Camera**: Takes photos using your webcam with a retro interface.
- **AI Captioning**: Uses Gemini AI to generate context-aware captions for your photos.
- **Developing Effect**: Photos slowly develop and animate out of the camera.
- **Interactive Photo Wall**: Drag, drop, and arrange your photos on a digital wall.
- **Zoom & Pan**: 
    - **Desktop**: Click a photo to select, then use the mouse wheel to zoom.
    - **Mobile**: Pinch to zoom photos and the camera interface.
- **Download**: Save your Polaroid memories as images.

## Technologies

- React 19
- Vite
- Framer Motion
- Google Gemini AI SDK
- Tailwind CSS

## Setup

1. Clone the repository
2. `npm install`
3. Create a `.env` file with your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. `npm run dev`
