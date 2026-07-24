const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€";

export interface SmsStatistics {
  encoding: "GSM_7" | "UCS_2";
  segmentCount: number;
  length: number;
}

export function calculateSmsSegments(text: string): SmsStatistics {
  let septets = 0;
  let gsm = true;
  for (const char of text) {
    if (GSM_BASIC.includes(char)) septets += 1;
    else if (GSM_EXTENDED.includes(char)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }

  if (gsm) {
    return {
      encoding: "GSM_7",
      length: septets,
      segmentCount: Math.max(
        1,
        septets <= 160 ? 1 : Math.ceil(septets / 153)
      ),
    };
  }

  const length = [...text].length;
  return {
    encoding: "UCS_2",
    length,
    segmentCount: Math.max(1, length <= 70 ? 1 : Math.ceil(length / 67)),
  };
}
