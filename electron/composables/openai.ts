import OpenAI from "openai";
import dotenv from "dotenv";
import { app } from "electron";
import path from "path";

if (app.isPackaged) {
  dotenv.config({ path: path.join(process.resourcesPath, '.env') });
} else {
  dotenv.config();
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  baseURL: 'https://one-api.system.addcn.com/v1'
});

export const openaiProxy = async () => {
  return await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Say this is a content' }],
  });
}
