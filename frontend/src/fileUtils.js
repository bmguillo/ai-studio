// fileUtils.js - Utility functions for file operations

/**
 * Detects if content appears to be in a specific format
 * @param {string} content - The content to analyze
 * @returns {string} - Detected format: 'json', 'csv', 'html', 'txt'
 */
export const detectContentFormat = (content) => {
  // Trim the content
  const trimmed = content.trim();

  // Check for JSON
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch (e) {
      // Not valid JSON
    }
  }

  // Check for HTML
  if (
    trimmed.startsWith("<") &&
    trimmed.endsWith(">") &&
    (trimmed.includes("<html") ||
      trimmed.includes("<body") ||
      trimmed.includes("<div") ||
      trimmed.includes("<table"))
  ) {
    return "html";
  }

  // Check for CSV
  const lines = trimmed.split("\n");
  if (lines.length > 1) {
    const commasInFirstLine = (lines[0].match(/,/g) || []).length;
    const commasInSecondLine =
      lines.length > 1 ? (lines[1].match(/,/g) || []).length : 0;

    // If consistent comma usage and more than one value per line
    if (commasInFirstLine > 0 && commasInFirstLine === commasInSecondLine) {
      return "csv";
    }
  }

  // Default to text
  return "txt";
};

/**
 * Formats content based on the specified type
 * @param {string} content - The content to format
 * @param {string} type - The desired format type
 * @returns {string} - Formatted content
 */
export const formatContent = (content, type) => {
  switch (type) {
    case "json":
      try {
        // If it's already JSON, pretty-print it
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Not JSON, try to convert from text
        try {
          // Simple conversion of key-value text to JSON
          const lines = content.trim().split("\n");
          const result = {};

          lines.forEach((line) => {
            const parts = line.split(":");
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const value = parts.slice(1).join(":").trim();
              result[key] = value;
            }
          });

          return JSON.stringify(result, null, 2);
        } catch (e) {
          return content; // Return as is if conversion fails
        }
      }

    case "csv":
      if (content.includes(",")) return content; // Already CSV-like

      // Simple conversion of text to CSV
      try {
        const lines = content.trim().split("\n");
        return lines
          .map((line) => {
            // Replace tabs with commas or split by multiple spaces
            return line.replace(/\t/g, ",").replace(/\s{2,}/g, ",");
          })
          .join("\n");
      } catch (e) {
        return content;
      }

    case "html":
      if (content.includes("<html") || content.includes("<body"))
        return content;

      // Wrap plain text in HTML
      return `<!DOCTYPE html>
  <html>
  <head>
    <title>Generated Content</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
      pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
    </style>
  </head>
  <body>
    <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </body>
  </html>`;

    default:
      return content;
  }
};

/**
 * Suggests a filename based on content and type
 * @param {string} content - The content
 * @param {string} type - The file type
 * @returns {string} - Suggested filename
 */
export const suggestFilename = (content, type) => {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];

  // Try to extract a title from the first line
  const firstLine = content.trim().split("\n")[0].trim();
  let title = "";

  if (firstLine.length > 0 && firstLine.length < 30) {
    title = firstLine
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 20);
  }

  return title
    ? `${title}_${timestamp}.${type}`
    : `export_${timestamp}.${type}`;
};
