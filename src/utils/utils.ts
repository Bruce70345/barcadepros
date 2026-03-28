"use client";

// import { CustomError } from "@/api/CRMApi";
import { StatusCodes } from "http-status-codes";

export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

export class CustomError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const prefix = "data:application/pdf;base64,";
        const base64String = reader.result.toString();
        const result = base64String.startsWith(prefix)
          ? base64String.slice(prefix.length)
          : base64String;
        resolve(result);
      } else {
        reject(new Error("Conversion failed"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

function stringToColor(string: string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

export function stringAvatar(name: string) {
  if (!name) return { children: "" };

  const nameParts = name.split(" ");
  let initials = nameParts[0][0].toUpperCase();

  if (nameParts.length > 1) {
    initials += nameParts[1][0].toUpperCase();
  }

  return {
    sx: {
      bgcolor: stringToColor(name),
      fontSize: "1rem",
    },
    children: initials,
  };
}

export const shouldRetry = (
  failureCount: number,
  error: CustomError
): boolean => {
  // console.log("shouldRetry Fn");
  // console.log("failureCount" + failureCount);
  // console.log(error.status);
  const MAX_RETRY = 3;

  if (failureCount >= MAX_RETRY) {
    return false;
  }

  if (
    error.status === StatusCodes.INTERNAL_SERVER_ERROR ||
    error.status === StatusCodes.SERVICE_UNAVAILABLE ||
    error.status === StatusCodes.BAD_GATEWAY ||
    error.status === StatusCodes.GATEWAY_TIMEOUT
  ) {
    return true;
  } else if (
    error.status === StatusCodes.UNAUTHORIZED ||
    error.status === StatusCodes.FORBIDDEN
  ) {
    return false;
  } else if (error.status === StatusCodes.NOT_FOUND) {
    return false;
  }

  return false;
};

// export const computeYTDComparison = (
//   comparisonData: GetYTDComparisonResponse,
//   setTwoYearsComparison: (value: number) => void
// ) => {
//   const data = comparisonData.data;

//   if (!data || data.length === 0) {
//     setTwoYearsComparison(0);
//     return;
//   }

//   data.sort((a, b) => {
//     // console.log(a, b);
//     return parseInt(b.year) - parseInt(a.year);
//   });

//   const currentYearAmount =
//     parseFloat(data[0]?.ytdAmount.replace(/,/g, "")) || 0;
//   const previousYearAmount =
//     parseFloat(data[1]?.ytdAmount.replace(/,/g, "")) || 0;

//   const comparisonValue = calculateGrowthRate(
//     currentYearAmount,
//     previousYearAmount
//   );
//   setTwoYearsComparison(comparisonValue);
// };


export const cleanAmount = (amount: string) => amount.replace(/,/g, "");

export type ProcessedData = {
  years: number[];
  data: MonthlyDataItem[];
};

type MonthlyDataItem = {
  month: number;
  [year: string]: string | number;
};

/**
 * 定義設備資訊的介面
 */
interface DeviceInfo {
  type: "phone" | "tablet" | "desktop" | "unknown";
  device?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  version?: string;
  mobile?: string;
}

/**
 * 定義解析結果的介面
 */
interface UserAgentParseResult {
  platform: "web" | "ios" | "android" | "pwa";
  deviceInfo: DeviceInfo;
}

/**
 * 從 User-Agent 字串中解析出平台和設備信息
 * @param {string} userAgentString - 瀏覽器的 User-Agent 字串
 * @returns {UserAgentParseResult} 包含 platform 和 deviceInfo 的物件
 */
export function parseUserAgent(userAgentString: string): UserAgentParseResult {
  // 初始化返回結果
  const result: UserAgentParseResult = {
    platform: "web", // 預設為 web
    deviceInfo: {
      type: "unknown", // 預設為 unknown
    },
  };

  // 確保傳入的是字串
  if (!userAgentString || typeof userAgentString !== "string") {
    return result;
  }

  // 解析平台
  if (/(iPhone|iPad|iPod)/i.test(userAgentString)) {
    result.platform = "ios";
  } else if (/Android/i.test(userAgentString)) {
    result.platform = "android";
  } else if (/PWA|Progressive Web App/i.test(userAgentString)) {
    result.platform = "pwa";
  }

  // 初始化設備信息
  const deviceInfo: DeviceInfo = {
    type: "unknown",
  };

  // 獲取設備類型
  const deviceMatch = userAgentString.match(/\(([^;]+);/);
  if (deviceMatch) {
    deviceInfo.device = deviceMatch[1].trim();

    // 判斷設備類型 (type)
    if (/(iPhone|iPod)/i.test(deviceInfo.device)) {
      deviceInfo.type = "phone";
    } else if (/(iPad)/i.test(deviceInfo.device)) {
      deviceInfo.type = "tablet";
    } else if (/Android/.test(userAgentString)) {
      // Android 設備需要進一步判斷是手機還是平板
      deviceInfo.type = /Mobile/.test(userAgentString) ? "phone" : "tablet";
    } else if (/(Win|Mac|Linux)/i.test(deviceInfo.device)) {
      deviceInfo.type = "desktop";
    }
  }

  // 解析作業系統及版本
  if (result.platform === "ios") {
    deviceInfo.os = "iOS";
    const iosVersionMatch = userAgentString.match(/OS (\d+[._]\d+[._]?\d*)/);
    if (iosVersionMatch) {
      deviceInfo.osVersion = iosVersionMatch[1].replace(/_/g, ".");
    }
  } else if (result.platform === "android") {
    deviceInfo.os = "Android";
    const androidVersionMatch = userAgentString.match(
      /Android (\d+[._]\d+[._]?\d*)/
    );
    if (androidVersionMatch) {
      deviceInfo.osVersion = androidVersionMatch[1];
    }
  }

  // 獲取瀏覽器信息
  const browserMap = [
    { name: "Chrome", regex: /Chrome\/(\d+(\.\d+)+)/i },
    { name: "Firefox", regex: /Firefox\/(\d+(\.\d+)+)/i },
    { name: "Safari", regex: /Safari\/(\d+(\.\d+)+)/i },
    { name: "Edge", regex: /Edge\/(\d+(\.\d+)+)/i },
    { name: "Opera", regex: /OPR\/(\d+(\.\d+)+)/i },
  ];

  for (const browser of browserMap) {
    const match = userAgentString.match(browser.regex);
    if (match) {
      deviceInfo.browser = browser.name;
      deviceInfo.browserVersion = match[1];
      break;
    }
  }

  // 獲取更多詳細信息
  const versionMatch = userAgentString.match(/Version\/(\d+(\.\d+)+)/i);
  if (versionMatch) {
    deviceInfo.version = versionMatch[1];
  }

  const mobileMatch = userAgentString.match(/Mobile\/(\w+)/i);
  if (mobileMatch) {
    deviceInfo.mobile = mobileMatch[1];
  }

  result.deviceInfo = deviceInfo;
  return result;
}
