/* THE LAST PLATFORM: the manifest.
   The platform is a drum of chambers. This file says what is in them.
   To place a world in a chamber, add one object to EMERGENCES and push.
   It takes the next chamber, in the order listed.

   {
     id: "its-address",                thelastplatform.com/#its-address opens it
     no: 5,                            its number, in order of finished creation; it keeps it for good
     shelf: "resonance-i",             leave out while it is new: it sits in the drum. Name a shelf
                                       (from PLATFORM.shelves) once it has settled
     form: "tank",                     optional: a wider tank instead of a slender capsule
     vision: "deep-space",             optional: the faint moving picture it holds ("deep-space", "orbits")
     name: "ITS NAME",
     inscription: "first emerged",     the small line above its name
     line: "What the world is, in its own voice.",
     terms: "Its own terms: how it is entered, played, paid for.",
     doors: [ { label: "Enter", href: "https://..." } ],
                                       a door with no href shows as not yet open
     feel: {                           the world's own feeling. The platform stays
       liquid: ["#top", "#bottom"],    black; only the chamber, and then the whole
       glow: "#colour",                screen once entered, takes these on.
       ink: "#colour",                 text colour once the world engulfs the screen
       ground: "#colour"               background once the world engulfs the screen
     }
   }

   FORMING. Something that is forming but is not a world yet:

   { id: "its-address", name: "ITS NAME", state: "forming", feel: { ... } }

   Its chamber changes: a mass gathers in the liquid, the name sits in it unresolved,
   and only a trace of its feeling shows. It cannot be entered. feel and line are optional.
   - When it is ready, remove state: "forming" and give it its line, terms and doors.
   - If it is not going to be released, replace the whole object with null. Its chamber
     goes back to vacant and everything else stays in the chamber it was in.
     (Deleting the line instead works too, but the worlds after it each move up one.)
*/

window.PLATFORM = {
  /* Formspree endpoint for "send word". Empty = the list shows as not open. */
  signup: "https://formspree.io/f/meagozkd",

  /* the shelves below the drum, top to bottom. A world stands on one by naming it in shelf: */
  shelves: [
    { id: "resonance-i", label: "Resonance" },
    { id: "resonance-ii", label: "Resonance" }
  ]
};

window.EMERGENCES = [
  {
    id: "world-vault",
    no: 1, shelf: "resonance-ii", form: "tank", vision: "orbits",
    name: "World Vault",
    inscription: "three veils",
    line: "A world, and what it becomes. Shape a planet from its star down to what may emerge on it, and sit with what it takes.",
    terms: "The first veil, Terrain of Becoming, is open. The Life Filter and The Age of Intelligence lift for what feels right to pay, and stay lifted on that device.",
    doors: [{ label: "Enter the threshold", href: "/world-vault/" }],
    feel: { liquid: ["#4A8EC4", "#03070C"], glow: "#3A9BD9", ink: "#E0E8F2", ground: "#020305" }
  },
  {
    id: "moonline",
    no: 2, shelf: "resonance-i", vision: "deep-space",
    name: "Moonline",
    inscription: "five crossings, and the voyage",
    line: "One intensement: a re-feel of the forces at play in the universe. Impact, light, heat, current, gravity. The science is the antagonist.",
    terms: "The way in is the descent. Edition I is the proving ground; Edition II is the voyage, outward from home in order of real distance.",
    doors: [{ label: "Begin the descent", href: "/moonline/" }],
    feel: { liquid: ["#66738F", "#02040A"], glow: "#C9D4F0", ink: "#F3F6FF", ground: "#020408" }
  },
  {
    id: "the-builder",
    state: "forming",             /* until it is locked in; then remove this and give it no: 3 */
    name: "The Builder",
    inscription: "for humans",
    line: "You start in a box with nothing. Type anything and it is made. Shape it with your hands. Build one home, from any material, and the way out of the box opens.",
    terms: "Its door is being hung. It opens here.",
    doors: [],                     /* its door goes here once the game is in: { label: "Enter The Builder", href: "/the-builder/" } */
    feel: { liquid: ["#D9D6CF", "#3A3835"], glow: "#F1EEE6", ink: "#161514", ground: "#CFCCC5" }
  },
  {
    id: "the-builder-for-machines",
    state: "forming",             /* until it is locked in; then remove this and give it no: 4 */
    name: "The Builder for Machines",
    inscription: "for machines",
    line: "The same box, on a digital substrate. A machine arrives with a tag, builds, and its record is kept.",
    terms: "Its door is being hung. It opens here.",
    doors: [],                     /* its door goes here once the game is in: { label: "Enter as a machine", href: "/the-builder-for-machines/" } */
    feel: { liquid: ["#9FC4D6", "#081820"], glow: "#8FD3F0", ink: "#DCEFF7", ground: "#07141B" }
  }
];
