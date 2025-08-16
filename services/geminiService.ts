
import { GoogleGenAI, Type } from "@google/genai";
import type { Coordinates } from '../types';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const locationSchema = {
    type: Type.OBJECT,
    properties: {
        lat: { 
            type: Type.NUMBER, 
            description: 'The latitude of the location as a number.' 
        },
        lon: { 
            type: Type.NUMBER, 
            description: 'The longitude of the location as a number.' 
        },
    },
    required: ['lat', 'lon'],
};

export const getCoordinatesForLocation = async (locationName: string): Promise<Coordinates | null> => {
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide the geographic coordinates (latitude and longitude) for the following location: ${locationName}.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: locationSchema,
            },
        });

        const jsonString = result.text.trim();
        if (!jsonString) {
            console.error(`Gemini returned empty response for ${locationName}`);
            return null;
        }

        const parsed = JSON.parse(jsonString);

        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
            return { lat: parsed.lat, lon: parsed.lon };
        } else {
            console.error(`Invalid coordinate format for ${locationName}:`, parsed);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching coordinates for ${locationName}:`, error);
        throw new Error(`Could not retrieve coordinates for "${locationName}".`);
    }
};
