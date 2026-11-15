import { HI_DATA } from "./hi-data";
import { HI_UI } from "./hi-ui";

/** 1) Exact entries: the English text in the code is the key. */
export const HI: Record<string, string> = { ...HI_DATA, ...HI_UI };

/**
 * 2) Patterns for dynamic strings that cannot be listed one by one (times, counts, "A → B").
 *    {1}, {2} are the captured groups, translated in turn.
 */
export const PATTERNS: [RegExp, string][] = [
  [/^(\d+) min ago$/, "{1} मिनट पहले"],
  [/^(\d+) s ago$/, "{1} सेकंड पहले"],
  [/^(\d+) h ago$/, "{1} घंटे पहले"],
  [/^([\d.,]+) min$/, "{1} मिनट"],
  [/^(\d+) trucks?$/, "{1} ट्रक"],
  [/^(\d+) yrs$/, "{1} वर्ष"],
  [/^Shift ([ABC])$/, "शिफ्ट {1}"],
  [/^ID (DRV-\d+)$/, "आईडी {1}"],
  [/^Delivered (\d\d:\d\d)$/, "{1} पर वितरित"],
  [/^ETA (\d\d:\d\d) \(\+(\d+) min\)$/, "अनुमानित {1} (+{2} मिनट)"],
  [/^ETA (\d\d:\d\d)$/, "अनुमानित {1}"],
  [/^Dispatch (\d\d:\d\d)$/, "{1} को रवानगी"],
  [/^Loading, (\d+)% done$/, "लोडिंग, {1}% पूर्ण"],
  [/^Bay (\d+)$/, "बे {1}"],
  [/^(\d+) in progress$/, "{1} जारी"],
  [/^(\d+) low tank · (\d+) signal$/, "{1} कम टैंक · {2} सिग्नल"],
  [/^(\d+) trucks · ([\d.]+) km$/, "{1} ट्रक · {2} km"],
  [/^(.+) → (.+)$/, "{1} → {2}"],
];

/**
 * 3) Glossary: single terms replaced inside any string that is not an exact entry.
 *    This is what translates "Coal Dumper 03", "Anonymous Falcon" or "13 Nov" without listing every combination.
 */
export const GLOSSARY: Record<string, string> = {
  // vehicle classes and machines
  "Coal Dumper": "कोल डंपर",
  "OB Dumper": "ओबी डंपर",
  "Heavy Dumper": "हेवी डंपर",
  "Coal Tipper": "कोल टिपर",
  ADT: "एडीटी",
  Excavator: "एक्सकेवेटर",
  Dozer: "डोज़र",
  // people
  Anonymous: "अनाम",
  Falcon: "बाज़", Otter: "ऊदबिलाव", Lynx: "लिंक्स", Heron: "बगुला", Badger: "बिज्जू", Fox: "लोमड़ी", Raven: "रेवेन",
  Panda: "पांडा", Gecko: "छिपकली", Bison: "बाइसन", Ibis: "आइबिस", Koala: "कोआला", Lemur: "लीमर", Marten: "मार्टेन",
  Newt: "न्यूट", Osprey: "ऑस्प्रे", Puffin: "पफिन", Quokka: "क्वोक्का", Robin: "रॉबिन", Stoat: "स्टोट", Tapir: "टेपिर",
  Urial: "उरियल", Viper: "वाइपर", Wombat: "वॉम्बैट", Yak: "याक", Zebra: "ज़ेबरा", Hare: "खरगोश", Jackal: "सियार",
  Kiwi: "कीवी", Lark: "चंडूल", Mole: "छछूंदर", Okapi: "ओकापी", Quail: "बटेर", Skink: "स्किंक",
  // places on site
  "Pit North": "पिट नॉर्थ",
  "Pit South": "पिट साउथ",
  "OB Bench": "ओबी बेंच",
  "Waste Dump": "वेस्ट डंप",
  "Coal Stockyard": "कोयला स्टॉकयार्ड",
  "Rail Siding": "रेल साइडिंग",
  Weighbridge: "वेइंगब्रिज",
  "Haul Road": "हॉल रोड",
  "Loading Point": "लोडिंग पॉइंट",
  Ramp: "रैंप",
  Bench: "बेंच",
  // months (short)
  Jan: "जन॰", Feb: "फ़र॰", Mar: "मार्च", Apr: "अप्रैल", May: "मई", Jun: "जून",
  Jul: "जुल॰", Aug: "अग॰", Sep: "सित॰", Oct: "अक्तू॰", Nov: "नव॰", Dec: "दिस॰",
};
