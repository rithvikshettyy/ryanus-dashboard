/**
 * Everyone currently active on site, as anonymous users (like "Anonymous Falcon" in shared docs).
 * No real names: each person gets an animal alias and a colour. Operators are tied to the
 * truck they drive, so this list stays consistent with the tracking map and the alerts.
 */
export type UserRole = "Shift supervisor" | "Dispatcher" | "Safety officer" | "Operator";

export interface ActiveUser {
  id: string;
  alias: string; // "Anonymous Falcon"
  initial: string; // "F"
  role: UserRole;
  equipment: string | null; // truck / machine they operate
  since: string; // logged in at (IST)
  tone: { bg: string; fg: string };
}

const TONES = [
  { bg: "#e8eef9", fg: "#2f4b9a" },
  { bg: "#fbede6", fg: "#a33a26" },
  { bg: "#e9f4ee", fg: "#2d6e50" },
  { bg: "#fbf1e1", fg: "#8a5a12" },
  { bg: "#f0eaf8", fg: "#5b3e96" },
  { bg: "#e6f3f5", fg: "#1f6272" },
  { bg: "#f7e9f0", fg: "#8f2d5e" },
  { bg: "#eef0f2", fg: "#3f4652" },
];

const STAFF: { animal: string; role: UserRole; since: string }[] = [
  { animal: "Falcon", role: "Shift supervisor", since: "13:45" },
  { animal: "Otter", role: "Dispatcher", since: "13:50" },
  { animal: "Lynx", role: "Dispatcher", since: "13:52" },
  { animal: "Heron", role: "Safety officer", since: "13:58" },
];

// Same trucks as the live map (plus the two machines that only appear in alerts)
const EQUIPMENT = [
  "Coal Dumper 01", "Coal Dumper 02", "Coal Dumper 03", "Coal Dumper 04", "Coal Dumper 05", "Coal Dumper 07",
  "OB Dumper 01", "OB Dumper 02", "OB Dumper 03", "OB Dumper 04", "OB Dumper 05", "OB Dumper 06", "OB Dumper 07",
  "Heavy Dumper 02", "Heavy Dumper 03", "Coal Tipper 02", "Coal Tipper 05", "ADT 03",
  "Excavator 04", "Dozer 02",
];

const OPERATOR_ANIMALS = [
  "Badger", "Fox", "Raven", "Panda", "Gecko", "Bison", "Ibis", "Koala", "Lemur", "Marten",
  "Newt", "Osprey", "Puffin", "Quokka", "Robin", "Stoat", "Tapir", "Urial", "Viper", "Wombat",
];

const mk = (i: number, animal: string, role: UserRole, equipment: string | null, since: string): ActiveUser => ({
  id: `u-${animal.toLowerCase()}`,
  alias: `Anonymous ${animal}`,
  initial: animal[0],
  role,
  equipment,
  since,
  tone: TONES[i % TONES.length],
});

export const ACTIVE_USERS: ActiveUser[] = [
  ...STAFF.map((s, i) => mk(i, s.animal, s.role, null, s.since)),
  ...EQUIPMENT.map((eq, i) =>
    mk(STAFF.length + i, OPERATOR_ANIMALS[i], "Operator", eq, `14:${String((i * 3) % 24).padStart(2, "0")}`),
  ),
];

/** Alias of whoever is operating a given machine (used on alert cards). */
export function operatorOf(equipment: string): string | undefined {
  return ACTIVE_USERS.find((u) => u.equipment === equipment)?.alias;
}
