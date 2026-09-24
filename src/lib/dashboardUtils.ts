// Format a countdown into HH:MM:SS text representation.
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Clean Markdown formatting symbols (like * and #) from study coach responses.
export function cleanCoachText(text: string): string {
  if (!text) return "";
  // Remove hash headers: replace lines starting with optional whitespace, one or more #, and optional whitespace, with just the remaining text
  let cleaned = text.replace(/^[ \t]*#+[ \t]*/gm, "");

  // Replace bullet asterisks or dashes like "* " or "- " at the beginning of a line with "• "
  cleaned = cleaned.replace(/^[ \t]*[\*\-][ \t]+/gm, "• ");

  // Remove bold/italic markers like **, ***, *, __, _ but leave the text intact
  cleaned = cleaned.replace(/\*{2,3}([^*]+)\*{2,3}/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/_{2,3}([^_]+)_{2,3}/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

  // Clean up any remaining multiple asterisks or trailing/unpaired asterisks or hashes
  cleaned = cleaned.replace(/[\*#]+/g, "");

  return cleaned;
}
