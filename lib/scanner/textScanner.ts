export type ScanSeverity = "safe" | "warning" | "blocked";

export interface ScanResult {
  severity: ScanSeverity;
  reason?: string;
  matchedKeyword?: string;
}

export interface ScannerConfig {
  blockedKeywords: string[];
  warningKeywords?: string[];
  useWordBoundary?: boolean;
}

/**
 * Escape regex special chars in keywords
 */
function escapeRegex(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile array of regexes from keywords
 */
function compileRegex(keywords: string[], useWordBoundary: boolean): RegExp[] {
  return keywords.map((keyword) => {
    const pattern = useWordBoundary
      ? `\\b${escapeRegex(keyword)}\\b`
      : escapeRegex(keyword);
    return new RegExp(pattern, "i");
  });
}

/**
 * Scan input text for keywords with severity
 */
export function scanText(
  inputText: string,
  config: ScannerConfig
): ScanResult {
  if (typeof inputText !== "string") {
    throw new TypeError("Input text must be a string");
  }

  const text = inputText.trim();
  if (!text) {
    return { severity: "safe" };
  }

  const {
    blockedKeywords,
    warningKeywords = [],
    useWordBoundary = true,
  } = config;

  const blockedRegexes = compileRegex(blockedKeywords, useWordBoundary);
  for (const regex of blockedRegexes) {
    const match = regex.exec(text);
    if (match) {
      return {
        severity: "blocked",
        reason: `Blocked keyword detected: "${match[0]}"`,
        matchedKeyword: match[0],
      };
    }
  }

  const warningRegexes = compileRegex(warningKeywords, useWordBoundary);
  for (const regex of warningRegexes) {
    const match = regex.exec(text);
    if (match) {
      return {
        severity: "warning",
        reason: `Suspicious keyword detected: "${match[0]}"`,
        matchedKeyword: match[0],
      };
    }
  }

  return { severity: "safe" };
}
