// Code 128 (set B) barcode encoding — self-contained, no dependency
// (Phase 4, §4.1). Used to render product label barcodes as SVG.
//
// Every Code 128 symbol is drawn as 6 bar/space widths totalling 11
// modules (the stop symbol has 7 widths totalling 13). The table
// below is the standard ISO/IEC 15417 width table for code values
// 0–106. Set B encodes ASCII 32–126 as value = charCode − 32, which
// covers every SKU / barcode string this system stores (letters,
// digits and common punctuation). The checksum symbol is
// (startValue + Σ valueᵢ × positionᵢ) mod 103, positions from 1.

const CODE128_WIDTHS: string[] = [
   "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
   "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
   "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
   "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
   "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
   "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
   "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
   "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
   "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
   "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
   "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
   "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
   "114311", "411113", "411311", "113141", "114131", "311141", "411131",
   "211412", // 103 — Start A
   "211214", // 104 — Start B
   "211232", // 105 — Start C
   "2331112", // 106 — Stop
];

export const CODE128_START_B = 104;
export const CODE128_STOP = 106;

/** Code values for `text` in set B, including Start B and the checksum (excluding Stop). */
export function code128BValues(text: string): number[] {
   const values: number[] = [CODE128_START_B];
   for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code < 32 || code > 126) {
         throw new Error(
            `Character ${JSON.stringify(ch)} cannot be encoded in Code 128 set B`,
         );
      }
      values.push(code - 32);
   }
   let checksum = values[0];
   for (let i = 1; i < values.length; i++) {
      checksum += values[i] * i;
   }
   values.push(checksum % 103);
   return values;
}

/**
 * The full bar pattern for `text` as an array of module widths in
 * order, starting with a bar: [bar, space, bar, space, …]. Quiet
 * zones are the caller's concern (renderers add margins).
 */
export function code128BWidths(text: string): number[] {
   const values = [...code128BValues(text), CODE128_STOP];
   const widths: number[] = [];
   for (const v of values) {
      for (const digit of CODE128_WIDTHS[v]) {
         widths.push(Number(digit));
      }
   }
   return widths;
}

/** Total module count of the encoded symbol (for sizing renderers). */
export function code128BModuleCount(text: string): number {
   return code128BWidths(text).reduce((sum, w) => sum + w, 0);
}
