// src/utils/extractText.js

module.exports = function extractText(response) {
  try {
    if (!response || !response.output) return null;

    for (const item of response.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.type === "output_text") {
            return content.text;
          }
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
};
