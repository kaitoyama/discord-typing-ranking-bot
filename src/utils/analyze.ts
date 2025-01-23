import { config } from "../config";
import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import {
  ComputerVisionClientReadOptionalParams,
  ReadResult,
  Line,
  Word,
  GetReadResultResponse,
} from "@azure/cognitiveservices-computervision/esm/models";
import { ApiKeyCredentials } from "@azure/ms-rest-js";

// 抽出結果の型定義 (以前のコードと同様)
interface ResultData {
  level?: number;
  charCount?: number;
  accuracyRate?: number;
  mistypeCount?: number;
}

// 領域の型定義
interface Region {
  boundingPolygon: Point[];
}

interface Point {
  x: number;
  y: number;
}

/**
 * 矩形領域内に点が内包されているか判定
 * @param point 判定したい点
 * @param regionBoundingPolygon 矩形領域の boundingPolygon
 * @returns boolean
 */
function isPointInRegion(
  point: Point,
  regionBoundingPolygon: Point[]
): boolean {
  if (regionBoundingPolygon.length !== 4) {
    return false; // 矩形領域は4点必要
  }

  const [p1, p2, p3, p4] = regionBoundingPolygon;
  const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

  return (
    point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  );
}

/**
 * テキスト行の中心点が指定された領域内にあるか判定
 * @param lineTextBoundingPolygon テキスト行の boundingPolygon
 * @param regionBoundingPolygon 矩形領域の boundingPolygon
 * @returns boolean
 */
function isTextInRegion(
  boundingPolygon: number[],
  regionBoundingPolygon: Point[]
): boolean {
  if (!boundingPolygon || boundingPolygon.length < 4) {
    return false;
  }
  // OCRの結果からPoint型に変換
  const points = [];
  for (let i = 0; i < boundingPolygon.length; i += 2) {
    points.push({
      x: boundingPolygon[i],
      y: boundingPolygon[i + 1],
    });
  }

  // テキスト行の bounding box の中心点を計算
  const centerX = (points[0].x + points[2].x) / 2;
  const centerY = (points[0].y + points[2].y) / 2;
  const centerPoint: Point = { x: centerX, y: centerY };

  return isPointInRegion(centerPoint, regionBoundingPolygon);
}

/**
 * 指定された領域からテキストを抽出
 * @param lines 全てのテキスト行
 * @param region 領域情報
 * @returns 領域内にあるテキスト行の配列
 */
function extractTextFromRegion(lines: Line[], region: Region): Line[] {
  return lines.filter((line) =>
    isTextInRegion(line.boundingBox, region.boundingPolygon)
  );
}

/**
 * Azure OCR の結果 JSON から必要な情報を抽出する (場所情報に基づいて)
 * @param json Azure OCR の結果 JSON
 * @returns 抽出された情報 (レベル、文字数、正確率、ミスタイプ数)
 */
function extractDataByLocation(json: ReadResult): ResultData {
  const result: ResultData = {};
  const lines = json.lines;

  // 各項目の領域を boundingPolygon で定義 (example.json から取得)
  const levelRegion: Region = {
    boundingPolygon: [
      { x: 77, y: 120 },
      { x: 282, y: 120 },
      { x: 282, y: 156 },
      { x: 77, y: 156 },
    ],
  };
  const charCountRegion: Region = {
    boundingPolygon: [
      {
        x: 272,
        y: 229,
      },
      {
        x: 453,
        y: 229,
      },
      {
        x: 453,
        y: 261,
      },
      {
        x: 272,
        y: 261,
      },
    ],
  };
  const accuracyRateRegion: Region = {
    boundingPolygon: [
      {
        x: 281,
        y: 284,
      },
      {
        x: 386,
        y: 285,
      },
      {
        x: 386,
        y: 315,
      },
      {
        x: 281,
        y: 314,
      },
    ],
  };
  const mistypeCountRegion: Region = {
    boundingPolygon: [
      {
        x: 133,
        y: 354,
      },
      {
        x: 280,
        y: 354,
      },
      {
        x: 280,
        y: 379,
      },
      {
        x: 133,
        y: 379,
      },
    ],
  }; // "… 12回" の領域

  // レベルの抽出
  const levelLines = extractTextFromRegion(lines, levelRegion);
  if (levelLines.length > 0) {
    const levelLineText = levelLines[0].text; // 最初の行を使用
    const levelMatch = levelLineText.match(/レベル(\d+)/);
    if (levelMatch) {
      result.level = parseInt(levelMatch[1], 10);
    } else {
      throw new Error("Failed to extract level");
    }
  } else {
    throw new Error("Level region not found");
  }

  // 文字数の抽出
  const charCountLines = extractTextFromRegion(lines, charCountRegion);
  if (charCountLines.length > 0) {
    const charCountLineText = charCountLines[0].text;
    const charCountMatch = charCountLineText.match(/(\d+)文字/);
    if (charCountMatch) {
      result.charCount = parseInt(charCountMatch[1], 10);
    } else {
      throw new Error("Failed to extract character count");
    }
  } else {
    throw new Error("Character count region not found");
  }

  // 正確率の抽出
  const accuracyRateLines = extractTextFromRegion(lines, accuracyRateRegion);
  if (accuracyRateLines.length > 0) {
    const accuracyRateLineText = accuracyRateLines[0].text;
    const accuracyRateMatch = accuracyRateLineText.match(/([\d.]+)%/);
    if (accuracyRateMatch) {
      result.accuracyRate = parseFloat(accuracyRateMatch[1]);
    } else {
      throw new Error("Failed to extract accuracy rate");
    }
  } else {
    throw new Error("Accuracy rate region not found");
  }

  // ミスタイプ数の抽出
  const mistypeCountLines = extractTextFromRegion(lines, mistypeCountRegion);
  if (mistypeCountLines.length > 0) {
    const mistypeCountLineText = mistypeCountLines[0].text;
    const mistypeCountMatch = mistypeCountLineText.match(/(\d+)回/); // "… 12回" の "12回" を抽出
    if (mistypeCountMatch) {
      result.mistypeCount = parseInt(mistypeCountMatch[1], 10);
    } else {
      throw new Error("Failed to extract mistype count");
    }
  } else {
    throw new Error("Mistype count region not found");
  }

  return result;
}

async function pollUntilSucceeded(
  azure: ComputerVisionClient,
  operationId: string
): Promise<GetReadResultResponse> {
  const result = await azure.getReadResult(operationId);
  console.debug(`ocr: ${result.status}`);

  if (result.status !== "succeeded") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return pollUntilSucceeded(azure, operationId);
  }
  return result;
}

export async function analyze(imageUrl: string): Promise<ResultData> {
  try {
    const client = new ComputerVisionClient(
      new ApiKeyCredentials({
        inHeader: {
          "Ocp-Apim-Subscription-Key": config.AZURE_COMPUTER_VISION_KEY,
        },
      }),
      config.AZURE_COMPUTER_VISION_ENDPOINT
    );
    const options: ComputerVisionClientReadOptionalParams = {
      maxCandidates: 5,
      language: "ja",
    };

    const response = await client.read(imageUrl, options);
    if (!response?.operationLocation) {
      throw new Error("Failed to get operation location from Azure Vision API");
    }

    const operationId = response.operationLocation.split("/").pop()!;

    const result = await pollUntilSucceeded(client, operationId);

    if (!result?.analyzeResult?.readResults?.[0]) {
      throw new Error("Invalid OCR result format");
    }

    return extractDataByLocation(result.analyzeResult.readResults[0]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
    throw new Error("Unknown error occurred during image analysis");
  }
}
