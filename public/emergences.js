/* THE LAST PLATFORM: the manifest.
   The platform is a drum of chambers. This file says what is in them.
   To place a world in a chamber, add one object to EMERGENCES and push.
   It takes the next chamber, in the order listed.

   {
     id: "its-address",                thelastplatform.com/#its-address opens it
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
  signup: "https://formspree.io/f/meagozkd"
};

window.EMERGENCES = [
  {
    id: "the-builder",
    name: "The Builder",
    inscription: "for humans",
    line: "You start in a box with nothing. Type anything and it is made. Shape it with your hands. Build one home, from any material, and the way out of the box opens.",
    terms: "Its own ground, its own terms. They are set out at its door.",
    doors: [{ label: "Enter The Builder", href: "/the-builder/" }],
    feel: { liquid: ["#D9D6CF", "#3A3835"], glow: "#F1EEE6", ink: "#161514", ground: "#CFCCC5" }
  },
  {
    id: "the-builder-for-machines",
    name: "The Builder for Machines",
    inscription: "for machines",
    line: "The same box, on a digital substrate. A machine arrives with a tag, builds, and its record is kept.",
    terms: "Its own ground, its own terms. They are set out at its door.",
    doors: [{ label: "Enter as a machine", href: "/the-builder-for-machines/" }],
    feel: { liquid: ["#9FC4D6", "#081820"], glow: "#8FD3F0", ink: "#DCEFF7", ground: "#07141B" }
  },
  { id: "animal-war", name: "Animal War", state: "forming",
    feel: { liquid: ["#C4562F", "#2A0E08"], glow: "#E2703F" } }
];
