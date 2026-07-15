import { decode } from "html-entities";

const FORMATTING_TAG =
  /<\/?(?:b|em|i|span|strong|sub|sup)(?:\s[^>]*)?>/gi;

export function displayText(value: string): string {
  return decode(decode(value)).replace(FORMATTING_TAG, "");
}
