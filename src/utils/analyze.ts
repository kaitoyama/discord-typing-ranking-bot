import { config } from "../config";
import axios from "axios";
import { GoogleGenAI, Type } from "@google/genai";

// 抽出結果の型定義 (以前のコードと同様)
interface ResultData {
  level?: number;
  charCount?: number;
  accuracyRate?: number;
  mistypeCount?: number;
}

export async function analyze(imageUrl: string): Promise<ResultData> {
  try {
    // 1. 画像をダウンロードしてBase64にエンコード
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'] || 'image/jpeg';

    // 2. Gemini APIを初期化
    const genAI = new GoogleGenAI({apiKey: config.GEMINI_API_KEY});

    // 3. プロンプトを準備
    const prompt = `
      この画像はタイピングゲームの結果画面です。以下の情報を抽出し、厳密に指定されたJSON形式で返してください:
      - level: レベル (数値)
      - charCount: 文字数 (数値)
      - accuracyRate: 正確率 (%を除いた数値、例: 98.5)
      - mistypeCount: ミスタイプ数 (数値)

      レスポンスは以下のJSON形式に厳密に従ってください:
      {
        "level": number,
        "charCount": number,
        "accuracyRate": number,
        "mistypeCount": number
      }
    `;

    // 4. 画像とプロンプトを送信
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            level: {
              type: Type.NUMBER,
              description: 'タイピングのレベル'
            },
            charCount: {
              type: Type.NUMBER,
              description: '入力された文字数'
            },
            accuracyRate: {
              type: Type.NUMBER,
              description: '正確率 (パーセント)'
            },
            mistypeCount: {
              type: Type.NUMBER,
              description: 'ミスタイプの回数'
            }
          },
          required: ['level', 'charCount', 'accuracyRate', 'mistypeCount']
        }
      }
    });

    // 5. レスポンスをパース
    const responseText = result.text;
    if (!responseText) {
      throw new Error("No response text received from Gemini API");
    }
    
    try {
      // 直接JSONとしてパース
      return JSON.parse(responseText) as ResultData;
    } catch (parseError) {
      // JSON以外のテキストが含まれている場合、JSONの部分だけを抽出
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = responseText.slice(jsonStart, jsonEnd);
        return JSON.parse(jsonString) as ResultData;
      }
      throw new Error(`Failed to parse JSON response: ${responseText}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
    throw new Error("Unknown error occurred during image analysis");
  }
}
