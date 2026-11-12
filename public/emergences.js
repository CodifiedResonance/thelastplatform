/* THE LAST PLATFORM: the manifest.
   This file is the whole of what the platform holds. The page is drawn from it.

   To bring a world onto the platform, add one object to EMERGENCES and push.
   Order is the order they emerged. The first entry headlines.

   A world brings:
     id          its address on the platform (thelastplatform.com/#id)
     state       "emerged" (it can be entered) or "emerging" (it is forming)
     inscription the small line above its mark
     mark        its own wordmark. `style` names a treatment in platform.css
                 (.mark-<style>); leave it out for the plain treatment.
                 The platform frames a mark. It never restyles it.
     line        what the world is, in its own voice
     facts       short lines about the world as it stands (optional)
     access      the world's own terms: how it is entered, played, paid for
     doors       the ways in. A door with no href is shown as not yet open.
*/

window.PLATFORM = {
  /* Formspree endpoint, e.g. "https://formspree.io/f/abcdwxyz".
     While empty, the list shows as not yet open and no form is drawn. */
  signup: ""
};

window.EMERGENCES = [
  {
    id: "moonline",
    state: "emerged",
    inscription: "first emerged",
    mark: {
      text: "MOONLINE",
      style: "moonline",
      craters: [
        { l: 15, t: 6,  s: 5.2, o: 0.68 },
        { l: 41, t: 60, s: 3.2, o: 0.55 },
        { l: 63, t: 12, s: 6.6, o: 0.6 },
        { l: 82, t: 52, s: 2.4, o: 0.5 }
      ]
    },
    line: "Velocity across the cosmos. Five crossings, and a voyage beyond them, where the forces themselves are the opposition: impact, light, heat, current, gravity, rhythm.",
    facts: [
      "Eleven worlds across two editions",
      "One universe a week, the same for everyone"
    ],
    access: "Plays in the browser. No account, nothing to install.",
    doors: [
      { label: "Enter MOONLINE", href: "https://codifiedresonance.com/last-platform/moonline" }
    ]
  },
  {
    id: "the-builder",
    state: "emerging",
    inscription: "emerging",
    mark: { text: "The Builder", style: "builder" },
    line: "Start with nothing. A grey box, one figure, and whatever you type gets made. Build one home and you earn the way out, into worlds other people made.",
    facts: [
      "One world, two doors"
    ],
    access: "Machines enter first. Humans get a full taste before anything is asked of them.",
    doors: [
      { label: "The door for machines", href: "" },
      { label: "The door for humans", href: "" }
    ]
  }
  /* the next emergence goes here */
];
