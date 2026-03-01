/** Mock star catalog: list of { name, hip }. Replace with real import later. */
export const MOCK_STARS = [
  { name: "Sirius", hip: 32349 },
  { name: "Canopus", hip: 30438 },
  { name: "Arcturus", hip: 69673 },
  { name: "Vega", hip: 91262 },
  { name: "Capella", hip: 24608 },
  { name: "Rigel", hip: 24436 },
  { name: "Procyon", hip: 37279 },
  { name: "Betelgeuse", hip: 27989 },
  { name: "Altair", hip: 97649 },
  { name: "Aldebaran", hip: 21421 },
  { name: "Spica", hip: 65474 },
  { name: "Antares", hip: 80763 },
  { name: "Pollux", hip: 37826 },
  { name: "Fomalhaut", hip: 113368 },
  { name: "Deneb", hip: 102098 },
  { name: "Regulus", hip: 49669 },
  { name: "Castor", hip: 36850 },
  { name: "Bellatrix", hip: 25336 },
  { name: "Algol", hip: 14576 },
  { name: "Mira", hip: 10826 },
  { name: "Polaris", hip: 11767 },
  { name: "Alcyone", hip: 17702 },
];

/** Mock constellation catalog for Sidebar: { constellation_id, name, first_hip }.
 *  first_hip = first star in the constellation (for setting activeStarId when user points to constellation). */
export const MOCK_CONSTELLATIONS = [
  { constellation_id: "Ori", name: "Orion", first_hip: 26727 },
  { constellation_id: "UMa", name: "Ursa Major", first_hip: 67301 },
  { constellation_id: "Cas", name: "Cassiopeia", first_hip: 8886 },
  { constellation_id: "Cyg", name: "Cygnus", first_hip: 94779 },
  { constellation_id: "Lyr", name: "Lyra", first_hip: 91262 },
  { constellation_id: "Sco", name: "Scorpius", first_hip: 85927 },
  { constellation_id: "Leo", name: "Leo", first_hip: 57632 },
  { constellation_id: "Aql", name: "Aquila", first_hip: 98036 },
];

/** Constellation line data for StarMap: { constellation_id, name, hip_ids }.
 *  hip_ids are consecutive pairs (hip1, hip2) per segment; StarMap uses this to draw lines. */
export const CONSTELLATION_LINES = [
  // {
  //   constellation_id: "Aql",
  //   name: "Aquila",
  //   hip_ids: [97649, 91262, 91262, 102098, 102098, 24608, 24608, 97649],
  // },
];

// Array of { name, hip, x, y, radius (0–1), color } — exported for use as fallback
export const tmp_star_data = [
  // { name: "Sirius", hip: 32349, x: -0.406, y: 0.345, radius: 0.9, color: "#ffffff" },
  // { name: "Canopus", hip: 30438, x: -0.591, y: -0.717, radius: 0.85, color: "#f0f4ff" },
  // { name: "Arcturus", hip: 69673, x: -0.972, y: 0.042, radius: 0.7, color: "#fff4e6" },
  // { name: "Vega", hip: 91262, x: 0.893, y: -0.616, radius: 0.8, color: "#e8f4ff" },
  // { name: "Capella", hip: 24608, x: 0.460, y: 0.564, radius: 0.75, color: "#fff8dc" },
  // { name: "Rigel", hip: 24436, x: 0.707, y: 0.420, radius: 0.95, color: "#FF69B4" },
  // { name: "Procyon", hip: 37279, x: -0.318, y: -0.207, radius: 0.65, color: "#f5f5ff" },
  // { name: "Betelgeuse", hip: 27989, x: -0.153, y: 0.182, radius: 0.88, color: "#ffddd0" },
  // { name: "Altair", hip: 97649, x: 0.542, y: 0.546, radius: 0.7, color: "#faf0e6" },
  // { name: "Aldebaran", hip: 21421, x: 0.809, y: -0.190, radius: 0.78, color: "#ffebcd" },
  // { name: "Spica", hip: 65474, x: -0.223, y: -0.427, radius: 0.6, color: "#e0f0ff" },
  // { name: "Antares", hip: 80763, x: 0.967, y: 0.834, radius: 0.82, color: "#ffddd0" },
  // { name: "Pollux", hip: 37826, x: -0.436, y: 0.364, radius: 0.68, color: "#fff0e6" },
  // { name: "Fomalhaut", hip: 113368, x: -0.436, y: 0.364, radius: 0.55, color: "#f0f8ff" },
  // { name: "Deneb", hip: 102098, x: 0.895, y: -0.165, radius: 0.92, color: "#e6f0ff" },
  // { name: "Regulus", hip: 49669, x: 0.014, y: -0.878, radius: 0.72, color: "#fff5ee" },
  // { name: "Castor", hip: 36850, x: -0.386, y: -0.179, radius: 0.58, color: "#f8f8ff" },
  // { name: "Bellatrix", hip: 25336, x: 0.554, y: 0.024, radius: 0.62, color: "#e8eeff" },
  // { name: "Algol", hip: 14576, x: 0.075, y: 0.785, radius: 0.5, color: "#f5f5f5" },
  // { name: "Mira", hip: 10826, x: -0.680, y: -0.535, radius: 0.45, color: "#ffd4c4" },
  // { name: "Polaris", hip: 11767, x: -0.259, y: 0.941, radius: 0.74, color: "#f0f4ff" },
  // { name: "Alcyone", hip: 17702, x: -0.495, y: 0.233, radius: 0.52, color: "#e6eeff" },
  // { name: "", hip: null, x: 0, y: 0, radius: 0.99, color: "#e6eeff" },
];